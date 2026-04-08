# ParseTreePanel.jsx 역할 정리

## 현재 상태

- 파일: `frontend/src/components/ParseTreePanel.jsx`
- 현재 구현 상태:

```jsx
export default function ParseTreePanel() {
  return null;
}
```

- B는 아직 화면 렌더링 구현을 시작하지 않은 상태다.
- 현재 실제 UI에서는 가운데 패널이 비어 있는 상태다.
- props 계약, 표시 로직, parse tree 시각화 코드가 아직 없다.

## B의 담당 역할

`ROLES.md` 기준으로 B는 `frontend/src/components/ParseTreePanel.jsx`를 담당한다.

B는 최종 3분할 화면에서 가운데 패널을 맡는다.

- 현재 SQL 쿼리에 대한 parse tree 데이터를 전달받는다.
- SQL 분석 결과를 AST 또는 쿼리 구조 형태로 보여준다.
- 패널 역할은 시각화에 집중한다.
- D와 백엔드가 고정한 계약을 따른다.

## B가 먼저 읽어야 할 파일

B는 구현 전에 아래 파일을 먼저 읽는 것이 좋다.

- `ROLES.md`
- `docs/architecture.md`
- `docs/contracts.md`

## B와 관련된 데이터 계약

`docs/contracts.md` 기준으로 백엔드 응답에는 아래와 같은 `parseTree`가 포함된다.

```json
{
  "parseTree": {
    "type": "INSERT",
    "children": []
  }
}
```

즉, B는 `parseTree`를 `ParseTreePanel.jsx`의 핵심 입력값으로 다뤄야 한다.

## B가 책임지는 것

- 현재 쿼리 타입이 `INSERT`, `SELECT` 중 무엇인지 보여주기
- parse tree 구조를 가운데 패널에 명확하게 렌더링하기
- 첫 쿼리 실행 전의 빈 상태 처리하기
- 새 쿼리 결과가 오면 패널 내용 갱신하기
- SQL 실행 로직과 분리된 UI 컴포넌트로 유지하기

## B의 책임이 아닌 것

- SQL 쿼리 전송
- C 엔진 직접 호출
- 백엔드 브리지 동작 정의
- 서비스 데이터나 댓글 목록 렌더링
- 앱 전체 통합 구조 소유

이 책임은 A, C, 그리고 특히 D 쪽에 가깝다.

## 통합 경계

B는 `ParseTreePanel.jsx`가 `App.jsx`의 공용 상태에 D에 의해 연결된다고 가정하고 작업하면 된다.

예상 흐름은 아래와 같다.

```text
CliPanel
-> backend bridge
-> C engine
-> backend response
-> App.jsx shared state
-> ParseTreePanel.jsx
```

## B 구현 체크리스트

1. `App.jsx`로부터 `parseTree` props를 받도록 구성한다.
2. 아직 쿼리가 실행되지 않았을 때 기본 빈 상태를 보여준다.
3. 최소한 현재 쿼리의 루트 노드 타입은 표시한다.
4. 자식 노드를 재귀 구조 또는 중첩 리스트 형태로 렌더링한다.
5. 가운데 패널이 구분되도록 읽기 쉬운 스타일을 유지한다.
6. 컴포넌트 안에 백엔드나 엔진 전용 로직을 넣지 않는다.

## 한 줄 요약

B의 역할은 백엔드의 `parseTree` 데이터를 가운데 패널에 보이는 구조로 바꾸는 것이며, 쿼리 실행이나 백엔드 통합 자체를 담당하는 것은 아니다.
