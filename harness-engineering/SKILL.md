---
name: harness-engineering
description: |
  네이티브 엔진(C/C++/Rust 바이너리)을 Node.js 하네스로 감싸서 웹 풀스택 시스템으로 확장하는 아키텍처 설계 및 구현 스킬.
  이 스킬은 다음 상황에서 반드시 사용한다:
  - "C 프로그램을 웹으로 올리고 싶다", "CLI 프로그램에 웹 UI를 붙이고 싶다"
  - "하네스", "브릿지", "래퍼", "child_process로 실행" 언급 시
  - 네이티브 바이너리의 stdin/stdout을 Node.js에서 제어하려는 모든 경우
  - Agent.md, 역할분담 문서, 프로젝트 명세서를 만들어야 할 때
  - 팀 프로젝트에서 C엔진 + 웹 프론트엔드 구조를 잡아야 할 때
  - "코드를 안 건드리고 감싸서 확장하고 싶다"는 의도가 보일 때
  네이티브 프로그램의 코드를 직접 수정하지 않고, 그 위에 계층을 쌓아 올리는 것이 핵심 철학이다.
---

# Harness Engineering

네이티브 바이너리를 한 줄도 수정하지 않고, Node.js 하네스 계층으로 감싸서 웹 시스템으로 확장하는 아키텍처 패턴.

이 스킬의 철학: **코어는 건드리지 않는다.** 코어 엔진은 독립 실행 가능한 상태를 유지하고, 그 위에 하네스 → 프론트엔드를 계층적으로 쌓는다.

---

## 전체 흐름

이 스킬을 사용하면 아래 순서로 작업이 진행된다:

```
Phase 1: 코어 엔진 분석/구축
Phase 2: Agent.md 명세서 작성
Phase 3: 하네스 계층 구현
Phase 4: 프론트엔드 연결
Phase 5: 역할분담 문서 생성
Phase 6: 통합 테스트
```

각 Phase는 독립적으로도 실행 가능하다. 사용자가 "Agent.md만 만들어줘"라고 하면 Phase 2만 실행하고, "전체 프로젝트 세팅해줘"라면 1~6을 순서대로 진행한다.

---

## Phase 1: 코어 엔진 분석/구축

코어 엔진이 이미 있으면 분석하고, 없으면 만든다.

### 분석해야 할 것

코어 엔진의 **입출력 규약(Protocol)**을 정확히 파악하는 것이 모든 것의 시작이다. 하네스는 이 규약에 맞춰 구현되기 때문이다.

파악할 항목:

1. **실행 방법**: 어떻게 실행하는가? (`./engine`, `./engine input.txt`, `./engine --query "..."`)
2. **입력 채널**: stdin인가? 커맨드라인 인자인가? 파일인가?
3. **출력 형식**: stdout에 뭘 찍는가? 텍스트? JSON? 바이너리?
4. **프롬프트 패턴**: 대화형이면 프롬프트가 있는가? (`db > `, `>>> `, `> `)
5. **종료 방법**: 어떻게 종료하는가? (`.exit`, `quit`, EOF, Ctrl+C)
6. **종료 코드**: 성공/실패를 종료 코드로 구분하는가?
7. **부수효과**: 파일을 생성/수정하는가? 어디에?

### 분석 결과 정리 형식

분석이 끝나면 아래 형식으로 정리한다. 이 정리가 Agent.md의 "C 엔진 인터페이스 명세" 섹션이 된다:

```markdown
## 엔진 인터페이스 명세

실행: ./db
입력: stdin (한 줄씩 SQL 쿼리)
종료: ".exit\n" 전송
프롬프트: "db > "

### 출력 패턴

성공 (데이터 있음):
  db > (1, user1, user1@email.com)
  Executed.

성공 (데이터 없음):
  db > Executed.

에러:
  db > Error: <에러 메시지>
```

### 코어 엔진 구축 (없을 때)

코어 엔진을 새로 만들어야 하면, 모듈 분리 원칙을 따른다:

```
core/src/
├── main.c       # 진입점: CLI 루프 또는 파일 실행
├── parser.c/h   # 입력 파싱 (토크나이저 → 파서 → 구조체)
├── executor.c/h # 파싱 결과를 실행
├── storage.c/h  # 데이터 저장/조회 (파일 I/O)
└── Makefile
```

이 구조가 중요한 이유: 각 모듈이 독립적으로 테스트 가능하고, 팀원별로 나눠서 작업할 수 있다. parser만 담당하는 사람, storage만 담당하는 사람이 충돌 없이 병렬 작업이 가능하다.

