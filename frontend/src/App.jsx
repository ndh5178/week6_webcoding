import { useState } from "react";

import CliPanel from "./components/CliPanel";
import ParseTreePanel from "./components/ParseTreePanel";
import ServicePanel from "./components/ServicePanel";

const DEFAULT_QUERY = "SELECT * FROM comments;";
const DEFAULT_MESSAGE =
  "왼쪽 CLI에서 SQL을 실행하면 파싱 트리와 서비스 패널이 함께 갱신됩니다.";

export default function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [parseTree, setParseTree] = useState(null);
  const [rows, setRows] = useState([]);
  const [queryType, setQueryType] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRun(nextQuery) {
    const trimmedQuery = String(nextQuery ?? "").trim();

    setQuery(trimmedQuery);

    if (!trimmedQuery) {
      setError("실행할 SQL을 입력해주세요.");
      setMessage("빈 쿼리는 실행할 수 없습니다.");
      setParseTree(null);
      setRows([]);
      setQueryType("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: trimmedQuery }),
      });

      const payload = await response.json();

      if (!response.ok || payload.success === false) {
        setParseTree(payload.parseTree ?? null);
        setRows(payload.rows ?? []);
        setQueryType(payload.queryType ?? "");
        setMessage(payload.message ?? "쿼리 실행에 실패했습니다.");
        setError(payload.message ?? "쿼리 실행에 실패했습니다.");
        return;
      }

      setParseTree(payload.parseTree ?? null);
      setRows(payload.rows ?? []);
      setQueryType(payload.queryType ?? "");
      setMessage(payload.message ?? "Executed.");
    } catch (fetchError) {
      setParseTree(null);
      setRows([]);
      setQueryType("");
      setMessage("백엔드 연결에 실패했습니다.");
      setError(fetchError.message || "백엔드 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>THREE-PANEL SQL DEMO</p>
          <h1 style={styles.title}>Cupid SQL Integration Page</h1>
        </div>
        <p style={styles.subtitle}>
          `semin` 브랜치의 CLI 입력 화면과 `gyugo` 브랜치의 Parse Tree
          시각화를 현재 통합 페이지에 연결했습니다.
        </p>
      </section>

      <section style={styles.grid}>
        <CliPanel initialQuery={query} isRunning={loading} onRun={handleRun} />
        <ParseTreePanel parseTree={parseTree} />
        <ServicePanel
          rows={rows}
          queryType={queryType}
          message={message}
          loading={loading}
          error={error}
        />
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    background:
      "radial-gradient(circle at top left, rgba(58, 123, 213, 0.18), transparent 28%), #0a1020",
    color: "#f8fafc",
    fontFamily:
      '"Pretendard Variable", "Pretendard", "Noto Sans KR", system-ui, sans-serif',
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    alignItems: "flex-start",
    marginBottom: "20px",
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
    maxWidth: "520px",
    color: "#cbd5e1",
    lineHeight: 1.6,
    fontSize: "15px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "16px",
    alignItems: "stretch",
  },
};
