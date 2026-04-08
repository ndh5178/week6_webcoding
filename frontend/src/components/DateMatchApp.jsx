import { useEffect, useState } from "react";

const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
];

const HOBBY_EMOJIS = {
  독서: "📚",
  요리: "🍳",
  게임: "🎮",
  여행: "✈️",
  운동: "🏃",
  음악: "🎵",
  travel: "✈️",
  reading: "📚",
};

const AVATAR_COLORS = [
  "linear-gradient(135deg, #FD297B, #FF5864)",
  "linear-gradient(135deg, #FF5864, #FF655B)",
  "linear-gradient(135deg, #a855f7, #6366f1)",
  "linear-gradient(135deg, #f97316, #eab308)",
  "linear-gradient(135deg, #06b6d4, #3b82f6)",
  "linear-gradient(135deg, #ec4899, #f43f5e)",
];

function escapeSqlValue(value) {
  return String(value).replace(/'/g, "''");
}

function buildComment(person, target, score) {
  if (score === 100) {
    return `${target.name}님과 MBTI와 취미가 모두 완벽하게 맞아요.`;
  }

  if (person.hobby === target.hobby) {
    return `둘 다 ${person.hobby}를 좋아해서 대화가 바로 이어질 수 있어요.`;
  }

  if (score >= 60) {
    return "성향 코드가 꽤 비슷해서 편안하게 가까워질 가능성이 높아요.";
  }

  return "공통점은 적지만 의외의 케미를 기대해볼 만한 조합이에요.";
}

function calculateScore(person, target) {
  let score = 0;

  for (let index = 0; index < 4; index += 1) {
    if (person.mbti[index] === target.mbti[index]) {
      score += 20;
    }
  }

  if (person.hobby === target.hobby) {
    score += 20;
  }

  return Math.min(score, 100);
}

function normalizeProfiles(rows, fallbackProfiles = []) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const fallbackMap = new Map(
    fallbackProfiles.map((profile) => [
      `${String(profile.name ?? "").trim()}::${String(profile.hobby ?? "").trim()}`,
      profile,
    ]),
  );

  return rows
    .filter((row) => row && typeof row === "object")
    .map((row, index) => {
      const name = String(row.name ?? "").trim();
      const hobby = String(row.hobby ?? "").trim();
      const mbti = String(row.mbti ?? "").trim().toUpperCase();
      const fallback = fallbackMap.get(`${name}::${hobby}`);

      return {
        id: `${name || "profile"}-${index}`,
        name,
        mbti: mbti || String(fallback?.mbti ?? "").trim().toUpperCase(),
        hobby,
      };
    })
    .filter((row) => row.name && row.mbti && row.hobby);
}

async function runQuery(query) {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const payload = await response.json();

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "SQL 실행에 실패했습니다.");
  }

  return payload;
}

