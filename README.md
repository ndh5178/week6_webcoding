# Cupid SQL

> **C 엔진 기반 SQL 데이트 매칭 시스템**

```
 ██████╗██╗   ██╗██████╗ ██╗██████╗     ███████╗ ██████╗ ██╗     
██╔════╝██║   ██║██╔══██╗██║██╔══██╗    ██╔════╝██╔═══██╗██║     
██║     ██║   ██║██████╔╝██║██║  ██║    ███████╗██║   ██║██║     
██║     ██║   ██║██╔═══╝ ██║██║  ██║    ╚════██║██║▄▄ ██║██║     
╚██████╗╚██████╔╝██║     ██║██████╔╝    ███████║╚██████╔╝███████╗
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═════╝     ╚══════╝ ╚══▀▀═╝ ╚══════╝
```

---
![alt text](<mainpage.png>)
## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                        │
│  ┌─────────────────┬──────────────────┬──────────────────────┐ │
│  │   CLI Panel      │   Parse Tree     │   Date Match App     │ │
│  │   xterm.js       │   ReactFlow      │   Profile Matcher    │ │
│  │   터미널 입력       │   SQL 구조 시각화   │     매칭 서비스        │ │
│  └────────┬─────────┴────────┬─────────┴──────────┬──────────┘ │
│           │ WebSocket        │                    │ HTTP POST   │
└───────────┼──────────────────┼────────────────────┼────────────┘
            │                  │                    │
            v                  v                    v
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Node.js:3001)                       │
│                                                                 │
│   /ws/terminal ──── PTY Shell ──── C Engine (REPL mode)        │
│   /api/query  ──── Spawn Process ── C Engine (File mode)       │
│                         │                                       │
│              responseProtocol.js                                │
│              C 출력 → JSON 변환                                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          v
┌─────────────────────────────────────────────────────────────────┐
│                     C SQL Engine                                │
│                                                                 │
│   main.c ─→ parser.c ─→ executor.c ─→ storage.c               │
│    입구       SQL 분석     실행          CSV 읽기/쓰기           │
│                                            │                    │
│                                            v                    │
│                                   data/profiles.csv             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3-Panel Layout

```
┌──────────────────┬──────────────────┬──────────────────┐
│                  │                  │                  │
│   PANEL 1        │   PANEL 2        │   PANEL 3        │
│   CLI            │   Parse Tree     │   Cupid SQL      │
│                  │                  │                  │
│  ┌────────────┐  │   ┌──SELECT──┐  │  ┌────────────┐  │
│  │ db > SELECT│  │   │  /    \  │  │  │ 이름: ___  │  │
│  │ * FROM     │  │   │COLS  FROM│  │  │ MBTI: ___  │  │
│  │ profiles;  │  │   │ |     |  │  │  │ 취미: ___  │  │
│  │            │  │   │ *  profiles│ │  │            │  │
│  │ (Kim,ENFP, │  │   │      |   │  │  │[매칭하기]  │  │
│  │  travel)   │  │   │   WHERE  │  │  │            │  │
│  │ Executed.  │  │   │   / \    │  │  │ BEST 김규태│  │
│  │            │  │   │ mbti ENFP│  │  │ 매칭률 80% │  │
│  │ db > _     │  │   └─────────┘  │  │ ████████░░ │  │
│  └────────────┘  │                  │  └────────────┘  │
│                  │                  │                  │
│  담당: 세민       │  담당: 규민       │  담당: 규태       │
└──────────────────┴──────────────────┴──────────────────┘
                        통합: 동현
```

---

## Data Flow

```
사용자 입력
    │
    ▼
┌─────────┐    WebSocket    ┌─────────┐    spawn    ┌─────────┐
│ Browser │ ──────────────→ │ Node.js │ ──────────→ │ C Engine│
│ (React) │ ←────────────── │ :3001   │ ←────────── │ (gcc)   │
└─────────┘    JSON 응답     └─────────┘   stdout    └────┬────┘
    │                                                      │
    ▼                                                      ▼
 3패널 동시 갱신                                      data/profiles.csv
 - parseTree → 트리                                  name,mbti,hobby
 - rows → 매칭 결과                                  Kim,ENFP,travel
 - message → 상태                                    Lee,ISFJ,reading
```

---

## Core Logic: SQL Parsing Flow

```
INSERT INTO profiles VALUES ('김규태', 'INFP', '독서');

  ┌─────────┐     ┌──────────┐     ┌────────────┐     ┌───────────┐
  │ main.c  │ ──→ │ parser.c │ ──→ │ executor.c │ ──→ │ storage.c │
  │  입력    │     │  SQL 분석  │     │   실행      │     │  CSV 저장  │
  └─────────┘     └──────────┘     └────────────┘     └───────────┘
       │                │                  │                  │
       ▼                ▼                  ▼                  ▼
  "INSERT INTO    Statement 구조체       schema.c에서      profiles.csv에
   profiles       {                     profiles 테이블    한 줄 추가:
   VALUES(...);"    type: INSERT        스키마 확인        김규태,INFP,독서
                    table: profiles
                    values: [김규태,
                      INFP, 독서]
                  }
```

