# ParseTreePanel 동작 설명

## 한 줄 요약

2번 패널은 "SQL이 실제로 어떤 구조로 해석되었는가"를 보여주는 시각화 패널이다.  
중요한 점은, 이 패널이 보여주는 것은 **실행 순서 자체**가 아니라 **쿼리의 구조와 관계**라는 점이다.

현재 구현 기준으로 이 패널은:

- 브라우저에서 직접 SQL을 해석하지 않는다.
- backend가 만든 `parseTree` JSON을 받아서 보여준다.
- 그 JSON을 React Flow 노드와 엣지로 변환해 AST처럼 시각화한다.

즉, 현재 화면에서 보이는 그래프는:

```text
사용자 입력 SQL
-> backend가 query 문자열을 분석해서 parseTree 생성
-> frontend가 parseTree를 React Flow 그래프로 렌더링
```

이다.

---

## 1. 이 패널이 실제로 보여주는 것

이 패널은 "이 쿼리가 어떤 절들로 이루어져 있는가"를 보여준다.

예를 들어 `SELECT author, content FROM comments WHERE id = 1;` 이 들어오면,
패널은 대략 아래 구조를 보여준다.

```text
SELECT
├─ COLUMNS
├─ FROM
└─ WHERE
   ├─ COLUMN
   └─ VALUE
```

즉 이 패널은 다음을 보여준다.

- 루트 쿼리 타입
  - `SELECT`
  - `INSERT`
- 절(clause) 단위 구조
  - `COLUMNS`
  - `FROM`
  - `WHERE`
  - `INTO`
  - `VALUES`
- 각 절에 속한 값
  - 테이블 이름
  - 컬럼 이름
  - 조건 값
  - INSERT 값 목록
- 부모-자식 관계
  - 어떤 항목이 어떤 절 아래에 속하는지

왼쪽에서 오른쪽으로 갈수록 더 깊은 구조를 의미한다.  
하지만 이것은 "실행 시간 순서"라기보다 "구조적 깊이"에 가깝다.

---

## 2. 이 패널이 보여주지 않는 것

이 문서를 볼 때 가장 헷갈리기 쉬운 부분이 이 부분이다.

현재 2번 패널은 다음을 **보여주지 않는다**.

- C 엔진 내부의 진짜 AST 메모리 구조
- parser가 만든 토큰 단위 상세 정보
- executor의 실제 처리 순서
- storage 파일 접근 순서
- 최종 SELECT 결과 row 자체
- 서비스 화면 데이터 변화

즉, 지금 패널은 "엔진 내부 디버거 화면"이 아니라,
**backend가 query 문자열을 바탕으로 만든 단순화된 query structure view** 이다.

이 점이 중요하다.  
현재 화면은 "실제 엔진이 처리한 쿼리 결과를 기반으로 backend가 정리한 구조"를 보여주지만,
그 구조 자체는 아직 C 엔진이 직접 JSON AST를 내보내는 방식은 아니다.

만약 앞으로 "진짜 엔진 AST"를 보여주고 싶다면, backend에서 정규식으로 `parseTree`를 만드는 현재 방식 대신:

- C 엔진이 machine-readable JSON AST를 출력하게 하거나
- backend가 엔진의 parser 결과를 더 정확하게 구조화해서 전달해야 한다.

---

## 3. 현재 전체 데이터 흐름

현재 구현 기준의 실제 흐름은 아래와 같다.

```text
CliPanel (xterm.js)
-> WebSocket
-> backend/src/server.js
-> sql-engine.exe 실행 결과 수집
-> backend/src/protocol/responseProtocol.js
-> parseTree 생성
-> query-result payload 전송
-> App.jsx 상태 갱신
-> ParseTreePanel.jsx 렌더링
```

조금 더 자세히 보면 아래 순서다.

1. 사용자가 왼쪽 CLI 패널에서 SQL을 입력한다.
2. `CliPanel.jsx`가 입력을 WebSocket으로 backend에 보낸다.
3. backend의 `server.js`가 실제 shell + `sql-engine.exe` 세션으로 query를 전달한다.
4. 엔진 출력이 다시 `db >` 프롬프트로 돌아오면, backend는 "한 쿼리가 끝났다"고 판단한다.
5. 그때 `buildResponsePayload(query, rawOutput)`를 호출해서 payload를 만든다.
6. 이 payload 안에 `parseTree`, `rows`, `message`가 함께 들어간다.
7. frontend의 `App.jsx`가 `query-result`를 받아 `parseTree` state를 업데이트한다.
8. `ParseTreePanel.jsx`가 새 `parseTree`를 받아 React Flow 그래프로 다시 그린다.

