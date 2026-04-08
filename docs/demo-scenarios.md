# Demo Scenarios

## 시나리오 1: 댓글 저장

입력:

```sql
INSERT INTO profiles VALUES ('Donghyun', 'INTJ', 'music');
```

기대 결과:
- CLI: 성공 메시지 표시
- Parse Tree: INSERT 구조 표시
- Service: 상태 배너만 갱신, 목록은 아직 변하지 않을 수 있음

## 시나리오 2: 댓글 목록 조회

입력:

```sql
SELECT * FROM profiles;
```

기대 결과:
- CLI: SELECT 실행 성공
- Parse Tree: SELECT 구조 표시
- Service: 댓글 목록 렌더링

## 시나리오 3: 조건 조회

입력:

```sql
SELECT name, hobby FROM profiles WHERE mbti = 'INTJ';
```

기대 결과:
- CLI: 조건 조회 성공
- Parse Tree: WHERE 포함 SELECT 구조 표시
- Service: 필터된 댓글 결과 반영

## 시나리오 4: 에러 처리

입력:

```sql
INSERT INTO profiles VALUES ('Donghyun', 'INTJ');
```

기대 결과:
- CLI: 에러 메시지 표시
- Parse Tree: 기존 결과 유지 또는 최소 구조만 표시
- Service: 기존 목록 유지, 에러 상태만 반영

## 시나리오 5: 한 번에 한 쿼리

현재는 아래처럼 여러 문장을 한 번에 보내는 것을 기본 시나리오로 잡지 않는다.

```sql
INSERT INTO profiles VALUES ('Donghyun', 'INTJ', 'music');
SELECT * FROM profiles;
```

현재 권장 방식:
1. INSERT 실행
2. SELECT 실행
