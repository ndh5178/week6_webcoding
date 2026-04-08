import { useState } from "react";

const MBTI_TYPES = [
  "ISTJ","ISFJ","INFJ","INTJ",
  "ISTP","ISFP","INFP","INTP",
  "ESTP","ESFP","ENFP","ENTP",
  "ESTJ","ESFJ","ENFJ","ENTJ",
];

const MOCK_PEOPLE = [
  { id: 1, name: "김민수", mbti: "INFP", hobby: "독서", comment: "같이 카페에서 책 읽어요!" },
  { id: 2, name: "이서연", mbti: "ENFJ", hobby: "요리", comment: "맛있는 거 해줄게요~" },
  { id: 3, name: "박지훈", mbti: "INFP", hobby: "게임", comment: "롤 듀오 할 사람!" },
  { id: 4, name: "최수진", mbti: "ENTP", hobby: "여행", comment: "다음 주 제주도 갈 사람?" },
  { id: 5, name: "정우성", mbti: "ISTJ", hobby: "운동", comment: "매일 러닝하는 사람이에요" },
  { id: 6, name: "한소희", mbti: "ENFP", hobby: "음악", comment: "같이 페스티벌 가요!" },
  { id: 7, name: "송지은", mbti: "INTP", hobby: "독서", comment: "SF 소설 좋아하는 사람?" },
  { id: 8, name: "강도윤", mbti: "ESFJ", hobby: "요리", comment: "브런치 카페 탐방 좋아해요" },
];

const HOBBY_EMOJIS = {
  "독서": "📚", "요리": "🍳", "게임": "🎮", "여행": "✈️",
  "운동": "💪", "음악": "🎵", "영화": "🎬", "사진": "📷",
};

const AVATAR_COLORS = [
  "linear-gradient(135deg, #FD297B, #FF5864)",
  "linear-gradient(135deg, #FF5864, #FF655B)",
  "linear-gradient(135deg, #a855f7, #6366f1)",
  "linear-gradient(135deg, #f97316, #eab308)",
  "linear-gradient(135deg, #06b6d4, #3b82f6)",
  "linear-gradient(135deg, #ec4899, #f43f5e)",
];

function calculateScore(person, target) {
  let score = 0;
  for (let i = 0; i < 4; i++) {
    if (person.mbti[i] === target.mbti[i]) score += 20;
  }
  if (person.hobby === target.hobby) score += 20;
  return Math.min(score, 100);
}

