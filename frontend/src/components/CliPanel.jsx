import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

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
}) {
  const mountRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const socketRef = useRef(null);
  const lastViewportRef = useRef({ width: 0, height: 0, cols: 0, rows: 0 });
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onQueryResultRef = useRef(onQueryResult);
  const onQueryStartRef = useRef(onQueryStart);
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
      const socket = socketRef.current;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        terminal.bell();
        return;
      }

      socket.send(JSON.stringify({ type: "terminal-input", data }));
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
        setSessionMeta(message.engine || null);
        setStatusMessage(message.message || "Terminal session created.");
        onConnectionChangeRef.current?.({
          status: message.ready ? "connecting" : "error",
          message: message.message || "Terminal session created.",
        });
        return;
      }

      if (message.type === "session-status") {
        setStatusMessage(message.message || "Terminal state changed.");
        onConnectionChangeRef.current?.({
          status: normalizeConnectionStatus(message.status),
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
      setStatusMessage("Failed to connect to the backend WebSocket.");
      onConnectionChangeRef.current?.({
        status: "error",
        message: "Failed to connect to the backend WebSocket.",
      });
    };

    socket.onclose = () => {
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
      lastViewportRef.current = { width: 0, height: 0, cols: 0, rows: 0 };
      terminalRef.current = null;
      fitAddonRef.current = null;
      resizeObserverRef.current = null;
      socketRef.current = null;
    };
  }, []);

  async function handleExampleClick(query) {
    if (!canRunExamples(connectionState)) {
      return;
    }

    const terminal = terminalRef.current;
    onQueryStartRef.current?.(query);
    setStatusMessage(`Running: ${query}`);
    terminal?.write(`\r\ndb > ${query}\r\n`);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const payload = await response.json();
      const nextPayload = {
        success: Boolean(response.ok && payload.success !== false),
        queryType: payload.queryType ?? "",
        message: payload.message ?? (response.ok ? "Executed." : "Query failed."),
        parseTree: payload.parseTree ?? null,
        rows: Array.isArray(payload.rows) ? payload.rows : [],
        rawOutput: payload.rawOutput ?? "",
      };

      writeExampleResult(terminal, nextPayload);
      setStatusMessage(nextPayload.message);
      onQueryResultRef.current?.(nextPayload);
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
      onQueryResultRef.current?.(failedPayload);
    }

    terminal?.focus();
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

function canRunExamples(connectionState) {
  return connectionState === "connected" || connectionState === "shell";
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
