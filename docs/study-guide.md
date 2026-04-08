# Cupid SQL 완전 정복 가이드 (최종판)

> C 언어 몰라도 OK. 이것만 읽으면 발표 끝.

---

## 1. 이 프로젝트가 뭔데?

한 줄 요약: **웹에서 SQL을 치면, 진짜 C로 만든 엔진이 돌아가서 데이트 매칭 결과를 보여주는 시스템**

비유하면:
- 일반 웹사이트 = 식당에서 전자레인지로 데우는 것
- 우리 프로젝트 = 식당 뒤에 진짜 셰프(C 엔진)가 요리하고, 웨이터(웹)가 갖다 주는 것

---

## 2. 전체 구조 (이것만 이해하면 절반 끝)

```
[사용자가 브라우저에서 SQL 입력 or 프로필 등록]
          |
          v
┌─────────────────────────┐
│  프론트엔드 (React)      │  ← 화면 담당. 3개 패널로 보여줌
│  http://localhost:5173   │
└────────┬────────────────┘
         | WebSocket(터미널) 또는 HTTP(API)
         v
┌─────────────────────────┐
│  백엔드 (Node.js)        │  ← 중간 다리. 프론트↔엔진 연결
│  http://localhost:3001   │
└────────┬────────────────┘
         | C 프로그램 실행 (spawn)
         v
┌─────────────────────────┐
│  C 엔진 (sql-engine)     │  ← 진짜 두뇌. SQL 파싱 + 실행
│  engine/build/sql-engine │
└────────┬────────────────┘
         | 파일 읽기/쓰기
         v
┌─────────────────────────┐
│  데이터 파일 (CSV)       │  ← 데이터 저장소
│  engine/data/profiles.csv│
└─────────────────────────┘
```

**3줄 요약:**
1. 프론트엔드 = 화면 (React)
2. 백엔드 = 연결 다리 (Node.js + WebSocket)
3. C 엔진 = 진짜 SQL 처리하는 프로그램

---

## 3. 화면 구조 (3패널)

```
┌──────────────┬──────────────┬──────────────┐
│   패널 1      │   패널 2      │   패널 3      │
│   CLI         │  Parse Tree  │   Service    │
│              │              │              │
│  실제 터미널   │  SQL 구조를   │  데이트 매칭  │
│  xterm.js로   │  트리 그림으로 │  앱 화면      │
│  C엔진 실행   │  보여줌       │  (내가 만듦)  │
│              │              │              │
│  담당: 세민   │  담당: 규고   │  담당: 규태   │
└──────────────┴──────────────┴──────────────┘
                    통합 담당: 동현
```

### 패널 1 - CLI (세민 담당)
- xterm.js 라이브러리로 **진짜 터미널**을 웹에 띄움
- WebSocket으로 백엔드에 연결 → 백엔드가 쉘 세션을 열고 C 엔진을 실행
- 사용자가 SQL을 치면 C 엔진이 직접 처리
- 예제 SQL 버튼 3개: INSERT demo, SELECT all, SELECT where

### 패널 2 - Parse Tree (규고 담당)
- SQL을 실행하면 그 SQL의 구조를 트리 그림으로 보여줌
- 예: `SELECT * FROM profiles`를 실행하면
  - SELECT 노드 → COLUMNS(*) + FROM(profiles) 형태의 그래프
- ReactFlow 라이브러리 사용

### 패널 3 - Service, 데이트 매칭 (규태, 내가 담당)
- 이름, MBTI, 취미를 입력하면 매칭 상대를 찾아줌
- 프로필 등록 시 INSERT 쿼리로 C 엔진 DB에 저장
- 매칭 시 SELECT로 전체 프로필 가져와서 점수 계산
- 상위 3명을 매칭 카드로 보여줌

---

## 4. 데이터가 흘러가는 과정 (핵심!)

### 예시 1: 사용자가 터미널에서 `SELECT * FROM profiles;` 실행

