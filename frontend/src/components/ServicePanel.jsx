import { useState, useEffect } from "react";

/**
 * ServicePanel (C 담당 - panel 3, 오른쪽)
 *
 * 역할: 엔진 실행 결과로 받은 rows 데이터를 서비스 UI로 보여준다.
 * - rows는 contracts.md 기준 comments(id, author, content) 테이블 데이터
 * - mock 상태를 중심에 두지 않고, 엔진 결과를 받아 렌더링하는 구조
 * - INSERT 후 반영되는 SELECT 결과가 바로 보여야 함
 *
 * Props:
 *   rows      - Array<{ id, author, content }> : 엔진 실행 결과 (contracts.md 기준)
 *   queryType - string : 실행된 쿼리 타입 ("SELECT", "INSERT" 등)
 *   message   - string : 엔진 상태 메시지 ("Executed." 등)
 *   loading   - boolean : 쿼리 실행 중 로딩 상태
 *   error     - string|null : 에러 메시지
 */
export default function ServicePanel({
  rows = [],
  queryType = "",
  message = "",
  loading = false,
  error = null,
}) {
  // comments 테이블 고정 컬럼 (contracts.md Domain Rule)
  const columns = ["id", "author", "content"];

  // ─── 정렬 상태 ─────────────────────────────────────────
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  // rows 변경 시 정렬 초기화
  useEffect(() => {
    setSortCol(null);
    setSortDir("asc");
  }, [rows]);

  const sortedRows = (() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  })();

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  // ─── 로딩 상태 ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.panel}>
        <h2 style={styles.header}>Service</h2>
        <div style={styles.center}>쿼리 실행 중...</div>
      </div>
    );
  }

  // ─── 에러 상태 ─────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.panel}>
        <h2 style={styles.header}>Service</h2>
        <div style={styles.errorBox}>Error: {error}</div>
      </div>
    );
  }

  // ─── 초기 상태 (결과 없음) ─────────────────────────────
  if (!rows.length && !message) {
    return (
      <div style={styles.panel}>
        <h2 style={styles.header}>Service</h2>
        <div style={styles.center}>
          쿼리를 실행하면 comments 데이터가 여기에 표시됩니다.
        </div>
      </div>
    );
  }

  // ─── 결과 렌더링 ───────────────────────────────────────
  return (
    <div style={styles.panel}>
      <h2 style={styles.header}>Service</h2>

      {/* 상태 메시지 */}
      {message && (
        <div style={styles.messageBar}>
          {queryType && <span style={styles.badge}>{queryType}</span>}
          <span>{message}</span>
        </div>
      )}

      {/* comments 테이블 */}
      {rows.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={styles.th}
                    onClick={() => handleSort(col)}
                  >
                    {col}
                    {sortCol === col && (sortDir === "asc" ? " ▲" : " ▼")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}
                >
                  <td style={styles.td}>{row.id}</td>
                  <td style={styles.td}>{row.author}</td>
                  <td style={styles.td}>{row.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 하단 행 수 */}
      <div style={styles.footer}>
        {rows.length > 0 ? `${rows.length}개 행` : "결과 없음"}
      </div>
    </div>
  );
}

// ─── 스타일 ──────────────────────────────────────────────
const styles = {
  panel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    borderLeft: "1px solid #333",
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
    fontFamily: "'Consolas', 'Courier New', monospace",
    fontSize: 13,
  },
  header: {
    margin: 0,
    padding: "10px 14px",
    fontSize: 14,
    borderBottom: "1px solid #333",
    backgroundColor: "#252526",
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    color: "#888",
    padding: 20,
  },
  errorBox: {
    margin: 12,
    padding: 12,
    backgroundColor: "#2d1515",
    color: "#f44747",
    borderRadius: 4,
  },
  messageBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    backgroundColor: "#2d2d2d",
    borderBottom: "1px solid #333",
    fontSize: 12,
  },
  badge: {
    padding: "2px 8px",
    borderRadius: 3,
    backgroundColor: "#0e639c",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 11,
  },
  tableWrap: {
    flex: 1,
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "6px 12px",
    textAlign: "left",
    borderBottom: "2px solid #444",
    backgroundColor: "#252526",
    cursor: "pointer",
    userSelect: "none",
    position: "sticky",
    top: 0,
  },
  rowEven: { backgroundColor: "#1e1e1e" },
  rowOdd: { backgroundColor: "#252526" },
  td: {
    padding: "4px 12px",
    borderBottom: "1px solid #2a2a2a",
  },
  footer: {
    padding: "6px 14px",
    borderTop: "1px solid #333",
    backgroundColor: "#252526",
    fontSize: 12,
    color: "#888",
    textAlign: "right",
  },
};
