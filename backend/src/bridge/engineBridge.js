const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const pty = require("node-pty");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const ENGINE_FILENAME = process.platform === "win32" ? "sql-engine.exe" : "sql-engine";
const ENGINE_PATH = path.join(PROJECT_ROOT, "engine", "build", ENGINE_FILENAME);
const SHELL_COMMAND = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash";
const SHELL_ARGS = process.platform === "win32" ? ["-NoLogo"] : [];

function getEngineStatus() {
  return {
    path: ENGINE_PATH,
    exists: fs.existsSync(ENGINE_PATH),
    workingDirectory: PROJECT_ROOT,
    shell: SHELL_COMMAND,
    launchCommand: getEngineLaunchCommand()
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

function createEngineSession(handlers = {}) {
  if (!fs.existsSync(ENGINE_PATH)) {
    throw new Error(`Engine binary not found at ${ENGINE_PATH}`);
  }

  const child = spawn(ENGINE_PATH, [], {
    cwd: PROJECT_ROOT,
    stdio: ["pipe", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => {
    handlers.onStdout?.(chunk.toString());
  });

  child.stderr.on("data", (chunk) => {
    handlers.onStderr?.(chunk.toString());
  });

  child.on("error", (error) => {
    handlers.onError?.(error);
  });

  child.on("close", (code, signal) => {
    handlers.onClose?.({ code, signal });
  });

  return {
    write(command) {
      if (child.stdin.destroyed) {
        throw new Error("Engine stdin is already closed.");
      }

      child.stdin.write(`${String(command).replace(/\r?\n$/, "")}\n`);
    },
    dispose() {
      if (!child.killed) {
        child.kill();
      }
    }
  };
}

function createShellSession(handlers = {}) {
  if (!fs.existsSync(ENGINE_PATH)) {
    throw new Error(`Engine binary not found at ${ENGINE_PATH}`);
  }

  const process = pty.spawn(SHELL_COMMAND, SHELL_ARGS, {
    name: "xterm-256color",
    cols: handlers.cols || 120,
    rows: handlers.rows || 32,
    cwd: PROJECT_ROOT,
    env: {
      ...processEnvSansUndefined(),
      TERM: "xterm-256color"
    }
  });

  process.onData((data) => {
    handlers.onData?.(data);
  });

  process.onExit(({ exitCode, signal }) => {
    handlers.onExit?.({ code: exitCode, signal });
  });

  return {
    write(data) {
      process.write(data);
    },
    resize(cols, rows) {
      if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) {
        return;
      }

      process.resize(cols, rows);
    },
    launchEngine() {
      process.write(`${getEngineLaunchCommand()}\r`);
    },
    dispose() {
      process.kill();
    }
  };
}

function getEngineLaunchCommand() {
  if (process.platform === "win32") {
    return `& '.\\engine\\build\\${ENGINE_FILENAME}'`;
  }

  return `./engine/build/${ENGINE_FILENAME}`;
}

function processEnvSansUndefined() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined),
  );
}

function cleanupTempFiles(tempDir) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_error) {
    // Temporary files are best-effort cleanup only.
  }
}

module.exports = {
  createShellSession,
  createEngineSession,
  executeQuery,
  getEngineStatus
};
