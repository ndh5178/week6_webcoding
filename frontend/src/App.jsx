import { useState } from "react";

import CliPanel from "./components/CliPanel";
import ParseTreePanel from "./components/ParseTreePanel";
import DateMatchApp from "./components/DateMatchApp";

const DEFAULT_MESSAGE =
  "Open the shell-backed terminal, let it launch the built SQL engine, then run SQL to update the parse tree and service panel.";

export default function App() {
  const [query, setQuery] = useState("");
  const [parseTree, setParseTree] = useState(null);
  const [rows, setRows] = useState([]);
  const [queryType, setQueryType] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connectionState, setConnectionState] = useState("connecting");

  function handleQueryStart(nextQuery) {
    setQuery(nextQuery);
    setLoading(true);
    setError("");
  }

  function handleQueryResult(payload) {
    setLoading(false);
    setParseTree(payload.parseTree ?? null);
    setRows(payload.rows ?? []);
    setQueryType(payload.queryType ?? "");
    setMessage(payload.message ?? "Executed.");
    setError(payload.success === false ? payload.message ?? "Query failed." : "");
  }

  function handleConnectionChange({ status, message: nextMessage }) {
    setConnectionState(status);

    if ((status === "connected" || status === "shell" || status === "connecting") && !query) {
      setMessage(nextMessage || DEFAULT_MESSAGE);
      if (status !== "connected") {
        setError("");
      }
      return;
    }

    if (status === "error" || status === "disconnected" || status === "closed") {
      setLoading(false);
      setError(nextMessage || "Backend terminal connection is not available.");
      if (nextMessage) {
        setMessage(nextMessage);
      }
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>THREE-PANEL SQL DEMO</p>
          <h1 style={styles.title}>Cupid SQL Integration Page</h1>
        </div>
        <div style={styles.heroMeta}>
          <p style={styles.subtitle}>
            The left panel now opens a real shell session in the project directory and launches the
            built SQL engine inside that terminal.
          </p>
          <p style={styles.connection(connectionState)}>
            Terminal: {formatConnectionLabel(connectionState)}
          </p>
        </div>
      </section>

      <section style={styles.grid}>
        <CliPanel
          connectionState={connectionState}
          onConnectionChange={handleConnectionChange}
          onQueryResult={handleQueryResult}
          onQueryStart={handleQueryStart}
        />
        <ParseTreePanel parseTree={parseTree} />
        <DateMatchApp />
      </section>
    </main>
  );
}

function formatConnectionLabel(connectionState) {
  switch (connectionState) {
    case "connected":
      return "Engine Ready";
    case "shell":
      return "Shell Ready";
    case "error":
      return "Engine Missing";
    case "disconnected":
      return "Disconnected";
    case "closed":
      return "Closed";
    default:
      return "Connecting";
  }
}

const styles = {
  page: {
    height: "100vh",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "24px",
    background:
      "radial-gradient(circle at top left, rgba(58, 123, 213, 0.18), transparent 28%), #0a1020",
    color: "#f8fafc",
    fontFamily:
      '"Pretendard Variable", "Pretendard", "Noto Sans KR", system-ui, sans-serif',
    overflow: "hidden",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    alignItems: "flex-start",
    marginBottom: "20px",
    flexShrink: 0,
  },
  heroMeta: {
    maxWidth: "520px",
  },
  eyebrow: {
    margin: 0,
    color: "#38bdf8",
    fontSize: "12px",
    letterSpacing: "0.18em",
    fontWeight: 700,
  },
  title: {
    margin: "8px 0 0",
    fontSize: "46px",
    lineHeight: 1.08,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: 1.6,
    fontSize: "15px",
  },
  connection: (connectionState) => ({
    margin: "12px 0 0",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    borderRadius: "999px",
    background:
      connectionState === "connected"
        ? "rgba(16, 185, 129, 0.16)"
        : connectionState === "shell"
          ? "rgba(56, 189, 248, 0.16)"
        : connectionState === "error"
          ? "rgba(248, 113, 113, 0.16)"
          : "rgba(148, 163, 184, 0.12)",
    color:
      connectionState === "connected"
        ? "#bbf7d0"
        : connectionState === "shell"
          ? "#bae6fd"
        : connectionState === "error"
          ? "#fecaca"
          : "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
  }),
  grid: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "16px",
    alignItems: "stretch",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
};
