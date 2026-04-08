import { useState } from "react";
import CliPanel from "./components/CliPanel";
import ParseTreePanel from "./components/ParseTreePanel";
import ServicePanel from "./components/ServicePanel";

const DEFAULT_MESSAGE = "Enter a SQL query to run the C engine.";

export default function App() {
  const [query, setQuery] = useState("");
  const [parseTree, setParseTree] = useState(null);
  const [rows, setRows] = useState([]);
  const [queryType, setQueryType] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRun(nextQuery) {
    const trimmedQuery = nextQuery.trim();

    if (!trimmedQuery) {
      setError("Query is empty.");
      return;
    }

    setQuery(trimmedQuery);
    setLoading(true);
    setError("");
    setQueryType("");

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: trimmedQuery })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Query execution failed.");
        setMessage(result.message || "Query execution failed.");
        setParseTree(result.parseTree || null);
        setRows(result.rows || []);
        setQueryType(result.queryType || "");
        return;
      }

      setParseTree(result.parseTree || null);
      setRows(result.rows || []);
      setMessage(result.message || "Executed.");
      setQueryType(result.queryType || "");
    } catch (fetchError) {
      setError("Backend connection failed.");
      setMessage("Backend connection failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Three-Panel SQL Demo</p>
          <h1 style={styles.title}>Cupid SQL Integration Page</h1>
        </div>
        <p style={styles.subtitle}>
          CLI input, parse tree visualization, and service output stay connected through one shared flow.
        </p>
      </header>

      <section style={styles.grid}>
        <div style={styles.panel}>
          <CliPanel
            initialQuery={query}
            loading={loading}
            onRun={handleRun}
            message={message}
            error={error}
          />
        </div>

        <div style={styles.panel}>
          <ParseTreePanel tree={parseTree} />
        </div>

        <div style={styles.panel}>
          <ServicePanel
            rows={rows}
            queryType={queryType}
            message={message}
            loading={loading}
            error={error}
          />
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    background: "#0b1020",
    color: "#f3f4f6",
    fontFamily: "system-ui, sans-serif"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    alignItems: "flex-end",
    marginBottom: "24px",
    flexWrap: "wrap"
  },
  eyebrow: {
    margin: 0,
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#7dd3fc"
  },
  title: {
    margin: "6px 0 0",
    fontSize: "32px",
    lineHeight: 1.1
  },
  subtitle: {
    maxWidth: "680px",
    margin: 0,
    color: "#cbd5e1"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "16px"
  },
  panel: {
    minHeight: "560px",
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)"
  }
};
