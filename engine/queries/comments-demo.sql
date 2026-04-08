INSERT INTO comments VALUES (1, 'kim', 'hello');
INSERT INTO comments VALUES (2, 'lee', 'nice to meet you');
SELECT * FROM comments;
SELECT author, content FROM comments WHERE id = 2;
