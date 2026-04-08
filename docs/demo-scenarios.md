# Demo Scenarios

## Scenario 1: Insert Comment

Input:

```sql
INSERT INTO comments VALUES (1, 'donghyun', 'hello');
```

Expected:

- CLI: success message
- Parse Tree: INSERT tree
- Service: new comment appears

## Scenario 2: Select Comments

Input:

```sql
SELECT * FROM comments;
```

Expected:

- CLI: rows printed
- Parse Tree: SELECT tree
- Service: comments list rendered from engine result

## Scenario 3: Error Case

Input:

```sql
INSERT INTO comments VALUES (1, 'donghyun');
```

Expected:

- CLI: error shown
- Parse Tree: optional error tree or no update
- Service: no change
