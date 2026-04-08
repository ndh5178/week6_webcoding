import { useEffect, useMemo, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const DEFAULT_EXAMPLES = [
  "INSERT INTO comments VALUES (1, 'kim', 'hello');",
  "SELECT * FROM comments;",
  "SELECT author, content FROM comments WHERE author = 'kim';",
  ".exit",
];

export default function Terminal({
  onPayload,
  status = "연결 중...",
  examples = DEFAULT_EXAMPLES,
}) {
  const shellRef = useRef(null);
  const xtermRef = useRef(null);
  const socketRef = useRef(null);

  const normalizedExamples = useMemo(
    () => (Array.isArray(examples) && examples.length > 0 ? examples : DEFAULT_EXAMPLES),
    [examples],
  );

  useEffect(() => {
    let isDisposed = false;
    let didOpen = false;
    const terminal = new XTerm({
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
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(shellRef.current);
    fitAddon.fit();
    terminal.focus();

    xtermRef.current = terminal;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.hostname}:3001/ws/terminal`);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      didOpen = true;
      onPayload?.({
        kind: "status",
        message: "연결됨",
      });
      fitAddon.fit();
      socket.send(
        JSON.stringify({
          type: "resize",
          cols: terminal.cols,
          rows: terminal.rows,
        }),
      );
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "output") {
        terminal.write(message.data);
        return;
      }

      if (message.type === "result" || message.type === "status" || message.type === "clear") {
        onPayload?.(message);
      }
    });

    socket.addEventListener("close", () => {
      if (isDisposed) {
        return;
      }

       if (!didOpen) {
        onPayload?.({
          kind: "status",
          message: "연결 실패",
          error: "백엔드 터미널 소켓 연결에 실패했습니다.",
        });
        return;
      }

      onPayload?.({
        kind: "status",
        message: "연결 종료",
        error: "터미널 연결이 종료되었습니다.",
      });
    });

    socket.addEventListener("error", () => {
      onPayload?.({
        kind: "status",
        message: "연결 실패",
        error: "백엔드 터미널 소켓 연결에 실패했습니다.",
      });
    });

    terminal.onData((data) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(JSON.stringify({ type: "input", data }));
    });

    const handleResize = () => {
      fitAddon.fit();
      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(
        JSON.stringify({
          type: "resize",
          cols: terminal.cols,
          rows: terminal.rows,
        }),
      );
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener("resize", handleResize);
      socket.close();
      terminal.dispose();
    };
  }, [onPayload]);

  function sendExample(query) {
    const terminal = xtermRef.current;
    const socket = socketRef.current;

    if (!terminal || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify({ type: "input", data: `${query}\r` }));
    terminal.focus();
  }

  return (
    <section style={styles.panel}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>PANEL 1</p>
          <h2 style={styles.title}>Real Engine Terminal</h2>
          <p style={styles.subtitle}>
            xterm.js로 실제 엔진 프로세스 세션에 연결된 터미널입니다. 브라우저는 성공을
            흉내 내지 않고, 엔진 출력만 그대로 보여줍니다.
          </p>
        </div>
        <span style={styles.statusChip(status)}>{status}</span>
      </header>

      <div style={styles.examplesCard}>
        <div style={styles.examplesHeader}>
          <strong>빠른 실행 예제</strong>
          <span>예제는 그대로 실제 터미널에 입력됩니다.</span>
        </div>
        <div style={styles.examplesRow}>
          {normalizedExamples.map((example) => (
            <button
              key={example}
              type="button"
              style={styles.exampleButton}
              onClick={() => sendExample(example)}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div
        style={styles.terminalShell}
        onClick={() => xtermRef.current?.focus()}
      >
        <div ref={shellRef} style={styles.terminalViewport} />
      </div>
    </section>
  );
}

const styles = {
  panel: {
    minHeight: "720px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "20px",
    borderRadius: "24px",
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.25)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
  },
  eyebrow: {
    margin: 0,
    fontSize: "11px",
    letterSpacing: "0.16em",
    fontWeight: 700,
    color: "#7dd3fc",
  },
  title: {
    margin: "8px 0 0",
    fontSize: "34px",
    fontWeight: 800,
  },
  subtitle: {
    margin: "10px 0 0",
    color: "#cbd5e1",
    lineHeight: 1.6,
    maxWidth: "540px",
  },
  statusChip: (status) => ({
    padding: "8px 12px",
    borderRadius: "999px",
    background: status.includes("실행") ? "rgba(56, 189, 248, 0.18)" : "rgba(34, 197, 94, 0.18)",
    color: status.includes("실행") ? "#bae6fd" : "#bbf7d0",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  }),
  examplesCard: {
    borderRadius: "18px",
    padding: "16px",
    background: "rgba(15, 23, 42, 0.66)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    display: "grid",
    gap: "12px",
  },
  examplesHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    color: "#cbd5e1",
    fontSize: "12px",
    flexWrap: "wrap",
  },
  examplesRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  exampleButton: {
    border: "1px solid rgba(125, 211, 252, 0.2)",
    background: "rgba(8, 47, 73, 0.5)",
    color: "#dbeafe",
    borderRadius: "999px",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "Consolas, 'JetBrains Mono', monospace",
  },
  terminalShell: {
    flex: 1,
    borderRadius: "20px",
    border: "1px solid rgba(125, 211, 252, 0.14)",
    background: "#07101d",
    padding: "14px",
    overflow: "hidden",
    minHeight: "480px",
  },
  terminalViewport: {
    width: "100%",
    height: "100%",
  },
};
