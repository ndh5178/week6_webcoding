# Agent.md — Cupid SQL Processor 하네스 엔지니어링 명세

## 프로젝트 개요

크래프톤 정글 WEEK6 과제: C언어 기반 SQL 처리기.
텍스트 파일로 작성된 SQL문을 CLI를 통해 SQL처리기에 전달하고, 파일 기반 DB에 저장/조회한다.

---

## 현재 상태 (AS-IS)

### 완성된 것: C 엔진 (engine/)
- `engine/src/main.c` — 대화형 CLI (`db >` 프롬프트) + .sql 파일 실행
- `engine/src/parser.c/.h` — SQL 토크나이저 + 파서 (INSERT, SELECT, WHERE)
- `engine/src/executor.c/.h` — 파싱된 Statement 실행
- `engine/src/storage.c/.h` — CSV 파일 기반 DB (data/<table>.csv)
- `engine/db` — 컴파일된 실행파일
- `engine/tests/run_tests.sh` — 15개 자동화 테스트 (전부 통과)

### 동작 확인된 CLI 예시
```
db > select
db > insert 1 user1 user1@email.com
Executed.
db > insert 2 user2 user2@email.com
Executed.
db > select
(1, user1, user1@email.com)
(2, user2, user2@email.com)
Executed.
```

### 미완성: 웹 프론트엔드/백엔드 (하네스 미적용)
- `backend/server.js` — Mock 데이터 기반, 실제 C 엔진과 연결 안 됨
- `frontend/` — React 앱 껍데기만 존재, npm install 안 됨

---

## 목표 상태 (TO-BE): 하네스 아키텍처

### 폴더 구조 변경

```
week6_webcoding-main/
│
├── core/                          ← (engine/ 에서 이름 변경) 순수 C 엔진
│   ├── src/
│   │   ├── main.c                 # CLI 진입점 (단독 실행 유지)
│   │   ├── parser.c / parser.h    # SQL 파싱 (변경 없음)
│   │   ├── executor.c / executor.h # SQL 실행 (변경 없음)
│   │   ├── storage.c / storage.h  # 파일 DB (변경 없음)
│   │   └── Makefile               # data/ 경로를 ../data → ../../data 로 변경
│   ├── db                         # 컴파일된 바이너리
│   └── tests/
│       ├── run_tests.sh
│       └── sample.sql
│
├── harness/                       ← ★ 신규 생성
│   ├── package.json               # express, ws, cors
│   ├── bridge.js                  # C 엔진 프로세스 실행/결과 수집
│   ├── protocol.js                # C 엔진 텍스트 출력 ↔ JSON 변환
│   ├── server.js                  # Express API + WebSocket
│   └── tests/
│       └── bridge.test.js         # bridge 단위 테스트
│
├── frontend/                      ← 기존 유지, harness 연결로 수정
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── Terminal.jsx       # harness WebSocket 연결
│   │       ├── ParseTree.jsx      # harness에서 받은 트리 렌더링
│   │       └── DateMatchPage.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── data/                          ← 프로젝트 루트로 이동 (공유 DB)
│   └── users.csv
│
├── tests/                         ← 통합 테스트
│   └── e2e.sh                     # 전체 파이프라인 테스트
│
├── Agent.md                       ← 이 파일
└── README.md
```

---

## 데이터 흐름

```
[사용자 브라우저]
       │
       │ WebSocket / HTTP
       ▼
[harness/server.js]          ← 진입점: 프론트엔드 요청 수신
       │
       │ 함수 호출
       ▼
[harness/bridge.js]          ← 핵심: child_process.execFile로 C 엔진 실행
       │
       │ stdin/stdout 파이프
       ▼
[core/db]                    ← C 엔진 바이너리 (수정 없음)
       │
       │ stdout 텍스트 출력
       ▼
[harness/protocol.js]        ← 텍스트 → JSON 변환
       │
       │ JSON
       ▼
[harness/server.js]          ← 프론트엔드로 JSON 응답 전송
       │
       ▼
[frontend/Terminal.jsx]      ← 터미널 UI에 결과 표시
[frontend/ParseTree.jsx]     ← 파싱 트리 시각화
```

