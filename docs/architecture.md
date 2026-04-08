# Architecture

## 최종 화면 구조

한 페이지 안에 3개 패널이 동시에 보여야 한다.

```text
+-------------------+-------------------+-------------------+
| CLI Panel         | Parse Tree Panel  | Service Panel     |
| SQL 입력          | 파싱 구조 표시     | 댓글 서비스 화면   |
+-------------------+-------------------+-------------------+
```

## 프론트 파일 책임

```text
CliPanel.jsx        -> panel 1
ParseTreePanel.jsx  -> panel 2
ServicePanel.jsx    -> panel 3
App.jsx             -> 최종 통합
```

## 시스템 흐름

```text
CliPanel
-> POST /api/query
-> backend bridge
-> C engine
-> file-based DB
-> backend protocol parsing
-> ParseTreePanel + ServicePanel
```

## 현재 서비스 패널 의도

오른쪽 패널은 단순 결과창이 아니라 **작은 댓글 서비스 페이지**다.

구성:
- 서비스 헤더
- 댓글 입력창처럼 보이는 영역
- 댓글 목록 영역

하지만 실제 쓰기/읽기 데이터는 SQL 엔진 결과를 사용한다.

즉:

```text
서비스처럼 보임
+
실제 데이터는 엔진에서 옴
```

## C 작업자가 알아야 하는 구조 포인트

1. 현재 서비스 도메인은 `profiles(name, mbti, hobby)` 하나로 맞춘다.
2. backend는 엔진을 REPL stdin이 아니라 **sql 파일 실행 모드**로 호출한다.
3. ServicePanel은 `rows`만 받아 렌더링한다.
4. `rows`가 비어 있으면 서비스 empty state가 뜬다.
5. 따라서 C 작업자의 핵심은:
   - `INSERT`
   - `SELECT`
   - 파일 실행 모드
   - row 출력 형식
   를 계약대로 유지하는 것이다.
