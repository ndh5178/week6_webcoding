# 실제 터미널처럼 보이는 이유 추적 가이드

이 문서는 현재 프로젝트에서 왜 브라우저 안 터미널이 "실제 터미널이 열린 것처럼" 보이는지, 그리고 그 흐름을 어디서부터 순서대로 읽어야 하는지 정리한 문서다.

핵심은 아래 한 줄이다.

```text
xterm.js 화면
-> WebSocket
-> backend
-> node-pty
-> 실제 PowerShell 세션
-> sql-engine.exe 실행
-> 엔진 stdout/stderr
-> 브라우저로 다시 출력
```

즉, 브라우저 안에 진짜 OS 터미널이 직접 뜨는 것은 아니고, backend가 실제 shell을 열고 그 입출력을 브라우저로 중계하기 때문에 그렇게 보인다.

## 1. 먼저 봐야 하는 폴더 트리

이 기능을 이해할 때는 `engine/`만 보면 부족하다.
아래 세 구역을 같이 봐야 한다.

```text
frontend/
  src/
    App.jsx
    components/
      CliPanel.jsx
  vite.config.js

backend/
  src/
    server.js
    bridge/
      engineBridge.js
    protocol/
      responseProtocol.js

engine/
  build/
    sql-engine.exe
  src/
    main.c
    executor.c
    storage.c
    parser.c
    schema.c
    Makefile
```

## 2. 가장 먼저 읽을 시작점

이 흐름을 이해하려면 아래 순서로 읽는 것이 가장 빠르다.

1. `frontend/src/App.jsx`
2. `frontend/src/components/CliPanel.jsx`
3. `frontend/vite.config.js`
4. `backend/src/server.js`
5. `backend/src/bridge/engineBridge.js`
6. `backend/src/protocol/responseProtocol.js`
7. `engine/src/main.c`
8. 필요하면 `engine/src/executor.c`, `engine/src/storage.c`, `engine/src/parser.c`

## 3. 왜 `App.jsx`부터 봐야 하나

현재 전체 화면의 조립점은 `frontend/src/App.jsx`다.

여기서 확인할 것:

- 왼쪽 패널에 `CliPanel`
- 가운데 패널에 `ParseTreePanel`
- 현재 브랜치 기준 오른쪽은 `DateMatchApp`
- `CliPanel`이 `onConnectionChange`, `onQueryStart`, `onQueryResult`를 부모로 올려줌
- 부모가 `parseTree`, `rows`, `queryType`, `message`, `error` 상태를 관리함

즉:

```text
CliPanel
-> query-result 이벤트 전달
-> App 상태 갱신
-> ParseTreePanel 렌더링
```

주의:
이 문서를 쓰는 현재 시점에는 오른쪽이 `ServicePanel`이 아니라 `DateMatchApp`으로 연결돼 있다.
그래도 "터미널이 어떻게 실제처럼 보이는가"를 따라가는 핵심 경로에는 영향이 없다.

## 4. 그 다음은 `CliPanel.jsx`

실제 터미널처럼 보이는 UI 시작점은 `frontend/src/components/CliPanel.jsx`다.

여기서 중요한 포인트:

- `xterm`의 `Terminal` 객체를 생성함
- `FitAddon`으로 크기를 맞춤
- 터미널 입력이 들어오면 `terminal.onData(...)`로 받음
- 받은 입력을 직접 해석하지 않고 WebSocket으로 backend에 넘김
- backend에서 오는 `terminal-output`을 그대로 `terminal.write(...)`로 화면에 그림

즉 이 파일의 역할은:

```text
"진짜처럼 보이는 터미널 화면"을 만들고
키 입력과 출력 문자열을 중계하는 것
```

브라우저가 직접 PowerShell을 여는 것은 아니다.
브라우저는 단지 터미널 에뮬레이터 화면만 보여준다.

## 5. 왜 WebSocket이 필요한가

`frontend/vite.config.js`를 보면 `/ws` 프록시가 잡혀 있다.

이 뜻은:

- frontend 개발 서버는 `5173`
- 실제 터미널 세션은 backend `3001`
- 브라우저는 `/ws/terminal`에 연결
- Vite가 그 연결을 backend로 넘김

