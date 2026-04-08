# Architecture

## Final Screen Layout

```text
+-------------------+-------------------+-------------------+
| CLI Panel         | Parse Tree Panel  | Service Panel     |
| SQL input         | AST / query view  | comments / cards  |
+-------------------+-------------------+-------------------+
```

## Frontend Ownership

```text
CliPanel.jsx        -> panel 1
ParseTreePanel.jsx  -> panel 2
ServicePanel.jsx    -> panel 3
App.jsx             -> final integration
```

## System Flow

```text
CliPanel
-> POST /api/query or WebSocket command
-> backend bridge
-> C engine
-> file-based DB
-> parsed response
-> ParseTreePanel + ServicePanel
```

## Design Intent

- `CLI Panel`은 입력 입구
- `Parse Tree Panel`은 SQL 해석 과정 시각화
- `Service Panel`은 엔진 결과가 반영된 실제 서비스 뷰
- `App.jsx`는 3개 패널을 한 화면에 배치하고 공용 상태를 연결하는 통합 레이어

이 세 영역은 서로 독립이 아니라, 하나의 SQL 실행 흐름으로 연결되어야 합니다.