즉, 2번 패널은 독립적으로 무언가를 계산하는 컴포넌트가 아니라,
**backend가 이미 만들어서 보낸 구조를 읽기 전용으로 시각화하는 컴포넌트**다.

---

## 4. backend는 어떤 규칙으로 parseTree를 만드는가

현재 `parseTree`는 `backend/src/protocol/responseProtocol.js` 안의 `buildParseTree(query)`에서 만들어진다.

핵심은 다음 두 단계다.

### 4-1. 쿼리 타입 판별

먼저 `inferQueryType(query)`가 query가 어떤 유형인지 판단한다.

- `INSERT`로 시작하면 `INSERT`
- `SELECT`로 시작하면 `SELECT`
- 그 외는 `UNKNOWN`

즉, 현재 parse tree는 아주 제한된 SQL subset만 안정적으로 다룬다.

### 4-2. 쿼리 문자열을 간단한 트리 JSON으로 변환

현재는 정규식 기반으로 구조를 만든다.

#### INSERT의 경우

예시 SQL:

```sql
INSERT INTO comments VALUES (1, 'kim', 'hello');
```

backend가 만드는 구조:

```json
{
  "type": "INSERT",
  "children": [
    { "type": "INTO", "value": "comments" },
    {
      "type": "VALUES",
      "children": [
        { "type": "VALUE", "value": "1" },
        { "type": "VALUE", "value": "kim" },
        { "type": "VALUE", "value": "hello" }
      ]
    }
  ]
}
```

이 구조가 의미하는 것은 다음과 같다.

- 루트는 `INSERT`
- 그 아래에 어떤 테이블에 넣는지 나타내는 `INTO`
- 실제 값 묶음을 나타내는 `VALUES`
- `VALUES` 아래에는 각 값이 `VALUE` 노드로 매달림

즉, "INSERT 문을 구성하는 절과 값의 관계"를 보여준다.

#### SELECT의 경우

예시 SQL:

```sql
SELECT author, content FROM comments WHERE id = 1;
```

backend가 만드는 구조:

```json
{
  "type": "SELECT",
  "children": [
    { "type": "COLUMNS", "value": "author, content" },
    { "type": "FROM", "value": "comments" },
    {
      "type": "WHERE",
      "children": [
        { "type": "COLUMN", "value": "id" },
        { "type": "VALUE", "value": "1" }
      ]
    }
  ]
}
```

이 구조가 의미하는 것은 다음과 같다.

- 루트는 `SELECT`
- 어떤 컬럼을 읽는지 `COLUMNS`
- 어느 테이블에서 읽는지 `FROM`
- 조건이 있으면 `WHERE`
- `WHERE` 아래에는 비교 대상 컬럼과 값이 들어감

즉, 현재 패널은 "SELECT 문이 어떤 주요 절로 나뉘는가"를 보여주는 형태다.

---

## 5. 이 패널은 실패한 쿼리에서도 구조를 보여줄 수 있다

현재 backend는 `buildResponsePayload(query, rawOutput)`를 만들 때,
실행 에러가 있어도 `parseTree`는 가능한 한 같이 넣는다.

즉 예를 들어:

- SQL 실행은 실패했지만
- query 문자열 자체는 `SELECT ... FROM ... WHERE ...` 형태로 인식 가능하다면

2번 패널에는 query structure가 계속 보일 수 있다.

이 말은 곧:

- 2번 패널은 "실행 성공 여부"만을 보여주는 패널이 아니고
- "사용자가 어떤 구조의 쿼리를 시도했는가"를 보여주는 패널이기도 하다

는 뜻이다.

그래서 오른쪽 서비스 패널의 결과가 비어 있어도,
2번 패널은 여전히 구조를 보여줄 수 있다.

---

## 6. frontend는 이 parseTree를 어떻게 React Flow로 바꾸는가

`ParseTreePanel.jsx`는 `parseTree`를 그대로 그리는 것이 아니라,
중간에 React Flow용 데이터로 변환한다.

큰 흐름은 아래와 같다.

```text
parseTree JSON
-> createDescriptor()
-> buildFlowGraph()
-> nodes / edges 생성
-> ReactFlow 렌더링
```

### 6-1. `createDescriptor()`

이 함수는 입력 데이터를 "렌더링용 중간 구조"로 바꾼다.

