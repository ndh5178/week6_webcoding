import React, { useEffect, useRef, useState } from 'react';

/**
 * === SQL 터미널 컴포넌트 (세민 담당) ===
 *
 * xterm.js를 사용한 웹 터미널
 * WebSocket으로 백엔드와 실시간 통신
 *
 * [개발 TIP]
 * - npm install 후 xterm.js를 사용하면 진짜 터미널처럼 됩니다
 * - 지금은 xterm.js 없이도 동작하는 간이 터미널을 먼저 만들어둡니다
 * - 나중에 xterm.js로 교체하면 됩니다
 */
export default function Terminal({ onParseTree, onMatchResult }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const termRef = useRef(null);
  const inputRef = useRef(null);
  const wsRef = useRef(null);

  // WebSocket 연결
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Terminal] WebSocket 연결됨');
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') {
          // \r\n을 줄바꿈으로 변환
          const lines = msg.data.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
          setHistory(prev => [...prev, ...lines.map(line => ({ type: 'output', text: line }))]);
        } else if (msg.type === 'parseTree') {
          onParseTree?.(msg.data);
        } else if (msg.type === 'matchResult') {
          onMatchResult?.(msg.data);
        } else if (msg.type === 'clear') {
          setHistory([]);
        }
      };

      ws.onerror = () => {
        console.log('[Terminal] WebSocket 연결 실패 → 로컬 모드');
        setHistory([{
          type: 'system',
          text: '╔══════════════════════════════════════╗'
        }, {
          type: 'system',
          text: '║   Cupid SQL Engine v1.0              ║'
        }, {
          type: 'system',
          text: '║   데이트 매칭 SQL 시스템 (로컬 모드)   ║'
        }, {
          type: 'system',
          text: '╚══════════════════════════════════════╝'
        }, {
          type: 'info',
          text: '백엔드 서버 연결 대기 중... (node server.js 실행 필요)'
        }, {
          type: 'info',
          text: '"help"를 입력하면 사용법을 볼 수 있습니다.'
        }]);
      };

      ws.onclose = () => {
        console.log('[Terminal] WebSocket 종료');
      };

      return () => ws.close();
    } catch {
      // WebSocket 미지원 환경
      setHistory([{ type: 'system', text: 'Cupid SQL Engine v1.0 (오프라인 모드)' }]);
    }
  }, [onParseTree, onMatchResult]);

  // 자동 스크롤
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [history]);

  // 로컬 Mock 처리 (서버 없을 때)
  function handleLocalCommand(query) {
    const q = query.trim().toUpperCase();
    const lines = [];

    if (query.trim().toLowerCase() === 'help') {
      lines.push({ type: 'info', text: '사용 가능한 명령어:' });
      lines.push({ type: 'info', text: '  INSERT INTO people VALUES (이름, MBTI, 취미);' });
      lines.push({ type: 'info', text: '  SELECT * FROM people [WHERE 조건];' });
      lines.push({ type: 'info', text: '  MATCH 이름 WITH mbti, hobby;' });
      lines.push({ type: 'info', text: '  help  - 도움말  |  clear - 화면 지우기' });
    } else if (query.trim().toLowerCase() === 'clear') {
      setHistory([]);
      return;
    } else if (q.startsWith('INSERT')) {
      lines.push({ type: 'success', text: '[INSERT] 데이터 삽입 완료' });
      // Mock 파싱 트리
      onParseTree?.({
        type: 'INSERT',
        children: [
          { type: 'INTO', value: 'people' },
          { type: 'VALUES', children: [
            { type: 'STRING', value: '...' }
          ]}
        ]
      });
    } else if (q.startsWith('SELECT')) {
      lines.push({ type: 'success', text: '[SELECT] 조회 결과:' });
      lines.push({ type: 'output', text: '┌──────────┬──────┬──────┐' });
      lines.push({ type: 'output', text: '│ 김민수   │ INFP │ 독서 │' });
      lines.push({ type: 'output', text: '│ 이서연   │ ENFJ │ 요리 │' });
      lines.push({ type: 'output', text: '└──────────┴──────┴──────┘' });
      onParseTree?.({
        type: 'SELECT',
        children: [
          { type: 'COLUMNS', value: '*' },
          { type: 'FROM', value: 'people' }
        ]
      });
    } else if (q.startsWith('MATCH')) {
      lines.push({ type: 'success', text: '[MATCH] 매칭 결과 발견!' });
      lines.push({ type: 'output', text: '  박지훈 (INFP, 게임) - 매칭률: 85%' });
      lines.push({ type: 'output', text: '  이서연 (ENFJ, 독서) - 매칭률: 70%' });
    } else {
      lines.push({ type: 'error', text: `[오류] 알 수 없는 쿼리: ${query}` });
    }

    setHistory(prev => [...prev, ...lines]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;

    // 입력 히스토리 추가
    setHistory(prev => [...prev, { type: 'command', text: `cupid> ${input}` }]);
    setCommandHistory(prev => [input, ...prev]);
    setHistoryIndex(-1);

    // WebSocket으로 전송 또는 로컬 처리
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'command', data: input }));
    } else {
      handleLocalCommand(input);
    }

    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  }

  const lineStyles = {
    command: { color: '#ff6b9d', fontWeight: 'bold' },
    output: { color: '#e6edf3' },
    success: { color: '#3fb950' },
    error: { color: '#f85149' },
    info: { color: '#58a6ff' },
    system: { color: '#d29922' }
  };

  return (
    <div className="terminal-container" onClick={() => inputRef.current?.focus()}>
      <div
        ref={termRef}
        style={{
          height: 'calc(100% - 40px)',
          overflow: 'auto',
          padding: '12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
          lineHeight: '1.6'
        }}
      >
        {history.map((line, i) => (
          <div key={i} style={lineStyles[line.type] || lineStyles.output}>
            {line.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', padding: '0 12px' }}>
        <span style={{ color: '#ff6b9d', fontFamily: "'JetBrains Mono', monospace", lineHeight: '36px' }}>
          cupid&gt;
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SQL 쿼리를 입력하세요..."
          autoFocus
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--text)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            outline: 'none'
          }}
        />
      </form>
    </div>
  );
}
