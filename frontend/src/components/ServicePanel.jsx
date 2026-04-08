import { useState, useEffect } from "react";

/**
 * ServicePanel (C 담당 - panel 3, 오른쪽)
 *
 * 역할: 엔진 실행 결과로 받은 rows 데이터를 Cupid 매칭 카드 UI로 보여준다.
 * - rows는 contracts.md 기준 comments(id, author, content) 테이블 데이터
 * - 엔진 결과를 받아 렌더링하는 구조 (mock 상태 중심 X)
 * - INSERT 후 반영되는 SELECT 결과가 바로 보여야 함
 *
 * Props:
 *   rows      - Array<{ id, author, content }> : 엔진 실행 결과 (contracts.md 기준)
 *   queryType - string : 실행된 쿼리 타입 ("SELECT", "INSERT", "DELETE" 등)
 *   message   - string : 엔진 상태 메시지 ("Executed." 등)
 *   loading   - boolean : 쿼리 실행 중 로딩 상태
 *   error     - string|null : 에러 메시지
 */

const BANNER_THEMES = {
  INSERT: { icon: "\uD83D\uDC98", text: "NEW MATCH!" },
  SELECT: { icon: "\uD83D\uDD25", text: "MATCH RESULTS" },
  DELETE: { icon: "\uD83D\uDC94", text: "GHOSTED" },
  ERROR: { icon: "\u26A0\uFE0F", text: "ERROR" },
};

