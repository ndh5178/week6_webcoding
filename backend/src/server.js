const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocket, WebSocketServer } = require("ws");

const {
  createShellSession,
  executeQuery,
  getEngineStatus,
} = require("./bridge/engineBridge");
const { buildResponsePayload } = require("./protocol/responseProtocol");

const ENGINE_PROMPT = "db > ";
const MAX_PROMPT_BUFFER = 4000;
const LAUNCH_DELAY_MS = 300;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/terminal" });
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "cupid-sql-backend",
    engine: getEngineStatus(),
  });
});

app.post("/api/query", async (req, res) => {
  const { query } = req.body || {};

  if (!query || typeof query !== "string") {
    return res.status(400).json({
      success: false,
      message: "Query must be a non-empty string.",
      parseTree: null,
      rows: [],
    });
  }

  try {
    const rawOutput = await executeQuery(query);
    const payload = buildResponsePayload(query, rawOutput);
    const statusCode = payload.success ? 200 : 400;
    return res.status(statusCode).json(payload);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unexpected backend error.",
      parseTree: null,
      rows: [],
    });
  }
});

wss.on("connection", (socket) => {
  const engineStatus = getEngineStatus();
  let session = null;
  let pendingQuery = null;
  let pendingOutput = "";
  let inputBuffer = "";
  let promptBuffer = "";
  let engineReady = false;

  send(socket, {
    type: "session-ready",
    ready: engineStatus.exists,
    engine: engineStatus,
    message: engineStatus.exists
      ? `Opened ${engineStatus.shell} in ${engineStatus.workingDirectory}. Waiting for the SQL engine prompt...`
      : `Engine binary not found at ${engineStatus.path}`,
  });

  if (!engineStatus.exists) {
    send(socket, {
      type: "session-status",
      status: "error",
      message: `Engine binary not found at ${engineStatus.path}`,
    });
    sendTerminalOutput(socket, `\r\n[backend] Engine binary not found at ${engineStatus.path}\r\n`);
    return;
  }

  try {
    session = createShellSession({
      onData(text) {
        handleSessionData(text);
      },
      onExit({ code, signal }) {
        handleSessionExit(code, signal);
      },
    });
  } catch (error) {
    send(socket, {
      type: "system-error",
      message: error.message || "Failed to open the shell session.",
    });
    send(socket, {
      type: "session-status",
      status: "error",
      message: error.message || "Failed to open the shell session.",
    });
    return;
  }

  send(socket, {
    type: "session-status",
    status: "launching",
    message: `Shell opened at ${engineStatus.workingDirectory}. Launching ${engineStatus.launchCommand}...`,
  });

  setTimeout(() => {
    if (!session) {
      return;
    }

    try {
      session.launchEngine();

      // Some Windows PTY sessions do not surface the first `db >` prompt
      // until an extra newline is sent after launch.
      setTimeout(() => {
        if (!session || engineReady) {
          return;
        }

        session.write("\r");
      }, 120);
    } catch (error) {
      send(socket, {
        type: "system-error",
        message: error.message || "Failed to launch the SQL engine inside the shell.",
      });
    }
  }, LAUNCH_DELAY_MS);

  socket.on("message", (rawMessage) => {
    let message;

    try {
      message = JSON.parse(rawMessage.toString());
    } catch (_error) {
      send(socket, {
        type: "system-error",
        message: "WebSocket payload must be valid JSON.",
      });
      return;
    }

    if (!session) {
      return;
    }

    if (message.type === "terminal-input") {
      const data = String(message.data ?? "");
      captureInput(data);
      session.write(data);
      return;
    }

    if (message.type === "terminal-resize") {
      session.resize(Number(message.cols), Number(message.rows));
      return;
    }

    if (message.type === "run-query") {
      const query = String(message.query ?? "").trim();
      runQueryThroughTerminal(query);
    }
  });

  socket.on("close", () => {
    session?.dispose();
    session = null;
  });

  socket.on("error", () => {
    session?.dispose();
    session = null;
  });

  function handleSessionData(text) {
    sendTerminalOutput(socket, text);

    promptBuffer = keepTail(promptBuffer + stripAnsi(text), MAX_PROMPT_BUFFER);

    const latestPrompt = getLatestPrompt(promptBuffer);

    if (latestPrompt === "engine" && !engineReady) {
      engineReady = true;
      inputBuffer = "";

      send(socket, {
        type: "session-status",
        status: "connected",
        message: `Shell opened at ${engineStatus.workingDirectory}. ${engineStatus.path} is running.`,
      });
    }

    if (pendingQuery) {
      pendingOutput += text;

      if (flushPendingQuery()) {
        return;
      }
    }

    if (engineReady && latestPrompt === "shell") {
      engineReady = false;
      inputBuffer = "";

      send(socket, {
        type: "session-status",
        status: "shell",
        message:
          `The SQL engine stopped, but the shell is still open at ${engineStatus.workingDirectory}. ` +
          `Run ${engineStatus.launchCommand} to start it again.`,
      });
    }
  }

  function handleSessionExit(code, signal) {
    const closeMessage =
      code === 0
        ? "The terminal session closed."
        : `The terminal session closed unexpectedly (code=${code ?? "?"}, signal=${signal ?? "none"}).`;

    if (pendingQuery) {
      finalizePendingQuery({
        success: false,
        queryType: "UNKNOWN",
        message: closeMessage,
        parseTree: null,
        rows: [],
        rawOutput: pendingOutput,
      });
    }

    engineReady = false;

    send(socket, {
      type: "session-status",
      status: "closed",
      message: closeMessage,
    });
  }

  function captureInput(data) {
    let index = 0;

    while (index < data.length) {
      if (data.startsWith("\u001b[A", index) || data.startsWith("\u001b[B", index)) {
        index += 3;
        continue;
      }

      const char = data[index];

      if (char === "\u0003") {
        inputBuffer = "";
      } else if (char === "\u007f" || char === "\b") {
        inputBuffer = inputBuffer.slice(0, -1);
      } else if (char === "\r") {
        const command = inputBuffer.trim();
        inputBuffer = "";

        if (engineReady && !pendingQuery && command) {
          beginQuery(command);
        }
      } else if (char >= " " && char !== "\u007f" && char !== "\n") {
        inputBuffer += char;
      }

      index += 1;
    }
  }

  function runQueryThroughTerminal(query) {
    if (!query) {
      return;
    }

    if (!engineReady) {
      send(socket, {
        type: "system-error",
        message: `The SQL engine is not running yet. Start it with ${engineStatus.launchCommand}.`,
      });
      return;
    }

    if (pendingQuery) {
      sendTerminalOutput(socket, "\r\n[busy] Wait for the current query to finish.\r\n");
      return;
    }

    beginQuery(query);
    inputBuffer = "";
    session.write(`${query}\r`);
  }

  function beginQuery(query) {
    pendingQuery = query;
    pendingOutput = "";

    send(socket, {
      type: "query-started",
      query,
    });
  }

  function flushPendingQuery() {
    const promptIndex = pendingOutput.lastIndexOf(ENGINE_PROMPT);

    if (promptIndex !== -1) {
      const rawOutput = pendingOutput.slice(0, promptIndex);
      const payload = buildResponsePayload(pendingQuery, rawOutput);
      finalizePendingQuery(payload);
      return true;
    }

    if (isExitCommand(pendingQuery) && getLatestPrompt(promptBuffer) === "shell") {
      finalizePendingQuery({
        success: true,
        queryType: "UNKNOWN",
        message: "The SQL engine process exited. The shell is still open.",
        parseTree: null,
        rows: [],
        rawOutput: pendingOutput,
      });
      return true;
    }

    return false;
  }

  function finalizePendingQuery(payload) {
    const nextPayload = {
      success: payload.success ?? false,
      queryType: payload.queryType ?? "UNKNOWN",
      message: payload.message ?? "Unexpected engine response.",
      parseTree: payload.parseTree ?? null,
      rows: payload.rows ?? [],
      rawOutput: payload.rawOutput ?? pendingOutput,
    };

    pendingQuery = null;
    pendingOutput = "";

    send(socket, {
      type: "query-result",
      payload: nextPayload,
    });
  }
});

