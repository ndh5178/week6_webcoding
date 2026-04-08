const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");

const { executeQuery, getEngineStatus } = require("./bridge/engineBridge");
const { buildResponsePayload } = require("./protocol/responseProtocol");
const { attachTerminalServer } = require("./websocket/terminalServer");

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "backend", "public");
const XTERM_DIR = path.join(PROJECT_ROOT, "frontend", "node_modules", "@xterm", "xterm");
const XTERM_FIT_DIR = path.join(PROJECT_ROOT, "frontend", "node_modules", "@xterm", "addon-fit");

app.use(cors());
app.use(express.json());
app.use("/vendor/xterm", express.static(XTERM_DIR));
app.use("/vendor/xterm-fit", express.static(XTERM_FIT_DIR));
app.use(express.static(PUBLIC_DIR));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "cupid-sql-backend",
    engine: getEngineStatus()
  });
});

app.post("/api/query", async (req, res) => {
  const { query } = req.body || {};

  if (!query || typeof query !== "string") {
    return res.status(400).json({
      success: false,
      message: "Query must be a non-empty string.",
      parseTree: null,
      rows: []
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
      rows: []
    });
  }
});

attachTerminalServer(server);

server.listen(PORT, () => {
  const status = getEngineStatus();
  console.log(`[backend] listening on http://localhost:${PORT}`);
  console.log(`[backend] engine path: ${status.path}`);
  console.log(`[backend] engine exists: ${status.exists}`);
});
