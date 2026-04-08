/**
 * === Cupid SQL Backend Server (하네스/Harness) ===
 *
 * 역할: React 프론트엔드와 C 엔진 사이의 다리(Bridge)
 * 담당: 세민
 *
 * 흐름:
 *   1. 프론트(xterm.js)에서 SQL 쿼리 문자열이 WebSocket으로 들어옴
 *   2. Node.js가 child_process로 C 엔진(./cupid_engine)을 실행
 *   3. C 엔진이 stdout으로 JSON을 출력
 *   4. Node.js가 JSON을 파싱해서 프론트로 전달
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// ─── C 엔진 경로 설정 ───
const ENGINE_PATH = path.join(__dirname, '..', 'engine', 'cupid_engine');

// ─── 엔진이 아직 없을 때 쓸 Mock 데이터 ───
function getMockResponse(query) {
  const q = query.trim().toUpperCase();

  if (q.startsWith('INSERT')) {
    // INSERT INTO people VALUES ('홍길동', 'INFP', '독서');
    const match = query.match(/VALUES\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/i);
    if (match) {
      return {
        success: true,
        type: 'INSERT',
        message: `데이터 삽입 완료: ${match[1]} (${match[2]}, ${match[3]})`,
        data: { name: match[1], mbti: match[2], hobby: match[3] },
        parseTree: {
          type: 'INSERT',
          children: [
            { type: 'INTO', value: 'people' },
            { type: 'VALUES', children: [
              { type: 'STRING', value: match[1] },
              { type: 'STRING', value: match[2] },
              { type: 'STRING', value: match[3] }
            ]}
          ]
        }
      };
    }
  }

  if (q.startsWith('SELECT')) {
    // SELECT * FROM people WHERE mbti = 'INFP';
    const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*'([^']+)'/i);
    return {
      success: true,
      type: 'SELECT',
      message: whereMatch
        ? `조건 검색: ${whereMatch[1]} = '${whereMatch[2]}'`
        : '전체 조회',
      data: [
        { name: '김민수', mbti: 'INFP', hobby: '독서' },
        { name: '이서연', mbti: 'ENFJ', hobby: '요리' },
        { name: '박지훈', mbti: 'INFP', hobby: '게임' }
      ],
      parseTree: {
        type: 'SELECT',
        children: [
          { type: 'COLUMNS', value: '*' },
          { type: 'FROM', value: 'people' },
          ...(whereMatch ? [{
            type: 'WHERE',
            children: [
              { type: 'CONDITION', children: [
                { type: 'COLUMN', value: whereMatch[1] },
                { type: 'OPERATOR', value: '=' },
                { type: 'STRING', value: whereMatch[2] }
              ]}
            ]
          }] : [])
        ]
      }
    };
  }

  if (q.startsWith('MATCH')) {
    // MATCH '홍길동' WITH mbti, hobby;
    return {
      success: true,
      type: 'MATCH',
      message: '데이트 매칭 결과!',
      data: {
        target: { name: '홍길동', mbti: 'INFP', hobby: '독서' },
        matches: [
          { name: '박지훈', mbti: 'INFP', hobby: '게임', score: 85 },
          { name: '이서연', mbti: 'ENFJ', hobby: '독서', score: 70 }
        ]
      },
      parseTree: {
        type: 'MATCH',
        children: [
          { type: 'TARGET', value: '홍길동' },
          { type: 'CRITERIA', children: [
            { type: 'FIELD', value: 'mbti' },
            { type: 'FIELD', value: 'hobby' }
          ]}
        ]
      }
    };
  }

  return {
    success: false,
    type: 'ERROR',
    message: `알 수 없는 쿼리: ${query}`,
    parseTree: null
  };
}

// ─── C 엔진 실행 함수 ───
function executeEngine(query) {
  return new Promise((resolve) => {
    // C 엔진 파일이 있으면 실제 실행, 없으면 Mock
    execFile(ENGINE_PATH, [query], { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        // 엔진이 없거나 에러 → Mock 데이터 사용
        console.log('[하네스] C엔진 없음 → Mock 모드 작동');
        resolve(getMockResponse(query));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        resolve({ success: false, type: 'ERROR', message: 'JSON 파싱 실패', raw: stdout });
      }
    });
  });
}

// ─── REST API 엔드포인트 ───
app.post('/api/query', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: '쿼리가 비어 있습니다' });

  console.log(`[쿼리 수신] ${query}`);
  const result = await executeEngine(query);
  res.json(result);
});

// 데이터 조회 API (데이트 매칭 페이지용)
app.get('/api/people', async (req, res) => {
  const result = await executeEngine("SELECT * FROM people;");
  res.json(result);
});

// ─── WebSocket (xterm.js 터미널 연동) ───
wss.on('connection', (ws) => {
  console.log('[터미널] 새 연결');

  // 환영 메시지
  ws.send(JSON.stringify({
    type: 'output',
    data: '\r\n  ╔══════════════════════════════════════╗\r\n  ║   Cupid SQL Engine v1.0              ║\r\n  ║   데이트 매칭 SQL 시스템              ║\r\n  ╚══════════════════════════════════════╝\r\n\r\ncupid> '
  }));

  ws.on('message', async (message) => {
    const msg = JSON.parse(message);

    if (msg.type === 'command') {
      const query = msg.data.trim();

      if (query.toLowerCase() === 'help') {
        ws.send(JSON.stringify({
          type: 'output',
          data: '\r\n사용 가능한 명령어:\r\n' +
            '  INSERT INTO people VALUES (이름, MBTI, 취미);\r\n' +
            '  SELECT * FROM people [WHERE 조건];\r\n' +
            '  MATCH 이름 WITH mbti, hobby;\r\n' +
            '  COMMENT ON 이름 내용;\r\n' +
            '  help  - 도움말\r\n' +
            '  clear - 화면 지우기\r\n\r\ncupid> '
        }));
        return;
      }

      if (query.toLowerCase() === 'clear') {
        ws.send(JSON.stringify({ type: 'clear' }));
        ws.send(JSON.stringify({ type: 'output', data: 'cupid> ' }));
        return;
      }

      if (!query) {
        ws.send(JSON.stringify({ type: 'output', data: '\r\ncupid> ' }));
        return;
      }

      // C 엔진 실행
      const result = await executeEngine(query);

      // 터미널 출력용 텍스트 생성
      let output = '\r\n';
      if (result.success) {
        output += `[${result.type}] ${result.message}\r\n`;
        if (Array.isArray(result.data)) {
          output += '┌──────────┬──────┬──────┐\r\n';
          output += '│ 이름     │ MBTI │ 취미 │\r\n';
          output += '├──────────┼──────┼──────┤\r\n';
          result.data.forEach(row => {
            output += `│ ${(row.name || '').padEnd(8)} │ ${(row.mbti || '').padEnd(4)} │ ${(row.hobby || '').padEnd(4)} │\r\n`;
          });
          output += '└──────────┴──────┴──────┘\r\n';
        }
      } else {
        output += `[오류] ${result.message}\r\n`;
      }
      output += '\r\ncupid> ';

      // 터미널에 텍스트 출력
      ws.send(JSON.stringify({ type: 'output', data: output }));

      // 파싱 트리는 별도로 전송 (React Flow에서 사용)
      if (result.parseTree) {
        ws.send(JSON.stringify({ type: 'parseTree', data: result.parseTree }));
      }

      // 매칭 결과도 별도 전송 (데이트 매칭 UI에서 사용)
      if (result.type === 'MATCH') {
        ws.send(JSON.stringify({ type: 'matchResult', data: result.data }));
      }
    }
  });

  ws.on('close', () => console.log('[터미널] 연결 종료'));
});

// ─── 서버 시작 ───
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Cupid SQL Backend Server`);
  console.log(`   REST API: http://localhost:${PORT}/api/query`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   C엔진 경로: ${ENGINE_PATH}`);
  console.log(`\n   C엔진이 없으면 자동으로 Mock 모드로 작동합니다.\n`);
});
