# Contracts

## 1. 프론트 -> 백엔드 요청

프론트는 아래 형식으로 한 번에 **한 쿼리**만 보낸다.

```json
{
  "query": "SELECT * FROM profiles;"
}
```

주의:
- 멀티 쿼리 문자열은 현재 기준 계약이 아니다.
- 줄바꿈이 있어도 최종적으로는 한 SQL 문장만 보내는 것을 기준으로 한다.

## 2. 백엔드 -> 프론트 응답

백엔드는 아래 구조를 반환한다.

```json
{
  "success": true,
  "queryType": "SELECT",
  "message": "Executed.",
  "parseTree": {
    "type": "SELECT",
    "children": [
      { "type": "COLUMNS", "value": "*" },
      { "type": "FROM", "value": "profiles" }
    ]
  },
  "rows": [
    {
      "name": "Mina",
      "mbti": "ENFP",
      "hobby": "travel"
    }
  ],
  "rawOutput": "..."
}
```

## 3. 필드 의미

- `queryType`
  - 현재 실행된 SQL 종류
  - 예: `INSERT`, `SELECT`

- `message`
  - 실행 결과 메시지
  - 예: `Executed.`

- `parseTree`
  - Parse Tree Panel 전용 데이터

- `rows`
  - Service Panel 전용 데이터
  - 현재는 `profiles` 테이블 결과를 panel 3 서비스 UI 기준 데이터로 사용한다

- `rawOutput`
  - 디버깅용 원본 엔진 출력

## 4. 현재 고정 도메인 규칙

현재 서비스 스키마는 아래로 고정한다.

```text
profiles(name, mbti, hobby)
```

각 필드 의미:
- `name`: 프로필 이름
- `mbti`: 성향 타입
- `hobby`: 관심사 또는 취미

## 5. C 엔진 작업자가 반드시 지켜야 할 점

### 지원 SQL

현재 기준 최소 지원 문법:

```sql
INSERT INTO profiles VALUES ('Mina', 'ENFP', 'travel');
SELECT * FROM profiles;
SELECT name, hobby FROM profiles WHERE mbti = 'ENFP';
```

### 파일 실행 모드

backend는 현재 엔진을 **임시 sql 파일 경로를 인자로 넘겨 실행**한다.

즉 엔진은 아래 형태가 반드시 안정적으로 동작해야 한다.

```text
sql-engine.exe temp-query.sql
```

### 출력 규칙

- `SELECT` 결과는 각 row를 한 줄씩 출력한다.
- 예:

```text
(1, kim, hello)
(2, lee, nice to meet you)
Executed.
```

- 에러가 나면 `Error:`로 시작하는 줄이 있어야 한다.

예:

```text
Error: Value count does not match schema
```

## 6. ServicePanel 표현 규칙

ServicePanel은 다음 원칙을 따른다.

- 결과 테이블이 아니라 **실제 서비스 UI처럼 보여야 한다**
- 서비스 이름, 댓글 입력창, 댓글 목록이 있는 구조를 가진다
- 하지만 실제 저장은 프론트가 직접 하지 않는다
- 실제 데이터는 항상 `rows`에서 온다

즉:

- 표현: 서비스
- 데이터 소스: 엔진 결과

## 7. App 통합 규칙

`App.jsx`는 최소한 아래 상태를 가진다.

- `query`
- `parseTree`
- `rows`
- `queryType`
- `message`
- `loading`
- `error`

패널 연결 규칙:

```jsx
<CliPanel onRun={handleRun} />
<ParseTreePanel tree={parseTree} />
<ServicePanel
  rows={rows}
  queryType={queryType}
  message={message}
  loading={loading}
  error={error}
/>
```
