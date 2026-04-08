const EXAMPLES = [
  "INSERT INTO comments VALUES (1, 'kim', 'hello');",
  "SELECT * FROM comments;",
  "SELECT author, content FROM comments WHERE author = 'kim';",
  ".exit",
];

const terminalElement = document.getElementById("terminal");
const statusElement = document.getElementById("terminal-status");
const examplesRow = document.getElementById("examples-row");
const parseTreeEmpty = document.getElementById("parse-tree-empty");
const parseTreeRoot = document.getElementById("parse-tree-root");
const queryTypeElement = document.getElementById("query-type");
const serviceMessageElement = document.getElementById("service-message");
const serviceErrorElement = document.getElementById("service-error");
const serviceEmpty = document.getElementById("service-empty");
const serviceTableWrap = document.getElementById("service-table-wrap");
const serviceHead = document.getElementById("service-head");
const serviceBody = document.getElementById("service-body");

const term = new Terminal({
  cursorBlink: true,
  convertEol: true,
  fontFamily: "Consolas, 'JetBrains Mono', monospace",
  fontSize: 14,
  theme: {
    background: "#07101d",
    foreground: "#e5eefc",
    cursor: "#f472b6",
    selectionBackground: "rgba(125, 211, 252, 0.26)",
  },
});
const fitAddon = new FitAddon.FitAddon();
let socket = null;

term.loadAddon(fitAddon);
term.open(terminalElement);

function setStatus(message, tone = "busy") {
  statusElement.textContent = message;
  statusElement.dataset.tone = tone;
}

function connectTerminal() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  socket = new WebSocket(`${protocol}://${window.location.host}/ws/terminal`);

  socket.addEventListener("open", () => {
    setStatus("연결됨", "ok");
    fitAddon.fit();
    sendResize();
    term.focus();
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "output") {
      term.write(message.data);
      return;
    }

    if (message.kind === "status") {
      const tone = message.error ? "error" : message.message.includes("실행") ? "busy" : "ok";
      setStatus(message.message || "연결됨", tone);
      if (message.error) {
        serviceErrorElement.textContent = message.error;
        serviceErrorElement.classList.remove("hidden");
      } else if (message.message === "연결됨") {
        serviceErrorElement.classList.add("hidden");
      }
      return;
    }

    if (message.kind === "clear") {
      clearPanels();
      return;
    }

    if (message.kind === "result") {
      renderResult(message);
    }
  });

  socket.addEventListener("close", () => {
    setStatus("연결 종료", "error");
    if (serviceErrorElement.classList.contains("hidden")) {
      serviceErrorElement.textContent = "터미널 연결이 종료되었습니다.";
      serviceErrorElement.classList.remove("hidden");
    }
  });

  socket.addEventListener("error", () => {
    setStatus("연결 실패", "error");
    serviceErrorElement.textContent = "백엔드 터미널 소켓 연결에 실패했습니다.";
    serviceErrorElement.classList.remove("hidden");
  });
}

function sendResize() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: "resize",
      cols: term.cols,
      rows: term.rows,
    }),
  );
}

function sendInput(data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify({ type: "input", data }));
}

function clearPanels() {
  parseTreeRoot.innerHTML = "";
  parseTreeRoot.classList.add("hidden");
  parseTreeEmpty.classList.remove("hidden");
  queryTypeElement.textContent = "대기 중";
  serviceMessageElement.textContent = "왼쪽 터미널에서 SQL을 실행하면 결과가 여기에 반영됩니다.";
  serviceErrorElement.classList.add("hidden");
  serviceTableWrap.classList.add("hidden");
  serviceEmpty.classList.remove("hidden");
  serviceHead.innerHTML = "";
  serviceBody.innerHTML = "";
}

function renderResult(payload) {
  queryTypeElement.textContent = payload.queryType || "UNKNOWN";
  serviceMessageElement.textContent = payload.message || "Executed.";

  if (payload.success === false) {
    serviceErrorElement.textContent = payload.message || "쿼리 실행에 실패했습니다.";
    serviceErrorElement.classList.remove("hidden");
  } else {
    serviceErrorElement.classList.add("hidden");
  }

  renderParseTree(payload.parseTree);
  renderRows(payload.rows || []);
}

function renderParseTree(tree) {
  parseTreeRoot.innerHTML = "";

  if (!tree) {
    parseTreeRoot.classList.add("hidden");
    parseTreeEmpty.classList.remove("hidden");
    return;
  }

  parseTreeEmpty.classList.add("hidden");
  parseTreeRoot.classList.remove("hidden");
  parseTreeRoot.appendChild(buildTreeNode(tree));
}

function buildTreeNode(node) {
  const wrapper = document.createElement("article");
  wrapper.className = "tree-node";

  const header = document.createElement("div");
  header.className = "tree-node-header";

  const type = document.createElement("strong");
  type.className = "tree-node-type";
  type.textContent = node.type || "NODE";
  header.appendChild(type);

  if (node.value) {
    const value = document.createElement("span");
    value.className = "tree-node-value";
    value.textContent = node.value;
    header.appendChild(value);
  }

  wrapper.appendChild(header);

  if (Array.isArray(node.children) && node.children.length > 0) {
    const children = document.createElement("div");
    children.className = "tree-children";
    node.children.forEach((child) => {
      children.appendChild(buildTreeNode(child));
    });
    wrapper.appendChild(children);
  }

  return wrapper;
}

function renderRows(rows) {
  serviceHead.innerHTML = "";
  serviceBody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    serviceTableWrap.classList.add("hidden");
    serviceEmpty.classList.remove("hidden");
    return;
  }

  serviceEmpty.classList.add("hidden");
  serviceTableWrap.classList.remove("hidden");

  const columns = Object.keys(rows[0]);
  const headRow = document.createElement("tr");
  columns.forEach((column) => {
    const th = document.createElement("th");
    th.textContent = column;
    headRow.appendChild(th);
  });
  serviceHead.appendChild(headRow);

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((column) => {
      const td = document.createElement("td");
      td.textContent = row[column] ?? "";
      tr.appendChild(td);
    });
    serviceBody.appendChild(tr);
  });
}

EXAMPLES.forEach((example) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "example-button";
  button.textContent = example;
  button.addEventListener("click", () => {
    sendInput(`${example}\r`);
    term.focus();
  });
  examplesRow.appendChild(button);
});

term.onData((data) => sendInput(data));

window.addEventListener("resize", () => {
  fitAddon.fit();
  sendResize();
});

terminalElement.addEventListener("click", () => term.focus());

clearPanels();
connectTerminal();
setTimeout(() => {
  fitAddon.fit();
  term.focus();
}, 0);