---

## 작업 목록

### TASK 1: 폴더 구조 재배치

**목적:** engine/ → core/ 이름 변경, data/를 루트로 이동, backend/ → harness/로 교체

**작업 내용:**
1. `engine/` 폴더를 `core/`로 이름 변경
2. `engine/data/` 를 프로젝트 루트 `data/`로 이동
3. `core/src/storage.c`의 `DATA_DIR` 상수를 `"data"` → `"../../data"` 또는 실행 위치 기준으로 수정
   - 또는 `main.c`에서 `chdir`로 프로젝트 루트 기준 실행되게 처리
4. `core/src/Makefile`의 경로 업데이트
5. `core/tests/run_tests.sh`의 경로 업데이트
6. `backend/` 폴더 삭제 (harness/로 대체)
7. 컴파일 & 기존 15개 테스트 재확인

**검증:**
```bash
cd core/src && make && cd ../.. && core/db
# db > select 이 정상 동작하면 완료
```

---

### TASK 2: harness/bridge.js 구현

**목적:** Node.js에서 C 엔진을 프로세스로 실행하고, stdout을 캡처하는 브릿지

**파일:** `harness/bridge.js`

**인터페이스:**
```javascript
/**
 * C 엔진에 SQL 쿼리를 보내고 결과를 받아온다
 *
 * @param {string} query - SQL 쿼리 문자열 (예: "select", "insert 1 user1 user1@email.com")
 * @returns {Promise<string>} - C 엔진의 stdout 원본 텍스트
 *
 * 내부 동작:
 *   1. child_process.execFile로 core/db 실행
 *   2. stdin으로 query + "\n" + ".exit\n" 전달
 *   3. stdout 전체를 수집하여 반환
 *
 * 엣지 케이스:
 *   - 엔진이 5초 내 응답 없으면 타임아웃
 *   - 엔진 바이너리가 없으면 명확한 에러 메시지
 *   - 빈 쿼리 → 빈 결과 반환
 */
async function executeQuery(query) { }

/**
 * C 엔진 바이너리 경로와 존재 여부 확인
 * @returns {{ path: string, exists: boolean }}
 */
function getEngineStatus() { }

module.exports = { executeQuery, getEngineStatus };
```

**핵심 구현 로직:**
```javascript
// bridge.js 핵심부 pseudo-code
const { spawn } = require('child_process');
const path = require('path');

const ENGINE_PATH = path.join(__dirname, '..', 'core', 'db');
const PROJECT_ROOT = path.join(__dirname, '..');

function executeQuery(query) {
    return new Promise((resolve, reject) => {
        const proc = spawn(ENGINE_PATH, [], {
            cwd: PROJECT_ROOT,          // ★ data/ 경로가 맞도록 프로젝트 루트에서 실행
            timeout: 5000
        });

        let stdout = '';
        proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });

        proc.stdin.write(query + '\n');
        proc.stdin.write('.exit\n');
        proc.stdin.end();

        proc.on('close', () => {
            // "db > " 프롬프트 제거 후 반환
            resolve(stdout);
        });
    });
}
```

**검증:**
```javascript
// bridge.test.js
const { executeQuery } = require('../bridge');

// 테스트 1: SELECT
const result = await executeQuery('select');
assert(result.includes('Executed'));

// 테스트 2: INSERT → SELECT 확인
await executeQuery('insert 999 testbridge test@bridge.com');
const after = await executeQuery('select');
assert(after.includes('testbridge'));
```

---

### TASK 3: harness/protocol.js 구현

**목적:** C 엔진의 텍스트 출력을 프론트엔드가 쓸 수 있는 JSON으로 변환