여기서 하는 일은 다음과 같다.

- scalar 값이면
  - 현재 노드의 메타데이터로 보여줄지
  - 별도의 leaf 성격 노드로 만들지 정리
- object면
  - 제목(`title`)
  - 라벨(`label`)
  - 메타데이터(`meta`)
  - 자식(`children`)
  로 분해
- array면
  - 각 원소를 child node로 분해

예를 들어:

- `type: "SELECT"`는 노드 제목 후보가 된다.
- `value: "comments"`는 메타데이터로 표시될 수 있다.
- `children: [...]`는 실제 엣지로 연결되는 자식 노드가 된다.

### 6-2. `getHeading()`

각 노드 카드의 제목을 정한다.

우선순위는 대략 아래와 같다.

1. `type`
2. `kind`
3. `name`
4. 없으면 relation label 사용

그래서 대부분의 현재 parse tree에서는 `type` 값이 카드 제목으로 보인다.

예:

- `SELECT`
- `WHERE`
- `VALUE`

### 6-3. `getScalarEntries()`

단순 문자열, 숫자, boolean, null 값은 key-value 메타데이터로 추린다.

예를 들어:

```json
{ "type": "FROM", "value": "comments" }
```

이면,

- 제목은 `FROM`
- 메타데이터는 `value = comments`

처럼 카드 안에 표시된다.

### 6-4. `getNestedEntries()`와 `normalizeChildren()`

중첩 object나 array는 자식 노드로 분리한다.

즉:

- object 속 object
- object 속 array
- 명시적인 `children`

이런 구조는 오른쪽으로 뻗는 브랜치가 된다.

이때 edge 라벨은:

- 속성명이 있으면 그 속성명
- `children`이면 `Child 1`, `Child 2`
- 배열이면 `Item 1`, `Item 2`

형태로 붙는다.

### 6-5. `layoutDescriptor()`

이 함수는 실제 노드 위치를 계산한다.

- 깊이(depth)가 깊을수록 오른쪽으로 이동
- leaf 분포를 기준으로 세로 위치 계산

즉 현재 레이아웃은:

- 가로축 = 구조적 깊이
- 세로축 = 형제 노드 분산

으로 보면 된다.

그래서 이 화면은 "타임라인"이 아니라 "계층 그래프"다.

### 6-6. `ReactFlow`

최종적으로 `nodes`와 `edges`를 `ReactFlow`에 넘겨서 화면에 그린다.

이 단계에서는:

- 확대/축소
- 이동
- 배경 그리드
- 컨트롤 버튼

이 제공되지만, 노드를 직접 편집하는 기능은 넣지 않았다.

즉 2번 패널은 편집기가 아니라 **읽기 전용 시각화 뷰어**다.

---

## 7. 이 그래프를 "로직 흐름"으로 읽는 방법

사용자가 "2번 패널의 로직 흐름"을 이해할 때는 아래처럼 읽으면 된다.

### 7-1. 루트 노드

가장 왼쪽 루트 노드는 "이 쿼리가 무엇을 하려는가"를 나타낸다.

- `SELECT`
- `INSERT`

즉 쿼리의 최상위 의도다.

### 7-2. 첫 번째 레벨 자식

루트 바로 오른쪽의 노드들은 "이 쿼리를 구성하는 주요 절"이다.

예:

- `COLUMNS`
- `FROM`
- `WHERE`
- `INTO`
- `VALUES`

즉 이 단계는 "큰 문장 덩어리"를 의미한다.

### 7-3. 더 깊은 자식

그 다음 깊이의 노드들은 각 절의 내부 구성 요소다.

예:

- WHERE 아래의 `COLUMN`, `VALUE`
- VALUES 아래의 여러 `VALUE`

즉 이 단계는 "각 절을 이루는 실제 구성값"에 해당한다.

### 7-4. 카드 안 메타데이터

노드 안에 보이는 key-value는 그 노드의 속성이다.

예:

- `value = comments`
- `value = author, content`
- `value = 1`

즉 카드 제목은 "역할", 카드 내부 값은 "실제 데이터"라고 생각하면 된다.

### 7-5. 엣지

노드 사이 선은 "실행 순서"보다 "포함 관계" 또는 "구성 관계"를 뜻한다.

예:

- `SELECT -> WHERE`
  - SELECT 쿼리의 일부로 WHERE 절이 포함된다
- `WHERE -> COLUMN`
  - WHERE 조건이 어떤 컬럼을 기준으로 하는지
