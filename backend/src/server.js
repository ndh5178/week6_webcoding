const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");

const { executeQuery, getEngineStatus } = require("./bridge/engineBridge");
const { buildResponsePayload } = require("./protocol/responseProtocol");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws/terminal" });
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
    const payload = await runQuery(query);
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

wss.on("connection", (ws) => {
  const engine = getEngineStatus();
  const session = {
    inputBuffer: "",
  };

  sendJson(ws, {
    type: "session-ready",
    ready: engine.exists,
    engine: {
      ...engine,
      workingDirectory: process.cwd(),
    },
    message: engine.exists
      ? "Terminal session created. Engine binary detected."
      : "Engine binary is missing. Queries are disabled until it is built.",
  });

  sendJson(ws, {
    type: "session-status",
    status: engine.exists ? "connected" : "error",
    message: engine.exists
      ? "Shell transport connected. Engine ready."
      : `Engine binary not found at ${engine.path}`,
  });

  sendTerminalOutput(
    ws,
    "\r\n  ╔══════════════════════════════════════╗\r\n" +
      "  ║   Cupid SQL Engine v1.0              ║\r\n" +
      "  ║   Terminal query runner              ║\r\n" +
      "  ╚══════════════════════════════════════╝\r\n\r\n" +
      "cupid> ",
  );

  ws.on("message", async (rawMessage) => {
    let message;

    try {
      message = JSON.parse(rawMessage.toString());
    } catch (_error) {
      sendSystemError(ws, "Received a malformed WebSocket message.");
      return;
    }

    if (message.type === "terminal-resize") {
      return;
    }

    if (message.type === "run-query") {
      await handleQuery(ws, String(message.query || "").trim());
      return;
    }

    if (message.type === "terminal-input") {
      await handleTerminalInput(ws, session, String(message.data || ""));
    }
  });
});

server.listen(PORT, () => {
  const status = getEngineStatus();
  console.log(`[backend] listening on http://localhost:${PORT}`);
  console.log(`[backend] websocket path: ws://localhost:${PORT}/ws/terminal`);
  console.log(`[backend] engine path: ${status.path}`);
  console.log(`[backend] engine exists: ${status.exists}`);
});

async function handleTerminalInput(ws, session, data) {
  if (!data) {
    return;
  }

  if (data === "\r") {
    const query = session.inputBuffer.trim();
    session.inputBuffer = "";
    sendTerminalOutput(ws, "\r\n");

    if (!query) {
      sendTerminalOutput(ws, "cupid> ");
      return;
    }

    await handleQuery(ws, query);
    return;
  }

  if (data === "\u0003") {
    session.inputBuffer = "";
    sendTerminalOutput(ws, "^C\r\ncupid> ");
    return;
  }

  if (data === "\u007F") {
    if (session.inputBuffer.length === 0) {
      return;
    }

    session.inputBuffer = session.inputBuffer.slice(0, -1);
    sendTerminalOutput(ws, "\b \b");
    return;
  }

  session.inputBuffer += data;
  sendTerminalOutput(ws, data);
}

async function handleQuery(ws, query) {
  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    sendTerminalOutput(ws, "cupid> ");
    return;
  }

  const engine = getEngineStatus();
  if (!engine.exists) {
    sendSystemError(ws, `Engine binary not found at ${engine.path}`);
    sendTerminalOutput(ws, "cupid> ");
    return;
  }

  sendJson(ws, {
    type: "query-started",
    query: trimmedQuery,
  });

  try {
    const payload = await runQuery(trimmedQuery);

    sendJson(ws, {
      type: "query-result",
      payload,
    });

    const renderedOutput = renderTerminalOutput(trimmedQuery, payload);
    sendTerminalOutput(ws, `${renderedOutput}\r\ncupid> `);
  } catch (error) {
    sendSystemError(ws, error.message || "Failed to execute query.");
    sendTerminalOutput(ws, "cupid> ");
  }
}

async function runQuery(query) {
  const rawOutput = await executeQuery(query);
  return buildResponsePayload(query, rawOutput);
}

function renderTerminalOutput(query, payload) {
  const lines = [];

  lines.push(`[${payload.queryType || "QUERY"}] ${payload.message || "Executed."}`);

  if (Array.isArray(payload.rows) && payload.rows.length > 0) {
    payload.rows.forEach((row) => {
      const values = Object.values(row).join(", ");
      lines.push(`(${values})`);
    });
  } else if (payload.queryType === "SELECT" && payload.success) {
    lines.push("(no rows)");
  }

  if (payload.success === false) {
    lines.push(`Error: ${payload.message || "Query failed."}`);
  }

  return lines.join("\r\n");
}

function sendTerminalOutput(ws, data) {
  sendJson(ws, {
    type: "terminal-output",
    data,
  });
}

function sendSystemError(ws, message) {
  sendJson(ws, {
    type: "system-error",
    message,
  });
}

function sendJson(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
