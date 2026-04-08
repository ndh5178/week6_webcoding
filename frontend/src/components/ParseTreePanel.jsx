const styles = {
  panel: {
    display: "flex",
    flexDirection: "column",
    minHeight: 320,
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
    background: "rgba(255, 255, 255, 0.8)",
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
    overflow: "auto",
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
  nodeCard: {
    border: "1px solid #d7dee7",
    borderRadius: 14,
    background: "#ffffff",
    padding: 14,
  },
  nodeHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  nodeTag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0f766e",
    background: "#ccfbf1",
  },
  nodeTitle: {
    margin: 0,
    fontSize: "0.98rem",
    fontWeight: 700,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "max-content 1fr",
    gap: "6px 10px",
    marginTop: 12,
  },
  metaKey: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#4b5d73",
  },
  metaValue: {
    margin: 0,
    fontSize: "0.84rem",
    color: "#10233a",
    wordBreak: "break-word",
  },
  branchBlock: {
    marginTop: 14,
  },
  branchLabel: {
    margin: "0 0 8px",
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#4b5d73",
  },
  childStack: {
    display: "grid",
    gap: 12,
    paddingLeft: 14,
    borderLeft: "2px solid #dbe4ee",
  },
  leaf: {
    padding: "10px 12px",
    border: "1px solid #d7dee7",
    borderRadius: 12,
    background: "#f8fbff",
  },
  leafText: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#10233a",
    wordBreak: "break-word",
  },
  emptyChildren: {
    padding: "10px 12px",
    borderRadius: 12,
    background: "#f6f8fb",
    color: "#61758a",
    fontSize: "0.84rem",
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

function LeafNode({ label, value }) {
  return (
    <div style={styles.leaf}>
      <p style={styles.leafText}>
        <strong>{formatLabel(label)}:</strong> {formatValue(value)}
      </p>
    </div>
  );
}

function TreeBranch({ label, value }) {
  if (isScalar(value) || (Array.isArray(value) && value.every(isScalar))) {
    return <LeafNode label={label} value={value} />;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <div style={styles.emptyChildren}>No items.</div>;
    }

    return (
      <div style={styles.childStack}>
        {value.map((child, index) => (
          <TreeBranch
            key={`${label}-${index}`}
            label={`${label} ${index + 1}`}
            value={child}
          />
        ))}
      </div>
    );
  }

  const heading = getHeading(value, label);
  const scalarEntries = getScalarEntries(value, heading.key);
  const nestedEntries = getNestedEntries(value);
  const children = normalizeChildren(value);

  return (
    <article style={styles.nodeCard}>
      <div style={styles.nodeHeader}>
        <span style={styles.nodeTag}>{formatLabel(label)}</span>
        <h3 style={styles.nodeTitle}>{heading.text}</h3>
      </div>

      {scalarEntries.length > 0 ? (
        <dl style={styles.metaGrid}>
          {scalarEntries.map(([key, entryValue]) => (
            <FragmentEntry
              key={key}
              label={key}
              value={formatValue(entryValue)}
            />
          ))}
        </dl>
      ) : null}

      {nestedEntries.map(([key, entryValue]) => (
        <section key={key} style={styles.branchBlock}>
          <p style={styles.branchLabel}>{formatLabel(key)}</p>
          <TreeBranch label={key} value={entryValue} />
        </section>
      ))}

      {children !== null ? (
        <section style={styles.branchBlock}>
          <p style={styles.branchLabel}>Children</p>
          {children.length === 0 ? (
            <div style={styles.emptyChildren}>No child nodes.</div>
          ) : (
            <div style={styles.childStack}>
              {children.map((child, index) => (
                <TreeBranch
                  key={`child-${index}`}
                  label={`Child ${index + 1}`}
                  value={child}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </article>
  );
}

function FragmentEntry({ label, value }) {
  return (
    <>
      <dt style={styles.metaKey}>{formatLabel(label)}</dt>
      <dd style={styles.metaValue}>{value}</dd>
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

export default function ParseTreePanel({ parseTree }) {
  const hasParseTree = parseTree !== undefined && parseTree !== null;

  return (
    <section style={styles.panel} aria-labelledby="parse-tree-panel-title">
      <header style={styles.header}>
        <p style={styles.eyebrow}>Panel 2</p>
        <h2 id="parse-tree-panel-title" style={styles.title}>
          Parse Tree
        </h2>
        <p style={styles.subtitle}>
          Show the AST or query structure returned by the backend. Keep this
          panel focused on visualization only.
        </p>
      </header>

      <div style={styles.content}>
        {hasParseTree ? (
          <TreeBranch label="Root" value={parseTree} />
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}
