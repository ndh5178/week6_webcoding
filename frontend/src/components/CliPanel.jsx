import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_EXAMPLES = [
  {
    label: "INSERT profile",
    query: "INSERT INTO profiles VALUES ('Mina', 'ENFP', 'travel');",
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

const panelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  height: "100%",
  padding: "20px",
  background: "#0f172a",
  color: "#e5eefc",
};

const cardStyle = {
  background: "#111c34",
  border: "1px solid #223250",
  borderRadius: "14px",
  padding: "16px",
};

const buttonStyle = {
  border: "1px solid #31486f",
  background: "#16233f",
  color: "#dbeafe",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
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
  isRunning = false,
  examples = DEFAULT_EXAMPLES,
  initialQuery = "",
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

    if (!trimmed || !isRunnable || isRunning) {
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
    <section style={panelStyle}>
      <header style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span
          style={{
            color: "#8fb3ff",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          INPUT ENTRY
        </span>
        <h2 style={{ margin: 0, fontSize: "24px" }}>CLI Panel</h2>
        <p style={{ margin: 0, color: "#93a7c4", fontSize: "14px", lineHeight: 1.6 }}>
          SQL 입력을 받고 실행 요청만 부모로 전달합니다. 예제는 panel 3의 profile
          도메인에 맞춰 두었고, 실제 실행과 결과 처리는 바깥에서 담당합니다.
        </p>
      </header>

      <div style={cardStyle}>
        <div style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 700 }}>
          Example SQL
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {normalizedExamples.map((example) => (
            <button
              key={`${example.label}-${example.query}`}
              type="button"
              onClick={() => handleExampleClick(example.query)}
              style={buttonStyle}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          ...cardStyle,
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          flex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "14px", fontWeight: 700 }}>SQL 입력</div>
          <div style={{ color: "#7d92b3", fontSize: "12px" }}>Ctrl/Cmd + Enter로 실행</div>
        </div>

        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="예: SELECT * FROM profiles;"
          spellCheck={false}
          style={{
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
          }}
        />

        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}
        >
          <div style={{ color: "#93a7c4", fontSize: "12px" }}>
            공통 계약: <code>docs/contracts.md</code>
            {!isRunnable ? " / 실행 핸들러 연결 대기 중" : ""}
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isRunning || !isRunnable}
            style={{
              ...buttonStyle,
              minWidth: "120px",
              background: !query.trim() || isRunning || !isRunnable ? "#223250" : "#2563eb",
              borderColor: !query.trim() || isRunning || !isRunnable ? "#31486f" : "#3b82f6",
              color: "#ffffff",
              cursor: !query.trim() || isRunning || !isRunnable ? "not-allowed" : "pointer",
            }}
          >
            {isRunning ? "실행 중.." : "실행"}
          </button>
        </div>
      </form>

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700 }}>입력 히스토리</div>

        {history.length === 0 ? (
          <div style={{ color: "#7d92b3", fontSize: "13px", lineHeight: 1.6 }}>
            아직 실행한 SQL이 없습니다. 예제 profile query를 고르거나 직접 작성해보세요.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {history.map((item, index) => (
              <button
                key={`${item}-${index}`}
                type="button"
                onClick={() => setQuery(item)}
                style={{
                  textAlign: "left",
                  border: "1px solid #223250",
                  background: "#0b1629",
                  color: "#dbeafe",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontFamily: "Consolas, 'JetBrains Mono', monospace",
                  fontSize: "12px",
                }}
                title={item}
              >
                {formatHistoryLabel(item, index)}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
