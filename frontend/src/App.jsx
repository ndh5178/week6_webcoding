import { useEffect, useState } from "react";

import CliPanel from "./components/CliPanel";
import ParseTreePanel from "./components/ParseTreePanel";
import ServicePanel from "./components/ServicePanel";

const DEFAULT_QUERY = "SELECT * FROM comments;";
const DEFAULT_MESSAGE =
  "왼쪽 CLI에서 SQL을 실행하면 파싱 트리와 서비스 패널이 함께 갱신됩니다.";
const DISCUSSION_TOPIC = "구현이 먼저인가, 학습이 먼저인가";
const DEFAULT_AUTHOR = "guest";

async function requestQuery(query) {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const payload = await response.json();
  return { response, payload };
}

function escapeSqlValue(value) {
  return String(value ?? "").replace(/'/g, "''");
}

export default function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [parseTree, setParseTree] = useState(null);
  const [rows, setRows] = useState([]);
  const [queryType, setQueryType] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function applyPayload(payload, fallbackMessage) {
    setParseTree(payload.parseTree ?? null);
    setRows(payload.rows ?? []);
    setQueryType(payload.queryType ?? "");
    setMessage(payload.message ?? fallbackMessage);
  }

  async function runQuery(nextQuery, fallbackMessage = "Executed.") {
    const trimmedQuery = String(nextQuery ?? "").trim();

    setQuery(trimmedQuery);

    if (!trimmedQuery) {
      setError("실행할 SQL을 입력해주세요.");
      setMessage("빈 쿼리는 실행할 수 없습니다.");
      setParseTree(null);
      setRows([]);
      setQueryType("");
      return { success: false };
    }

    setLoading(true);
    setError("");

    try {
      const { response, payload } = await requestQuery(trimmedQuery);

      if (!response.ok || payload.success === false) {
        applyPayload(payload, "쿼리 실행에 실패했습니다.");
        setError(payload.message ?? "쿼리 실행에 실패했습니다.");
        return { success: false, payload };
      }

      applyPayload(payload, fallbackMessage);
      return { success: true, payload };
    } catch (fetchError) {
      setParseTree(null);
      setRows([]);
      setQueryType("");
      setMessage("백엔드 연결에 실패했습니다.");
      setError(fetchError.message || "백엔드 연결에 실패했습니다.");
      return { success: false };
    } finally {
      setLoading(false);
    }
  }

  async function handleRun(nextQuery) {
    await runQuery(nextQuery);
  }

  async function handleSubmitComment(commentText) {
    const trimmedComment = String(commentText ?? "").trim();

    if (!trimmedComment) {
      setError("댓글 내용을 입력해주세요.");
      return false;
    }

    const numericIds = rows
      .map((row) => Number(row.id))
      .filter((value) => Number.isFinite(value));
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    const insertQuery =
      `INSERT INTO comments VALUES (${nextId}, '${escapeSqlValue(DEFAULT_AUTHOR)}', '${escapeSqlValue(trimmedComment)}');`;

    const insertResult = await runQuery(insertQuery, "댓글이 등록되었습니다.");
    if (!insertResult.success) {
      return false;
    }

    const selectResult = await runQuery(DEFAULT_QUERY, "댓글 목록을 다시 불러왔습니다.");
    return selectResult.success;
  }

  useEffect(() => {
    void runQuery(DEFAULT_QUERY, "토론 댓글을 불러왔습니다.");
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>THREE-PANEL SQL DEMO</p>
          <h1 style={styles.title}>Cupid SQL Integration Page</h1>
        </div>
        <p style={styles.subtitle}>
          1번 패널 입력, 2번 패널 파싱 트리, 3번 패널 서비스 UI가 모두 같은 SQL
          엔진 결과를 사용합니다.
        </p>
      </section>

      <section style={styles.grid}>
        <CliPanel initialQuery={query} isRunning={loading} onRun={handleRun} />
        <ParseTreePanel parseTree={parseTree} />
        <ServicePanel
          topic={DISCUSSION_TOPIC}
          authorLabel={DEFAULT_AUTHOR}
          rows={rows}
          queryType={queryType}
          message={message}
          loading={loading}
          error={error}
          onSubmitComment={handleSubmitComment}
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
