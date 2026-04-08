import React, { useState, useCallback } from 'react';
import Terminal from './components/Terminal';
import ParseTree from './components/ParseTree';
import DateMatchPage from './components/DateMatchPage';

/**
 * === Cupid SQL 메인 앱 ===
 *
 * 3개 탭:
 *   1. SQL 터미널 (세민) + 파싱 트리 (규민) - 좌우 분할
 *   2. 데이트 매칭 (규태) - 전체 화면
 */
export default function App() {
  const [activeTab, setActiveTab] = useState('terminal');
  const [parseTree, setParseTree] = useState(null);
  const [matchResult, setMatchResult] = useState(null);

  const handleParseTree = useCallback((tree) => {
    setParseTree(tree);
  }, []);

  const handleMatchResult = useCallback((result) => {
    setMatchResult(result);
  }, []);

  return (
    <div className="app-container" style={
      activeTab === 'match'
        ? { gridTemplateColumns: '1fr' }
        : { gridTemplateColumns: '1fr 1fr' }
    }>
      {/* ─── 헤더 ─── */}
      <header className="header">
        <h1>Cupid SQL</h1>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            SQL Terminal
          </button>
          <button
            className={`nav-tab ${activeTab === 'match' ? 'active' : ''}`}
            onClick={() => setActiveTab('match')}
          >
            Date Matching
          </button>
        </nav>
      </header>

      {/* ─── 터미널 탭 ─── */}
      {activeTab === 'terminal' && (
        <>
          <div className="panel">
            <div className="panel-header">
              <span className="dot green"></span>
              Terminal — 세민
            </div>
            <Terminal
              onParseTree={handleParseTree}
              onMatchResult={handleMatchResult}
            />
          </div>
          <div className="panel">
            <div className="panel-header">
              <span className="dot purple"></span>
              Parse Tree — 규민
            </div>
            <div className="parse-tree-container">
              <ParseTree tree={parseTree} />
            </div>
          </div>
        </>
      )}

      {/* ─── 데이트 매칭 탭 ─── */}
      {activeTab === 'match' && (
        <DateMatchPage />
      )}
    </div>
  );
}
