# 역할분담 — Cupid SQL Processor

## 팀 구성

| 이름 | 포지션 | 핵심 키워드 |
|------|--------|-------------|
| 세민 | CLI + 하네스 | C엔진 CLI, Node.js bridge, 프로젝트 통합 |
| 규민 | 파싱 시각화 | React Flow, 프론트엔드 UI, 파싱 트리 렌더링 |
| 규태 | C엔진 코어 | parser.c, executor.c, storage.c, 테스트 |

---

## 현재 완료된 것

C엔진이 동작한다. 아래가 실제로 돌아간다:

```
db > insert 1 user1 user1@email.com
Executed.
db > select
(1, user1, user1@email.com)
Executed.
```

파일: `engine/src/` (main.c, parser.c, executor.c, storage.c)
테스트: 15개 전부 통과

---

## 각자 할 일

### 규태 — C엔진 코어 강화

규태는 C엔진의 주인이다. 코드를 완전히 이해하고 설명할 수 있어야 한다.

**1단계: 코드 완전 이해 (필수)**

발표 때 "이 코드 설명해보세요" 질문이 온다. 아래 파일을 한 줄씩 읽고 설명할 수 있어야 한다.

- `parser.c` — tokenize() 함수가 SQL 문자열을 어떻게 토큰으로 쪼개는지
- `parser.c` — parse_insert(), parse_select()가 토큰을 어떻게 Statement 구조체로 만드는지
- `executor.c` — execute_statement()가 어떻게 storage 함수를 호출하는지
- `storage.c` — CSV 파일을 어떻게 읽고 쓰는지, 중복키 검사 로직

각 함수의 흐름을 종이에 그려보는 걸 추천한다.

**2단계: 엣지케이스 보강**

현재 안 되는 것들을 추가한다:

```
db > insert 1 user1 user1@email.com
Executed.
db > insert 1 user1 user1@email.com
Error: Duplicate key '1'.            ← 이건 된다

db > select from users where id = 999
                                      ← 결과 없을 때 메시지가 없다. "No results." 추가

db > INSERT INTO users VALUES (1, '', '');
                                      ← 빈 문자열 처리 확인

db > select from nonexistent_table
                                      ← 존재하지 않는 테이블 처리
```

수정 파일: `executor.c`, `storage.c`

**3단계: DELETE 또는 UPDATE 추가 (차별화)**

시간이 남으면 아래 중 하나를 추가한다:

```sql
DELETE FROM users WHERE id = 1;
UPDATE users SET username = 'newname' WHERE id = 1;
```

수정 파일: `parser.c` (새 StatementType 추가), `executor.c` (새 execute 함수), `storage.c` (파일 수정 로직)

**산출물:**
- [ ] 코드 흐름 설명 준비 (발표용)
- [ ] 엣지케이스 테스트 추가 (`engine/tests/run_tests.sh`에 케이스 추가)
- [ ] (선택) DELETE 또는 UPDATE 구현

---

### 세민 — 하네스 브릿지 + 프로젝트 통합

세민은 C엔진과 웹을 연결하는 다리를 만든다.

**1단계: 폴더 구조 정리**

```bash
# engine/ → core/ 이름 변경 (또는 유지해도 됨, 팀 합의)
# 중요한 건 harness/ 폴더를 만드는 것
mkdir -p harness
```

**2단계: bridge.js 구현**

C엔진을 Node.js에서 실행하고 결과를 받아오는 핵심 모듈.

파일: `harness/bridge.js`

```javascript
// 이것만 하면 된다:
// 1. child_process.spawn으로 ./engine/db 실행
// 2. stdin에 쿼리 + ".exit" 전송
// 3. stdout 수집해서 반환
```

이 파일이 프로젝트의 핵심 접점이다. Agent.md의 TASK 2를 참고한다.

**3단계: protocol.js 구현**

C엔진 출력 텍스트를 JSON으로 변환.

파일: `harness/protocol.js`

```
입력: "db > (1, user1, user1@email.com)\nExecuted.\ndb > Bye."
출력: { success: true, rows: [{ id: 1, username: "user1", email: "user1@email.com" }] }
```

Agent.md의 TASK 3을 참고한다.

**4단계: server.js 구현**

Express + WebSocket 서버. bridge와 protocol을 조합.

파일: `harness/server.js`

```
POST /api/query  { "query": "select" }  →  JSON 결과 반환
WebSocket        command → output/result
```

Agent.md의 TASK 4를 참고한다.

**산출물:**
- [ ] `harness/bridge.js` — C엔진 실행 브릿지
- [ ] `harness/protocol.js` — 텍스트→JSON 변환
- [ ] `harness/server.js` — API 서버
- [ ] bridge가 C엔진을 정상 호출하는지 테스트 통과