```
① 사용자가 패널1 터미널에서 SQL 타이핑하고 Enter
   |
② WebSocket으로 백엔드에 전달
   → { type: "run-query", query: "SELECT * FROM profiles;" }
   |
③ 백엔드가 PTY(가상 터미널)를 통해 C 엔진에 쿼리 전달
   |
④ C 엔진 내부에서:
   → parser.c가 SQL 텍스트를 분석
     (SELECT인지 INSERT인지, 테이블 이름 뭔지)
   → executor.c가 storage.c에 "profiles 테이블 데이터 가져와" 요청
   → storage.c가 data/profiles.csv 파일을 읽어서 결과 반환
   → 결과를 화면에 출력:
     (Mina, ENFP, travel)
     (Kim, ISFJ, reading)
     Executed.
   |
⑤ 백엔드가 C 엔진의 출력을 캡처
   → responseProtocol.js가 JSON으로 변환:
   {
     success: true,
     queryType: "SELECT",
     rows: [{name:"Mina", mbti:"ENFP", hobby:"travel"}, ...],
     parseTree: { ... }
   }
   |
⑥ React가 이 JSON을 받아서 3개 패널을 한꺼번에 업데이트
   → 패널1: 터미널에 결과 텍스트 표시
   → 패널2: parseTree로 트리 그림 갱신
   → 패널3: rows로 프로필 목록 업데이트
```

### 예시 2: 서비스 패널에서 프로필 등록 + 매칭

```
① 사용자가 이름/MBTI/취미 입력하고 "내 짝궁 찾기" 클릭
   |
② DateMatchApp이 INSERT 쿼리 생성
   → "INSERT INTO profiles VALUES ('홍길동', 'ENFP', '독서');"
   → POST /api/query 로 백엔드에 전송
   |
③ 백엔드가 C 엔진 실행 → profiles.csv에 한 줄 추가
   |
④ 성공하면 다시 SELECT * FROM profiles; 실행
   → 전체 프로필 목록을 가져옴
   |
⑤ 프론트에서 매칭 점수 계산
   → MBTI 4글자 비교 (글자당 20점) + 취미 일치 (20점)
   → 상위 3명 선택
   |
⑥ 매칭 결과 카드로 표시
   → BEST 뱃지, 매칭률 바, 코멘트
```

---

## 5. C 엔진이 뭘 하는지 (C 몰라도 되는 설명)

### 엔진 = 5개 파일로 구성

| 파일 | 하는 일 | 비유 |
|------|---------|------|
| **main.c** | 프로그램 시작점. SQL 받아서 처리 시작 | 식당 입구 |
| **parser.c** | SQL 텍스트를 분석해서 구조화 | 주문서 해독 |
| **executor.c** | 분석된 SQL을 실제로 실행 | 셰프가 요리 시작 |
| **storage.c** | CSV 파일에 데이터 저장/불러오기 | 냉장고에서 재료 꺼내기 |
| **schema.c** | 테이블 구조 정의 (profiles 테이블) | 메뉴판 |

### main.c (입구)

두 가지 모드가 있음:
1. **대화형 모드(REPL)**: `db >` 프롬프트가 뜨고 SQL을 하나씩 타이핑
   - 패널 1의 터미널이 이 모드를 사용
2. **파일 모드**: SQL 파일을 받아서 실행
   - 백엔드의 HTTP API가 이 모드를 사용

핵심 함수: `run_query(쿼리)`
- parser로 SQL 분석 → executor로 실행 → 결과 출력

### parser.c (주문서 해독)

SQL 텍스트를 받으면 컴퓨터가 이해할 수 있는 구조로 바꿈.

```
입력: "INSERT INTO profiles VALUES ('홍길동', 'ENFP', '독서');"

parser가 만드는 구조:
{
  타입: INSERT
  테이블: profiles
  값들: [홍길동, ENFP, 독서]
}
```

```
입력: "SELECT * FROM profiles WHERE mbti = 'ENFP';"

parser가 만드는 구조:
{
  타입: SELECT
  테이블: profiles
  전체선택: true (*)
  조건: mbti = ENFP
}
```

커서라는 포인터가 SQL 텍스트를 한 글자씩 읽으면서 분석함. 주요 함수들:
- `match_keyword()` - INSERT, SELECT, FROM 같은 키워드 찾기
- `parse_value()` - 따옴표 안의 값 읽기 (예: 'ENFP')
- `parse_insert()` - INSERT 문 전체 분석
- `parse_select()` - SELECT 문 전체 분석

### executor.c (셰프)

parser가 분석한 걸 받아서 실제로 실행.

핵심 함수: `execute_statement(statement, output)`
1. 테이블 스키마 찾기 (schema.c에서)
2. INSERT면 → storage한테 "이 데이터 저장해" 요청
3. SELECT면 → storage한테 "이 조건으로 데이터 가져와" 요청
4. 에러 나면 에러 메시지 설정

### storage.c (냉장고)

