# cupid-db-demo.html 동작 흐름 정리

## 개요

`cupid-db-demo.html`은 하나의 HTML 파일 안에서 스타일, 마크업, 스크립트를 모두 포함한 단일 페이지 데모다.

이 데모는 아래 3단계 흐름을 시각적으로 보여주는 목적을 가진다.

```text
CLI Input -> Parse Tree -> Service
```

실제 서버나 DB를 호출하지는 않고, 브라우저 메모리 안의 배열을 가짜 DB처럼 사용한다.

## 전체 구조

페이지는 크게 두 부분으로 나뉜다.

1. 상단 Top Bar
2. 본문 3-Panel Layout

### Top Bar

상단에는 `Cupid-DB` 타이틀과 함께 현재 흐름 단계를 보여주는 flow indicator가 있다.

- `CLI Input`
- `Parse Tree`
- `Service`

`activateFlow(step)` 함수가 이 단계 표시를 활성화하거나 해제한다.

### 본문 3개 패널

본문은 3열 레이아웃으로 나뉜다.

1. CLI Panel
2. Parse Tree Panel
3. Service Panel

## 핵심 상태

이 파일의 핵심 상태는 사실상 하나다.

```js
const db = [];
```

이 `db` 배열이 현재 저장된 댓글/프로필 데이터를 들고 있다.

각 row 구조는 아래와 같다.

```js
{
  id: number,
  author: string,
  content: string
}
```

중요한 점:

- 새로고침하면 `db`는 초기화된다
- 실제 파일 DB나 서버 저장은 없다
- `comments` 테이블 하나만 가정한다

## 사용자 입력 시작점

사용자가 쿼리를 실행하는 방법은 3가지다.

1. 예시 버튼 클릭
2. 입력창에 SQL 입력 후 Enter
3. 입력창에 SQL 입력 후 RUN 버튼 클릭

최종적으로는 모두 `runQuery(sql)` 함수로 모인다.

## 메인 실행 흐름

실행의 중심은 `runQuery(sql)` 함수다.

흐름은 아래 순서대로 진행된다.

### 1. 입력 검증

`sql`이 비어 있거나 공백뿐이면 아무 것도 하지 않고 종료한다.

### 2. CLI 단계 활성화

```js
activateFlow("cli");
```

상단 flow indicator에서 `CLI Input` 단계를 활성화한다.

### 3. CLI 로그 출력

```js
cliAppend(...)
```

사용자가 입력한 SQL을 CLI 출력 영역에 한 줄 추가한다.

즉, 화면 왼쪽 패널은 터미널 로그처럼 누적되는 구조다.

### 4. 200ms 후 SQL 실행

```js
setTimeout(() => { ... }, 200);
```

즉시 실행하지 않고 약간의 지연을 줘서, 마치 단계별 파이프라인처럼 보이게 만든다.

이 시점에서:

- `Parse Tree` 단계가 활성화된다
- `executeSQL(sql)`이 호출된다

### 5. SQL 해석 및 결과 생성

`executeSQL(sql)`은 쿼리 문자열을 정규식으로 분석해서 결과 객체를 만든다.

반환 구조는 아래 형태다.

```js
{
  ok: boolean,
  type: "INSERT" | "SELECT" | "DELETE" | "ERROR",
  msg: string,
  tree: object | null,
  rows: array
}
```

### 6. CLI 성공/실패 메시지 출력

`res.ok` 값에 따라:

- 성공이면 초록 체크 표시와 메시지
- 실패면 빨간 X 표시와 메시지

를 CLI 패널에 추가한다.

### 7. Parse Tree 렌더링

```js
renderTree(res.tree);
```

가운데 패널에 현재 쿼리 구조를 표시한다.

### 8. 300ms 후 Service 단계 활성화

```js
setTimeout(() => { ... }, 300);
```

다시 지연을 둔 뒤:

- `Service` 단계가 활성화된다
- `renderService(res)`가 호출된다

### 9. Service 패널 갱신

오른쪽 패널이 현재 실행 결과에 맞게 바뀐다.

### 10. 1초 후 flow 표시 초기화

```js
setTimeout(() => activateFlow(null), 1000);
```

단계 표시를 모두 꺼서 다음 입력을 기다리는 상태로 돌아간다.

## SQL 실행 로직

`executeSQL(sql)`은 실제 SQL 엔진이 아니라 정규식 기반의 매우 단순한 해석기다.

지원하는 문법은 3가지다.

### 1. INSERT

지원 형식:

```sql
INSERT INTO comments VALUES (1, 'kim', 'hello');
```

동작:

- `id`, `author`, `content`를 뽑아서 row 객체 생성
- 같은 `id`가 이미 있으면 실패
- 없으면 `db.push(row)`로 추가

반환:

- 성공: `Executed. New profile registered!`
- 실패: `id X already exists`

이때 parse tree에는:

- `type = INSERT`
- `table = comments`
- `vals = row`

가 들어간다.

### 2. SELECT

지원 형식:

```sql
SELECT * FROM comments;
SELECT * FROM comments WHERE id = 1;
```

동작:

- 기본적으로 `db` 전체를 복사
- `WHERE`가 있으면 `col = value` 조건 하나만 해석
- 조건에 맞는 row만 필터링

반환:

- `${rows.length} match(es) found`

이때 parse tree에는:

- `type = SELECT`
- `table = comments`
- `cond = { col, val }` 또는 `null`

이 들어간다.

주의:

- `SELECT`는 `startsWith("SELECT")`만 검사하므로 컬럼 목록을 실제로 분석하지 않는다
- `SELECT author FROM ...` 같은 문법도 형식상은 통과할 수 있지만, 렌더링 구조는 단순하다

### 3. DELETE

지원 형식:

```sql
DELETE FROM comments WHERE id = 1;
```

동작:

- `WHERE col = value` 하나만 해석
- 해당 row를 `findIndex`로 찾아서 삭제
- 찾지 못하면 실패

반환:

- 성공: `Ghosted! 'author' removed`
- 실패: `No match found`

이때 parse tree에는:

- `type = DELETE`
- `table = comments`
- `cond = { col, val }`

이 들어간다.

### 4. 지원하지 않는 문법

위 3가지 외에는 모두 아래로 처리된다.

```js
{ ok: false, type: "ERROR", msg: "Syntax error", tree: null, rows: [...db] }
```

즉:

- Parse Tree는 실패 화면
- Service는 현재 DB 상태를 그대로 반영
- CLI에는 에러 메시지 출력

## Parse Tree 패널 흐름

가운데 패널은 `renderTree(tree)`가 담당한다.

### tree가 없을 때

`tree === null`이면 아래 의미의 빈 상태를 보여준다.

- 경고 아이콘
- `Parse failed`

### tree가 있을 때

`mkTree(type, table, cond, vals)`로 만들어진 단순 객체를 기준으로 HTML 문자열을 조립한다.

출력 구조는 대략 아래와 같다.

```text
INSERT
├ TABLE comments
├ VALUES
│ ├ id: 1
│ ├ author: kim
│ └ content: hello
└ WHERE id = 1
```

실제 구현 특징:

- 진짜 AST가 아니라 요약형 트리다
- `type`, `table`, `vals`, `cond` 네 정보만 보여준다
- `vals`가 있으면 VALUES 블록을 렌더링
- `cond`가 있으면 WHERE 블록을 렌더링

즉, SQL 전체 문법 트리를 세밀하게 분석하는 구조는 아니다.

## Service 패널 흐름

오른쪽 패널은 `renderService(res)`가 담당한다.

### 1. type에 따라 배너 테마 결정

쿼리 종류별로 다른 배너가 나온다.

- `INSERT` -> `NEW MATCH!`
- `SELECT` -> `MATCH RESULTS`
- `DELETE` -> `GHOSTED`
- `ERROR` -> `ERROR`

### 2. 상태 메시지 표시

배지와 함께 `res.msg`를 보여준다.

예:

- `Executed. New profile registered!`
- `2 match(es) found`
- `No match found`

### 3. rows를 카드 형태로 렌더링

`res.rows.length === 0`이면:

- `No profiles yet`

화면을 보여준다.

`res.rows.length > 0`이면:

- author 첫 글자를 아바타로 표시
- author 이름과 id 표시
- content를 말풍선 같은 카드로 표시

즉, Service 패널은 현재 쿼리의 결과 목록을 “매칭 카드 UI”처럼 보여주는 역할이다.

### 4. footer 갱신

마지막 줄에는 아래 텍스트가 나온다.

```text
N profile(s)
```

## 함수별 역할 요약

### `activateFlow(step)`

- 상단 단계 표시 활성화/비활성화

### `executeSQL(sql)`

- SQL 문자열 해석
- in-memory `db` 수정 또는 조회
- 결과 객체 생성

### `mkTree(type, table, cond, vals)`

- Parse Tree 패널용 단순 구조 생성

### `cliAppend(html)`

- CLI 로그 영역에 HTML 한 줄 추가

### `renderTree(tree)`

- Parse Tree 패널 렌더링

### `renderService(res)`

- Service 패널 렌더링

### `runQuery(sql)`

- 전체 실행 흐름 오케스트레이션
- 단계 전환, SQL 실행, 패널 렌더링을 순서대로 묶는 메인 함수

## 현재 파일의 특징

이 데모는 구조적으로 아래 특징을 가진다.

### 장점

- HTML 하나로 바로 실행 가능하다
- 흐름이 직관적이다
- `CLI -> Parse -> Service` 단계를 시각적으로 보여주기 쉽다
- INSERT / SELECT / DELETE 데모를 짧게 시연하기 좋다

### 한계

- 실제 SQL 엔진이 아니다
- 실제 백엔드 호출이 없다
- DB가 메모리 배열 하나뿐이라 새로고침 시 데이터가 사라진다
- SQL 파싱이 정규식 기반이라 매우 제한적이다
- Parse Tree도 진짜 AST가 아니라 요약 정보다

## 실제 화면에서 보이는 흐름 한 줄 요약

사용자가 SQL을 입력하면 `runQuery()`가 이를 받아 CLI 로그에 먼저 출력하고, 정규식 기반 `executeSQL()`로 메모리 DB를 수정/조회한 뒤, 그 결과를 Parse Tree 패널과 Service 패널에 순서대로 반영하면서 상단 flow indicator를 `CLI -> Parse -> Service` 순서로 강조하는 구조다.

## 참고 메모

현재 HTML 안의 Service welcome 영역에는 닫는 태그가 깨진 부분이 하나 있다.

```html
<div class="svc-welcome-desc">.../div>
```

즉, 이 파일은 동작 흐름 요약용 데모로는 충분하지만, 실제 앱 구조로 옮길 때는:

- HTML 구조 정리
- backend 연결
- 실제 parser/engine 연동
- 컴포넌트 분리

가 필요하다.
