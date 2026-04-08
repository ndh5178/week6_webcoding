import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function walkTree(node, parentId = null, depth = 0, index = 0, acc = { nodes: [], edges: [] }) {
  if (!node) {
    return acc;
  }

  const id = `${depth}-${index}-${node.type ?? "node"}-${node.value ?? "root"}`;
  acc.nodes.push({
    id,
    position: {
      x: depth * 220,
      y: acc.nodes.length * 96,
    },
    data: {
      label: buildNodeLabel(node),
    },
    style: {
      borderRadius: 18,
      padding: 12,
      border: "1px solid rgba(56, 189, 248, 0.28)",
      background: "rgba(15, 23, 42, 0.96)",
      color: "#e2e8f0",
      width: 180,
      boxShadow: "0 12px 28px rgba(2, 6, 23, 0.35)",
      fontSize: 13,
      fontWeight: 600,
      lineHeight: 1.4,
    },
  });

  if (parentId) {
    acc.edges.push({
      id: `${parentId}-${id}`,
      source: parentId,
      target: id,
      style: {
        stroke: "#38bdf8",
        strokeWidth: 1.8,
      },
    });
  }

  (node.children ?? []).forEach((child, childIndex) => {
    walkTree(child, id, depth + 1, childIndex, acc);
  });

  return acc;
}

function buildNodeLabel(node) {
  if (!node) {
    return "빈 노드";
  }

  if (node.value !== undefined && node.value !== "") {
    return `${node.type}\n${node.value}`;
  }

  return String(node.type ?? "NODE");
}

export default function ParseTreePanel({ tree }) {
  const fallbackTree = tree ?? {
    type: "대기 중",
    children: [
      { type: "안내", value: "왼쪽에서 SQL을 실행하면 파싱 트리가 생성됩니다." },
    ],
  };

  const { nodes, edges } = walkTree(fallbackTree);

  return (
    <section style={styles.panel}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>PANEL 2</p>
          <h2 style={styles.title}>Parse Tree</h2>
        </div>
        <span style={styles.badge}>{tree ? "실행 반영됨" : "대기 중"}</span>
      </header>

      <div style={styles.graphArea}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.3}
          maxZoom={1.5}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <MiniMap
            pannable
            zoomable
            style={styles.minimap}
            nodeColor={() => "#38bdf8"}
            maskColor="rgba(2, 6, 23, 0.56)"
          />
          <Controls style={styles.controls} />
          <Background color="rgba(148, 163, 184, 0.14)" gap={18} />
        </ReactFlow>
      </div>

      <div style={styles.rawSection}>
        <p style={styles.rawTitle}>원본 트리</p>
        <pre style={styles.rawBlock}>{JSON.stringify(fallbackTree, null, 2)}</pre>
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
    alignItems: "center",
  },
  eyebrow: {
    margin: 0,
    fontSize: "11px",
    letterSpacing: "0.16em",
    fontWeight: 700,
    color: "#a855f7",
  },
  title: {
    margin: "8px 0 0",
    fontSize: "34px",
    fontWeight: 800,
  },
  badge: {
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#e9d5ff",
    background: "rgba(88, 28, 135, 0.4)",
    border: "1px solid rgba(192, 132, 252, 0.3)",
  },
  graphArea: {
    flex: 1,
    minHeight: "440px",
    borderRadius: "20px",
    overflow: "hidden",
    border: "1px solid rgba(168, 85, 247, 0.18)",
    background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.96))",
  },
  minimap: {
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: 12,
  },
  controls: {
    background: "rgba(15, 23, 42, 0.95)",
    borderRadius: 12,
    border: "1px solid rgba(148, 163, 184, 0.16)",
  },
  rawSection: {
    borderTop: "1px solid rgba(148, 163, 184, 0.12)",
    paddingTop: "14px",
  },
  rawTitle: {
    margin: 0,
    color: "#cbd5e1",
    fontWeight: 700,
    fontSize: "14px",
  },
  rawBlock: {
    margin: "10px 0 0",
    padding: "14px",
    borderRadius: "14px",
    background: "rgba(2, 6, 23, 0.8)",
    color: "#cbd5e1",
    overflow: "auto",
    fontSize: "12px",
    lineHeight: 1.6,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
};