```
SELECT * FROM profiles WHERE mbti = 'INFP';

  ┌─────────┐     ┌──────────┐     ┌────────────┐     ┌───────────┐
  │ main.c  │ ──→ │ parser.c │ ──→ │ executor.c │ ──→ │ storage.c │
  │  입력    │     │  SQL 분석  │     │   실행      │     │  CSV 조회  │
  └─────────┘     └──────────┘     └────────────┘     └───────────┘
       │                │                  │                  │
       ▼                ▼                  ▼                  ▼
  "SELECT *        Statement 구조체     schema.c에서      profiles.csv
   FROM profiles   {                   컬럼 검증         한 줄씩 읽으며
   WHERE            type: SELECT                        mbti = 'INFP'
   mbti='INFP';"    table: profiles                     매칭되는 행만
                    select_all: true                    결과로 반환
                    where: {
                      column: mbti       stdout 출력:
                      value: INFP        (김규태, INFP, 독서)
                    }                    Executed.
                  }
```

---

## Match Algorithm

```
MBTI 비교 (글자당 20점)                    취미 비교 (+20점)

  나: E N F P                              나: 독서
  상대: E N T P                            상대: 독서
       ✓ ✓ ✗ ✓                                  ✓
       20+20+0+20 = 60점                         +20점

                    총 매칭률: 80점 / 100점
                    ████████░░
```

---

## Tech Stack

```
Frontend          Backend           Engine            Data
─────────         ─────────         ─────────         ─────────
React 18          Node.js           C (gcc)           CSV 파일
Vite              Express           Makefile          profiles.csv
xterm.js          WebSocket
ReactFlow         node-pty
                  responseProtocol
```

---

## Quick Start

```bash
# 터미널 1: 백엔드
cd backend && npm install && node server.js

# 터미널 2: 프론트엔드
cd frontend && npm install && npm run dev

# (필요 시) C 엔진 빌드
cd engine/src && make
```

```
→ http://localhost:5173
```

---

## SQL Supported

```sql
-- 프로필 등록
INSERT INTO profiles VALUES ('홍길동', 'ENFP', '독서');

-- 전체 조회
SELECT * FROM profiles;

-- 조건 조회
SELECT name, hobby FROM profiles WHERE mbti = 'ENFP';
```

---

## Folder Structure

```
week6_webcoding/
├── frontend/
│   └── src/
│       ├── App.jsx                  # 3패널 총괄
│       └── components/
│           ├── CliPanel.jsx         # 패널1: 터미널
│           ├── ParseTreePanel.jsx   # 패널2: 트리
│           └── DateMatchApp.jsx     # 패널3: 매칭
│
├── backend/
│   └── src/
│       ├── server.js                # API + WebSocket
│       ├── bridge/engineBridge.js   # C 엔진 실행
│       └── protocol/responseProtocol.js  # 응답 파싱
│
├── engine/
│   └── src/
│       ├── main.c       # 진입점
│       ├── parser.c     # SQL 파싱
│       ├── executor.c   # 실행
│       ├── storage.c    # CSV I/O
│       └── schema.c     # 테이블 정의
│
└── docs/
    ├── contracts.md     # API 계약
    └── study-guide.md   # 공부 자료
```

---
## API Contract

```
Request:  POST /api/query
          { "query": "SELECT * FROM profiles;" }

Response: {
            "success": true,
            "queryType": "SELECT",
            "message": "Executed.",
            "parseTree": { ... },
            "rows": [{ "name", "mbti", "hobby" }]
          }
```

---
## Team

| 역할 | 이름 | 담당 |
|------|------|------|
| A | 세민 | CLI Panel (xterm + WebSocket) |
| B | 규민 | Parse Tree (ReactFlow) |
| C | 규태 | Date Match App (서비스 UI) |
| D | 동현 | 통합 + Backend + C Engine |

---
## 문제점

<b>*규민*</b>: Parse Tree를 처음에는 컴포넌트로 직접 트리 노드를 구현했는데
ReactFlow 라이브러리를 도입하면서 훨씬 간편하게 개발할 수 있었습니다.
적절한 라이브러리 선택이 개발 효율을 크게 높인다는 걸 알게 되었습니다.

<b>*세민*</b>: CLI 패널을 만들 때 처음에는 input 태그로 명령어를 받는 방식이었는데,
이러면 진짜 터미널처럼 보이지 않는 문제가 있었습니다.
그래서 xterm.js 라이브러리를 도입해서
실제 shell 프로세스를 연결하고
브라우저 안에서 진짜 터미널을 띄우는 방식으로 해결했습니다.

<b>*규태*</b>: 서비스 패널을 만들 때 처음에는 단독 페이지로 개발했는데
3패널 통합 화면에 넣으니 레이아웃이 깨지는 문제가 있었습니다.
패널 크기에 맞게 스타일을 전부 다시 조정해야 했고
독립적으로 만든 컴포넌트를 통합 환경에 맞추는 과정이 생각보다 까다로웠습니다.

<b>*동현*</b>: 통합 과정에서 브랜치 전략이 미흡해서
병합할 때 충돌이 많이 발생했고
충돌을 해결하는 과정에서 기능이 상당 부분 날아갔습니다.
결국 전부 초기화하고 처음부터 다시 통합했습니다.
이 경험을 통해 브랜치 전략과 충돌 관리의 중요성을 체감했습니다.

---
