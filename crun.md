# 실행 가이드

## 1. 엔진 빌드

현재 backend는 아래 실행 파일을 찾는다.

```text
D:\jungleCamp\Projects\sqlProcessor\engine\build\sql-engine.exe
```

그래서 먼저 C 엔진을 빌드해야 한다.

```powershell
cd D:\jungleCamp\Projects\sqlProcessor\engine\src
mingw32-make
```

빌드가 끝나면 아래 파일이 생성되어야 한다.

```text
D:\jungleCamp\Projects\sqlProcessor\engine\build\sql-engine.exe
```

완전 새로 다시 빌드하고 싶으면:

```powershell
cd D:\jungleCamp\Projects\sqlProcessor\engine\src
mingw32-make clean
mingw32-make
```

## 2. backend 실행

backend는 Express + WebSocket 서버이고, 브라우저 터미널에서 실제 PowerShell 세션과 SQL 엔진을 붙여준다.

```powershell
cd D:\jungleCamp\Projects\sqlProcessor\backend
npm.cmd install
npm.cmd run dev
```

정상 실행되면 대략 이런 의미의 로그가 보여야 한다.

```text
[backend] listening on http://localhost:3001
[backend] websocket on ws://localhost:3001/ws/terminal
[backend] shell: powershell.exe
[backend] cwd: D:\jungleCamp\Projects\sqlProcessor
[backend] engine exists: true
```

## 3. frontend 실행

frontend는 Vite 개발 서버다.

```powershell
cd D:\jungleCamp\Projects\sqlProcessor\frontend
npm.cmd install
npm.cmd run dev
```

브라우저에서 Vite가 알려주는 주소를 연다.
보통:

```text
http://localhost:5173
```

## 4. 브라우저에서 실제로 어떻게 실행되는가

현재 왼쪽 CLI 패널은 단순 textarea가 아니라 `xterm.js` 터미널이다.

실제 흐름은 아래와 같다.

```text
브라우저 xterm.js
-> backend WebSocket
-> backend가 실제 PowerShell 실행
-> PowerShell 현재 경로: D:\jungleCamp\Projects\sqlProcessor
-> backend가 PowerShell 안에서 .\engine\build\sql-engine.exe 실행
-> db > 프롬프트 표시
-> SQL 입력
-> 엔진 결과 출력
-> Parse Tree / Service 패널 갱신
```

즉, 브라우저 안에 보이는 터미널이지만 실제로는 backend가 연 PowerShell과 빌드된 `sql-engine.exe`를 사용한다.

## 5. 화면에서 확인하는 순서

1. backend를 실행한다.
2. frontend를 실행한다.
3. 브라우저를 연다.
4. 왼쪽 패널에서 먼저 PowerShell 경로 프롬프트가 잠깐 보인다.
5. 이어서 SQL 엔진이 실행되면 `db >` 프롬프트가 뜬다.
6. 그 상태에서 SQL을 입력하고 Enter를 누른다.

예시:

```sql
SELECT * FROM comments;
```

또는:

```sql
INSERT INTO comments VALUES (10, 'kim', 'hello');
```

실행하면:

- 왼쪽: 실제 터미널 출력
- 가운데: Parse Tree
- 오른쪽: Service 결과

가 같이 갱신된다.

## 6. 예제 SQL

```sql
INSERT INTO comments VALUES (1, 'kim', 'hello');
SELECT * FROM comments;
SELECT author, content FROM comments WHERE id = 1;
```

## 7. 엔진을 터미널에서 다시 실행해야 하는 경우

브라우저 터미널 안에서 `.exit` 또는 `quit`를 입력하면 SQL 엔진만 종료되고, PowerShell 자체는 남아 있을 수 있다.

그 경우 브라우저 터미널 안에서 아래 명령으로 다시 실행하면 된다.

```powershell
& '.\engine\build\sql-engine.exe'
```

다시 실행되면 `db >` 프롬프트가 다시 보여야 한다.

## 8. 자주 나는 문제

### 8-1. `Engine binary not found ... sql-engine.exe`

엔진을 아직 빌드하지 않았거나 빌드 위치가 맞지 않는 경우다.

다시 실행:

```powershell
cd D:\jungleCamp\Projects\sqlProcessor\engine\src
mingw32-make
```

### 8-2. `Upgrade Required` 또는 JSON 파싱 에러

대부분 `3001` 포트에 다른 프로세스가 떠 있을 때 생긴다.

해야 할 일:

1. `3001`을 쓰는 다른 서버를 내린다.
2. `backend`를 다시 실행한다.

### 8-3. frontend는 켜졌는데 터미널 연결이 안 됨

보통 backend가 실행 중이 아니거나, `3001` 포트 충돌이다.

확인 순서:

1. backend 터미널 로그 확인
2. `http://localhost:3001/api/health` 확인
3. frontend 새로고침

### 8-4. `mingw32-make` 명령이 없음

Windows에 MinGW 계열 빌드 도구가 먼저 설치되어 있어야 한다.

## 9. 가장 빠른 실행 순서 요약

```powershell
cd D:\jungleCamp\Projects\sqlProcessor\engine\src
mingw32-make
```

```powershell
cd D:\jungleCamp\Projects\sqlProcessor\backend
npm.cmd install
npm.cmd run dev
```

```powershell
cd D:\jungleCamp\Projects\sqlProcessor\frontend
npm.cmd install
npm.cmd run dev
```

브라우저에서 열고, 왼쪽 터미널에:

```sql
SELECT * FROM comments;
```

를 입력하면 된다.