**파일:** `harness/protocol.js`

**C 엔진 출력 형식 (입력):**
```
db > (1, user1, user1@email.com)
(2, user2, user2@email.com)
Executed.
db >
```

**JSON 출력 형식 (결과):**
```json
{
  "success": true,
  "type": "SELECT",
  "rows": [
    { "id": 1, "username": "user1", "email": "user1@email.com" },
    { "id": 2, "username": "user2", "email": "user2@email.com" }
  ],
  "message": "Executed.",
  "rowCount": 2
}
```

**인터페이스:**
```javascript
/**
 * C 엔진 stdout 텍스트를 JSON으로 변환
 *
 * @param {string} raw - bridge.js가 반환한 stdout 원본
 * @param {string} query - 원래 쿼리 (타입 판별용)
 * @returns {object} - 프론트엔드용 JSON 객체
 *
 * 파싱 규칙:
 *   "(숫자, 문자열, 문자열)" 패턴 → Row 배열로 변환
 *   "Executed." → success: true
 *   "Error:" → success: false, message에 에러 내용
 *   "Duplicate key" → success: false, type: "DUPLICATE_KEY"
 *   "Unrecognized" → success: false, type: "UNRECOGNIZED"
 */
function parseResponse(raw, query) { }

/**
 * 쿼리 문자열에서 SQL 타입 추출
 * @param {string} query
 * @returns {"INSERT" | "SELECT" | "UNKNOWN"}
 */
function getQueryType(query) { }

module.exports = { parseResponse, getQueryType };
```

**파싱 로직 상세:**
```javascript
// 행 파싱 정규식
const ROW_REGEX = /\((\d+),\s*([^,]+),\s*([^)]+)\)/g;

// "(1, user1, user1@email.com)" → { id: 1, username: "user1", email: "user1@email.com" }
function parseRow(line) {
    const match = ROW_REGEX.exec(line);
    if (!match) return null;
    return {
        id: parseInt(match[1]),
        username: match[2].trim(),
        email: match[3].trim()
    };
}
```

---

### TASK 4: harness/server.js 구현

**목적:** 프론트엔드에 REST API와 WebSocket을 제공

**파일:** `harness/server.js`

**API 엔드포인트:**

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/query` | SQL 쿼리 실행. body: `{ "query": "select" }` |
| GET | `/api/status` | 엔진 상태 확인 |

**WebSocket 프로토콜:**

| 방향 | type | data | 설명 |
|------|------|------|------|
| Client → Server | `command` | `"select"` | SQL 쿼리 전송 |
| Server → Client | `output` | `"(1, user1, ...)\n"` | 터미널 출력 텍스트 |
| Server → Client | `result` | `{ rows: [...] }` | 파싱된 JSON 결과 |
| Server → Client | `error` | `{ message: "..." }` | 에러 |

**server.js 구조:**
```javascript
const bridge = require('./bridge');
const protocol = require('./protocol');

// POST /api/query
app.post('/api/query', async (req, res) => {
    const { query } = req.body;
    const raw = await bridge.executeQuery(query);        // C 엔진 실행
    const result = protocol.parseResponse(raw, query);   // 텍스트 → JSON
    res.json(result);
});

// WebSocket
wss.on('connection', (ws) => {
    ws.on('message', async (msg) => {
        const { type, data } = JSON.parse(msg);
        if (type === 'command') {
            const raw = await bridge.executeQuery(data);
            ws.send(JSON.stringify({ type: 'output', data: raw }));
            ws.send(JSON.stringify({ type: 'result', data: protocol.parseResponse(raw, data) }));
        }
    });
});
```

**포트:** 3001
**프론트엔드 프록시:** vite.config.js에서 `/api` → `localhost:3001`

---

### TASK 5: frontend/ 수정 (harness 연결)

**목적:** 기존 Mock 데이터를 제거하고, harness WebSocket/API와 실제 연결

**수정 파일:**
1. `frontend/src/components/Terminal.jsx`
   - WebSocket URL: `ws://localhost:3001`
   - `type: 'command'`으로 쿼리 전송
   - `type: 'output'`으로 터미널 텍스트 수신
   - `type: 'result'`로 파싱된 데이터 수신
   - Mock 처리 로직(`handleLocalCommand`) 삭제