export default function ServicePanel({
  rows = [],
  queryType = "",
  message = "",
  loading = false,
  error = null,
}) {
  const [animKey, setAnimKey] = useState(0);

  // rows 또는 queryType 변경 시 애니메이션 재실행
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [rows, queryType]);

  // ─── 로딩 상태 ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <div style={styles.iconWrap}>
            <span style={styles.iconText}>{"\uD83D\uDD25"}</span>
          </div>
          <div>
            <div style={styles.label}>SERVICE</div>
            <div style={styles.desc}>Match Results</div>
          </div>
        </div>
        <div style={styles.welcome}>
          <div style={{ ...styles.welcomeFlame, animation: "spin 1s linear infinite" }}>
            {"\u23F3"}
          </div>
          <div style={styles.welcomeTitle}>Loading...</div>
          <div style={styles.welcomeDesc}>쿼리 실행 중입니다</div>
        </div>
        <style>{keyframes}</style>
      </div>
    );
  }

  // ─── 에러 상태 ─────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <div style={styles.iconWrap}>
            <span style={styles.iconText}>{"\uD83D\uDD25"}</span>
          </div>
          <div>
            <div style={styles.label}>SERVICE</div>
            <div style={styles.desc}>Match Results</div>
          </div>
        </div>
        <div style={styles.banner} key={`err-${animKey}`}>
          <span style={styles.bannerIcon}>{"\u26A0\uFE0F"}</span>
          <span style={styles.bannerText}>ERROR</span>
        </div>
        <div style={styles.statusBar}>
          <span style={styles.badge}>ERROR</span>
          <span style={styles.statusMsg}>{error}</span>
        </div>
        <div style={styles.noData}>
          <div style={{ fontSize: 32, opacity: 0.3 }}>{"\uD83D\uDC94"}</div>
          <div>Something went wrong</div>
        </div>
        <style>{keyframes}</style>
      </div>
    );
  }

  // ─── Welcome 상태 (최초, 결과 없음) ────────────────────
  if (!rows.length && !message) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <div style={styles.iconWrap}>
            <span style={styles.iconText}>{"\uD83D\uDD25"}</span>
          </div>
          <div>
            <div style={styles.label}>SERVICE</div>
            <div style={styles.desc}>Match Results</div>
          </div>
        </div>
        <div style={styles.welcome}>
          <div style={styles.welcomeFlame}>{"\uD83D\uDD25"}</div>
          <div style={styles.welcomeTitle}>Cupid-DB</div>
          <div style={styles.welcomeDesc}>
            SQL을 실행하면
            <br />
            매칭 결과가 여기에 표시됩니다
          </div>
        </div>
        <style>{keyframes}</style>
      </div>
    );
  }

  // ─── 결과 렌더링 ───────────────────────────────────────
  const theme = BANNER_THEMES[queryType] || { icon: "\u2699\uFE0F", text: queryType || "RESULT" };

  return (
    <div style={styles.panel}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div style={styles.iconWrap}>
          <span style={styles.iconText}>{"\uD83D\uDD25"}</span>
        </div>
        <div>
          <div style={styles.label}>SERVICE</div>
          <div style={styles.desc}>Match Results</div>
        </div>
      </div>

      {/* 배너 */}
      <div style={styles.banner} key={`banner-${animKey}`}>
        <span style={styles.bannerIcon}>{theme.icon}</span>
        <span style={styles.bannerText}>{theme.text}</span>
      </div>

      {/* 상태 메시지 바 */}
      {message && (
        <div style={styles.statusBar}>
          <span style={styles.badge}>{queryType}</span>
          <span style={styles.statusMsg}>{message}</span>
        </div>
      )}

      {/* 카드 목록 */}
      <div style={styles.cardsContainer}>
        {rows.length === 0 ? (
          <div style={styles.noData}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>{"\uD83D\uDC94"}</div>
            <div>No profiles yet</div>
          </div>
        ) : (
          rows.map((row, i) => (
            <div
              key={row.id ?? i}
              style={{
                ...styles.card,
                animationDelay: `${i * 0.06}s`,
              }}
            >
              <div style={styles.cardTop}>
                <div style={styles.avatar}>
                  {(row.author || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={styles.name}>{row.author}</div>
                  <div style={styles.idLabel}>#{row.id}</div>
                </div>
              </div>
              <div style={styles.content}>{row.content}</div>
            </div>
          ))
        )}
      </div>

      {/* 푸터 */}
      <div style={styles.footer}>
        {rows.length > 0 ? `${rows.length} profile(s)` : ""}
      </div>

      <style>{keyframes}</style>
    </div>
  );
}

// ─── CSS 키프레임 (인라인 스타일에서 사용) ─────────────────
const keyframes = `
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-100%); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cardPop {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

// ─── 스타일 (cupid-db-demo.html 기준 라이트 테마) ─────────
const styles = {
  panel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    borderLeft: "1px solid #E8E8E8",
    backgroundColor: "#FFFFFF",
    color: "#1A1A1A",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    overflow: "hidden",
  },

  // 패널 헤더
  header: {
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#F8F8F8",
    borderBottom: "1px solid #E8E8E8",
    flexShrink: 0,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "rgba(253, 38, 122, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#FD267A",
  },
  desc: {
    fontSize: 11,
    color: "#999999",
    fontWeight: 400,
  },

  // 배너
  banner: {
    padding: "16px 20px",
    background: "linear-gradient(135deg, #FD267A 0%, #FF6036 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    animation: "slideDown 0.3s ease",
    flexShrink: 0,
  },
  bannerIcon: {
    fontSize: 22,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // 상태 바
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    background: "#F8F8F8",
    borderBottom: "1px solid #E8E8E8",
    fontSize: 12,
    flexShrink: 0,
  },
  badge: {
    padding: "3px 10px",
    borderRadius: 20,
    background: "linear-gradient(135deg, #FD267A 0%, #FF6036 100%)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 10,
    letterSpacing: "0.5px",
  },
  statusMsg: {
    color: "#666666",
  },

  // 카드 컨테이너
  cardsContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "#FFFFFF",
  },

  // 프로필 카드
  card: {
    background: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #E8E8E8",
    animation: "cardPop 0.35s ease both",
    transition: "border-color 0.2s, box-shadow 0.2s",
    cursor: "default",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #FD267A 0%, #FF6036 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 18,
    color: "#fff",
    flexShrink: 0,
  },
  name: {
    fontWeight: 700,
    fontSize: 15,
    color: "#1A1A1A",
  },
  idLabel: {
    fontSize: 11,
    color: "#999999",
    fontWeight: 500,
  },
  content: {
    marginTop: 10,
    marginLeft: 56,
    fontSize: 14,
    color: "#666666",
    lineHeight: 1.6,
    padding: "10px 14px",
    background: "#F0F0F0",
    borderRadius: 12,
    borderTopLeftRadius: 4,
  },

  // Welcome 상태
  welcome: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 12,
  },
  welcomeFlame: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #FD267A 0%, #FF6036 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    opacity: 0.7,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 800,
    background: "linear-gradient(135deg, #FD267A 0%, #FF6036 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  welcomeDesc: {
    color: "#999999",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 1.5,
  },

  // No data
  noData: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    color: "#999999",
    gap: 8,
  },

  // 푸터
  footer: {
    padding: "10px 20px",
    borderTop: "1px solid #E8E8E8",
    background: "#F8F8F8",
    fontSize: 12,
    color: "#999999",
    textAlign: "right",
    fontWeight: 500,
    flexShrink: 0,
  },
};