여기서 HTTP가 아니라 WebSocket을 쓰는 이유는 아주 단순하다.

```text
터미널은 한 번 요청/응답으로 끝나는 UI가 아니라
계속 입력하고 계속 출력이 와야 하기 때문
```

REST API만으로는 현재 같은 터미널 경험을 만들기 어렵다.

## 6. 핵심 backend 진입점은 `backend/src/server.js`

이 파일이 실제 연결의 중심이다.

여기서 먼저 봐야 하는 것:

### 6-1. WebSocket 서버 생성

```text
new WebSocketServer({ server, path: "/ws/terminal" })
```

즉 frontend가 붙는 진짜 터미널 세션 입구가 여기다.

### 6-2. 접속 시 하는 일

브라우저가 붙으면 backend는:

1. 엔진 실행 파일이 있는지 확인
2. `createShellSession(...)` 호출
3. 실제 shell을 하나 연다
4. shell이 열리면 잠깐 뒤에 엔진 실행 명령을 보낸다

즉:

```text
브라우저 접속
-> backend WebSocket connection
-> shell 세션 생성
-> PowerShell 실행
-> PowerShell 안에서 sql-engine.exe 실행
```

### 6-3. 왜 shell prompt와 engine prompt를 구분하는가

`server.js`에는 prompt를 감지하는 로직이 있다.

구분 대상:

- shell prompt: 예를 들면 `PS D:\...>`
- engine prompt: `db >`

이 구분이 필요한 이유:

- 지금 shell만 열렸는지
- 이미 엔진까지 실행됐는지
- 엔진이 종료되고 shell만 남았는지

를 backend가 알아야 상태를 프론트에 알려줄 수 있기 때문이다.

### 6-4. query-result는 어디서 만들어지나

사용자가 SQL을 치고 Enter를 누르면 backend는 그 출력이 다시 `db >` 프롬프트를 만날 때까지 모은다.

즉:

```text
SELECT * FROM comments;
-> 엔진 stdout 계속 수집
-> 다시 db > 가 나오면
-> "한 쿼리가 끝났다"고 판단
```

그다음 이 raw output을 `buildResponsePayload(...)`에 넘겨 구조화한다.

## 7. 실제 shell을 여는 곳은 `engineBridge.js`

`backend/src/bridge/engineBridge.js`가 가장 중요한 파일 중 하나다.

이 파일에서 확인할 것:

### 7-1. 빌드된 엔진 경로

```text
engine/build/sql-engine.exe
```

backend는 소스 코드를 직접 실행하는 것이 아니라, 이 빌드 결과물을 실행한다.

### 7-2. `node-pty` 사용

여기서는 `node-pty`를 사용해서 실제 shell 프로세스를 띄운다.

핵심 개념:

- `child_process.spawn()`만 쓰면 일반 프로세스 실행은 가능
- 하지만 "실제 터미널처럼 보이는 세션"을 만들려면 PTY가 더 적합
- `node-pty`가 pseudo terminal 역할을 한다

즉:

```text
node-pty
-> PowerShell을 PTY 환경에서 실행
-> prompt, 줄바꿈, 인터랙티브 입력을 터미널처럼 다룸
```

### 7-3. shell 시작 위치

`cwd`가 프로젝트 루트로 잡혀 있다.

즉 shell이 열릴 때 현재 경로는:

```text
D:\jungleCamp\Projects\sqlProcessor
```

그래서 브라우저에서 실제로:

```powershell
PS D:\jungleCamp\Projects\sqlProcessor>
```

같이 보일 수 있다.

### 7-4. 엔진 실행 명령

Windows 기준으로 backend가 shell 안에 보내는 명령은 이런 형태다.

```powershell
& '.\engine\build\sql-engine.exe'
```

즉:

```text
PowerShell이 열리고
-> 그 PowerShell 안에서
-> 빌드된 exe를 실행
```

이 흐름이기 때문에 "실제 터미널에서 프로그램 실행한 것처럼" 보인다.

## 8. `responseProtocol.js`는 왜 필요한가

`backend/src/protocol/responseProtocol.js`는 터미널 출력 문자열을 프론트에서 쓰기 좋은 JSON으로 바꾸는 역할을 한다.