export default function DateMatchApp({
  rows = [],
  queryType = "",
  loading: parentLoading = false,
  error: parentError = "",
}) {
  const [form, setForm] = useState({ name: "", mbti: "", hobby: "" });
  const [saving, setSaving] = useState(true);
  const [results, setResults] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      try {
        setSaving(true);
        setError("");

        const payload = await runQuery("SELECT * FROM profiles;");
        if (!cancelled) {
          setProfiles(normalizeProfiles(payload.rows));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "프로필 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setSaving(false);
        }
      }
    }

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (queryType !== "SELECT") {
      return;
    }

    setProfiles((currentProfiles) => normalizeProfiles(rows, currentProfiles));
    setResults(null);
    setError(parentError || "");
  }, [rows, queryType, parentError]);

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const mbti = form.mbti.trim().toUpperCase();
    const hobby = form.hobby.trim();

    if (!name || !mbti || !hobby) {
      return;
    }

    const target = { name, mbti, hobby };
    const insertQuery = `INSERT INTO profiles VALUES ('${escapeSqlValue(name)}', '${escapeSqlValue(
      mbti,
    )}', '${escapeSqlValue(hobby)}');`;

    try {
      setSaving(true);
      setError("");

      await runQuery(insertQuery);

      const payload = await runQuery("SELECT * FROM profiles;");
      const nextProfiles = normalizeProfiles(payload.rows);
      setProfiles(nextProfiles);

      const targetIndex = nextProfiles.findLastIndex(
        (person) =>
          person.name === target.name &&
          person.mbti === target.mbti &&
          person.hobby === target.hobby,
      );

      const matched = nextProfiles
        .filter((_, index) => index !== targetIndex)
        .map((person) => {
          const score = calculateScore(person, target);
          return {
            ...person,
            score,
            comment: buildComment(person, target, score),
          };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, 3);

      setResults({ target, matched });
    } catch (submitError) {
      setError(submitError.message || "프로필 저장 또는 매칭 계산에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const isBusy = saving || parentLoading;
  const isButtonDisabled = !form.name.trim() || !form.mbti || !form.hobby.trim() || isBusy;

  return (
    <section style={S.panel}>
      <header style={S.header}>
        <div>
          <p style={S.eyebrow}>PANEL 3</p>
          <h2 style={S.title}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              style={{ verticalAlign: "middle", marginRight: 6 }}
            >
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
        <div style={S.card}>
          <p style={S.cardTitle}>프로필을 입력하세요.</p>
          <form onSubmit={handleSubmit} style={S.form}>
            <input
              style={S.input}
              type="text"
              placeholder="이름"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <select
              style={S.select}
              value={form.mbti}
              onChange={(event) =>
                setForm((current) => ({ ...current, mbti: event.target.value }))
              }
            >
              <option value="" disabled>
                MBTI 선택
              </option>
              {MBTI_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              style={S.input}
              type="text"
              placeholder="취미 (예: 독서, 여행...)"
              value={form.hobby}
              onChange={(event) =>
                setForm((current) => ({ ...current, hobby: event.target.value }))
              }
            />
            <button
              type="submit"
              style={{
                ...S.submitBtn,
                opacity: isButtonDisabled ? 0.5 : 1,
              }}
              disabled={isButtonDisabled}
            >
              {isBusy ? (
                <span style={S.loadingWrap}>
                  <span style={S.heartPulse}>&#x2764;&#xFE0F;</span>
                  <span>매칭 중...</span>
                </span>
              ) : (
                "내 짝궁 찾기"
              )}
            </button>
          </form>
        </div>

        {error ? <div style={S.errorBox}>{error}</div> : null}

        {isBusy && !results ? (
          <div style={S.loadingSection}>
            <div style={S.loadingHeart}>&#x2764;&#xFE0F;</div>
            <p style={S.loadingText}>저장된 프로필을 불러오는 중입니다.</p>
          </div>
        ) : null}

        {results ? (
          <div style={S.resultsSection}>
            <div style={S.resultsBanner}>
              <p style={S.resultsTitle}>{results.target.name}님의 매칭 결과</p>
              <p style={S.resultsSub}>
                {results.target.mbti} &middot; {results.target.hobby}
              </p>
            </div>

            {results.matched.length === 0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyHeart}>💞</div>
                <p style={S.emptyText}>아직 비교할 다른 프로필이 부족합니다.</p>
              </div>
            ) : (
              results.matched.map((person, index) => (
                <div
                  key={`${person.name}-${person.mbti}-${person.hobby}-${index}`}
                  style={S.matchCard}
                >
                  {index === 0 ? <div style={S.bestBadge}>BEST</div> : null}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        ...S.avatar,
                        background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                      }}
                    >
                      {person.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={S.matchName}>{person.name}</p>
                      <div style={S.matchInfo}>
                        <span style={S.mbtiTag}>{person.mbti}</span>
                        <span style={S.hobbyTag}>
                          {HOBBY_EMOJIS[person.hobby] || "✨"} {person.hobby}
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
                  <p style={S.matchComment}>{person.comment}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={S.resultsSection}>
            <div style={S.resultsBanner}>
              <p style={S.resultsTitle}>저장된 사람들</p>
              <p style={S.resultsSub}>
                패널 1에서 <code>SELECT * FROM profiles;</code>를 실행하면 이 목록이 다시 갱신됩니다.
              </p>
            </div>

            {profiles.length === 0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyHeart}>🫶</div>
                <p style={S.emptyText}>
                  아직 저장된 프로필이 없습니다. 먼저 한 명을 등록해보세요.
                </p>
              </div>
            ) : (
              profiles.map((person, index) => (
                <div
                  key={`${person.name}-${person.mbti}-${person.hobby}-${index}`}
                  style={S.matchCard}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        ...S.avatar,
                        background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                      }}
                    >
                      {person.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={S.matchName}>{person.name}</p>
                      <div style={S.matchInfo}>
                        <span style={S.mbtiTag}>{person.mbti}</span>
                        <span style={S.hobbyTag}>
                          {HOBBY_EMOJIS[person.hobby] || "✨"} {person.hobby}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
  errorBox: {
    padding: "14px",
    borderRadius: "14px",
    background: "rgba(127, 29, 29, 0.45)",
    border: "1px solid rgba(248, 113, 113, 0.28)",
    color: "#fecaca",
  },
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
    flexWrap: "wrap",
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
    lineHeight: 1.6,
  },
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
