import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// The left panel opens a real PTY-backed terminal session. In development,
// StrictMode mounts and unmounts the tree twice, which causes the WebSocket
// session to open and abort once before the real render.
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
