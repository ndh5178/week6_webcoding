import { useMemo, useState } from "react";

import ParseTreePanel from "./components/ParseTreePanel";
import ServicePanel from "./components/ServicePanel";
import Terminal from "./components/Terminal";

const DEFAULT_MESSAGE =
  "왼쪽 실제 터미널에서 SQL을 실행하면 파싱 트리와 서비스 패널이 함께 갱신됩니다.";

export default function App() {
  const [parseTree, setParseTree] = useState(null);
  const [rows, setRows] = useState([]);
  const [queryType, setQueryType] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [terminalStatus, setTerminalStatus] = useState("연결 중...");
  const [error, setError] = useState("");

  const examples = useMemo(
    () => [
      "INSERT INTO comments VALUES (1, 'kim', 'hello');",
      "SELECT * FROM comments;",
      "SELECT author, content FROM comments WHERE author = 'kim';",
      ".exit",
    ],
    [],
  );

  function handleTerminalPayload(payload) {
    if (!payload) {
      return;
    }

    if (payload.kind === "status") {
      setTerminalStatus(payload.message || "연결됨");
      if (payload.message === "연결됨") {
        setError("");
      } else if (payload.error) {
        setError(payload.error);
      }
      return;
    }

    if (payload.kind === "clear") {
      setParseTree(null);
      setRows([]);
      setQueryType("");
      setMessage(DEFAULT_MESSAGE);
      setError("");
      return;
    }

    if (payload.kind === "result") {
      setParseTree(payload.parseTree ?? null);
      setRows(payload.rows ?? []);
      setQueryType(payload.queryType ?? "");
      setMessage(payload.message ?? "Executed.");
      setError(payload.success === false ? payload.message ?? "쿼리 실행에 실패했습니다." : "");
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
          웹 입력창 흉내 대신 실제 엔진 세션에 연결된 터미널을 붙여, 왼쪽 패널에서 실행한 SQL이
          그대로 엔진으로 전달되도록 바꿉니다.
        </p>
      </section>

      <section style={styles.grid}>
        <Terminal
          examples={examples}
          status={terminalStatus}
          onPayload={handleTerminalPayload}
        />
        <ParseTreePanel parseTree={parseTree} />
        <ServicePanel
          rows={rows}
          queryType={queryType}
          message={message}
          loading={terminalStatus === "쿼리 실행 중..."}
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