데이터를 CSV 파일로 저장하고 읽음. 진짜 단순함.

```
engine/data/profiles.csv 파일 내용:

name,mbti,hobby       ← 첫 줄은 컬럼 이름 (헤더)
Mina,ENFP,travel      ← 데이터 행
Kim,ISFJ,reading      ← 데이터 행
홍길동,ENFP,독서       ← 새로 추가된 행
```

- `storage_insert_row()` = CSV 파일 맨 밑에 한 줄 추가
  - 파일을 "추가 모드(a)"로 열기 → 쉼표로 구분해서 쓰기 → 닫기
- `storage_select_rows()` = CSV 파일 읽어서 조건에 맞는 행만 반환
  - 파일 열기 → 헤더 건너뛰기 → 한 줄씩 읽기 → WHERE 조건 비교 → 맞으면 결과에 추가
- `ensure_data_dir()` = data/ 폴더 없으면 만들기
- `parse_csv_line()` = "Mina,ENFP,travel" → ["Mina", "ENFP", "travel"]

### schema.c (메뉴판)

테이블이 뭐가 있는지 정의. **profiles 테이블 딱 하나**.

```c
SCHEMAS[] = {
    { "profiles", 3, { "name", "mbti", "hobby" } },
    { NULL, 0, { NULL } }  // 끝 표시
};
```

- 테이블 이름: `profiles`
- 3개 컬럼: `name`, `mbti`, `hobby`
- `find_schema("profiles")` → 이 스키마 반환

---

## 6. 백엔드가 뭘 하는지

### server.js (메인 서버)

Express로 웹 서버를 만듦 (포트 3001). **두 가지 연결 방식** 지원:

**1. HTTP API (단발성 요청)**
- `POST /api/query` - SQL 쿼리 실행
  - 프론트가 보냄: `{ "query": "SELECT * FROM profiles;" }`
  - 백엔드가 C 엔진 실행하고 결과를 JSON으로 반환
- `GET /api/health` - 서버 상태 확인

**2. WebSocket (실시간 터미널)**
- `/ws/terminal` - 터미널 세션
  - 패널 1이 이걸로 연결
  - 양방향 실시간 통신 (HTTP는 요청-응답, WebSocket은 계속 연결)
  - 메시지 종류:
    - `terminal-input`: 사용자가 키보드로 친 것
    - `run-query`: 예제 버튼 클릭
    - `terminal-output`: 터미널 화면에 보여줄 텍스트
    - `query-result`: SQL 실행 결과 JSON

**핵심 로직:**
- 터미널 출력에서 `db >` 프롬프트를 감지하면 → "C 엔진이 준비됐다"
- 쿼리 실행 후 다시 `db >` 가 나타나면 → "실행 완료, 결과 파싱하자"

### engineBridge.js (엔진 연결)

백엔드가 C 엔진을 실행하는 방법 2가지:

**1. executeQuery(query)** - HTTP API용
1. SQL을 임시 파일로 저장 (예: /tmp/query.sql)
2. `spawn()`으로 C 프로그램 실행: `sql-engine /tmp/query.sql`
3. C 프로그램의 출력(stdout)을 수집
4. 5초 타임아웃 설정
5. 임시 파일 삭제
6. 출력 텍스트 반환

**2. createShellSession()** - WebSocket 터미널용
1. PTY(가상 터미널) 생성
2. 쉘(bash) 실행
3. 그 안에서 C 엔진 실행
4. 사용자 입력을 전달, 출력을 캡처
5. REPL 모드로 계속 상호작용

### responseProtocol.js (응답 변환)

C 엔진의 출력은 이렇게 생김:
```
(Mina, ENFP, travel)
(Kim, ISFJ, reading)
Executed.
```

이걸 프론트엔드가 쓸 수 있는 JSON으로 변환:

핵심 함수: `buildResponsePayload(query, rawOutput)`

```json
{
  "success": true,
  "queryType": "SELECT",
  "message": "Executed.",
  "parseTree": {
    "type": "SELECT",
    "children": [
      { "type": "COLUMNS", "value": "*" },
      { "type": "FROM", "value": "profiles" }
    ]
  },
  "rows": [
    { "name": "Mina", "mbti": "ENFP", "hobby": "travel" },
    { "name": "Kim", "mbti": "ISFJ", "hobby": "reading" }
  ],
  "rawOutput": "(Mina, ENFP, travel)\n(Kim, ISFJ, reading)\nExecuted.\n"
}
```

