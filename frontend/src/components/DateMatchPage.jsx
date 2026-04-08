import React, { useState } from 'react';

/**
 * === 데이트 매칭 페이지 (규태 담당) ===
 *
 * 화이트보드 설계:
 *   - 이름, MBTI, 취미 입력 폼
 *   - 연결(매칭) 버튼
 *   - 결과 카드 표시
 *   - 댓글/토론 섹션
 */

const MBTI_TYPES = [
  'ISTJ','ISFJ','INFJ','INTJ',
  'ISTP','ISFP','INFP','INTP',
  'ESTP','ESFP','ENFP','ENTP',
  'ESTJ','ESFJ','ENFJ','ENTJ'
];

// Mock 데이터 (나중에 C 엔진 API로 교체)
const MOCK_PEOPLE = [
  { id: 1, name: '김민수', mbti: 'INFP', hobby: '독서' },
  { id: 2, name: '이서연', mbti: 'ENFJ', hobby: '요리' },
  { id: 3, name: '박지훈', mbti: 'INFP', hobby: '게임' },
  { id: 4, name: '최수진', mbti: 'ENTP', hobby: '여행' },
  { id: 5, name: '정우성', mbti: 'ISTJ', hobby: '운동' },
  { id: 6, name: '한소희', mbti: 'ENFP', hobby: '음악' },
];

// 간단한 매칭 점수 계산
function calculateScore(person, target) {
  let score = 0;
  // MBTI 첫 글자씩 비교
  for (let i = 0; i < 4; i++) {
    if (person.mbti[i] === target.mbti[i]) score += 20;
  }
  // 취미 같으면 보너스
  if (person.hobby === target.hobby) score += 20;
  return Math.min(score, 100);
}

export default function DateMatchPage() {
  const [people, setPeople] = useState(MOCK_PEOPLE);
  const [form, setForm] = useState({ name: '', mbti: 'INFP', hobby: '' });
  const [matchTarget, setMatchTarget] = useState(null);
  const [matchResults, setMatchResults] = useState([]);
  const [comments, setComments] = useState([
    { author: '김민수', mbti: 'INFP', text: 'INFP끼리 만나면 대화가 너무 잘 통해요!' },
    { author: '이서연', mbti: 'ENFJ', text: '저는 내향적인 사람이 오히려 끌려요~' },
  ]);
  const [newComment, setNewComment] = useState('');

  // 사람 등록 (INSERT 역할)
  function handleInsert(e) {
    e.preventDefault();
    if (!form.name || !form.hobby) return;

    const newPerson = { ...form, id: Date.now() };
    setPeople(prev => [...prev, newPerson]);
    setForm({ name: '', mbti: 'INFP', hobby: '' });

    // TODO: 백엔드 API 호출
    // fetch('/api/query', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     query: `INSERT INTO people VALUES ('${form.name}', '${form.mbti}', '${form.hobby}');`
    //   })
    // });
  }

  // 매칭 실행
  function handleMatch(person) {
    setMatchTarget(person);
    const results = people
      .filter(p => p.id !== person.id)
      .map(p => ({ ...p, score: calculateScore(p, person) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    setMatchResults(results);
  }

  // 댓글 추가
  function handleComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments(prev => [...prev, {
      author: matchTarget?.name || '익명',
      mbti: matchTarget?.mbti || '????',
      text: newComment
    }]);
    setNewComment('');
  }

  return (
    <div className="match-page">
      {/* ─── 등록 폼 (INSERT) ─── */}
      <div className="input-form" style={{ maxWidth: '1000px', margin: '0 auto 24px' }}>
        <h3 style={{ marginBottom: '16px', color: '#ff6b9d' }}>
          프로필 등록
          <span style={{ fontSize: '12px', color: '#8b949e', marginLeft: '8px' }}>
            INSERT INTO people VALUES (...)
          </span>
        </h3>
        <form onSubmit={handleInsert}>
          <div className="form-row">
            <input
              placeholder="이름"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <select
              value={form.mbti}
              onChange={e => setForm(f => ({ ...f, mbti: e.target.value }))}
            >
              {MBTI_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              placeholder="취미"
              value={form.hobby}
              onChange={e => setForm(f => ({ ...f, hobby: e.target.value }))}
            />
            <button type="submit">등록</button>
          </div>
        </form>
      </div>

      {/* ─── 매칭 결과 (있을 때) ─── */}
      {matchTarget && (
        <div className="result-banner">
          <h2>{matchTarget.name}님의 매칭 결과</h2>
          <p style={{ color: '#8b949e' }}>{matchTarget.mbti} · {matchTarget.hobby}</p>
        </div>
      )}

      {matchResults.length > 0 && (
        <div className="match-grid" style={{ marginBottom: '32px' }}>
          {matchResults.map(person => (
            <div key={person.id} className="match-card">
              <h3>{person.name}</h3>
              <div className="field">
                <span className="field-label">MBTI</span>
                <span className="field-value">{person.mbti}</span>
              </div>
              <div className="field">
                <span className="field-label">취미</span>
                <span className="field-value">{person.hobby}</span>
              </div>
              <div className="match-score">매칭률 {person.score}%</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── 등록된 사람 목록 ─── */}
      <div className="match-grid">
        {people.map(person => (
          <div key={person.id} className="match-card">
            <h3>{person.name}</h3>
            <div className="field">
              <span className="field-label">MBTI</span>
              <span className="field-value">{person.mbti}</span>
            </div>
            <div className="field">
              <span className="field-label">취미</span>
              <span className="field-value">{person.hobby}</span>
            </div>
            <button
              onClick={() => handleMatch(person)}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '10px',
                background: 'linear-gradient(135deg, #ff6b9d, #a855f7)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              매칭하기
            </button>
          </div>
        ))}
      </div>

      {/* ─── 댓글/토론 섹션 ─── */}
      <div className="comments-section">
        <h3 style={{ marginBottom: '16px', color: '#a855f7' }}>토론 / 댓글</h3>

        <form onSubmit={handleComment} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            style={{
              flex: 1,
              padding: '12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              background: 'var(--purple)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontFamily: 'inherit',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            작성
          </button>
        </form>

        {comments.map((c, i) => (
          <div key={i} className="comment">
            <div className="comment-header">
              <div className="comment-avatar">{c.author[0]}</div>
              <span className="comment-author">{c.author}</span>
              <span className="comment-mbti">{c.mbti}</span>
            </div>
            <div className="comment-body">{c.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
