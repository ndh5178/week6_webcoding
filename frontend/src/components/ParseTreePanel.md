# ParseTreePanel 백엔드 연결 가이드

## 1. 현재 상태

현재 `ParseTreePanel.jsx`는 React Flow 기반으로 구현되어 있다.

이 컴포넌트는 직접 SQL을 실행하지 않는다.
역할은 오직 하나다.

- 상위 컴포넌트가 넘겨준 `parseTree` 데이터를 받아서
- React Flow의 `nodes`, `edges`로 변환한 뒤
- 가운데 패널에 AST 그래프처럼 시각화해서 보여준다

즉, 실제 동작 흐름은 아래처럼 이어져야 한다.

```text
CliPanel
-> App.jsx
-> backend API
-> engine 실행
-> backend 응답
-> App.jsx 상태 갱신
-> ParseTreePanel.jsx
```

현재 저장소 기준으로는 아직 아래 연결이 비어 있다.

- `frontend/src/App.jsx`
- `frontend/src/components/CliPanel.jsx`
- `backend/src/server.js`

그래서 지금 `ParseTreePanel.jsx`는 "렌더링 준비는 완료"된 상태이고,
"실제 쿼리 실행 후 데이터 연결"은 아직 구현되지 않은 상태다.

## 2. ParseTreePanel이 기대하는 입력값

`ParseTreePanel.jsx`는 `parseTree` prop 하나를 받는다.

예시:

```jsx
<ParseTreePanel parseTree={parseTree} />
```

`parseTree`가 `null` 또는 `undefined`이면 빈 상태를 보여준다.

```jsx
<ParseTreePanel parseTree={null} />
```

`parseTree`가 객체이면 React Flow 그래프로 바꿔서 보여준다.

```json
{
  "type": "SELECT",
  "table": "comments",
  "selectedColumns": ["author", "content"],
  "where": {
    "type": "WHERE",
    "column": "id",
    "operator": "=",
    "value": "2"
  },
  "children": [
    {
      "type": "COLUMN",
      "name": "author"
    },
    {
      "type": "COLUMN",
      "name": "content"
    }
  ]
}
```

## 3. 백엔드가 반드시 내려줘야 하는 응답 구조

`docs/contracts.md` 기준으로 프론트엔드는 아래 응답을 기대한다.

```json
{
  "success": true,
  "queryType": "INSERT",
  "message": "Executed.",
  "parseTree": {
    "type": "INSERT",
    "children": []
  },
  "rows": [
    {
      "id": 1,
      "author": "kim",
      "content": "hello"
    }
  ]
}
```

여기서 역할은 이렇게 나뉜다.

- `message`: CLI 실행 결과 메시지
- `parseTree`: ParseTreePanel 전용 데이터
- `rows`: ServicePanel 전용 데이터

중요한 점:

- `parseTree`는 반드시 JSON 직렬화 가능한 plain object 여야 한다
- 순환 참조가 있으면 안 된다
- 함수, 클래스 인스턴스, Map, Set 같은 특수 구조는 쓰지 않는 편이 안전하다
- 가능한 한 `type`, `children`, `name`, `table`, `where` 같은 단순 구조를 유지하는 것이 좋다

## 4. 실제 연결 순서

실제 구현은 아래 순서대로 붙이면 된다.

### Step 1. CliPanel에서 SQL 입력을 받는다

`CliPanel.jsx`는 사용자가 SQL을 입력하고 실행 버튼을 누르면 상위로 쿼리를 넘겨야 한다.

예시:

```jsx
export default function CliPanel({ onRunQuery }) {
  const [query, setQuery] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    await onRunQuery(query);
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={query} onChange={(e) => setQuery(e.target.value)} />
      <button type="submit">Run</button>
    </form>
  );
}
```

핵심:

- `CliPanel`은 입력 UI만 담당한다
- 실제 fetch 호출을 `CliPanel` 안에 둘 수도 있지만, 현재 구조에서는 `App.jsx`가 통합 지점이므로 `onRunQuery` 콜백으로 위임하는 편이 깔끔하다

