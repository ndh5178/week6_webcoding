const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const pty = require("node-pty");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const ENGINE_FILENAME = process.platform === "win32" ? "sql-engine.exe" : "sql-engine";
const ENGINE_PATH = path.join(PROJECT_ROOT, "engine", "build", ENGINE_FILENAME);
const SHELL_CONFIG = getShellConfig();

function getEngineStatus() {
  return {
    path: ENGINE_PATH,
    exists: fs.existsSync(ENGINE_PATH),
    shell: SHELL_CONFIG.label,
    workingDirectory: PROJECT_ROOT,
    launchCommand: buildLaunchCommand(),
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

function createShellSession({ onData, onExit } = {}) {
  if (!fs.existsSync(ENGINE_PATH)) {
    throw new Error(`Engine binary not found at ${ENGINE_PATH}`);
  }

  let closed = false;
  const terminal = pty.spawn(SHELL_CONFIG.file, SHELL_CONFIG.args, {
    name: "xterm-color",
    cols: 120,
    rows: 32,
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      TERM: "xterm-256color",
    },
  });

  if (typeof onData === "function") {
    terminal.onData((text) => {
      onData(text);
    });
  }

  if (typeof onExit === "function") {
    terminal.onExit((event) => {
      closed = true;
      onExit({
        code: event?.exitCode,
        signal: event?.signal,
      });
    });
  }

  return {
    write(data) {
      terminal.write(String(data ?? ""));
    },
    resize(cols, rows) {
      if (Number.isFinite(cols) && Number.isFinite(rows) && cols > 0 && rows > 0) {
        terminal.resize(cols, rows);
      }
    },
    launchEngine() {
      terminal.write(`${buildLaunchCommand()}\r`);
    },
    dispose() {
      if (closed) {
        return;
      }

      closed = true;

      try {
        terminal.kill();
      } catch (_error) {
        // The pty may already be torn down when the socket closes.
      }
    },
  };
}

function getShellConfig() {
  if (process.platform === "win32") {
    const powershell =
      process.env.ComSpec && process.env.ComSpec.toLowerCase().includes("powershell")
        ? process.env.ComSpec
        : "powershell.exe";

    return {
      file: powershell,
      args: ["-NoLogo"],
      label: "PowerShell",
    };
  }

  const shell = process.env.SHELL || "/bin/bash";
  return {
    file: shell,
    args: ["-l"],
    label: path.basename(shell),
  };
}

function buildLaunchCommand() {
  if (process.platform === "win32") {
    return `[Console]::InputEncoding = [System.Text.UTF8Encoding]::new(); [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); chcp 65001 > $null; & "${ENGINE_PATH}"`;
  }

  return `"${ENGINE_PATH}"`;
}

module.exports = {
  createShellSession,
  executeQuery,
  getEngineStatus,
};