server.listen(PORT, () => {
  const status = getEngineStatus();
  console.log(`[backend] listening on http://localhost:${PORT}`);
  console.log(`[backend] websocket on ws://localhost:${PORT}/ws/terminal`);
  console.log(`[backend] shell: ${status.shell}`);
  console.log(`[backend] cwd: ${status.workingDirectory}`);
  console.log(`[backend] engine path: ${status.path}`);
  console.log(`[backend] engine exists: ${status.exists}`);
});

function getLatestPrompt(buffer) {
  const engineIndex = buffer.lastIndexOf(ENGINE_PROMPT);
  const shellIndex = getLastShellPromptIndex(buffer);

  if (engineIndex > shellIndex) {
    return "engine";
  }

  if (shellIndex > engineIndex) {
    return "shell";
  }

  return null;
}

function getLastShellPromptIndex(buffer) {
  const regex =
    process.platform === "win32"
      ? /(?:^|\n)PS [^\r\n]*>/g
      : /(?:^|\n)[^\r\n]*[$#]/g;

  let match;
  let lastIndex = -1;

  while ((match = regex.exec(buffer)) !== null) {
    lastIndex = match.index;
  }

  return lastIndex;
}

function isExitCommand(query) {
  const normalized = String(query ?? "").trim().toLowerCase();
  return normalized === ".exit" || normalized === "quit";
}

function keepTail(text, limit) {
  return text.length > limit ? text.slice(-limit) : text;
}

function stripAnsi(text) {
  return text
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function send(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function sendTerminalOutput(socket, text) {
  send(socket, {
    type: "terminal-output",
    data: text,
  });
}
