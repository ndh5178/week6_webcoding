import { useEffect, useMemo, useState } from "react";

const DEFAULT_EXAMPLES = [
  {
    label: "INSERT 예제",
    query: "INSERT INTO comments VALUES (1, 'kim', 'hello');",
  },
  {
    label: "SELECT 전체",
    query: "SELECT * FROM comments;",
  },
  {
    label: "SELECT WHERE",
    query: "SELECT author, content FROM comments WHERE id = 1;",
  },
];

const styles = {
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "100%",
    padding: "20px",
    background: "#111827",
    color: "#e5eefc",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  eyebrow: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7dd3fc",
  },
  title: {
    margin: "8px 0 0",
    fontSize: "24px",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#93a7c4",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  status: {
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#1e293b",
    color: "#cbd5e1",
    fontSize: "12px",
  },
  card: {
    background: "#0f172a",
    border: "1px solid #223250",
    borderRadius: "14px",
    padding: "16px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
    color: "#f8fafc",
  },
  examplesWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "12px",
  },
  exampleButton: {
    border: "1px solid #31486f",
    background: "#16233f",
    color: "#dbeafe",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  form: {
    ...{
      background: "#0f172a",
      border: "1px solid #223250",
      borderRadius: "14px",
      padding: "16px",
    },
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    flex: 1,
  },
  formTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  helper: {
    color: "#7d92b3",
    fontSize: "12px",
  },
  textarea: {
    width: "100%",
    minHeight: "180px",
    resize: "vertical",
    borderRadius: "12px",
    border: "1px solid #31486f",
    background: "#08111f",
    color: "#e5eefc",
    padding: "14px",
    fontSize: "14px",
    lineHeight: 1.6,
    fontFamily: "Consolas, 'JetBrains Mono', monospace",
    outline: "none",
    boxSizing: "border-box",
    flex: 1,
  },
  formBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  contract: {
    color: "#93a7c4",
    fontSize: "12px",
  },
  runButton: {
    minWidth: "120px",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 700,
    border: "1px solid #3b82f6",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
  },
  disabledButton: {
    background: "#223250",
    borderColor: "#31486f",
    cursor: "not-allowed",
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "12px",
  },
  historyButton: {
    textAlign: "left",
    border: "1px solid #223250",
    background: "#0b1629",
    color: "#dbeafe",
    borderRadius: "10px",
    padding: "10px 12px",
    cursor: "pointer",
    fontFamily: "Consolas, 'JetBrains Mono', monospace",
    fontSize: "12px",
  },
  emptyHistory: {
    marginTop: "12px",
    color: "#7d92b3",
    fontSize: "13px",
    lineHeight: 1.6,
  },
  footer: {
    borderTop: "1px solid #1f2937",
    paddingTop: "12px",
  },
  message: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "13px",
  },
  error: {
    margin: "8px 0 0",
    color: "#fca5a5",
    fontSize: "13px",
  },
};

function formatHistoryLabel(query, index) {
  const singleLine = query.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 64) {
    return `${index + 1}. ${singleLine}`;
  }
  return `${index + 1}. ${singleLine.slice(0, 61)}...`;
}

export default function CliPanel({
  onRun,
  loading = false,
  examples = DEFAULT_EXAMPLES,
  initialQuery = "",
  message = "",
  error = "",
}) {
  const [query, setQuery] = useState(initialQuery);
  const [history, setHistory] = useState([]);
  const isRunnable = typeof onRun === "function";

  const normalizedExamples = useMemo(
    () => (Array.isArray(examples) && examples.length > 0 ? examples : DEFAULT_EXAMPLES),
    [examples],
  );

  useEffect(() => {
    setQuery(initialQuery || "");
  }, [initialQuery]);

  function submitQuery(nextQuery) {
    const trimmed = nextQuery.trim();

    if (!trimmed || !isRunnable || loading) {
      return;
    }

    setHistory((prev) => {
      const withoutDuplicate = prev.filter((item) => item !== trimmed);
      return [trimmed, ...withoutDuplicate].slice(0, 8);
    });

    onRun(trimmed);
  }

  function handleSubmit(event) {
    event.preventDefault();
    submitQuery(query);
  }

  function handleExampleClick(exampleQuery) {
    setQuery(exampleQuery);
  }

  function handleKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      submitQuery(query);
    }
  }

  return (
    <section style={styles.panel}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <p style={styles.eyebrow}>Panel 1</p>
            <h2 style={styles.title}>CLI</h2>
          </div>
          <span style={styles.status}>{loading ? "실행 중" : "준비됨"}</span>
        </div>
        <p style={styles.subtitle}>
          SQL 입력을 받고 실행 요청만 부모로 전달합니다. 실제 실행과 결과 처리는 이 패널 밖에서 이뤄집니다.
        </p>
      </header>

      <div style={styles.card}>
        <p style={styles.cardTitle}>예제 SQL</p>
        <div style={styles.examplesWrap}>
          {normalizedExamples.map((example) => (
            <button
              key={`${example.label}-${example.query}`}
              type="button"
              onClick={() => handleExampleClick(example.query)}
              style={styles.exampleButton}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formTop}>
          <p style={styles.cardTitle}>SQL 입력</p>
          <div style={styles.helper}>Ctrl/Cmd + Enter로 실행</div>
        </div>

        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="예: SELECT * FROM comments;"
          spellCheck={false}
          style={styles.textarea}
        />

        <div style={styles.formBottom}>
          <div style={styles.contract}>
            공통 계약: <code>docs/contracts.md</code>
            {!isRunnable ? " · 실행 핸들러 연결 대기 중" : ""}
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading || !isRunnable}
            style={{
              ...styles.runButton,
              ...(!query.trim() || loading || !isRunnable ? styles.disabledButton : {}),
            }}
          >
            {loading ? "실행 중..." : "실행"}
          </button>
        </div>
      </form>

      <div style={styles.card}>
        <p style={styles.cardTitle}>입력 히스토리</p>
        {history.length === 0 ? (
          <div style={styles.emptyHistory}>아직 실행한 SQL이 없습니다. 예제 SQL을 선택하거나 직접 입력해보세요.</div>
        ) : (
          <div style={styles.historyList}>
            {history.map((item, index) => (
              <button
                key={`${item}-${index}`}
                type="button"
                onClick={() => setQuery(item)}
                style={styles.historyButton}
                title={item}
              >
                {formatHistoryLabel(item, index)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <p style={styles.message}>{message}</p>
        {error ? <p style={styles.error}>{error}</p> : null}
      </div>
    </section>
  );
}