코어 엔진은 반드시 **단독 실행이 가능한 상태**로 만든다. 하네스 없이도 터미널에서 바로 쓸 수 있어야 한다.

---

## Phase 2: Agent.md 명세서 작성

Agent.md는 AI 에이전트(Codex, Claude 등)가 읽고 바로 작업을 시작할 수 있도록 프로젝트의 현재 상태, 목표 상태, 작업 목록을 명세하는 문서다.

### Agent.md 필수 섹션

```markdown
# Agent.md — [프로젝트명] 하네스 엔지니어링 명세

## 프로젝트 개요
한 줄 설명.

## 현재 상태 (AS-IS)
- 완성된 것: 파일 목록, 동작 확인 예시
- 미완성인 것: 뭐가 안 되는지

## 목표 상태 (TO-BE): 하네스 아키텍처
- 변경될 폴더 구조 (트리 다이어그램)
- 신규 생성 파일 목록

## 데이터 흐름
사용자 → server.js → bridge.js → 코어엔진 → protocol.js → 프론트엔드
(ASCII 다이어그램으로 그린다)

## 작업 목록
TASK 1 ~ N, 각각:
- 목적 (한 줄)
- 파일 (어떤 파일을 만들거나 수정하는지)
- 인터페이스 (함수 시그니처, 입출력 형식)
- 검증 방법 (이걸 어떻게 확인하는지)

## 코어 엔진 인터페이스 명세 (수정 금지 구역)
Phase 1에서 분석한 입출력 규약을 여기에 복사.
"하네스는 이 규약에 맞춰 구현한다. 코어 코드는 수정하지 않는다."

## 실행 명령어 요약
빌드, 실행, 테스트 명령어를 한곳에 모아둔다.
```

### TASK 작성 원칙

각 TASK는 AI가 읽고 바로 코딩을 시작할 수 있을 만큼 구체적이어야 한다:

- **함수 시그니처**를 적는다 (이름, 파라미터, 반환값, JSDoc 주석)
- **핵심 구현 로직**을 pseudo-code로 보여준다
- **엣지 케이스**를 나열한다 (타임아웃, 바이너리 없음, 빈 입력)
- **검증 코드**를 적는다 (이 테스트가 통과하면 완료)

나쁜 예: "bridge.js를 만든다"
좋은 예: "bridge.js — child_process.spawn으로 코어엔진을 실행하고 stdin에 쿼리를 보내고 stdout을 수집하는 함수. 타임아웃 5초. 바이너리 없으면 에러 객체 반환."

### 폴더 구조 패턴

하네스 아키텍처의 표준 폴더 구조:

```
project-root/
├── core/              ← 네이티브 엔진 (수정 금지)
│   ├── src/           # 소스 코드
│   ├── tests/         # 엔진 단위 테스트
│   └── <binary>       # 컴파일된 실행파일
│
├── harness/           ← Node.js 하네스 계층
│   ├── bridge.js      # 엔진 실행/결과 수집 (유일한 접점)
│   ├── protocol.js    # 엔진 출력 ↔ JSON 변환
│   ├── server.js      # API 서버 (bridge + protocol 조합)
│   └── tests/         # 하네스 테스트
│
├── frontend/          ← 웹 UI
│   └── src/
│
├── data/              ← 공유 데이터 (루트에 위치)
│
├── tests/             ← 통합/E2E 테스트
├── Agent.md           ← AI 에이전트용 명세서
├── ROLES.md           ← 팀 역할분담
└── README.md
```

핵심: `core/`는 독립적이다. `harness/`를 지워도 `core/`는 그대로 동작한다.

---

## Phase 3: 하네스 계층 구현

하네스는 3개의 모듈로 구성된다. 각각의 역할이 명확히 분리되어 있다.

### bridge.js — 엔진 실행기

코어 엔진 바이너리를 `child_process`로 실행하고 결과를 수집하는 **유일한 접점**.

프로젝트에서 코어 엔진을 직접 호출하는 코드는 이 파일에만 존재해야 한다. server.js가 직접 `spawn`을 호출하면 안 된다.