변환 과정:
1. `normalizeOutput()` - 줄바꿈 정리, 빈 줄 제거
2. `inferQueryType()` - 첫 단어 보고 INSERT/SELECT 판단
3. `buildParseTree()` - SQL 구조를 트리로 변환 (패널2용)
4. `parseRowLine()` - `(값1, 값2, 값3)` → 배열로 변환
5. `inferRowObject()` - 배열을 컬럼 이름과 매핑

---

## 7. 프론트엔드가 뭘 하는지

### App.jsx (총괄)

3개 패널을 배치하고 데이터를 관리하는 총괄 컴포넌트.

**상태(state) 7개:**
```
query          → 현재 실행한 SQL 쿼리
parseTree      → 트리 시각화 데이터
rows           → 실행 결과 행들
queryType      → "INSERT" or "SELECT"
message        → 결과 메시지 ("Executed." 등)
loading        → 실행 중이면 true
error          → 에러 메시지
connectionState → 터미널 연결 상태
```

**핵심 함수 3개:**
- `handleQueryStart(query)` → 쿼리 실행 시작할 때 (로딩 true)
- `handleQueryResult(payload)` → 결과 도착했을 때 (상태 업데이트)
- `handleConnectionChange({status})` → 연결 상태 바뀔 때

### CliPanel.jsx (패널 1)

진짜 터미널을 웹에 띄움. 핵심 기술: **xterm.js + WebSocket**

- xterm.js = 웹 브라우저에서 터미널을 보여주는 라이브러리
- WebSocket = 서버와 실시간 양방향 통신
- 사용자가 키보드 치면 → WebSocket으로 백엔드에 전달
- 백엔드가 C 엔진 출력 보내면 → 터미널에 표시

### ParseTreePanel.jsx (패널 2)

ReactFlow 라이브러리로 SQL 구조를 트리 그래프로 시각화.

```
SELECT * FROM profiles WHERE mbti = 'ENFP'

        SELECT
       /      \
   COLUMNS   FROM
      |        |
      *    profiles
              |
           WHERE
           /   \
       COLUMN  VALUE
         |       |
        mbti   ENFP
```

### DateMatchApp.jsx (패널 3, 내가 담당)

데이트 매칭 서비스 화면. 핵심 기능:

**1. 프로필 등록**
- 이름, MBTI(16종 드롭다운), 취미 입력
- 버튼 누르면 INSERT SQL로 C 엔진 DB에 저장

**2. 매칭 계산**
- 전체 프로필을 SELECT로 가져옴
- `calculateScore()` 함수로 점수 계산:
  - MBTI 4글자 각각 비교 → 같으면 글자당 20점
  - 취미 같으면 → 추가 20점
  - 최대 100점

**3. 결과 표시**
- 상위 3명을 카드 형태로 표시
- BEST 뱃지 (1등)
- 매칭률 프로그레스 바
- `buildComment()` 함수로 점수별 코멘트 자동 생성:
  - 100점: "MBTI와 취미가 모두 완벽하게 맞아요"
  - 취미 같으면: "둘 다 OO를 좋아해서 대화가 바로 이어질 수 있어요"
  - 60점 이상: "성향 코드가 꽤 비슷해요"
  - 그 외: "의외의 케미를 기대해볼 만한 조합이에요"

**4. SQL 인젝션 방지**
- `escapeSqlValue()` 함수로 따옴표를 이스케이프
- 예: `O'Brien` → `O''Brien` (따옴표 2개로)

---

## 8. 우리가 쓰는 SQL (이것만 알면 됨)

테이블은 **profiles** 딱 하나. 컬럼은 3개.

| 컬럼 | 뜻 |
|------|----|
| name | 이름 |
| mbti | MBTI 유형 |
| hobby | 취미 |

### INSERT (데이터 넣기)
```sql
INSERT INTO profiles VALUES ('홍길동', 'ENFP', '독서');
```
→ profiles 테이블에 (홍길동, ENFP, 독서) 추가
→ data/profiles.csv 파일에 `홍길동,ENFP,독서` 한 줄 추가됨

### SELECT (데이터 조회)
```sql
SELECT * FROM profiles;
```
→ profiles 테이블의 모든 데이터 가져오기

```sql
SELECT name, hobby FROM profiles WHERE mbti = 'ENFP';
```
→ MBTI가 ENFP인 사람의 이름과 취미만 가져오기

---

## 9. 공용 계약 (contracts.md)

