import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

const PROMPT = "db > ";

const DEFAULT_EXAMPLES = [
  {
    label: "INSERT profile",
    query: "INSERT INTO profiles VALUES ('김민수', 'INFP', '독서');",
  },
  {
    label: "SELECT all",
    query: "SELECT * FROM profiles;",
  },
  {
    label: "SELECT filter",
    query: "SELECT name, hobby FROM profiles WHERE mbti = 'ENFP';",
  },
];

export default function CliPanel({
  examples = DEFAULT_EXAMPLES,
  connectionState = "connecting",
  onConnectionChange,
  onQueryResult,
  onQueryStart,
  runQuery,
}) {
  const mountRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const socketRef = useRef(null);
  const lastViewportRef = useRef({ width: 0, height: 0, cols: 0, rows: 0 });
  const inputBufferRef = useRef("");
  const cursorIndexRef = useRef(0);
  const historyEntriesRef = useRef([]);
  const historyIndexRef = useRef(null);
  const historyDraftRef = useRef("");
  const connectionStateRef = useRef(connectionState);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onQueryResultRef = useRef(onQueryResult);
  const onQueryStartRef = useRef(onQueryStart);
  const runQueryRef = useRef(runQuery);
  const [statusMessage, setStatusMessage] = useState("Opening a shell-backed terminal...");
  const [sessionMeta, setSessionMeta] = useState(null);

  const normalizedExamples = useMemo(
    () => (Array.isArray(examples) && examples.length > 0 ? examples : DEFAULT_EXAMPLES),
    [examples],
  );

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  useEffect(() => {
    onQueryResultRef.current = onQueryResult;
  }, [onQueryResult]);

  useEffect(() => {
    onQueryStartRef.current = onQueryStart;
  }, [onQueryStart]);

  useEffect(() => {
    runQueryRef.current = runQuery;
  }, [runQuery]);

  useEffect(() => {
    connectionStateRef.current = connectionState;

    if (connectionState === "shell") {
      inputBufferRef.current = "";
      cursorIndexRef.current = 0;
      historyIndexRef.current = null;
      historyDraftRef.current = "";
    }
  }, [connectionState]);

  function renderPromptLine(terminal = terminalRef.current) {
    if (!terminal) {
      return;
    }

    const buffer = inputBufferRef.current;
    const characters = Array.from(buffer);
    const clampedCursorIndex = clamp(cursorIndexRef.current, 0, characters.length);
    const trailingText = characters.slice(clampedCursorIndex).join("");
    const trailingWidth = getDisplayWidth(trailingText);

    cursorIndexRef.current = clampedCursorIndex;
    terminal.write(`\r\x1b[2K${PROMPT}${buffer}`);

    if (trailingWidth > 0) {
      terminal.write(`\x1b[${trailingWidth}D`);
    }
  }

  function clearInputLine(terminal = terminalRef.current) {
    inputBufferRef.current = "";
    cursorIndexRef.current = 0;
    historyIndexRef.current = null;
    historyDraftRef.current = "";
    renderPromptLine(terminal);
  }

  function detachHistoryNavigation() {
    if (historyIndexRef.current === null) {
      return;
    }

    historyDraftRef.current = inputBufferRef.current;
    historyIndexRef.current = null;
  }

  function rememberHistoryEntry(query) {
    const normalizedQuery = String(query ?? "").trim();

    if (!normalizedQuery) {
      return;
    }

    historyEntriesRef.current = [...historyEntriesRef.current, normalizedQuery].slice(-100);
    historyIndexRef.current = null;
    historyDraftRef.current = "";
  }

  function applyHistoryEntry(entry, terminal = terminalRef.current) {
    inputBufferRef.current = entry;
    cursorIndexRef.current = Array.from(entry).length;
    renderPromptLine(terminal);
  }

  function navigateHistory(direction, terminal = terminalRef.current) {
    const entries = historyEntriesRef.current;

    if (!terminal || entries.length === 0) {
      return;
    }

    if (direction < 0) {
      if (historyIndexRef.current === null) {
        historyDraftRef.current = inputBufferRef.current;
        historyIndexRef.current = entries.length - 1;
      } else if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
      }

      applyHistoryEntry(entries[historyIndexRef.current], terminal);
      return;
    }

    if (historyIndexRef.current === null) {
      return;
    }

    if (historyIndexRef.current < entries.length - 1) {
      historyIndexRef.current += 1;
      applyHistoryEntry(entries[historyIndexRef.current], terminal);
      return;
    }

    historyIndexRef.current = null;
    applyHistoryEntry(historyDraftRef.current, terminal);
  }

  useEffect(() => {
    const mountNode = mountRef.current;

    if (!mountNode) {
      return undefined;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "Consolas, 'JetBrains Mono', monospace",
      fontSize: 14,
      lineHeight: 1.45,
      allowTransparency: true,
      convertEol: false,
      theme: {
        background: "#08111f",
        foreground: "#e2e8f0",
        cursor: "#38bdf8",
        selectionBackground: "rgba(56, 189, 248, 0.25)",
        brightBlue: "#93c5fd",
        brightGreen: "#86efac",
        brightRed: "#fca5a5",
        brightYellow: "#fde68a",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(mountNode);
    terminal.focus();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const syncTerminalSize = () => {
      const width = mountNode.clientWidth;
      const height = mountNode.clientHeight;

      if (!width || !height) {
        return;
      }

      const previousViewport = lastViewportRef.current;

      if (
        previousViewport.width === width &&
        previousViewport.height === height &&
        previousViewport.cols > 0 &&
        previousViewport.rows > 0
      ) {
        return;
      }

      fitAddon.fit();

      lastViewportRef.current = {
        width,
        height,
        cols: terminal.cols,
        rows: terminal.rows,
      };

      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "terminal-resize",
            cols: terminal.cols,
            rows: terminal.rows,
          }),
        );
      }
    };

    requestAnimationFrame(syncTerminalSize);

    const resizeObserver = new ResizeObserver(() => {
      syncTerminalSize();
    });

    resizeObserver.observe(mountNode);
    resizeObserverRef.current = resizeObserver;

    const handleWindowResize = () => {
      syncTerminalSize();
    };

    window.addEventListener("resize", handleWindowResize);

    const terminalInput = terminal.onData((data) => {
      if (connectionStateRef.current === "shell") {
        const socket = socketRef.current;

        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "terminal-input",
              data,
            }),
          );
        }

        return;
      }

      let index = 0;

      while (index < data.length) {
        if (data.startsWith("\u001b[A", index)) {
          navigateHistory(-1, terminal);
          index += 3;
          continue;
        }

        if (data.startsWith("\u001b[B", index)) {
          navigateHistory(1, terminal);
          index += 3;
          continue;
        }

        if (data.startsWith("\u001b[D", index)) {
          const characters = Array.from(inputBufferRef.current);

          if (cursorIndexRef.current > 0) {
            cursorIndexRef.current -= 1;
            renderPromptLine(terminal);
          } else if (characters.length > 0) {
            terminal.bell();
          }

          index += 3;
          continue;
        }

        if (data.startsWith("\u001b[C", index)) {
          const characters = Array.from(inputBufferRef.current);

          if (cursorIndexRef.current < characters.length) {
            cursorIndexRef.current += 1;
            renderPromptLine(terminal);
          } else if (characters.length > 0) {
            terminal.bell();
          }

          index += 3;
          continue;
        }

        const escapeSequenceLength = getEscapeSequenceLength(data, index);

        if (escapeSequenceLength > 0) {
          index += escapeSequenceLength;
          continue;
        }

        const char = data[index];

        if (char === "\u0003") {
          terminal.write("\r\x1b[2K^C\r\n");
          clearInputLine(terminal);
          index += 1;
          continue;
        }

        if (char === "\u007f" || char === "\b") {
          const characters = Array.from(inputBufferRef.current);

          if (cursorIndexRef.current > 0) {
            detachHistoryNavigation();
            characters.splice(cursorIndexRef.current - 1, 1);
            inputBufferRef.current = characters.join("");
            cursorIndexRef.current -= 1;
            renderPromptLine(terminal);
          }
          index += 1;
          continue;
        }

        if (char === "\r") {
          const query = inputBufferRef.current.trim();
          inputBufferRef.current = "";
          cursorIndexRef.current = 0;
          historyIndexRef.current = null;
          historyDraftRef.current = "";
          terminal.write("\r\n");

          if (!query) {
            terminal.write(PROMPT);
            index += 1;
            continue;
          }

          if (!canRunExamples(connectionStateRef.current)) {
            terminal.bell();
            terminal.write(PROMPT);
            index += 1;
            continue;
          }

          if (isTerminalSessionCommand(query)) {
            void executeSessionCommand(query);
            index += 1;
            continue;
          }

          void executeTerminalQuery(query);
          index += 1;
          continue;
        }

        if (char >= " " && char !== "\u007f" && char !== "\n") {
          detachHistoryNavigation();
          const characters = Array.from(inputBufferRef.current);
          characters.splice(cursorIndexRef.current, 0, char);
          inputBufferRef.current = characters.join("");
          cursorIndexRef.current += 1;
          renderPromptLine(terminal);
        }

        index += 1;
      }
    });

    const socket = new WebSocket(buildWebSocketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      setStatusMessage("Shell transport connected. Waiting for prompt...");
      syncTerminalSize();
    };

    socket.onmessage = (event) => {
      let message;

      try {
        message = JSON.parse(event.data);
      } catch (_error) {
        terminal.writeln("");
        terminal.writeln("[backend] Received a non-JSON WebSocket payload.");
        return;
      }

      if (message.type === "session-ready") {
        connectionStateRef.current = message.ready ? "connecting" : "error";
        setSessionMeta(message.engine || null);
        setStatusMessage(message.message || "Terminal session created.");
        onConnectionChangeRef.current?.({
          status: message.ready ? "connecting" : "error",
          message: message.message || "Terminal session created.",
        });
        return;
      }

      if (message.type === "session-status") {
        const nextStatus = normalizeConnectionStatus(message.status);
        connectionStateRef.current = nextStatus;

        if (nextStatus === "shell" || nextStatus === "connected") {
          inputBufferRef.current = "";
          cursorIndexRef.current = 0;
          historyIndexRef.current = null;
          historyDraftRef.current = "";
        }

        setStatusMessage(message.message || "Terminal state changed.");
        onConnectionChangeRef.current?.({
          status: nextStatus,
          message: message.message || "Terminal state changed.",
        });
        return;
      }

      if (message.type === "terminal-output") {
        terminal.write(message.data);
        return;
      }

      if (message.type === "query-started") {
        setStatusMessage(`Running: ${message.query}`);
        onQueryStartRef.current?.(message.query);
        return;
      }

      if (message.type === "query-result") {
        setStatusMessage(message.payload?.message || "Query finished.");
        onQueryResultRef.current?.(message.payload || {});
        return;
      }

      if (message.type === "system-error") {
        setStatusMessage(message.message || "Backend terminal error.");
        onConnectionChangeRef.current?.({
          status: "error",
          message: message.message || "Backend terminal error.",
        });
      }
    };

    socket.onerror = () => {
      connectionStateRef.current = "error";
      setStatusMessage("Failed to connect to the backend WebSocket.");
      onConnectionChangeRef.current?.({
        status: "error",
        message: "Failed to connect to the backend WebSocket.",
      });
    };

    socket.onclose = () => {
      connectionStateRef.current = "disconnected";
      setStatusMessage("Terminal connection closed.");
      onConnectionChangeRef.current?.({
        status: "disconnected",
        message: "Terminal connection closed.",
      });
    };

    return () => {
      terminalInput.dispose();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      socket.close();
      terminal.dispose();
      inputBufferRef.current = "";
      cursorIndexRef.current = 0;
      historyEntriesRef.current = [];
      historyIndexRef.current = null;
      historyDraftRef.current = "";
      lastViewportRef.current = { width: 0, height: 0, cols: 0, rows: 0 };
      terminalRef.current = null;
      fitAddonRef.current = null;
      resizeObserverRef.current = null;
      socketRef.current = null;
    };
  }, []);

  async function executeTerminalQuery(query, { echoCommand = false } = {}) {
    const terminal = terminalRef.current;
    const activeRunQuery = runQueryRef.current;

    if (!terminal || typeof activeRunQuery !== "function") {
      setStatusMessage("The shared query runner is not connected.");
      return;
    }

    rememberHistoryEntry(query);
    inputBufferRef.current = "";
    cursorIndexRef.current = 0;
    onQueryStartRef.current?.(query);
    setStatusMessage(`Running: ${query}`);

    if (echoCommand) {
      terminal.write(`\r\ndb > ${query}\r\n`);
    }

    try {
      const nextPayload = await activeRunQuery(query, {
        updateSharedState: true,
        trackLoading: true,
      });

      writeExampleResult(terminal, nextPayload);
      setStatusMessage(nextPayload.message);
    } catch (error) {
      const failedPayload = {
        success: false,
        queryType: inferQueryType(query),
        message: error.message || "Unexpected backend error.",
        parseTree: null,
        rows: [],
        rawOutput: "",
      };
      writeExampleResult(terminal, failedPayload);
      setStatusMessage(failedPayload.message);
    }

    terminal.focus();
  }

  function executeSessionCommand(query) {
    const terminal = terminalRef.current;
    const socket = socketRef.current;

    if (!terminal) {
      return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      const message = "The terminal transport is not connected.";
      setStatusMessage(message);
      terminal.write(`${message}\r\n${PROMPT}`);
      terminal.focus();
      return;
    }

    rememberHistoryEntry(query);
    inputBufferRef.current = "";
    cursorIndexRef.current = 0;
    onQueryStartRef.current?.(query);
    setStatusMessage(`Running: ${query}`);

    socket.send(
      JSON.stringify({
        type: "run-query",
        query,
      }),
    );

    terminal.focus();
  }

  async function handleExampleClick(query) {
    if (!canRunExamples(connectionState)) {
      return;
    }

    await executeTerminalQuery(query, { echoCommand: true });
  }

  return (
    <section style={styles.panel}>
      <header style={styles.header}>
        <span style={styles.eyebrow}>LIVE TERMINAL</span>
        <h2 style={styles.title}>CLI Panel</h2>
        <p style={styles.subtitle}>
          This panel opens a terminal-style session, then runs profile SQL through the built engine
          so the parse tree and service panel stay in sync.
        </p>
      </header>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Example SQL</span>
          <span style={styles.cardBadge(connectionState)}>
            {formatConnectionLabel(connectionState)}
          </span>
        </div>

        <div style={styles.buttonRow}>
          {normalizedExamples.map((example) => (
            <button
              key={`${example.label}-${example.query}`}
              type="button"
              disabled={!canRunExamples(connectionState)}
              onClick={() => handleExampleClick(example.query)}
              style={styles.exampleButton(canRunExamples(connectionState))}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.terminalCard}>
        <div style={styles.terminalToolbar}>
          <span style={styles.toolbarTitle}>Shell + SQL Engine</span>
          <span style={styles.toolbarHint}>
            {sessionMeta?.workingDirectory || "Waiting for shell path..."}
          </span>
        </div>

        <div
          ref={mountRef}
          style={styles.terminalViewport}
          onClick={() => terminalRef.current?.focus()}
        />
      </div>

      <footer style={styles.footer}>
        <span style={styles.footerChip(connectionState)}>
          {formatConnectionLabel(connectionState)}
        </span>
        <span style={styles.footerText}>{statusMessage}</span>
      </footer>
    </section>
  );
}

function buildWebSocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";

  if (import.meta.env.DEV) {
    return `${protocol}://${window.location.hostname}:3001/ws/terminal`;
  }

  return `${protocol}://${window.location.host}/ws/terminal`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDisplayWidth(text) {
  return Array.from(text).reduce(
    (width, character) => width + (isWideCharacter(character) ? 2 : 1),
    0,
  );
}

function isWideCharacter(character) {
  return /[\u1100-\u115F\u2329\u232A\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/u.test(
    character,
  );
}

function getEscapeSequenceLength(data, startIndex) {
  if (data[startIndex] !== "\u001b") {
    return 0;
  }

  const nextChar = data[startIndex + 1];

  if (!nextChar) {
    return 1;
  }

  if (nextChar === "[") {
    let index = startIndex + 2;

    while (index < data.length) {
      const code = data.charCodeAt(index);

      if (code >= 0x40 && code <= 0x7e) {
        return index - startIndex + 1;
      }

      index += 1;
    }

    return data.length - startIndex;
  }

  if (nextChar === "O") {
    return Math.min(3, data.length - startIndex);
  }

  return 2;
}

function canRunExamples(connectionState) {
  return connectionState === "connected";
}

function isTerminalSessionCommand(query) {
  const normalized = String(query ?? "").trim().toLowerCase();
  return normalized === ".exit" || normalized === "quit";
}

function inferQueryType(query) {
  const upper = String(query ?? "").trim().toUpperCase();
  if (upper.startsWith("INSERT")) {
    return "INSERT";
  }
  if (upper.startsWith("SELECT")) {
    return "SELECT";
  }
  return "UNKNOWN";
}

function writeExampleResult(terminal, payload) {
  if (!terminal) {
    return;
  }

  const lines = [];

  if (Array.isArray(payload.rows)) {
    payload.rows.forEach((row) => {
      if (row && typeof row === "object") {
        const ordered = Object.values(row).map((value) => String(value ?? "").trim());
        lines.push(`(${ordered.join(", ")})`);
      }
    });
  }

  lines.push(payload.message || (payload.success ? "Executed." : "Query failed."));
  terminal.write(`${lines.join("\r\n")}\r\ndb > `);
}

function normalizeConnectionStatus(status) {
  if (status === "connected") {
    return "connected";
  }

  if (status === "shell") {
    return "shell";
  }

  if (status === "launching") {
    return "connecting";
  }

  if (status === "closed") {
    return "closed";
  }

  if (status === "error") {
    return "error";
  }

  return "connecting";
}

function formatConnectionLabel(connectionState) {
  switch (connectionState) {
    case "connected":
      return "Engine Ready";
    case "shell":
      return "Shell Ready";
    case "error":
      return "Engine Error";
    case "disconnected":
      return "Disconnected";
    case "closed":
      return "Closed";
    default:
      return "Connecting";
  }
}

const styles = {
  panel: {
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
    borderRadius: 24,
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flexShrink: 0,
  },
  eyebrow: {
    color: "#8fb3ff",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.12em",
  },
  title: {
    margin: 0,
    fontSize: 34,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#93a7c4",
    fontSize: 14,
    lineHeight: 1.6,
  },
  card: {
    minWidth: 0,
    background: "#111c34",
    border: "1px solid #223250",
    borderRadius: 14,
    padding: 16,
    flexShrink: 0,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
  },
  cardBadge: (connectionState) => ({
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background:
      connectionState === "connected"
        ? "rgba(16, 185, 129, 0.16)"
        : connectionState === "shell"
          ? "rgba(56, 189, 248, 0.16)"
          : connectionState === "error"
            ? "rgba(248, 113, 113, 0.16)"
            : "rgba(51, 65, 85, 0.8)",
    color:
      connectionState === "connected"
        ? "#bbf7d0"
        : connectionState === "shell"
          ? "#bae6fd"
          : connectionState === "error"
            ? "#fecaca"
            : "#cbd5e1",
  }),
  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  exampleButton: (enabled) => ({
    border: "1px solid #31486f",
    background: enabled ? "#16233f" : "#172033",
    color: enabled ? "#dbeafe" : "#6b7d9b",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "not-allowed",
  }),
  terminalCard: {
    flex: "1 1 0",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    minWidth: 0,
    width: "100%",
    background: "#111c34",
    border: "1px solid #223250",
    borderRadius: 14,
    overflow: "hidden",
  },
  terminalToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    padding: "12px 14px",
    borderBottom: "1px solid #223250",
    background: "rgba(8, 17, 31, 0.85)",
  },
  toolbarTitle: {
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  toolbarHint: {
    flex: 1,
    minWidth: 0,
    color: "#7d92b3",
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "right",
  },
  terminalViewport: {
    flex: "1 1 0",
    minHeight: 0,
    minWidth: 0,
    height: 0,
    width: "100%",
    maxWidth: "100%",
    padding: "12px 10px",
    background: "#08111f",
    overflow: "hidden",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    color: "#94a3b8",
    fontSize: 12,
    flexShrink: 0,
  },
  footerChip: (connectionState) => ({
    padding: "6px 10px",
    borderRadius: 999,
    background:
      connectionState === "connected"
        ? "rgba(16, 185, 129, 0.16)"
        : connectionState === "shell"
          ? "rgba(56, 189, 248, 0.16)"
          : connectionState === "error"
            ? "rgba(248, 113, 113, 0.16)"
            : "rgba(51, 65, 85, 0.8)",
    color:
      connectionState === "connected"
        ? "#bbf7d0"
        : connectionState === "shell"
          ? "#bae6fd"
          : connectionState === "error"
            ? "#fecaca"
            : "#cbd5e1",
    fontWeight: 700,
  }),
  footerText: {
    minWidth: 0,
    textAlign: "right",
  },
};
