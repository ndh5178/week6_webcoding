# ROLES.md

## 4-Person Collaboration

| Role | Main Area | Responsibility |
|------|-----------|----------------|
| A | `frontend/src/components/CliPanel.jsx` | SQL 입력 UI, 예제 SQL, 실행 트리거 |
| B | `frontend/src/components/ParseTreePanel.jsx` | 파싱 트리 렌더링 |
| C | `frontend/src/components/ServicePanel.jsx` | 엔진 결과를 보여주는 서비스 UI |
| D | `frontend/src/App.jsx`, `backend/`, `engine/` | 3개 창 통합, 브리지 연결, 기준 C 엔진 구현과 실제 연결 확인 |

## Integration Ownership

- 최종 통합 오너는 `D`다.
- D는 3개 창을 한 화면에 통합하고, 백엔드와 C 엔진이 실제로 이어지게 만드는 책임을 가진다.
- D는 프로젝트의 `기준 C 엔진` 오너이기도 하다.
- 즉 `engine/`의 최소 동작 기준과 `backend/` 연결 규약을 D가 먼저 고정한다.
- 개별 패널 담당자는 자기 창만 만드는 것이 아니라, D가 정한 계약을 따라야 한다.
- 통합 전, 아래 3개를 먼저 고정해야 한다.

## Must-Fix Contract Before Integration

1. 엔진 실행 파일 경로
2. 엔진 입력 형식
3. 엔진 출력 형식

## Recommended Order

1. D가 `docs/contracts.md`, `engine/` 기준 구조, `backend/` 연결 방식, `App.jsx` 통합 구조를 먼저 고정
2. A가 `CliPanel` 구현
3. B가 `ParseTreePanel` 구현
4. C가 `ServicePanel` 구현
5. D가 `backend/`와 `engine/`를 연결하고 3개 창을 통합
6. 전원 통합 테스트
