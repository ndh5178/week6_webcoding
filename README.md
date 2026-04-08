# Cupid SQL

한 페이지 안에서 아래 3개 패널이 동시에 보이는 SQL 처리기 데모 프로젝트입니다.

- 왼쪽: `CLI Panel`
- 가운데: `Parse Tree Panel`
- 오른쪽: `Service Panel`

핵심 원칙은 웹이 SQL 엔진을 흉내 내는 것이 아니라, `C 엔진을 실제로 사용`하는 것입니다.

## Architecture

```text
frontend (3-panel UI)
-> backend bridge (HTTP/WebSocket)
-> engine (C SQL processor)
-> data (file-based DB)
```

## Folder Tree

```text
week6_webcoding/
├─ README.md
├─ AGENT.md
├─ ROLES.md
├─ docs/
│  ├─ architecture.md
│  ├─ contracts.md
│  └─ demo-scenarios.md
├─ frontend/
│  ├─ package.json
│  ├─ src/
│  │  ├─ App.jsx
│  │  ├─ layout/
│  │  │  └─ .gitkeep
│  │  ├─ api/
│  │  │  └─ .gitkeep
│  │  ├─ components/
│  │  │  ├─ .gitkeep
│  │  │  ├─ CliPanel.jsx
│  │  │  ├─ ParseTreePanel.jsx
│  │  │  └─ ServicePanel.jsx
│  │  ├─ hooks/
│  │  │  └─ .gitkeep
│  │  ├─ state/
│  │  │  └─ .gitkeep
│  │  └─ styles/
│  │     └─ .gitkeep
│  └─ public/
│     └─ .gitkeep
├─ backend/
│  ├─ package.json
│  ├─ src/
│  │  ├─ server.js
│  │  ├─ bridge/
│  │  │  └─ .gitkeep
│  │  ├─ protocol/
│  │  │  └─ .gitkeep
│  │  ├─ routes/
│  │  │  └─ .gitkeep
│  │  └─ websocket/
│  │     └─ .gitkeep
│  └─ tests/
│     └─ .gitkeep
├─ engine/
│  ├─ src/
│  │  ├─ main.c
│  │  ├─ parser.c
│  │  ├─ parser.h
│  │  ├─ executor.c
│  │  ├─ executor.h
│  │  ├─ storage.c
│  │  └─ storage.h
│  ├─ tests/
│  │  └─ .gitkeep
│  ├─ queries/
│  │  └─ .gitkeep
│  ├─ data/
│  │  └─ .gitkeep
│  └─ build/
│     └─ .gitkeep
└─ scripts/
   └─ .gitkeep
```

## Working Rule

- `engine/`는 과제 본체입니다. 실제 SQL 파싱/실행/파일 저장은 여기서만 합니다.
- `backend/`는 `frontend`와 `engine` 사이의 브리지입니다.
- `frontend/`는 3패널 UI와 시각화만 담당합니다.
- 서비스 패널은 독립 앱이 아니라, `engine` 실행 결과를 보여주는 뷰여야 합니다.
- `frontend/src/App.jsx`는 3개 창을 하나의 흐름으로 통합하는 최종 조립 지점입니다.