export default function DateMatchApp() {
  const [form, setForm] = useState({ name: "", mbti: "", hobby: "" });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.mbti || !form.hobby.trim()) return;

    setLoading(true);
    setResults(null);
    setSubmitted(true);

    setTimeout(() => {
      const target = { name: form.name, mbti: form.mbti, hobby: form.hobby };
      const matched = MOCK_PEOPLE
        .map((p) => ({ ...p, score: calculateScore(p, target) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      setResults({ target, matched });
      setLoading(false);
    }, 1500);
  }

  return (
    <section style={S.panel}>
      {/* ── 헤더 ── */}
      <header style={S.header}>
        <div>
          <p style={S.eyebrow}>PANEL 3</p>
          <h2 style={S.title}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: "middle", marginRight: 6 }}>
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                   2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                   C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
                   c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="url(#heartGradPanel)"
              />
              <defs>
                <linearGradient id="heartGradPanel" x1="2" y1="3" x2="22" y2="21">
                  <stop offset="0%" stopColor="#FD297B" />
                  <stop offset="100%" stopColor="#FF655B" />
                </linearGradient>
              </defs>
            </svg>
            Cupid SQL
          </h2>
        </div>
      </header>

      <div style={S.body}>
        {/* ── 입력 폼 ── */}
        <div style={S.card}>
          <p style={S.cardTitle}>프로필을 입력하세요</p>
          <form onSubmit={handleSubmit} style={S.form}>
            <input
              style={S.input}
              type="text"
              placeholder="이름"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <select
              style={S.select}
              value={form.mbti}
              onChange={(e) => setForm((f) => ({ ...f, mbti: e.target.value }))}
            >
              <option value="" disabled>MBTI 선택</option>
              {MBTI_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              style={S.input}
              type="text"
              placeholder="취미 (예: 독서, 요리...)"
              value={form.hobby}
              onChange={(e) => setForm((f) => ({ ...f, hobby: e.target.value }))}
            />
            <button
              type="submit"
              style={{
                ...S.submitBtn,
                opacity: !form.name.trim() || !form.mbti || !form.hobby.trim() ? 0.5 : 1,
              }}
              disabled={loading || !form.name.trim() || !form.mbti || !form.hobby.trim()}
            >
              {loading ? (
                <span style={S.loadingWrap}>
                  <span style={S.heartPulse}>&#x2764;&#xFE0F;</span>
                  <span>매칭 중...</span>
                </span>
              ) : (
                "내 운명의 짝 찾기"
              )}
            </button>
          </form>
        </div>

        {/* ── 로딩 ── */}
        {loading && (
          <div style={S.loadingSection}>
            <div style={S.loadingHeart}>&#x2764;&#xFE0F;</div>
            <p style={S.loadingText}>매칭 중...</p>
          </div>
        )}

        {/* ── 결과 ── */}
        {results && !loading && (
          <div style={S.resultsSection}>
            <div style={S.resultsBanner}>
              <p style={S.resultsTitle}>
                {results.target.name}님의 매칭 결과
              </p>
              <p style={S.resultsSub}>
                {results.target.mbti} &middot; {results.target.hobby}
              </p>
            </div>

            {results.matched.map((person, idx) => (
              <div key={person.id} style={S.matchCard}>
                {idx === 0 && <div style={S.bestBadge}>BEST</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      ...S.avatar,
                      background: AVATAR_COLORS[person.id % AVATAR_COLORS.length],
                    }}
                  >
                    {person.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={S.matchName}>{person.name}</p>
                    <div style={S.matchInfo}>
                      <span style={S.mbtiTag}>{person.mbti}</span>
                      <span style={S.hobbyTag}>
                        {HOBBY_EMOJIS[person.hobby] || "🎯"} {person.hobby}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={S.scoreSection}>
                  <div style={S.scoreLabel}>
                    매칭률 <strong>{person.score}%</strong>
                  </div>
                  <div style={S.scoreBarBg}>
                    <div style={{ ...S.scoreBarFill, width: `${person.score}%` }} />
                  </div>
                </div>
                <p style={S.matchComment}>"{person.comment}"</p>
              </div>
            ))}
          </div>
        )}

        {/* ── 빈 상태 ── */}
        {!submitted && !loading && (
          <div style={S.emptyState}>
            <div style={S.emptyHeart}>&#x1F498;</div>
            <p style={S.emptyText}>프로필을 입력하고<br />매칭 버튼을 눌러보세요!</p>
          </div>
        )}
      </div>

      {/* ── CSS 애니메이션 ── */}
      <style>{`
        @keyframes heartPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </section>
  );
}

// ─── 패널용 스타일 (다크 테마, 3분할에 맞춤) ──────────
const S = {
  panel: {
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    borderRadius: "24px",
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
    fontFamily: "'Noto Sans KR', system-ui, sans-serif",
    color: "#f8fafc",
  },
  header: {
    padding: "16px 20px",
  },
  eyebrow: {
    margin: 0,
    fontSize: 11,
    letterSpacing: "0.16em",
    fontWeight: 700,
    color: "#fda4af",
  },
  title: {
    margin: "8px 0 0",
    fontSize: 28,
    fontWeight: 800,
    background: "linear-gradient(135deg, #FD297B, #FF655B)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "0 16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  // 입력 카드
  card: {
    borderRadius: 16,
    padding: "16px",
    background: "rgba(30, 41, 59, 0.8)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
  },
  cardTitle: {
    margin: "0 0 12px",
    fontSize: 14,
    fontWeight: 700,
    color: "#e2e8f0",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  input: {
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: 10,
    background: "rgba(2, 6, 23, 0.6)",
    outline: "none",
    fontFamily: "inherit",
    color: "#f8fafc",
  },
  select: {
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: 10,
    background: "rgba(2, 6, 23, 0.6)",
    outline: "none",
    fontFamily: "inherit",
    color: "#f8fafc",
    cursor: "pointer",
  },
  submitBtn: {
    marginTop: 4,
    padding: "12px 0",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "inherit",
    color: "#fff",
    border: "none",
    borderRadius: 24,
    background: "linear-gradient(135deg, #FD297B, #FF5864, #FF655B)",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(253, 41, 123, 0.3)",
  },
  loadingWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  heartPulse: {
    display: "inline-block",
    animation: "heartPulse 0.8s infinite",
  },

  // 로딩
  loadingSection: {
    textAlign: "center",
    padding: "32px 0",
  },
  loadingHeart: {
    fontSize: 40,
    animation: "heartPulse 0.8s infinite",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#94a3b8",
  },

  // 결과
  resultsSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    animation: "fadeInUp 0.4s ease-out",
  },
  resultsBanner: {
    textAlign: "center",
    padding: "12px 0",
  },
  resultsTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#fda4af",
  },
  resultsSub: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#94a3b8",
  },
  matchCard: {
    position: "relative",
    borderRadius: 14,
    padding: "14px",
    background: "rgba(30, 41, 59, 0.7)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
  },
  bestBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: "3px 10px",
    borderRadius: 999,
    background: "linear-gradient(135deg, #FD297B, #FF655B)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  matchName: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
  },
  matchInfo: {
    display: "flex",
    gap: 6,
    marginTop: 4,
  },
  mbtiTag: {
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    background: "rgba(253, 41, 123, 0.15)",
    color: "#fda4af",
  },
  hobbyTag: {
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    background: "rgba(148, 163, 184, 0.12)",
    color: "#cbd5e1",
  },
  scoreSection: {
    marginTop: 10,
  },
  scoreLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
  },
  scoreBarBg: {
    height: 6,
    borderRadius: 3,
    background: "rgba(148, 163, 184, 0.15)",
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 3,
    background: "linear-gradient(90deg, #FD297B, #FF655B)",
    transition: "width 0.6s ease-out",
  },
  matchComment: {
    margin: "8px 0 0",
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
  },

  // 빈 상태
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 0",
  },
  emptyHeart: {
    fontSize: 40,
    animation: "float 3s ease-in-out infinite",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 1.6,
  },
};
