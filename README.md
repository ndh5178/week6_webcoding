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

## Team

| 역할 | 이름 | 담당 |
|------|------|------|
| A | 세민 | CLI Panel (xterm + WebSocket) |
| B | 규민 | Parse Tree (ReactFlow) |
| C | 규태 | Date Match App (서비스 UI) |
| D | 동현 | 통합 + Backend + C Engine |

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

## Database Schema

```
┌─────────────────────────────────┐
│         profiles 테이블          │
├──────────┬──────────┬───────────┤
│  name    │  mbti    │  hobby    │
├──────────┼──────────┼───────────┤
│  김규태   │  INFP    │  독서     │
│  김규민   │  ENFJ    │  요리     │
│  남동현   │  INFP    │  실뜨기   │
│  김세민   │  ENTP    │  곤충채집  │
│  ...     │  ...     │  ...      │
└──────────┴──────────┴───────────┘
```