```javascript
const { spawn } = require('child_process');
const path = require('path');

const ENGINE_PATH = path.join(__dirname, '..', 'core', '<binary>');
const PROJECT_ROOT = path.join(__dirname, '..');

/**
 * 코어 엔진에 명령을 보내고 결과를 받는다
 * @param {string} command - 엔진에 보낼 명령 문자열
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
 */
async function execute(command) {
    return new Promise((resolve, reject) => {
        const proc = spawn(ENGINE_PATH, [], {
            cwd: PROJECT_ROOT,
            timeout: 5000
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

        // 명령 전송 + 종료 명령
        proc.stdin.write(command + '\n');
        proc.stdin.write('.exit\n');  // ← 엔진의 종료 명령에 맞게 수정
        proc.stdin.end();

        proc.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code });
        });

        proc.on('error', (err) => {
            reject(new Error(`엔진 실행 실패: ${err.message}`));
        });
    });
}
```

bridge.js를 만들 때 반드시 확인할 것:
- `cwd`를 프로젝트 루트로 설정해서 데이터 파일 경로가 맞는지
- 종료 명령(`.exit`, `quit` 등)이 엔진의 실제 종료 명령과 일치하는지
- 타임아웃을 설정해서 엔진이 멈췄을 때 무한 대기하지 않는지

### protocol.js — 번역기

코어 엔진의 텍스트 출력을 프론트엔드가 소비할 수 있는 JSON으로 변환한다. 반대 방향(JSON → 엔진 입력 문자열)도 필요하면 여기에 넣는다.

protocol.js를 설계하는 방법:

1. 엔진의 모든 출력 패턴을 나열한다 (Phase 1에서 파악한 것)
2. 각 패턴에 대응하는 JSON 구조를 정의한다
3. 정규식 또는 파서로 텍스트 → JSON 변환 함수를 만든다

```javascript
/**
 * 엔진 stdout을 JSON으로 변환
 * @param {string} raw - bridge.js가 반환한 stdout 원본
 * @param {string} command - 원래 명령 (타입 판별용)
 * @returns {object} 프론트엔드용 JSON
 */
function parseResponse(raw, command) {
    // 1. 프롬프트 문자열 제거 ("db > " 등)
    // 2. 에러 패턴 검사 ("Error:" 로 시작하는 줄)
    // 3. 데이터 행 파싱 (엔진 출력 형식에 맞는 정규식)
    // 4. 성공/실패 판정 ("Executed." 포함 여부)
}
```

protocol.js는 **엔진의 출력 형식이 바뀌면 여기만 수정하면 된다**는 점에서 중요하다. server.js나 프론트엔드 코드에 엔진 출력 파싱 로직이 흩어져 있으면 안 된다.

### server.js — API 서버

bridge와 protocol을 조합해서 프론트엔드에 API를 제공한다.

```javascript
const bridge = require('./bridge');
const protocol = require('./protocol');

// REST API
app.post('/api/query', async (req, res) => {
    const { command } = req.body;
    const raw = await bridge.execute(command);
    const result = protocol.parseResponse(raw.stdout, command);
    res.json(result);
});

// WebSocket (실시간 터미널용)
wss.on('connection', (ws) => {
    ws.on('message', async (msg) => {
        const { type, data } = JSON.parse(msg);
        if (type === 'command') {
            const raw = await bridge.execute(data);
            ws.send(JSON.stringify({
                type: 'output',
                data: raw.stdout
            }));
            ws.send(JSON.stringify({
                type: 'result',
                data: protocol.parseResponse(raw.stdout, data)
            }));
        }
    });
});
```

server.js는 bridge와 protocol만 호출한다. 엔진 실행 로직이나 텍스트 파싱 로직이 server.js에 직접 들어가면 안 된다.

---

## Phase 4: 프론트엔드 연결

프론트엔드는 harness/server.js의 API만 호출한다. 코어 엔진의 존재를 모른다.

### 권장 구성

```
frontend/src/
├── App.jsx              # 레이아웃 + 탭 전환
└── components/
    ├── Terminal.jsx      # WebSocket 터미널 (harness와 실시간 통신)
    ├── Visualization.jsx # 데이터 시각화 (React Flow, D3 등)
    └── DataPage.jsx      # CRUD UI (REST API 호출)
```

### 개발 순서

프론트엔드는 하네스 완성 전에도 개발할 수 있다. Mock 데이터를 넣어두고 UI를 먼저 만든 뒤, 하네스가 완성되면 Mock을 실제 API 호출로 교체한다.

```javascript
// 개발 중: Mock
const result = { rows: [{ id: 1, name: "test" }] };

// 하네스 완성 후: 실제 API
const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'select' })
});
const result = await res.json();
```