### Step 2. App.jsx에서 공용 상태를 가진다

`App.jsx`는 세 패널이 공유하는 상태를 가져야 한다.

최소 상태 예시:

```jsx
const [queryResult, setQueryResult] = useState({
  message: "",
  parseTree: null,
  rows: [],
});
```

이 상태를 기준으로:

- `message`는 CLI 패널에
- `parseTree`는 ParseTreePanel에
- `rows`는 ServicePanel에 넘긴다

### Step 3. App.jsx에서 백엔드 API를 호출한다

예시:

```jsx
async function handleRunQuery(query) {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();

  setQueryResult({
    message: data.message ?? "",
    parseTree: data.parseTree ?? null,
    rows: data.rows ?? [],
  });
}
```

핵심:

- `App.jsx`가 백엔드 응답을 받아서 세 패널의 공용 상태를 갱신한다
- `parseTree`는 여기서 바로 `ParseTreePanel`로 전달된다

### Step 4. backend/src/server.js에서 API를 만든다

현재 `backend/src/server.js`는 placeholder 상태다.
여기서 최소한 `/api/query` 엔드포인트는 만들어야 한다.

예시 구조:

```js
import express from "express";

const app = express();
app.use(express.json());

app.post("/api/query", async (req, res) => {
  const { query } = req.body;

  // 1. engine 실행
  // 2. stdout 또는 결과 파일 읽기
  // 3. parseTree / rows / message 로 변환

  res.json({
    success: true,
    queryType: "SELECT",
    message: "Executed.",
    parseTree: {
      type: "SELECT",
      table: "comments",
      children: [],
    },
    rows: [],
  });
});

app.listen(3001);
```

핵심:

- 백엔드는 프론트가 그대로 쓸 수 있는 `parseTree`를 내려줘야 한다
- 프론트에서 엔진 stdout 문자열을 다시 파싱하게 만들면 안 된다
- 가능하면 백엔드에서 이미 구조화된 JSON으로 변환해서 넘기는 것이 맞다

### Step 5. backend에서 engine 결과를 parseTree로 변환한다

여기가 실질적인 통합 지점이다.

가능한 방식은 두 가지다.

1. 엔진이 처음부터 machine-readable JSON을 출력하게 만든다
2. 엔진이 텍스트를 출력하면 backend protocol parser가 이를 JSON으로 바꾼다

현재 문서 기준으로는 2번도 허용된다.

예를 들어 엔진이 내부적으로 아래 의미를 알고 있다면:

```text
SELECT author, content FROM comments WHERE id = 2;
```

백엔드는 이를 이런 구조로 바꿔줄 수 있다.

```json
{
  "type": "SELECT",
  "table": "comments",
  "selectedColumns": ["author", "content"],
  "where": {
    "type": "WHERE",
    "column": "id",
    "operator": "=",
    "value": "2"
  },
  "children": [
    {
      "type": "COLUMN",
      "name": "author"
    },
    {
      "type": "COLUMN",
      "name": "content"
    },
    {
      "type": "WHERE",
      "column": "id",
      "operator": "=",
      "value": "2"
    }
  ]
}
```

이렇게 만들어진 객체가 그대로 `ParseTreePanel`에 전달된다.

## 5. ParseTreePanel 내부에서 이 데이터를 어떻게 그리는가

현재 `ParseTreePanel.jsx`는 들어온 `parseTree`를 다음 순서로 처리한다.

### 5-1. `buildFlowGraph(parseTree)` 호출

루트 객체를 기준으로 전체 트리를 훑는다.

- 루트 노드 생성
- 자식 노드 생성
- 부모-자식 간 edge 생성

### 5-2. 스칼라 값은 노드 안의 메타데이터로 표시

예:

- `table: "comments"`
- `operator: "="`
- `value: "2"`

이런 값은 노드 카드 안의 key-value 영역에 들어간다.

### 5-3. 중첩 객체는 별도 노드로 분리

