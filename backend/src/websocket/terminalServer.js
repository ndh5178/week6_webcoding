const { WebSocketServer } = require("ws");
const pty = require("node-pty");

const { getEngineStatus } = require("../bridge/engineBridge");
const { buildResponsePayload } = require("../protocol/responseProtocol");

function attachTerminalServer(server) {
  const wss = new WebSocketServer({ server, path: "/ws/terminal" });

  wss.on("connection", (socket) => {
    const status = getEngineStatus();

    if (!status.exists) {
      socket.send(
        JSON.stringify({
          type: "output",
          data:
            "Error: engine binary not found.\r\n" +
            `${status.path}\r\n` +
            "Build the C engine first, then reconnect.\r\n",
        }),
      );
      socket.send(
        JSON.stringify({
          type: "status",
          kind: "status",
          message: "엔진 없음",
          error: `Engine binary not found at ${status.path}`,
        }),
      );
      socket.close();
      return;
    }

    const shell = pty.spawn(status.path, [], {
      cwd: status.cwd,
      env: process.env,
      name: "xterm-color",
      cols: 120,
      rows: 30,
    });

    let lineBuffer = "";
    let activeCapture = null;

    socket.send(
      JSON.stringify({
        type: "status",
        kind: "status",
        message: "연결됨",
      }),
    );

    shell.onData((data) => {
      socket.send(JSON.stringify({ type: "output", data }));

      if (!activeCapture) {
        return;
      }

      activeCapture.raw += data;
      const promptIndex = activeCapture.raw.lastIndexOf("db > ");

      if (promptIndex === -1) {
        return;
      }

      const rawOutput = sanitizeCommandOutput(activeCapture.query, activeCapture.raw.slice(0, promptIndex));
      const payload = buildResponsePayload(activeCapture.query, rawOutput);

      socket.send(
        JSON.stringify({
          type: "result",
          kind: "result",
          ...payload,
        }),
      );

      if (activeCapture.query === ".clear") {
        socket.send(JSON.stringify({ type: "clear", kind: "clear" }));
      }

      socket.send(
        JSON.stringify({
          type: "status",
          kind: "status",
          message: "연결됨",
        }),
      );

      activeCapture = null;
    });

    shell.onExit(() => {
      socket.send(
        JSON.stringify({
          type: "status",
          kind: "status",
          message: "세션 종료",
          error: "엔진 세션이 종료되었습니다.",
        }),
      );
      socket.close();
    });

    socket.on("message", (message) => {
      const packet = JSON.parse(String(message));

      if (packet.type === "resize") {
        if (typeof packet.cols === "number" && typeof packet.rows === "number") {
          try {
            shell.resize(packet.cols, packet.rows);
          } catch (_error) {
            // Ignore resize failures.
          }
        }
        return;
      }

      if (packet.type !== "input" || typeof packet.data !== "string") {
        return;
      }

      const commands = extractSubmittedCommands(packet.data, lineBuffer);
      lineBuffer = commands.lineBuffer;

      commands.submitted.forEach((query) => {
        const trimmed = query.trim();

        if (!trimmed) {
          return;
        }

        activeCapture = { query: trimmed, raw: "" };
        socket.send(
          JSON.stringify({
            type: "status",
            kind: "status",
            message: "쿼리 실행 중...",
          }),
        );
      });

      shell.write(packet.data);
    });

    socket.on("close", () => {
      try {
        shell.kill();
      } catch (_error) {
        // Best-effort PTY cleanup only.
      }
    });
  });
}

function extractSubmittedCommands(input, previousBuffer) {
  let lineBuffer = previousBuffer;
  const submitted = [];

  for (const character of input) {
    if (character === "\r") {
      submitted.push(lineBuffer);
      lineBuffer = "";
      continue;
    }

    if (character === "\u007f") {
      lineBuffer = lineBuffer.slice(0, -1);
      continue;
    }

    if (character !== "\n") {
      lineBuffer += character;
    }
  }

  return { submitted, lineBuffer };
}

function sanitizeCommandOutput(query, rawOutput) {
  let sanitized = rawOutput;
  const echoed = `${query}\r\n`;

  if (sanitized.startsWith(echoed)) {
    sanitized = sanitized.slice(echoed.length);
  }

  if (sanitized.startsWith(`${query}\n`)) {
    sanitized = sanitized.slice(query.length + 1);
  }

  return sanitized;
}

module.exports = {
  attachTerminalServer,
};
