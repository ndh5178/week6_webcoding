# AGENT.md

## Goal

이 프로젝트의 목표는 `C로 만든 SQL 처리기`를 중심으로, 한 페이지 안에서 아래 흐름을 동시에 보여주는 데모를 만드는 것입니다.

```text
CLI 입력 -> 파싱 트리 -> 서비스 반영
```

## Non-Negotiables

1. 실제 SQL 처리 로직은 `engine/`의 C 코드가 담당한다.
2. `frontend/`는 C 엔진을 흉내 내지 않는다.
3. `backend/`는 브리지 역할만 한다.
4. 서비스 패널은 엔진의 실행 결과를 받아 렌더링한다.
5. 최종 발표 화면은 `CLI / Parse Tree / Service` 3패널 동시 노출을 기본으로 한다.

## Shared Data Flow

```text
frontend CliPanel
-> backend server
-> backend bridge
-> engine binary
-> engine stdout / file DB
-> backend protocol parsing
-> frontend ParseTreePanel + ServicePanel
```

## Collaboration Rules

- 각 담당자는 자신의 폴더만 우선 책임진다.
- 공용 계약이 바뀌면 `docs/contracts.md`를 먼저 수정한다.
- 엔진 출력 형식을 바꿀 때는 프론트/백엔드 담당과 먼저 합의한다.
- 서비스 도메인은 엔진 테이블 구조와 반드시 일치해야 한다.
- 프론트 3개 창은 각각 나눠 개발하더라도, 마지막에는 `App.jsx`에서 한 화면으로 통합되어야 한다.
- 통합 담당자는 UI만 붙이는 사람이 아니라, `CLI -> Parse Tree -> Service` 흐름이 실제로 이어지는지 책임진다.

## Definition of Done

- CLI에서 입력한 SQL이 실제 C 엔진으로 전달된다.
- Parse Tree Panel이 현재 쿼리의 구조를 보여준다.
- Service Panel이 실행 결과를 반영한다.
- INSERT / SELECT 흐름이 데모에서 끊기지 않는다.
