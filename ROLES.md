# ROLES.md

## 4인 협업 구조

| Role | Main Area | Responsibility |
|------|-----------|----------------|
| A | `frontend/src/components/CliPanel.jsx` | SQL 입력 UI, 예제 SQL 버튼, 실행 트리거 |
| B | `frontend/src/components/ParseTreePanel.jsx` | 파싱 트리 렌더링 |
| C | `frontend/src/components/ServicePanel.jsx` | 댓글 서비스 UI 렌더링 |
| D | `frontend/src/App.jsx`, `backend/`, `engine/` | 3패널 통합, 브리지 연결, 기준 C 엔진 유지 |

## 통합 오너

- 최종 통합 오너는 `D`다.
- D는 단순히 UI를 붙이는 사람이 아니라, 아래를 책임진다.
  - 프론트 -> 백엔드 -> 엔진 연결
  - 공용 계약 유지
  - 기준 C 엔진 유지
  - 3패널이 한 화면에서 동시에 동작하는지 확인

## C 작업자가 다시 붙일 때 기준

C 작업자는 아래만 맞추면 지금 구조에 바로 붙을 수 있다.

1. 테이블 스키마
```text
comments(id, author, content)
```

2. 지원 SQL
```sql
INSERT INTO comments VALUES (1, 'kim', 'hello');
SELECT * FROM comments;
SELECT author, content FROM comments WHERE id = 1;
```

3. 실행 방식
- backend는 임시 sql 파일을 만들어 엔진을 실행한다.
- 즉 엔진은 `sql-engine.exe query.sql` 방식이 반드시 돼야 한다.

4. SELECT 출력 형식
```text
(1, kim, hello)
(2, lee, nice to meet you)
Executed.
```

5. 에러 출력 형식
```text
Error: ...
```

## 추천 작업 순서

1. D가 계약과 기준 엔진을 먼저 고정
2. A가 CLI 패널 구현
3. B가 ParseTree 패널 구현
4. C가 Service 패널 구현
5. D가 backend와 engine을 연결
6. D가 `App.jsx`에서 최종 통합
7. 전원 통합 테스트
