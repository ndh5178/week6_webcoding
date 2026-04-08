import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const LAYOUT = {
  horizontalGap: 320,
  verticalGap: 170,
};

const styles = {
  panel: {
    display: "flex",
    flexDirection: "column",
    minHeight: 520,
    height: "100%",
    border: "1px solid #1f2937",
    borderRadius: 18,
    background: "linear-gradient(180deg, #111827 0%, #0f172a 100%)",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.14)",
    color: "#e5eefc",
    overflow: "hidden",
  },
  header: {
    padding: "18px 20px 14px",
    borderBottom: "1px solid #1f2937",
    background: "rgba(17, 24, 39, 0.92)",
  },
  eyebrow: {
    margin: 0,
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#c084fc",
  },
  title: {
    margin: "8px 0 0",
    fontSize: "1.15rem",
    fontWeight: 700,
  },
  subtitle: {
    margin: "8px 0 0",
    fontSize: "0.92rem",
    lineHeight: 1.5,
    color: "#94a3b8",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  canvasFrame: {
    height: "100%",
    minHeight: 430,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid #334155",
    background:
      "radial-gradient(circle at top left, rgba(76, 29, 149, 0.18), transparent 28%), linear-gradient(180deg, #111827 0%, #0b1120 100%)",
  },
  emptyState: {
    padding: 18,
    border: "1px dashed #334155",
    borderRadius: 14,
    background: "#0f172a",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    color: "#f8fafc",
  },
  emptyText: {
    margin: "8px 0 0",
    lineHeight: 1.6,
    color: "#94a3b8",
  },
  nodeShell: {
    minWidth: 220,
    maxWidth: 280,
    borderRadius: 18,
    border: "1px solid #7c3aed",
    background: "linear-gradient(180deg, #111827 0%, #1e1b4b 100%)",
    boxShadow: "0 18px 34px rgba(124, 58, 237, 0.18)",
    overflow: "hidden",
  },
  nodeHeader: {
    padding: "12px 14px 10px",
    borderBottom: "1px solid rgba(221, 214, 254, 0.18)",
    background: "rgba(17, 24, 39, 0.92)",
  },
  nodeLabel: {
    margin: 0,
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#c4b5fd",
  },
  nodeTitle: {
    margin: "6px 0 0",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#f5f3ff",
  },
  nodeBody: {
    padding: "12px 14px 14px",
    display: "grid",
    gap: 10,
  },
  nodeHint: {
    margin: 0,
    fontSize: "0.82rem",
    lineHeight: 1.5,
    color: "#cbd5e1",
  },
  nodeMetaGrid: {
    display: "grid",
    gridTemplateColumns: "max-content 1fr",
    gap: "6px 10px",
  },
  nodeMetaKey: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#c4b5fd",
  },
  nodeMetaValue: {
    margin: 0,
    fontSize: "0.82rem",
    color: "#e5eefc",
    wordBreak: "break-word",
  },
  nodeFooter: {
    margin: 0,
    fontSize: "0.78rem",
    color: "#cbd5e1",
  },
  handleLeft: {
    width: 10,
    height: 10,
    border: "2px solid #ffffff",
    background: "#8b5cf6",
    left: -6,
  },
  handleRight: {
    width: 10,
    height: 10,
    border: "2px solid #ffffff",
    background: "#14b8a6",
    right: -6,
  },
};

function isScalar(value) {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function formatLabel(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value) {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return value.map(formatValue).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getHeading(node, fallbackLabel) {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    if (typeof node.type === "string" && node.type.trim()) {
      return { key: "type", text: node.type.toUpperCase() };
    }

    if (typeof node.kind === "string" && node.kind.trim()) {
      return { key: "kind", text: node.kind };
    }

    if (typeof node.name === "string" && node.name.trim()) {
      return { key: "name", text: node.name };
    }
  }

  return { key: null, text: formatLabel(fallbackLabel) };
}

function getScalarEntries(node, headingKey) {
  return Object.entries(node).filter(([key, value]) => {
    if (key === "children" || key === headingKey || value === undefined) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.every(isScalar);
    }

    return isScalar(value);
  });
}

function getNestedEntries(node) {
  return Object.entries(node).filter(([key, value]) => {
    if (key === "children" || value === undefined) {
      return false;
    }

    if (Array.isArray(value)) {
      return !value.every(isScalar);
    }

    return value !== null && typeof value === "object";
  });
}

function normalizeChildren(node) {
  if (!Object.prototype.hasOwnProperty.call(node, "children")) {
    return null;
  }

  if (Array.isArray(node.children)) {
    return node.children;
  }

  if (node.children === undefined || node.children === null) {
    return [];
  }

  return [node.children];
}

function createDescriptor(value, relationLabel, sequence) {
  const id = `parse-node-${sequence.current++}`;
  const label = formatLabel(relationLabel);

  if (isScalar(value) || (Array.isArray(value) && value.every(isScalar))) {
    return {
      id,
      label,
      title: label,
      meta: [{ key: "value", value: formatValue(value) }],
      children: [],
    };
  }

  if (Array.isArray(value)) {
    return {
      id,
      label,
      title: `${label} (${value.length})`,
      meta: [],
      children: value.map((childValue, index) => ({
        edgeLabel: `Item ${index + 1}`,
        node: createDescriptor(childValue, `Item ${index + 1}`, sequence),
      })),
    };
  }

  const heading = getHeading(value, relationLabel);
  const meta = getScalarEntries(value, heading.key).map(([key, entryValue]) => ({
    key,
    value: formatValue(entryValue),
  }));
  const children = [];

  getNestedEntries(value).forEach(([key, entryValue]) => {
    if (Array.isArray(entryValue)) {
      entryValue.forEach((childValue, index) => {
        children.push({
          edgeLabel: formatLabel(key),
          node: createDescriptor(childValue, `${formatLabel(key)} ${index + 1}`, sequence),
        });
      });
      return;
    }

    children.push({
      edgeLabel: formatLabel(key),
      node: createDescriptor(entryValue, formatLabel(key), sequence),
    });
  });

  const explicitChildren = normalizeChildren(value);
  if (explicitChildren !== null) {
    explicitChildren.forEach((childValue, index) => {
      children.push({
        edgeLabel: `Child ${index + 1}`,
        node: createDescriptor(childValue, `Child ${index + 1}`, sequence),
      });
    });
  }

  return {
    id,
    label,
    title: heading.text,
    meta,
    children,
  };
}