---

### 규민 — 프론트엔드 + 파싱 트리 시각화

규민은 웹 브라우저에서 보이는 모든 것을 담당한다.

**1단계: 프론트엔드 로컬 실행 확인**

```bash
cd frontend
npm install
npm run dev
# localhost:3000 에서 화면 뜨는지 확인
```

현재 Mock 데이터로 동작하는 상태다. 세민이 harness를 완성하기 전까지 Mock으로 UI를 먼저 만든다.

**2단계: Terminal.jsx 개선**

파일: `frontend/src/components/Terminal.jsx`

현재 기본 터미널이 있다. 개선할 것:
- 글꼴, 색상 다듬기 (JetBrains Mono 사용 중)
- 명령어 입력 시 syntax highlighting (INSERT는 파란색, SELECT는 초록색 등)
- 결과 테이블 출력을 예쁘게 (ASCII 테이블 or HTML 테이블)
- 에러 메시지 빨간색 표시

**3단계: ParseTree.jsx — React Flow 시각화 (핵심 차별화)**

파일: `frontend/src/components/ParseTree.jsx`

SQL 쿼리가 실행되면, 파싱 트리를 React Flow로 시각화한다.

```
        SELECT
       /      \
    FROM      WHERE
     |        /   \
   users   id      1
```

현재 기본 구조가 있다. 개선할 것:
- 노드 색상: 키워드(보라), 테이블명(파랑), 값(초록), 연산자(노랑)
- 애니메이션: 쿼리 실행 시 노드가 하나씩 나타나는 효과
- 레이아웃: dagre 라이브러리로 자동 트리 배치

**4단계: harness 연결 (세민 완료 후)**

세민이 harness를 완성하면:
- Mock 데이터 삭제
- WebSocket으로 harness에 연결
- 실제 C엔진 결과를 화면에 표시

Agent.md의 TASK 5를 참고한다.

**산출물:**
- [ ] Terminal.jsx UI 개선
- [ ] ParseTree.jsx React Flow 시각화 완성
- [ ] harness 연결 (세민 완료 후)

---

## 작업 순서 타임라인

```
                  규태              세민              규민
                  ────              ────              ────
  오전        코드 이해          폴더 정리          npm install
              parser.c 분석      harness/ 생성      프론트 로컬 실행
                  │                  │                  │
                  ▼                  ▼                  ▼
  점심 전     엣지케이스         bridge.js          Terminal.jsx
              테스트 추가        protocol.js        UI 개선
                  │                  │                  │
                  ▼                  ▼                  ▼
  오후        (선택)             server.js          ParseTree.jsx
              DELETE 구현        API 테스트          React Flow
                  │                  │                  │
                  └──────────────────┼──────────────────┘
                                     ▼
  저녁                      harness ↔ frontend 연결
                            통합 테스트
                            README.md 최종 정리
                                     │
                                     ▼
  밤                          발표 준비 (4분)
                            데모 시나리오 리허설
```

---

## 발표 데모 시나리오 (4분)

**1분 — 프로젝트 소개 + 아키텍처**
- README.md 기반 설명
- "입력(SQL) → 파싱 → 실행 → 파일 저장" 흐름 한 줄로 설명

**1분 — C엔진 CLI 데모**
- 터미널에서 `./db` 실행
- insert 3건 → select → 과제 예시 재현
- `./db input.sql` 파일 실행도 시연

**1분 — 웹 데모 (차별화)**
- 브라우저에서 웹 터미널 실행
- 같은 SQL 입력 → 결과 표시
- React Flow 파싱 트리 시각화 시연

**30초 — 테스트**
- `bash tests/run_tests.sh` 실행 → 전부 통과 보여주기

**30초 — 핵심 코드 설명**
- parser.c의 tokenize → parse 흐름 한 줄 설명
- "C엔진은 수정 없이, Node.js 하네스가 감싸서 웹으로 확장했습니다"

---

## 참고 문서

| 문서 | 위치 | 내용 |
|------|------|------|
| Agent.md | 프로젝트 루트 | 하네스 아키텍처 상세 명세, TASK별 인터페이스 정의 |
| README.md | 프로젝트 루트 | 빌드/실행 방법, 프로젝트 구조 |
| parser.h | engine/src/ | SQL 파서 인터페이스 (Statement, Row, Token 구조체) |
| executor.h | engine/src/ | 실행기 인터페이스 (ExecuteResult 코드) |
| storage.h | engine/src/ | 저장소 인터페이스 (RowSet, CRUD 함수) |
