# Contracts

## Query Input

Frontend sends:

```json
{
  "query": "INSERT INTO comments VALUES (1, 'kim', 'hello');"
}
```

## Expected Backend Response

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

## Fixed Rule

- `parseTree`는 Parse Tree Panel 전용 데이터다.
- `rows`는 Service Panel 전용 데이터다.
- `message`는 CLI 결과창에 다시 출력한다.

## Domain Rule

서비스 테이블 구조는 초기에 하나만 고정한다.

예시:

```text
comments(id, author, content)
```

프론트와 엔진이 서로 다른 컬럼 구조를 쓰면 통합이 깨진다.