- `WHERE -> VALUE`
  - WHERE 조건이 어떤 값을 비교하는지

즉 현재 2번 패널은 **제어 흐름도(flowchart)** 에 가깝다기보다,
**구조도(structure graph)** 로 이해하는 것이 맞다.

---

## 8. 현재 패널을 볼 때 꼭 알아야 하는 제한사항

현재 구현은 데모 목적에 맞춘 간단한 구조다. 그래서 제한이 있다.

### 8-1. SQL 지원 범위가 좁다

현재 `buildParseTree(query)`는 정규식 기반이다.

즉 안정적으로 다루는 것은 주로:

- 단순 `INSERT INTO ... VALUES (...)`
- 단순 `SELECT ... FROM ...`
- 단순 `WHERE column = value`

정도다.

복잡한 SQL은 현재 패널 구조와 맞지 않을 수 있다.

예:

- JOIN
- AND / OR 복합 조건
- 중첩 SELECT
- 함수 호출
- ORDER BY
- GROUP BY

이런 문장은 현재 parse tree가 빈 구조이거나 불완전하게 보일 수 있다.

### 8-2. 실제 엔진 AST와 1:1 대응이 아니다

현재 패널은 backend가 별도로 만든 구조다.

즉:

- 엔진이 내부적으로 어떻게 parsing했는지
- executor가 어떤 순서로 처리했는지

를 그대로 반영하는 것은 아니다.

### 8-3. 패널 2는 읽기 전용이다

이 패널에서 노드를 수정해도 query가 바뀌지 않는다.

즉 이 패널은:

- 입력 패널이 아니고
- 편집 패널이 아니며
- 결과 구조를 읽어보는 패널이다

---

## 9. 실제 디버깅할 때 어디를 보면 되는가

2번 패널이 비어 있거나 기대한 모양이 안 나오면 아래 순서로 확인하면 된다.

### 9-1. `CliPanel.jsx`

확인할 것:

- `query-started`
- `query-result`

이벤트가 정상으로 오는지

즉 쿼리가 frontend에서 backend로 잘 전달되는지 먼저 본다.

### 9-2. `backend/src/server.js`

확인할 것:

- query가 실제 엔진으로 들어갔는지
- `pendingOutput`이 쌓이는지
- `db >` 프롬프트 복귀 시 `buildResponsePayload()`가 호출되는지

즉 backend가 "한 쿼리 종료"를 제대로 감지하는지 본다.

### 9-3. `backend/src/protocol/responseProtocol.js`

확인할 것:

- `buildParseTree(query)`가 원하는 구조를 반환하는지
- 현재 SQL 문법이 정규식 규칙과 맞는지

즉 parse tree 자체를 누가 만들고 있는지 보는 핵심 파일이다.

### 9-4. `App.jsx`

확인할 것:

- `handleQueryResult(payload)`에서 `setParseTree(payload.parseTree ?? null)`가 호출되는지

즉 backend가 준 값을 frontend 공용 상태에 넣고 있는지 확인한다.

### 9-5. `ParseTreePanel.jsx`

확인할 것:

- `parseTree`가 `null`인지
- `buildFlowGraph(parseTree)` 결과가 정상인지
- `nodes`, `edges`가 생성되는지

즉 마지막 렌더링 단계 문제인지 확인한다.

---

## 10. 정리

현재 2번 패널은 "실행 흐름도"라기보다 "쿼리 구조도"다.

정확히 말하면:

- 사용자가 입력한 SQL을 backend가 단순 parse tree JSON으로 바꾸고
- frontend가 그 JSON을 React Flow 그래프로 변환해
- 사람이 보기 쉬운 AST 형태로 보여주는 패널

이다.

따라서 지금 패널을 해석할 때는:

- 루트 = 쿼리의 최상위 의도
- 중간 노드 = 주요 절
- 리프/메타데이터 = 실제 값
- 엣지 = 포함 관계

로 읽으면 된다.

만약 앞으로 이 패널을 더 발전시키고 싶다면 다음 방향이 자연스럽다.

1. backend의 정규식 기반 `buildParseTree()`를 확장한다.
2. 또는 C 엔진이 직접 JSON AST를 내보내게 만든다.
3. 그 AST를 ParseTreePanel이 그대로 받아 더 정확한 구조를 그리게 한다.

현재 문서 기준으로는, 이 패널은 **"backend가 만든 쿼리 구조를 React Flow로 보여주는 읽기 전용 구조 시각화 패널"** 이라고 이해하면 가장 정확하다.
