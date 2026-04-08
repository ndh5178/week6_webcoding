function buildInitials(name) {
  if (!name) {
    return "??";
  }

  return String(name)
    .trim()
    .slice(0, 2)
    .toUpperCase();
}

function normalizeComments(rows) {
  return rows.map((row, index) => ({
    id: row.id ?? String(index + 1),
    author: row.author ?? "익명",
    content: row.content ?? "",
  }));
}

function buildHelperText(queryType, rows) {
  if (queryType === "INSERT") {
    return "댓글이 SQL 엔진을 통해 저장되었습니다. 댓글 목록을 보려면 SELECT 쿼리를 실행하세요.";
  }

  if (queryType === "SELECT") {
    return rows.length > 0
      ? "조회한 댓글 목록이 서비스 패널에 동기화되었습니다."
      : "조회는 성공했지만 아직 댓글이 없습니다.";
  }

  return "오른쪽 패널은 실제 서비스 화면처럼 보이지만, 데이터는 왼쪽 SQL 엔진 결과를 사용합니다.";
}

export default function ServicePanel({
  rows = [],
  queryType = "",
  message = "",
  loading = false,
  error = "",
}) {
  const comments = normalizeComments(rows);
  const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;
  const helperText = buildHelperText(queryType, comments);

  return (
    <section style={styles.panel}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>PANEL 3</p>
          <h2 style={styles.title}>Service</h2>
        </div>
        <span style={styles.count}>{comments.length} rows</span>
      </header>

      <div style={styles.serviceShell}>
        <div style={styles.serviceTopBar}>
          <div>
            <p style={styles.serviceLabel}>서비스 미리보기</p>
            <h3 style={styles.serviceTitle}>수제</h3>
          </div>
          <button type="button" style={styles.menuButton}>⋯</button>
        </div>

        <div style={styles.composerCard}>
          <p style={styles.sectionLabel}>댓글 입력</p>
          <div style={styles.composerBox}>
            <textarea
              style={styles.composerTextarea}
              value=""
              readOnly
              placeholder="사용자는 여기서 그냥 댓글만 입력합니다. 실제 저장은 왼쪽 SQL 엔진 결과와 연결됩니다."
            />
            <div style={styles.composerFooter}>
              <span style={styles.helper}>{helperText}</span>
              <button type="button" style={styles.submitButton} disabled>
                댓글 등록
              </button>
            </div>
          </div>
        </div>

        <div style={styles.threadCard}>
          <div style={styles.threadHeader}>
            <div>
              <p style={styles.sectionLabel}>댓글 목록</p>
              <p style={styles.threadHint}>실제 표시 데이터는 SELECT 결과에서 옵니다.</p>
            </div>
            <span style={styles.threadMeta}>
              {loading ? "불러오는 중" : latestComment ? `최신 댓글 #${latestComment.id}` : "댓글 없음"}
            </span>
          </div>

          {error ? (
            <div style={styles.errorBox}>{error}</div>
          ) : comments.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>아직 표시할 댓글이 없습니다.</p>
              <p style={styles.emptyDescription}>
                `INSERT`로 댓글을 저장한 뒤 `SELECT`를 실행하면 이 영역이 실제 서비스처럼 채워집니다.
              </p>
            </div>
          ) : (
            <div style={styles.commentList}>
              {comments.map((comment, index) => (
                <article
                  key={`${comment.id}-${comment.author}-${index}`}
                  style={styles.commentCard(index === comments.length - 1)}
                >
                  <div style={styles.avatar}>{buildInitials(comment.author)}</div>
                  <div style={styles.commentBody}>
                    <div style={styles.commentMeta}>
                      <strong style={styles.author}>{comment.author}</strong>
                      <span style={styles.commentId}>댓글 #{comment.id}</span>
                    </div>
                    <p style={styles.content}>{comment.content || "(비어 있는 댓글)"}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer style={styles.footer}>
        <span style={styles.footerChip(queryType)}>{queryType || "대기 중"}</span>
        <span style={styles.footerText}>{message || "결과 없음"}</span>
      </footer>
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
    color: "#fda4af",
  },
  title: {
    margin: "8px 0 0",
    fontSize: "34px",
    fontWeight: 800,
  },
  count: {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
  },
  serviceShell: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "18px",
    borderRadius: "22px",
    background: "linear-gradient(180deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))",
    border: "1px solid rgba(248, 113, 113, 0.16)",
  },
  serviceTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  serviceLabel: {
    margin: 0,
    color: "#fda4af",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
  },
  serviceTitle: {
    margin: "8px 0 0",
    fontSize: "28px",
    fontWeight: 800,
  },
  menuButton: {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(15, 23, 42, 0.72)",
    color: "#f8fafc",
    fontSize: "24px",
    cursor: "default",
  },
  composerCard: {
    borderRadius: "18px",
    padding: "16px",
    background: "rgba(15, 23, 42, 0.66)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
  },
  sectionLabel: {
    margin: 0,
    color: "#cbd5e1",
    fontWeight: 700,
    fontSize: "14px",
  },
  composerBox: {
    marginTop: "12px",
    borderRadius: "16px",
    border: "1px solid rgba(96, 165, 250, 0.16)",
    background: "rgba(2, 6, 23, 0.7)",
    padding: "14px",
  },
  composerTextarea: {
    width: "100%",
    minHeight: "84px",
    resize: "none",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#94a3b8",
    lineHeight: 1.6,
    fontFamily:
      '"Pretendard Variable", "Pretendard", "Noto Sans KR", system-ui, sans-serif',
    fontSize: "14px",
  },
  composerFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    marginTop: "12px",
  },
  helper: {
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: 1.5,
  },
  submitButton: {
    border: "none",
    borderRadius: "12px",
    padding: "10px 14px",
    background: "rgba(56, 189, 248, 0.32)",
    color: "#bae6fd",
    fontWeight: 700,
    cursor: "not-allowed",
  },
  threadCard: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    borderRadius: "18px",
    padding: "16px",
    background: "rgba(15, 23, 42, 0.66)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    minHeight: "320px",
  },
  threadHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
  },
  threadHint: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },
  threadMeta: {
    color: "#fda4af",
    fontSize: "12px",
    fontWeight: 700,
  },
  errorBox: {
    marginTop: "14px",
    padding: "14px",
    borderRadius: "14px",
    background: "rgba(127, 29, 29, 0.45)",
    border: "1px solid rgba(248, 113, 113, 0.28)",
    color: "#fecaca",
  },
  emptyState: {
    flex: 1,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: "#94a3b8",
    padding: "28px",
  },
  emptyTitle: {
    margin: 0,
    fontWeight: 700,
    color: "#e2e8f0",
  },
  emptyDescription: {
    margin: "10px 0 0",
    lineHeight: 1.7,
    maxWidth: "380px",
  },
  commentList: {
    marginTop: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    overflow: "auto",
    paddingRight: "4px",
  },
  commentCard: (isLatest) => ({
    display: "flex",
    gap: "12px",
    padding: "14px",
    borderRadius: "16px",
    border: `1px solid ${isLatest ? "rgba(56, 189, 248, 0.28)" : "rgba(148, 163, 184, 0.14)"}`,
    background: isLatest ? "rgba(8, 47, 73, 0.38)" : "rgba(2, 6, 23, 0.56)",
  }),
  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #38bdf8, #fb7185)",
    color: "#0f172a",
    fontWeight: 800,
    fontSize: "13px",
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  author: {
    color: "#f8fafc",
    fontSize: "14px",
  },
  commentId: {
    color: "#94a3b8",
    fontSize: "12px",
  },
  content: {
    margin: "8px 0 0",
    color: "#e2e8f0",
    lineHeight: 1.65,
    fontSize: "14px",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    color: "#94a3b8",
    fontSize: "12px",
  },
  footerChip: (queryType) => ({
    padding: "6px 10px",
    borderRadius: "999px",
    background: queryType ? "rgba(14, 165, 233, 0.18)" : "rgba(51, 65, 85, 0.8)",
    color: queryType ? "#bae6fd" : "#cbd5e1",
    fontWeight: 700,
  }),
  footerText: {
    textAlign: "right",
  },
};
