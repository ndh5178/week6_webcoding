function buildInitials(name) {
  if (!name) {
    return "??";
  }

  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "??";
}

function buildHelperText(queryType, rows) {
  if (queryType === "INSERT") {
    return "새 댓글이 엔진에 저장되었습니다. 댓글 목록을 보려면 SELECT를 실행하세요.";
  }

  if (queryType === "SELECT") {
    return rows.length > 0
      ? "토론 목록이 SQL 엔진 결과와 동기화되었습니다."
      : "조회는 성공했지만 아직 댓글이 없습니다.";
  }

  return "왼쪽 SQL 입력과 연결된 댓글 토론 서비스 화면입니다.";
}

export default function ServicePanel({
  rows = [],
  queryType = "",
  message = "",
  loading = false,
  error = "",
}) {
  const latestComment = rows.length > 0 ? rows[rows.length - 1] : null;
  const helperText = buildHelperText(queryType, rows);

  return (
    <section style={styles.panel}>
      <header style={styles.hero}>
        <div>
          <p style={styles.panelLabel}>Panel 3</p>
          <h2 style={styles.serviceName}>수제</h2>
          <p style={styles.serviceDescription}>
            사용자는 댓글을 쓰고 읽는 서비스처럼 보이지만, 실제 데이터는 SQL 엔진 결과와 연결됩니다.
          </p>
        </div>

        <div style={styles.heroStats}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>댓글 수</span>
            <strong style={styles.statValue}>{rows.length}</strong>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>최근 작성자</span>
            <strong style={styles.statValue}>{latestComment ? latestComment.author : "-"}</strong>
          </div>
        </div>
      </header>

      <div style={styles.statusBar}>
        {queryType ? <span style={styles.badge}>{queryType}</span> : null}
        <div style={styles.statusText}>
          <p style={styles.statusMain}>{message || "준비됨"}</p>
          <p style={styles.statusSub}>{helperText}</p>
        </div>
      </div>

      {error ? (
        <div style={styles.errorCard}>
          <strong style={styles.errorTitle}>서비스 동기화 실패</strong>
          <p style={styles.errorText}>{error}</p>
        </div>
      ) : null}

      <div style={styles.content}>
        <section style={styles.composerSection}>
          <div style={styles.sectionHeader}>
            <div>
              <p style={styles.sectionEyebrow}>입력창</p>
              <h3 style={styles.sectionTitle}>댓글 작성</h3>
            </div>
            <span style={styles.sectionMeta}>서비스 UI</span>
          </div>

          <div style={styles.composerCard}>
            <div style={styles.fakeInputTop}>
              <div style={styles.userChip}>
                <div style={styles.userAvatar}>나</div>
                <span style={styles.userName}>현재 사용자</span>
              </div>
              <span style={styles.fakeHint}>실제 저장은 왼쪽 SQL 실행으로 반영됩니다.</span>
            </div>

            <div style={styles.fakeTextarea}>
              오늘 토론에 참여해보고 싶은 생각이나 의견을 남겨보세요.
            </div>

            <div style={styles.composerFooter}>
              <span style={styles.footerHint}>이 영역은 서비스 화면 표현용이며, 실제 저장 경로는 SQL 엔진입니다.</span>
              <button type="button" style={styles.sendButton} disabled>
                댓글 등록
              </button>
            </div>
          </div>
        </section>

        <section style={styles.threadSection}>
          <div style={styles.sectionHeader}>
            <div>
              <p style={styles.sectionEyebrow}>댓글창</p>
              <h3 style={styles.sectionTitle}>토론 목록</h3>
            </div>
            <span style={styles.sectionMeta}>{loading ? "불러오는 중..." : `${rows.length}개 로드됨`}</span>
          </div>

          <div style={styles.threadCard}>
            {rows.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>#</div>
                <h4 style={styles.emptyTitle}>아직 댓글이 없습니다</h4>
                <p style={styles.emptyBody}>
                  먼저 왼쪽에서 댓글을 저장하는 INSERT를 실행한 뒤, SELECT로 목록을 불러오면 이 영역이 채워집니다.
                </p>
              </div>
            ) : (
              <div style={styles.commentList}>
                {rows.map((row, index) => (
                  <article key={`${row.id ?? index}-${row.author ?? ""}`} style={styles.commentCard}>
                    <div style={styles.commentAvatar}>{buildInitials(row.author)}</div>
                    <div style={styles.commentMain}>
                      <div style={styles.commentHeader}>
                        <div>
                          <p style={styles.commentAuthor}>{row.author || "알 수 없는 사용자"}</p>
                          <p style={styles.commentMeta}>댓글 #{row.id ?? index + 1}</p>
                        </div>
                        {index === rows.length - 1 ? <span style={styles.latestBadge}>최신</span> : null}
                      </div>
                      <p style={styles.commentText}>{row.content || "(비어 있는 댓글)"}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

const styles = {
  panel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#111827",
    color: "#f3f4f6",
    fontFamily: "system-ui, sans-serif",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    padding: "20px",
    borderBottom: "1px solid #1f2937",
    background: "linear-gradient(180deg, rgba(17,24,39,1) 0%, rgba(15,23,42,1) 100%)",
  },
  panelLabel: {
    margin: 0,
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#fda4af",
  },
  serviceName: {
    margin: "6px 0 0",
    fontSize: "32px",
    lineHeight: 1,
    color: "#f8fafc",
  },
  serviceDescription: {
    margin: "10px 0 0",
    maxWidth: "420px",
    color: "#cbd5e1",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  heroStats: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
  },
  statBox: {
    minWidth: "92px",
    padding: "12px 14px",
    borderRadius: "16px",
    backgroundColor: "#0f172a",
    border: "1px solid #23314b",
    boxShadow: "0 10px 24px rgba(2, 6, 23, 0.18)",
  },
  statLabel: {
    display: "block",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#94a3b8",
  },
  statValue: {
    display: "block",
    marginTop: "8px",
    fontSize: "18px",
    color: "#f8fafc",
  },
  statusBar: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    padding: "14px 20px",
    backgroundColor: "#0f172a",
    borderBottom: "1px solid #1f2937",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: "999px",
    backgroundColor: "#0ea5e9",
    color: "#eff6ff",
    fontSize: "11px",
    fontWeight: 700,
  },
  statusText: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statusMain: {
    margin: 0,
    color: "#f8fafc",
    fontWeight: 700,
    fontSize: "13px",
  },
  statusSub: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: 1.5,
  },
  errorCard: {
    margin: "16px 20px 0",
    padding: "14px 16px",
    borderRadius: "16px",
    backgroundColor: "#2d1515",
    border: "1px solid #7f1d1d",
  },
  errorTitle: {
    display: "block",
    color: "#fecaca",
    marginBottom: "8px",
  },
  errorText: {
    margin: 0,
    color: "#fecaca",
    lineHeight: 1.6,
    fontSize: "14px",
  },
  content: {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    gap: "16px",
    padding: "20px",
    flex: 1,
    minHeight: 0,
  },
  composerSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  threadSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minHeight: 0,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
  },
  sectionEyebrow: {
    margin: 0,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#94a3b8",
  },
  sectionTitle: {
    margin: "4px 0 0",
    fontSize: "18px",
    color: "#f8fafc",
  },
  sectionMeta: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  composerCard: {
    padding: "16px",
    borderRadius: "20px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    boxShadow: "0 16px 30px rgba(2, 6, 23, 0.18)",
  },
  fakeInputTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  userChip: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  userAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    backgroundColor: "#f97316",
    color: "#fff7ed",
    fontSize: "11px",
    fontWeight: 700,
  },
  userName: {
    fontSize: "13px",
    color: "#e2e8f0",
    fontWeight: 600,
  },
  fakeHint: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  fakeTextarea: {
    minHeight: "72px",
    borderRadius: "14px",
    border: "1px solid #334155",
    backgroundColor: "#020617",
    padding: "14px",
    color: "#cbd5e1",
    fontSize: "14px",
    lineHeight: 1.7,
  },
  composerFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: "12px",
  },
  footerHint: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  sendButton: {
    border: "none",
    borderRadius: "999px",
    padding: "10px 14px",
    backgroundColor: "#38bdf8",
    color: "#082f49",
    fontWeight: 700,
    cursor: "not-allowed",
    opacity: 0.8,
  },
  threadCard: {
    minHeight: 0,
    flex: 1,
    borderRadius: "20px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    boxShadow: "0 16px 30px rgba(2, 6, 23, 0.18)",
    overflow: "hidden",
  },
  commentList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    maxHeight: "100%",
    overflow: "auto",
  },
  commentCard: {
    display: "flex",
    gap: "12px",
    padding: "14px",
    borderRadius: "16px",
    backgroundColor: "#111827",
    border: "1px solid #22314b",
  },
  commentAvatar: {
    width: "40px",
    height: "40px",
    flexShrink: 0,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    backgroundColor: "#1d4ed8",
    color: "#eff6ff",
    fontWeight: 700,
    fontSize: "12px",
  },
  commentMain: {
    minWidth: 0,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  commentHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "flex-start",
  },
  commentAuthor: {
    margin: 0,
    fontWeight: 700,
    fontSize: "14px",
    color: "#f8fafc",
  },
  commentMeta: {
    margin: "4px 0 0",
    color: "#94a3b8",
    fontSize: "12px",
  },
  latestBadge: {
    padding: "4px 8px",
    borderRadius: "999px",
    backgroundColor: "#172554",
    color: "#bfdbfe",
    fontSize: "11px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  commentText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.7,
    color: "#dbe4f3",
    wordBreak: "break-word",
  },
  emptyState: {
    minHeight: "260px",
    display: "grid",
    placeItems: "center",
    gap: "10px",
    padding: "28px",
    textAlign: "center",
  },
  emptyIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    backgroundColor: "#172554",
    color: "#bfdbfe",
    fontWeight: 700,
    fontSize: "24px",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#f8fafc",
  },
  emptyBody: {
    margin: 0,
    maxWidth: "360px",
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: 1.7,
  },
};