즉 shell/engine 출력은 원래 그냥 문자열이다.

예:

```text
(1, kim, hello)
Executed.
db >
```

이걸 그대로 넘기면 Parse Tree나 테이블 렌더링이 어렵다.

그래서 여기서:

- `queryType`
- `parseTree`
- `rows`
- `message`

형태로 다시 만든다.

즉:

```text
엔진 stdout
-> responseProtocol.js
-> 구조화된 payload
-> App.jsx 상태 갱신
```

## 9. 엔진 쪽에서 꼭 봐야 하는 파일은 `main.c`

`engine/src/main.c`를 보면 왜 backend가 이 엔진을 "터미널 프로그램"처럼 붙일 수 있는지 이해된다.

여기서 핵심은 두 모드다.

### 9-1. 파일 실행 모드

인자가 있으면:

```text
run_file(path)
```

즉 `.sql` 파일을 읽어 실행한다.

이건 REST `/api/query` 쪽에서 쓰기 좋다.

### 9-2. REPL 모드

인자가 없으면:

```text
run_repl()
```

이 모드에서:

- `db > ` 프롬프트 출력
- `fgets(...)`로 한 줄 입력 받음
- SQL 실행
- 결과 출력
- 다시 `db > `

즉 backend가 shell 안에서 exe만 실행해도, 엔진 자체가 이미 인터랙티브한 터미널 프로그램처럼 동작한다.

이게 현재 전체 구조의 핵심이다.

## 10. 더 깊게 보고 싶으면 그다음은 이 순서

`main.c` 다음은 아래 순서로 보면 된다.

1. `engine/src/parser.c`
2. `engine/src/executor.c`
3. `engine/src/storage.c`
4. `engine/src/schema.c`

각 역할:

- `parser.c`: SQL 문자열을 내부 구조로 해석
- `executor.c`: statement 실행
- `storage.c`: CSV 기반 저장/조회
- `schema.c`: 현재 테이블 스키마 정의

즉:

```text
입력 SQL
-> parser
-> executor
-> storage/schema
-> stdout 출력
```

## 11. 한 번에 이해하는 전체 순서

아래 순서로 보면 된다.

```text
1. App.jsx
2. CliPanel.jsx
3. vite.config.js
4. backend/src/server.js
5. backend/src/bridge/engineBridge.js
6. backend/src/protocol/responseProtocol.js
7. engine/src/main.c
8. engine/src/parser.c / executor.c / storage.c / schema.c
9. engine/build/sql-engine.exe
```

## 12. 실제 실행 순간을 문장으로 풀면

사용자가 브라우저에서 페이지를 열면:

1. `CliPanel.jsx`가 xterm.js 터미널을 만든다.
2. 브라우저가 `/ws/terminal`로 WebSocket 연결을 연다.
3. `backend/src/server.js`가 그 연결을 받는다.
4. `engineBridge.js`가 `node-pty`로 실제 PowerShell을 연다.
5. PowerShell의 현재 경로는 프로젝트 루트다.
6. backend가 PowerShell 안에서 `.\engine\build\sql-engine.exe`를 실행한다.
7. 엔진은 `main.c`의 REPL 모드로 들어간다.
8. 엔진이 `db > ` 프롬프트를 출력한다.
9. 사용자가 입력한 키가 WebSocket으로 backend에 전달된다.
10. backend는 그 입력을 PTY shell에 그대로 쓴다.
11. 엔진 결과가 stdout으로 나온다.
12. backend는 그 출력 문자열을 다시 브라우저 xterm에 뿌린다.
13. 동시에 output을 파싱해서 `parseTree`, `rows`, `message`를 만든다.
14. `App.jsx`가 그 값을 받아서 가운데 패널을 갱신한다.

## 13. 한 줄 결론

현재 브라우저 터미널이 실제처럼 보이는 이유는:

```text
xterm.js가 터미널 "모양"을 만들고,
node-pty가 실제 PowerShell 세션을 만들고,
그 shell 안에서 sql-engine.exe를 실행하며,
WebSocket이 양방향 입출력을 계속 중계하기 때문
```