예:

- `where`
- 내부 object

이런 값은 오른쪽 자식 노드로 확장된다.

### 5-4. 배열은 여러 child node로 펼친다

예:

- `children`
- `selectedColumns`

이런 배열은 각 항목을 개별 노드 또는 리프 항목으로 분해한다.

### 5-5. ReactFlow가 최종 다이어그램을 그린다

최종적으로 `ReactFlow`에 아래 값이 들어간다.

```jsx
<ReactFlow
  nodes={flowGraph.nodes}
  edges={flowGraph.edges}
  nodeTypes={nodeTypes}
  fitView
>
  <Background />
  <Controls />
</ReactFlow>
```

즉, 백엔드가 내려준 `parseTree` 객체가 곧 다이어그램의 원재료다.

## 6. App.jsx 최종 연결 예시

아래처럼 연결하면 흐름이 완성된다.

```jsx
import { useState } from "react";
import CliPanel from "./components/CliPanel.jsx";
import ParseTreePanel from "./components/ParseTreePanel.jsx";
import ServicePanel from "./components/ServicePanel.jsx";

export default function App() {
  const [result, setResult] = useState({
    message: "",
    parseTree: null,
    rows: [],
  });

  async function handleRunQuery(query) {
    const response = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    setResult({
      message: data.message ?? "",
      parseTree: data.parseTree ?? null,
      rows: data.rows ?? [],
    });
  }

  return (
    <main>
      <CliPanel onRunQuery={handleRunQuery} message={result.message} />
      <ParseTreePanel parseTree={result.parseTree} />
      <ServicePanel rows={result.rows} />
    </main>
  );
}
```

이 흐름이 완성되면:

1. 사용자가 `CliPanel`에서 SQL 입력
2. `App.jsx`가 `/api/query` 호출
3. backend가 engine 실행
4. backend가 `parseTree`, `rows`, `message` 생성
5. `App.jsx` 상태 갱신
6. `ParseTreePanel.jsx`가 React Flow 그래프로 즉시 갱신

## 7. 에러 케이스 처리 방법

실제 연결 시에는 실패 응답도 반드시 생각해야 한다.

예:

```json
{
  "success": false,
  "message": "Value count does not match schema",
  "parseTree": null,
  "rows": []
}
```

권장 동작:

- 실패 시 `message`는 CLI 영역에 보여준다
- `parseTree`는 `null`로 유지하거나, 이전 성공 결과를 유지할지 정책을 정한다
- `rows`는 비우거나 이전 결과 유지 여부를 명확히 정한다

가장 단순한 정책은 아래다.

- 성공 시: `message`, `parseTree`, `rows` 모두 갱신
- 실패 시: `message`만 갱신하고 `parseTree`, `rows`는 유지 또는 초기화

팀 기준 계약을 먼저 정하고 맞추는 것이 좋다.

## 8. 지금 바로 확인할 수 있는 테스트 방법

실제 백엔드 연결 전에 수동 확인은 `playgrounds/parse-tree-preview`에서 가능하다.

이 preview 앱은 현재 `ParseTreePanel.jsx`를 그대로 import해서 mock 데이터를 넣어 보여준다.

실행:

```powershell
cd D:\jungleCamp\Projects\sqlProcessor\playgrounds\parse-tree-preview
npm.cmd run dev -- --host 127.0.0.1 --port 4173
```

브라우저:

```text
http://127.0.0.1:4173
```

여기서 확인되는 것은:

- 빈 상태 렌더링
- INSERT parse tree 렌더링
- SELECT parse tree 렌더링

즉, 지금 preview는 "백엔드 연결 전 시각화 검증 도구" 역할이다.

## 9. 한 줄 정리

실제 연결에서 가장 중요한 것은 `backend`가 엔진 결과를 프론트가 바로 쓸 수 있는 `parseTree` JSON으로 만들어 주고, `App.jsx`가 그 값을 `ParseTreePanel.jsx`에 그대로 넘겨주는 구조를 지키는 것이다.