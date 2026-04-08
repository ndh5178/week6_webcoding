# Agent.md 템플릿

아래는 실전에서 검증된 Agent.md 구조다. 프로젝트에 맞게 `<placeholder>`를 채워서 사용한다.

---

```markdown
# Agent.md — <프로젝트명> 하네스 엔지니어링 명세

## 프로젝트 개요

<프로젝트 한 줄 설명>

---

## 현재 상태 (AS-IS)

### 완성된 것: 코어 엔진 (core/)
- `core/src/<파일>` — <역할 설명>
- `core/<binary>` — 컴파일된 실행파일
- `core/tests/` — <N>개 자동화 테스트 (전부 통과)

### 동작 확인된 예시
\```
<실제 터미널 출력을 그대로 복사>
\```

### 미완성
- <뭐가 안 되는지>

---

## 목표 상태 (TO-BE): 하네스 아키텍처

### 폴더 구조
\```
project-root/
├── core/
│   ├── src/
│   ├── tests/
│   └── <binary>
├── harness/
│   ├── bridge.js
│   ├── protocol.js
│   ├── server.js
│   └── tests/
├── frontend/
│   └── src/
├── data/
├── tests/
├── Agent.md
├── ROLES.md
└── README.md
\```

---

## 데이터 흐름

\```
[사용자 브라우저]
       │ WebSocket / HTTP
       ▼
[harness/server.js]     ← 프론트엔드 요청 수신
       │ 함수 호출
       ▼
[harness/bridge.js]     ← child_process로 코어 엔진 실행
       │ stdin/stdout
       ▼
[core/<binary>]         ← 코어 엔진 (수정 금지)
       │ stdout
       ▼
[harness/protocol.js]   ← 텍스트 → JSON 변환
       │ JSON
       ▼
[harness/server.js]     ← 프론트엔드로 응답
\```

---

## 작업 목록

### TASK 1: <제목>

**목적:** <한 줄>
**파일:** `<경로>`

**인터페이스:**
\```javascript
/**
 * <함수 설명>
 * @param {<타입>} <이름> - <설명>
 * @returns {<타입>} <설명>
 */
async function <이름>(<파라미터>) { }
\```

**검증:**
\```bash
<이 명령이 성공하면 TASK 완료>
\```

---

(TASK 2, 3, ... 반복)

---

## 코어 엔진 인터페이스 명세 (수정 금지 구역)

### 입력
\```
<엔진에 보내는 입력 형식>
\```

### 출력

**성공:**
\```
<성공 시 출력>
\```

**에러:**
\```
<에러 시 출력>
\```

---

## 실행 명령어 요약

\```bash
# 코어 빌드
cd core/src && make

# 코어 단독 실행
cd core && ./<binary>

# 하네스 서버
cd harness && npm install && node server.js

# 프론트엔드
cd frontend && npm install && npm run dev

# 전체 테스트
bash tests/e2e.sh
\```
```
