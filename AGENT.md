# AGENT.md

## 목표

이 프로젝트의 목표는 **실제 C SQL 엔진**을 중심으로, 한 페이지 안에서 아래 흐름을 동시에 보여주는 데모를 만드는 것이다.

```text
CLI 입력 -> 파싱 트리 -> 서비스 반영
```

즉, 왼쪽은 SQL 입력, 가운데는 파싱 결과, 오른쪽은 실제 서비스 UI이며, 세 패널은 모두 같은 실행 결과를 공유해야 한다.

## 절대 규칙

1. 실제 SQL 처리 로직은 `engine/` 아래의 C 코드가 담당한다.
2. `frontend/`는 SQL 실행을 흉내 내면 안 된다.
3. `backend/`는 프론트와 엔진 사이를 연결하는 브리지 역할만 한다.
4. `ServicePanel`은 결과 테이블이 아니라 **작은 서비스 웹페이지처럼 보이는 UI**여야 한다.
5. 다만 `ServicePanel`의 데이터는 반드시 엔진 실행 결과 `rows`에서 와야 한다.
6. 발표 화면은 기본적으로 `CLI / Parse Tree / Service` 3패널이 동시에 보여야 한다.

## 현재 서비스 도메인

현재 기본 서비스는 **댓글 토론 서비스**다.

고정 스키마:

```text
comments(id, author, content)
```

이 스키마는 현재 기준 계약이며, 바뀌면 아래를 함께 수정해야 한다.

- `engine/src/schema.c`
- `docs/contracts.md`
- `frontend/src/components/ServicePanel.jsx`
- `backend/src/protocol/responseProtocol.js`

## 공유 데이터 흐름

```text
frontend CliPanel
-> POST /api/query
-> backend bridge
-> C engine binary
-> file-based DB
-> backend response parsing
-> frontend ParseTreePanel + ServicePanel
```

## 현재 구현 기준

### 쿼리 실행 단위

- 현재 프론트/백엔드 기준은 **한 번에 한 쿼리**다.
- 예:
  - 가능: `INSERT INTO comments VALUES (1, 'kim', 'hello');`
  - 가능: `SELECT * FROM comments;`
  - 비권장: `INSERT ...; SELECT ...;` 를 한 번에 같이 보내기

### 엔진 실행 방식

- backend는 엔진에 stdin REPL 방식으로 붙지 않는다.
- 현재는 **임시 `.sql` 파일을 만든 뒤 파일 모드로 엔진을 실행**하는 방식을 쓴다.
- 따라서 C 작업자는 **파일 입력 모드가 항상 안정적으로 동작해야 한다.**

### ServicePanel 역할

- 오른쪽 패널은 독립 서비스처럼 보여야 한다.
- 예:
  - 서비스 이름
  - 댓글 입력창처럼 보이는 영역
  - 댓글 목록
- 하지만 실제 저장은 왼쪽 SQL 엔진이 담당한다.
- 즉 **서비스처럼 보여도, 데이터는 rows 기반**이다.

## 협업 규칙

- 각 담당자는 자기 파일 범위를 우선 책임진다.
- 공용 계약을 바꿔야 하면 먼저 `docs/contracts.md`를 수정한다.
- C 엔진 출력 형식이 바뀌면 backend 담당과 먼저 합의한다.
- ServicePanel은 도메인 친화적으로 보여야 하며, 단순 테이블 뷰어로 끝내지 않는다.
- 최종 통합은 `App.jsx`에서 이뤄진다.

## 완료 기준

- CLI에서 입력한 SQL이 실제 C 엔진까지 도달한다.
- Parse Tree Panel이 현재 쿼리 구조를 보여준다.
- Service Panel이 엔진 결과를 서비스 UI로 반영한다.
- `INSERT`와 `SELECT` 흐름이 데모에서 끊기지 않는다.