팀원 4명이 이 문서 기준으로 독립적으로 개발함.

**프론트 → 백엔드 요청:**
```json
{ "query": "SELECT * FROM profiles;" }
```

**백엔드 → 프론트 응답:**
```json
{
  "success": true,
  "queryType": "SELECT",
  "message": "Executed.",
  "parseTree": { ... },
  "rows": [{ "name": "Mina", "mbti": "ENFP", "hobby": "travel" }],
  "rawOutput": "..."
}
```

**C 엔진 출력 규칙:**
- SELECT 결과: `(값1, 값2, 값3)` 형태로 한 줄씩
- 에러: `Error: 메시지` 형태
- 성공: 마지막에 `Executed.`

---

## 10. Git 협업 방식

```
main (배포용, 안 건드림)
  |
  └── dev (개발 통합 브랜치)
       |
       ├── feature/service-panel  ← 내 브랜치 (패널 3)
       ├── PANEL-3-connect        ← 동현 브랜치 (통합)
       ├── semin2                 ← 세민 브랜치 (패널 1)
       └── gyugo                  ← 규고 브랜치 (패널 2)
```

1. 각자 자기 브랜치에서 작업
2. 완성되면 dev로 PR(Pull Request) 생성
3. 코드 확인 후 병합
4. 충돌 나면 해결하고 병합

실제로 `DateMatchApp.jsx`와 `main.jsx`에서 충돌이 여러 번 발생했는데, 각자 역할이 명확해서 어떤 코드를 살릴지 바로 판단할 수 있었음.

---

## 11. 기술 스택 요약

| 뭐 | 기술 | 왜 씀 |
|----|------|-------|
| 화면 | React 18 | 컴포넌트 기반으로 3패널 쉽게 구성 |
| 빌드 | Vite | 개발 서버 빠르게 실행 + 프록시 설정 |
| 터미널 | xterm.js | 웹에서 진짜 터미널 띄우기 |
| 트리 시각화 | ReactFlow | 노드/엣지 그래프 라이브러리 |
| 서버 | Node.js + Express | HTTP API + WebSocket 서버 |
| 실시간 통신 | WebSocket | 터미널 양방향 통신 |
| 가상 터미널 | node-pty | 백엔드에서 쉘 세션 생성 |
| 엔진 | C (gcc) | 실제 SQL 파서/실행기 구현 |
| 데이터 | CSV 파일 | 가장 단순한 저장 방식 |
| 협업 | Git + GitHub | 브랜치 분리 + PR 병합 |

---

## 12. 실행 방법

**터미널 1 - 백엔드:**
```bash
cd ~/week6_webcoding/backend && npm install && node server.js
```

**터미널 2 - 프론트엔드:**
```bash
cd ~/week6_webcoding/frontend && npm install && npm run dev
```

**C 엔진 빌드 (필요 시):**
```bash
cd ~/week6_webcoding/engine/src && make
```

**브라우저:** `http://localhost:5173`

---

## 13. 폴더 구조 한눈에 보기

```
week6_webcoding/
├── frontend/                 # 화면 (React)
│   ├── vite.config.js        # 개발 서버 설정 (프록시 포함)
│   └── src/
│       ├── App.jsx           # 3패널 총괄 + 상태 관리
│       ├── main.jsx          # 진입점 (App 렌더링)
│       ├── styles.css        # 전역 스타일
│       └── components/
│           ├── CliPanel.jsx         # 패널1: 터미널 (xterm + WebSocket)
│           ├── ParseTreePanel.jsx   # 패널2: 트리 시각화 (ReactFlow)
│           └── DateMatchApp.jsx     # 패널3: 데이트 매칭 (내 담당)
│
├── backend/                  # 중간 다리 (Node.js)
│   ├── server.js             # 메인 서버 (이전 버전)
│   └── src/
│       ├── server.js                   # API + WebSocket 서버
│       ├── bridge/
│       │   └── engineBridge.js         # C 엔진 실행 + PTY 관리
│       └── protocol/
│           └── responseProtocol.js     # C 출력 → JSON 변환
│
├── engine/                   # 진짜 SQL 엔진 (C)
│   ├── src/
│   │   ├── main.c            # 시작점 (REPL 또는 파일 모드)
│   │   ├── parser.c/h        # SQL 텍스트 분석
│   │   ├── executor.c/h      # SQL 실행
│   │   ├── storage.c/h       # 데이터 저장/읽기 (CSV)
│   │   ├── schema.c/h        # 테이블 구조 정의
│   │   └── Makefile          # 컴파일 설정
│   ├── build/
│   │   └── sql-engine        # 컴파일된 실행 파일
│   └── data/
│       └── profiles.csv      # 실제 데이터 파일
│
└── docs/
    ├── contracts.md           # 팀 공용 계약
    ├── architecture.md        # 아키텍처 문서
    └── demo-scenarios.md      # 시연 시나리오
```

