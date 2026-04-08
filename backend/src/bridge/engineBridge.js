const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const ENGINE_FILENAME = process.platform === "win32" ? "sql-engine.exe" : "sql-engine";
const ENGINE_PATH = path.join(PROJECT_ROOT, "engine", "build", ENGINE_FILENAME);

function getEngineStatus() {
  return {
    path: ENGINE_PATH,
    exists: fs.existsSync(ENGINE_PATH)
  };
}

function executeQuery(query) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(ENGINE_PATH)) {
      reject(new Error(`Engine binary not found at ${ENGINE_PATH}`));
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cupid-sql-"));
    const queryFile = path.join(tempDir, "query.sql");

    try {
      fs.writeFileSync(queryFile, `${query.trim()}\n`, "utf8");
    } catch (error) {
      reject(new Error(`Failed to write temporary query file: ${error.message}`));
      return;
    }

    const child = spawn(ENGINE_PATH, [queryFile], {
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error("Engine execution timed out."));
      }
    }, 5000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });

    child.on("close", (code) => {
      cleanupTempFiles(tempDir);

      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (code !== 0 && stderr.trim()) {
        reject(new Error(stderr.trim()));
        return;
      }

      resolve(stdout);
    });

    child.stdin.end();
  });
}

function cleanupTempFiles(tempDir) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_error) {
    // Temporary files are best-effort cleanup only.
  }
}

module.exports = {
  executeQuery,
  getEngineStatus
};
