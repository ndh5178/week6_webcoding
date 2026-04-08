const express = require("express");
const cors = require("cors");

const { executeQuery, getEngineStatus } = require("./bridge/engineBridge");
const { buildResponsePayload } = require("./protocol/responseProtocol");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  const status = getEngineStatus();
  console.log(`[backend] listening on http://localhost:${PORT}`);
  console.log(`[backend] engine path: ${status.path}`);
  console.log(`[backend] engine exists: ${status.exists}`);
});