2. `frontend/src/components/ParseTree.jsx`
   - `result.parseTree` 대신, `result.rows`로부터 트리 생성
   - 또는 harness에서 파싱 트리를 별도 생성해서 전달

3. `frontend/src/components/DateMatchPage.jsx`
   - `fetch('/api/query')` 로 INSERT/SELECT 호출
   - Mock 데이터(`MOCK_PEOPLE`) 삭제

---

### TASK 6: 통합 테스트

**파일:** `tests/e2e.sh`

**테스트 시나리오:**
```bash
# 1. C 엔진 단독 테스트
cd core && bash tests/run_tests.sh

# 2. harness bridge 테스트
cd harness && node tests/bridge.test.js

# 3. API 통합 테스트
# harness 서버 시작 후
curl -X POST http://localhost:3001/api/query \
  -H 'Content-Type: application/json' \
  -d '{"query": "select"}' \
  | jq '.rows'

# 4. 과제 시나리오 재현 (API 경유)
curl -s -X POST localhost:3001/api/query -H 'Content-Type: application/json' -d '{"query":"insert 1 user1 user1@email.com"}'
curl -s -X POST localhost:3001/api/query -H 'Content-Type: application/json' -d '{"query":"insert 2 user2 user2@email.com"}'
curl -s -X POST localhost:3001/api/query -H 'Content-Type: application/json' -d '{"query":"select"}' | jq '.rows | length'
# 기대값: 2
```

---

## 팀원별 작업 배정

| 작업 | 담당 | 의존성 |
|------|------|--------|
| TASK 1: 폴더 재배치 | 세민 | 없음 |
| TASK 2: bridge.js | 세민 | TASK 1 완료 후 |
| TASK 3: protocol.js | 규태 | TASK 2 완료 후 |
| TASK 4: server.js | 세민 | TASK 2, 3 완료 후 |
| TASK 5: frontend 연결 | 규민 | TASK 4 완료 후 |
| TASK 6: 통합 테스트 | 전원 | TASK 5 완료 후 |

**병렬 가능:** TASK 2와 TASK 3은 인터페이스만 합의하면 동시 진행 가능

---

## C 엔진 인터페이스 명세 (수정 금지 구역)

아래는 C 엔진의 입출력 규약이다. harness는 이 규약에 맞춰 구현해야 한다.
C 엔진 코드 자체는 하네스 작업 중 수정하지 않는다.

### 입력 (stdin)
```
<SQL 쿼리>\n
.exit\n
```

### 출력 (stdout)

**SELECT 성공:**
```
db > (1, user1, user1@email.com)
(2, user2, user2@email.com)
Executed.
db > Bye.
```

**INSERT 성공:**
```
db > Executed.
db > Bye.
```

**에러 - 중복 키:**
```
db > Error: Duplicate key '1'.
db > Bye.
```

**에러 - 알 수 없는 명령:**
```
db > Error: Unrecognized command 'blah'.
  Supported: INSERT, SELECT
db > Bye.
```

**에러 - 값 부족:**
```
db > Error: Too few values. Expected: id, username, email.
db > Bye.
```

### 종료 코드
- 정상: 0
- 비정상: 0이 아닌 값 (현재는 모두 0 반환)

---

## 실행 명령어 요약

```bash
# C 엔진 빌드
cd core/src && make

# C 엔진 단독 실행
cd core && ./db

# harness 서버 시작
cd harness && npm install && node server.js

# 프론트엔드 개발 서버
cd frontend && npm install && npm run dev

# 전체 테스트
bash tests/e2e.sh
```