---

## 14. 핵심 데이터 구조 정리

### 프론트엔드 상태 (App.jsx)
```javascript
{
  query: "SELECT * FROM profiles;",     // 실행한 SQL
  parseTree: { type: "SELECT", ... },   // 트리 구조
  rows: [{ name, mbti, hobby }, ...],   // 결과 데이터
  queryType: "SELECT",                  // 쿼리 타입
  message: "Executed.",                 // 상태 메시지
  loading: false,                       // 로딩 중?
  error: "",                            // 에러 메시지
  connectionState: "connected"          // 연결 상태
}
```

### 백엔드 응답 (JSON)
```json
{
  "success": true,
  "queryType": "SELECT",
  "message": "Executed.",
  "parseTree": { "type": "SELECT", "children": [...] },
  "rows": [{ "name": "Mina", "mbti": "ENFP", "hobby": "travel" }],
  "rawOutput": "(Mina, ENFP, travel)\nExecuted.\n"
}
```

### C 엔진 Statement 구조
```
타입: INSERT 또는 SELECT
테이블 이름: "profiles"
값들: ["홍길동", "ENFP", "독서"]  (INSERT용)
선택 컬럼: ["name", "hobby"]     (SELECT용)
전체 선택: true/false            (SELECT *인지)
WHERE 조건: { 컬럼: "mbti", 값: "ENFP" }
```

### CSV 파일 (engine/data/profiles.csv)
```
name,mbti,hobby
Mina,ENFP,travel
Kim,ISFJ,reading
홍길동,ENFP,독서
```

---

## 15. 예상 질문 대비

**Q: 왜 C로 만들었어요? JavaScript로 하면 안 돼요?**
> 되긴 됩니다. 근데 이 프로젝트의 목적이 "시스템 프로그래밍 레벨에서 SQL 엔진을 직접 구현하는 경험"이었기 때문에 C를 사용했습니다.

**Q: 데이터베이스는 뭐 써요?**
> MySQL이나 PostgreSQL 같은 DB를 안 쓰고, CSV 파일에 직접 저장합니다. C 엔진이 직접 파일을 읽고 씁니다.

**Q: 매칭 알고리즘 설명해주세요**
> MBTI 4글자를 하나씩 비교합니다. 같은 글자가 있으면 글자당 20점, 취미도 같으면 20점 추가. 최대 100점이고, 높은 순서대로 3명을 보여줍니다. 점수에 따라 코멘트도 자동으로 달라집니다.

**Q: 패널3이 SQL이랑 무슨 관계에요?**
> 패널3에서 프로필을 등록하면 INSERT 쿼리가 실행되고, 매칭할 때는 SELECT로 전체 데이터를 가져옵니다. 실제로 C 엔진의 DB를 사용합니다.

**Q: WebSocket이 뭐에요?**
> HTTP는 요청-응답 방식인데, WebSocket은 한 번 연결하면 계속 양방향으로 데이터를 주고받을 수 있습니다. 터미널처럼 실시간으로 입출력이 필요한 곳에 사용합니다.

**Q: 팀 협업은 어떻게 했어요?**
> contracts.md라는 계약 문서를 먼저 만들어서 요청/응답 형식을 정했습니다. 각자 브랜치에서 독립적으로 개발하고, dev 브랜치에 PR로 병합했습니다.

**Q: 충돌은 없었어요?**
> DateMatchApp.jsx, main.jsx에서 충돌이 여러 번 있었습니다. 하지만 각자 담당 영역이 명확해서 어떤 코드를 살릴지 바로 판단할 수 있었습니다.

**Q: 테이블 구조는요?**
> profiles 테이블 하나입니다. name(이름), mbti(MBTI 유형), hobby(취미) 3개 컬럼입니다.

**Q: SQL 인젝션은 어떻게 방지해요?**
> escapeSqlValue() 함수로 따옴표를 이스케이프합니다. 'O'Brien' 같은 입력이 들어오면 'O''Brien'으로 변환해서 SQL 문법이 깨지지 않게 합니다.