이 덕분에 프론트엔드 담당자와 하네스 담당자가 병렬로 작업할 수 있다.

---

## Phase 5: 역할분담 문서 (ROLES.md)

팀 프로젝트일 때 ROLES.md를 생성한다.

### ROLES.md 필수 구성

```markdown
# 역할분담

## 팀 구성
| 이름 | 포지션 | 핵심 키워드 |

## 현재 완료된 것
무엇이 이미 동작하는지 코드 예시와 함께.

## 각자 할 일
### [이름] — [포지션]
  1단계: ...
  2단계: ...
  산출물: 체크리스트

## 작업 순서 타임라인
시간대별 누가 뭘 하는지 ASCII 다이어그램.

## 발표 데모 시나리오
분 단위로 뭘 보여줄지.

## 참고 문서
Agent.md, README.md 등 링크.
```

### 역할 배정 원칙

하네스 아키텍처에서 자연스러운 역할 분리:

| 역할 | 담당 영역 | 독립성 |
|------|-----------|--------|
| 코어 엔진 | core/ 전체, parser/executor/storage | 하네스 없이 독립 개발 가능 |
| 하네스 브릿지 | harness/ 전체, bridge/protocol/server | 코어 바이너리만 있으면 개발 가능 |
| 프론트엔드 | frontend/ 전체, UI/시각화 | Mock 데이터로 독립 개발 가능 |

세 역할 모두 다른 역할이 완성되기 전에 자기 작업을 시작할 수 있다. 이것이 하네스 아키텍처의 가장 큰 장점이다.

### 의존성 & 병렬화

```
코어 엔진 ──────────────────────────────→ (완료)
하네스 브릿지 ──bridge.js──protocol.js──server.js──→ (완료)
프론트엔드 ──UI 개발(Mock)──────────하네스 연결──→ (완료)
                                    ↑
                              하네스 완성 시점에 합류
```

코어 엔진과 프론트엔드는 처음부터 병렬 진행 가능. 하네스는 코어 바이너리가 있으면 시작 가능 (코어 코드 완성이 아니라 컴파일 가능 상태면 됨).

---

## Phase 6: 통합 테스트

### 3단계 테스트 전략

```
1. 코어 단위 테스트     → core/tests/
2. 하네스 단위 테스트   → harness/tests/
3. E2E 통합 테스트      → tests/
```

### E2E 테스트 패턴

```bash
# harness 서버 시작
node harness/server.js &
SERVER_PID=$!
sleep 1

# API로 코어 엔진 기능 테스트
curl -s -X POST localhost:3001/api/query \
  -H 'Content-Type: application/json' \
  -d '{"command":"insert 1 user1 user1@email.com"}' | jq '.success'
# 기대: true

curl -s -X POST localhost:3001/api/query \
  -H 'Content-Type: application/json' \
  -d '{"command":"select"}' | jq '.rows | length'
# 기대: 1 이상

kill $SERVER_PID
```

이 테스트가 통과하면 "브라우저 → harness → 코어 엔진 → 파일 DB → 결과 반환" 전체 파이프라인이 동작하는 것이다.

---

## 참고: 언제 이 스킬을 쓰지 않는가

- 코어 엔진 자체만 만들면 되는 경우 (웹 확장이 필요 없을 때)
- 이미 REST API가 있는 서버를 프론트엔드에 연결하는 경우 (하네스가 아니라 일반 API 클라이언트)
- 코어 엔진의 코드를 직접 수정해서 JSON을 출력하게 바꿀 수 있는 경우 (하네스 대신 엔진 자체를 웹 서버로 만드는 접근)

하네스 패턴이 빛나는 순간: "이 바이너리는 건드리면 안 되는데, 웹에서 쓰고 싶다."

---

## 빠른 시작 체크리스트

새 프로젝트에 하네스를 적용할 때:

- [ ] 코어 엔진 입출력 규약 문서화 (Phase 1)
- [ ] Agent.md 작성 — AS-IS, TO-BE, TASK 목록 (Phase 2)
- [ ] harness/bridge.js — 엔진 실행 + stdout 수집 (Phase 3)
- [ ] harness/protocol.js — 텍스트 → JSON 변환 (Phase 3)
- [ ] harness/server.js — API 서버 (Phase 3)
- [ ] frontend/ — Mock 데이터로 UI 개발 → harness 연결 (Phase 4)
- [ ] ROLES.md — 팀원별 할일 + 타임라인 (Phase 5)
- [ ] E2E 테스트 통과 확인 (Phase 6)