function countLeaves(descriptor) {
  if (descriptor.children.length === 0) {
    return 1;
  }

  return descriptor.children.reduce((total, child) => total + countLeaves(child.node), 0);
}

function layoutDescriptor(descriptor, depth, leafCursor, nodes, edges) {
  const childPlacements = [];
  let nextLeafCursor = leafCursor;

  descriptor.children.forEach((child) => {
    const childLeafCount = countLeaves(child.node);
    const childCenterY = layoutDescriptor(child.node, depth + 1, nextLeafCursor, nodes, edges);

    childPlacements.push({ child, centerY: childCenterY });
    nextLeafCursor += childLeafCount;
  });

  const centerY =
    childPlacements.length === 0
      ? leafCursor * LAYOUT.verticalGap
      : childPlacements.reduce((sum, item) => sum + item.centerY, 0) / childPlacements.length;

  nodes.push({
    id: descriptor.id,
    type: "parseNode",
    position: {
      x: depth * LAYOUT.horizontalGap,
      y: centerY,
    },
    data: {
      label: descriptor.label,
      title: descriptor.title,
      meta: descriptor.meta,
      childCount: descriptor.children.length,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  childPlacements.forEach(({ child }) => {
    edges.push({
      id: `${descriptor.id}-${child.node.id}`,
      source: descriptor.id,
      target: child.node.id,
      type: "smoothstep",
      label: child.edgeLabel,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#8b5cf6",
      },
      style: {
        stroke: "#a78bfa",
        strokeWidth: 1.6,
      },
      labelStyle: {
        fill: "#cbd5e1",
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: "#0f172a",
        fillOpacity: 0.92,
      },
    });
  });

  return centerY;
}

function buildFlowGraph(parseTree) {
  const sequence = { current: 1 };
  const rootDescriptor = createDescriptor(parseTree, "Root", sequence);
  const nodes = [];
  const edges = [];

  layoutDescriptor(rootDescriptor, 0, 0, nodes, edges);

  return { nodes, edges };
}

function ParseNodeCard({ data }) {
  return (
    <div style={styles.nodeShell}>
      <Handle type="target" position={Position.Left} style={styles.handleLeft} />

      <div style={styles.nodeHeader}>
        <p style={styles.nodeLabel}>{data.label}</p>
        <h3 style={styles.nodeTitle}>{data.title}</h3>
      </div>

      <div style={styles.nodeBody}>
        {data.meta.length > 0 ? (
          <dl style={styles.nodeMetaGrid}>
            {data.meta.map((entry) => (
              <NodeMetaEntry key={`${entry.key}-${entry.value}`} label={entry.key} value={entry.value} />
            ))}
          </dl>
        ) : (
          <p style={styles.nodeHint}>이 노드에는 추가 메타데이터가 없습니다.</p>
        )}

        <p style={styles.nodeFooter}>
          {data.childCount > 0
            ? `${data.childCount}개 하위 분기`
            : "리프 노드"}
        </p>
      </div>

      <Handle type="source" position={Position.Right} style={styles.handleRight} />
    </div>
  );
}

function NodeMetaEntry({ label, value }) {
  return (
    <>
      <dt style={styles.nodeMetaKey}>{formatLabel(label)}</dt>
      <dd style={styles.nodeMetaValue}>{value}</dd>
    </>
  );
}

function EmptyState() {
  return (
    <div style={styles.emptyState}>
      <h3 style={styles.emptyTitle}>아직 파싱 트리가 없습니다</h3>
      <p style={styles.emptyText}>
        왼쪽 CLI 패널에서 SQL을 실행하면, 백엔드가 돌려준 파싱 구조를 이 패널에서 시각화합니다.
      </p>
    </div>
  );
}

const nodeTypes = {
  parseNode: ParseNodeCard,
};

export default function ParseTreePanel({ tree }) {
  const hasParseTree = tree !== undefined && tree !== null;
  const flowGraph = hasParseTree ? buildFlowGraph(tree) : null;

  return (
    <section style={styles.panel} aria-labelledby="parse-tree-panel-title">
      <header style={styles.header}>
        <p style={styles.eyebrow}>Panel 2</p>
        <h2 id="parse-tree-panel-title" style={styles.title}>
          Parse Tree
        </h2>
        <p style={styles.subtitle}>
          백엔드가 해석한 현재 쿼리 구조를 노드 그래프로 보여주는 패널입니다.
        </p>
      </header>

      <div style={styles.content}>
        {hasParseTree ? (
          <div style={styles.canvasFrame}>
            <ReactFlow
              nodes={flowGraph.nodes}
              edges={flowGraph.edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              minZoom={0.35}
              maxZoom={1.6}
            >
              <Background gap={24} color="#312e81" />
              <Controls />
            </ReactFlow>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}
