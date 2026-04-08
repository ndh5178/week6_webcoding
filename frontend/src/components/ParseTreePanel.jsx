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
    border: "1px solid #d7dee7",
    borderRadius: 18,
    background: "linear-gradient(180deg, #f8fbff 0%, #eef5fb 100%)",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.08)",
    color: "#10233a",
    overflow: "hidden",
  },
  header: {
    padding: "18px 20px 14px",
    borderBottom: "1px solid #dbe4ee",
    background: "rgba(255, 255, 255, 0.86)",
  },
  eyebrow: {
    margin: 0,
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#0f766e",
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
    color: "#4b5d73",
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
    border: "1px solid #d7dee7",
    background:
      "radial-gradient(circle at top left, rgba(204, 251, 241, 0.7), transparent 28%), linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  },
  emptyState: {
    padding: 18,
    border: "1px dashed #bfd2e4",
    borderRadius: 14,
    background: "#ffffff",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
  },
  emptyText: {
    margin: "8px 0 0",
    lineHeight: 1.6,
    color: "#4b5d73",
  },
  nodeShell: {
    minWidth: 220,
    maxWidth: 280,
    borderRadius: 18,
    border: "1px solid #d8b4fe",
    background: "linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)",
    boxShadow: "0 18px 34px rgba(124, 58, 237, 0.12)",
    overflow: "hidden",
  },
  nodeHeader: {
    padding: "12px 14px 10px",
    borderBottom: "1px solid #ede9fe",
    background: "rgba(255, 255, 255, 0.92)",
  },
  nodeLabel: {
    margin: 0,
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7c3aed",
  },
  nodeTitle: {
    margin: "6px 0 0",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#1e1b4b",
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
    color: "#5b5675",
  },
  nodeMetaGrid: {
    display: "grid",
    gridTemplateColumns: "max-content 1fr",
    gap: "6px 10px",
  },
  nodeMetaKey: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#6d6787",
  },
  nodeMetaValue: {
    margin: 0,
    fontSize: "0.82rem",
    color: "#1f2937",
    wordBreak: "break-word",
  },
  nodeFooter: {
    margin: 0,
    fontSize: "0.78rem",
    color: "#5b5675",
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
          node: createDescriptor(
            childValue,
            `${formatLabel(key)} ${index + 1}`,
            sequence,
          ),
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

  return descriptor.children.reduce(
    (total, child) => total + countLeaves(child.node),
    0,
  );
}

function layoutDescriptor(descriptor, depth, leafCursor, nodes, edges) {
  const childPlacements = [];
  let nextLeafCursor = leafCursor;

  descriptor.children.forEach((child) => {
    const childLeafCount = countLeaves(child.node);
    const childCenterY = layoutDescriptor(
      child.node,
      depth + 1,
      nextLeafCursor,
      nodes,
      edges,
    );

    childPlacements.push({ child, centerY: childCenterY });
    nextLeafCursor += childLeafCount;
  });

  const centerY =
    childPlacements.length === 0
      ? leafCursor * LAYOUT.verticalGap
      : childPlacements.reduce((sum, item) => sum + item.centerY, 0) /
        childPlacements.length;

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
        fill: "#5b5675",
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.95,
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
              <NodeMetaEntry
                key={`${entry.key}-${entry.value}`}
                label={entry.key}
                value={entry.value}
              />
            ))}
          </dl>
        ) : (
          <p style={styles.nodeHint}>No scalar metadata on this node.</p>
        )}

        <p style={styles.nodeFooter}>
          {data.childCount > 0
            ? `${data.childCount} outgoing branch${data.childCount > 1 ? "es" : ""}`
            : "Leaf node"}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={styles.handleRight}
      />
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
      <h3 style={styles.emptyTitle}>No parse tree yet</h3>
      <p style={styles.emptyText}>
        Run a SQL query from the CLI panel and show the backend response here.
        This panel should stay read-only and reflect the latest parsed query
        structure.
      </p>
    </div>
  );
}

const nodeTypes = {
  parseNode: ParseNodeCard,
};

export default function ParseTreePanel({ parseTree }) {
  const hasParseTree = parseTree !== undefined && parseTree !== null;
  const flowGraph = hasParseTree ? buildFlowGraph(parseTree) : null;

  return (
    <section style={styles.panel} aria-labelledby="parse-tree-panel-title">
      <header style={styles.header}>
        <p style={styles.eyebrow}>Panel 2</p>
        <h2 id="parse-tree-panel-title" style={styles.title}>
          Parse Tree
        </h2>
        <p style={styles.subtitle}>
          Show the AST or query structure returned by the backend as a node
          graph. Keep this panel focused on visualization only.
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
              <Background gap={24} color="#ddd6fe" />
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
