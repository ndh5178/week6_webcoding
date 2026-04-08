import { useEffect, useMemo, useState } from "react";

const EXAMPLES = [
  "INSERT INTO comments VALUES (1, 'kim', 'hello');",
  "SELECT * FROM comments;",
  "SELECT author, content FROM comments WHERE id = 1;",
];

export default function CliPanel({
  initialQuery = "",
  loading = false,
  message = "",
  error = "",
  onRun,
}) {
  const [query, setQuery] = useState(initialQuery || EXAMPLES[0]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (typeof initialQuery === "string") {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const statusLabel = useMemo(() => {
    if (loading) return "실행 중";
    if (error) return "오류";
    return "준비";
  }, [loading, error]);

  function handleExampleClick(example) {
    setQuery(example);
  }

  function handleSubmit() {
    const trimmed = query.trim();
    if (!trimmed || typeof onRun !== "function") {
      return;
    }

    setHistory((prev) => [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 5));
    onRun(trimmed);
  }

  return (
    <section style={styles.panel}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>PANEL 1</p>
          <h2 style={styles.title}>CLI</h2>
        </div>
        <span style={styles.badge(statusLabel, error)}>{statusLabel}</span>
      </header>

      <div style={styles.examples}>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            style={styles.exampleButton}
            onClick={() => handleExampleClick(example)}
          >
            {example}
          </button>
        ))}
      </div>

      <div style={styles.console}>
        <div style={styles.consoleToolbar}>
          <span style={styles.consoleDot("#22c55e")} />
          <span style={styles.consoleDot("#f59e0b")} />
          <span style={styles.consoleDot("#ef4444")} />
          <span style={styles.consoleLabel}>sql-console</span>
        </div>
        <div style={styles.editor}>
          <span style={styles.prompt}>db &gt;</span>
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            spellCheck={false}
            style={styles.textarea}
            placeholder="SQL을 입력하세요."
          />
        </div>
      </div>

      <div style={styles.footer}>
        <div style={styles.feedback}>
          <p style={styles.feedbackLabel}>실행 상태</p>
          <p style={styles.feedbackText(error)}>{error || message || "아직 실행하지 않았습니다."}</p>
        </div>
        <button type="button" style={styles.runButton(loading)} onClick={handleSubmit} disabled={loading}>
          {loading ? "실행 중..." : "Run Query"}
        </button>
      </div>

      <div style={styles.historySection}>
        <p style={styles.historyTitle}>최근 실행</p>
        {history.length === 0 ? (
          <p style={styles.emptyText}>아직 실행한 쿼리가 없습니다.</p>
        ) : (
          <ul style={styles.historyList}>
            {history.map((item) => (
              <li key={item} style={styles.historyItem}>
                <button type="button" style={styles.historyButton} onClick={() => setQuery(item)}>
                  {item}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const styles = {
  panel: {
    minHeight: "720px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "20px",
    borderRadius: "24px",
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.25)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    margin: 0,
    fontSize: "11px",
    letterSpacing: "0.16em",
    fontWeight: 700,
    color: "#38bdf8",
  },
  title: {
    margin: "8px 0 0",
    fontSize: "34px",
    fontWeight: 800,
  },
  badge: (label, hasError) => ({
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    color: hasError ? "#fecaca" : "#dbeafe",
    background: hasError ? "rgba(127, 29, 29, 0.45)" : "rgba(30, 41, 59, 0.95)",
    border: `1px solid ${hasError ? "rgba(248, 113, 113, 0.35)" : "rgba(96, 165, 250, 0.2)"}`,
  }),
  examples: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  exampleButton: {
    width: "100%",
    textAlign: "left",
    padding: "10px 14px",
    borderRadius: "14px",
    border: "1px solid rgba(96, 165, 250, 0.18)",
    background: "rgba(15, 23, 42, 0.7)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: "12px",
  },
  console: {
    flex: 1,
    minHeight: "320px",
    borderRadius: "18px",
    overflow: "hidden",
    background: "#020617",
    border: "1px solid rgba(59, 130, 246, 0.18)",
  },
  consoleToolbar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    background: "rgba(15, 23, 42, 0.95)",
    borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
  },
  consoleDot: (color) => ({
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: color,
  }),
  consoleLabel: {
    marginLeft: "6px",
    color: "#94a3b8",
    fontSize: "12px",
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
  editor: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "10px",
    height: "100%",
    padding: "16px",
  },
  prompt: {
    paddingTop: "2px",
    color: "#38bdf8",
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: "13px",
    fontWeight: 700,
  },
  textarea: {
    width: "100%",
    minHeight: "300px",
    resize: "none",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#e2e8f0",
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: "14px",
    lineHeight: 1.7,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "16px",
  },
  feedback: {
    flex: 1,
  },
  feedbackLabel: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: 700,
  },
  feedbackText: (hasError) => ({
    margin: "6px 0 0",
    color: hasError ? "#fca5a5" : "#e2e8f0",
    lineHeight: 1.6,
    fontSize: "14px",
  }),
  runButton: (loading) => ({
    padding: "14px 20px",
    borderRadius: "14px",
    border: "none",
    cursor: loading ? "progress" : "pointer",
    fontWeight: 700,
    color: "#082f49",
    background: loading ? "#7dd3fc" : "#38bdf8",
    minWidth: "132px",
    boxShadow: "0 10px 20px rgba(14, 165, 233, 0.22)",
  }),
  historySection: {
    borderTop: "1px solid rgba(148, 163, 184, 0.12)",
    paddingTop: "14px",
  },
  historyTitle: {
    margin: 0,
    color: "#cbd5e1",
    fontWeight: 700,
    fontSize: "14px",
  },
  historyList: {
    margin: "10px 0 0",
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  historyItem: {
    margin: 0,
  },
  historyButton: {
    width: "100%",
    textAlign: "left",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "12px",
    padding: "10px 12px",
    background: "rgba(15, 23, 42, 0.6)",
    color: "#94a3b8",
    cursor: "pointer",
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: "12px",
  },
  emptyText: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },
};
