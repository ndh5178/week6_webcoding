import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

/**
 * === 파싱 트리 시각화 컴포넌트 (규민 담당) ===
 *
 * C 엔진이 뱉어낸 AST(Abstract Syntax Tree) 구조를
 * React Flow로 시각화합니다.
 *
 * [개발 TIP]
 * - 트리 데이터 구조: { type, value?, children? }
 * - 이 컴포넌트가 알아서 노드 위치를 계산합니다
 * - 색깔/스타일은 styles.css의 .tree-node 클래스 참고
 */

// 트리 데이터 → React Flow 노드/엣지 변환
function treeToFlow(tree, x = 0, y = 0, parentId = null, nodes = [], edges = [], counter = { id: 0 }) {
  if (!tree) return { nodes: [], edges: [] };

  const id = `node-${counter.id++}`;
  const nodeType =
    !parentId ? 'root' :
    tree.children ? 'keyword' :
    tree.type === 'OPERATOR' ? 'operator' : 'value';

  const label = tree.value ? `${tree.type}\n${tree.value}` : tree.type;

  nodes.push({
    id,
    position: { x, y },
    data: { label },
    className: `tree-node ${nodeType}`,
    style: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: `2px solid ${
        nodeType === 'root' ? '#ff6b9d' :
        nodeType === 'keyword' ? '#a855f7' :
        nodeType === 'operator' ? '#d29922' : '#58a6ff'
      }`,
      background: `${
        nodeType === 'root' ? 'rgba(255, 107, 157, 0.15)' :
        nodeType === 'keyword' ? 'rgba(168, 85, 247, 0.15)' :
        nodeType === 'operator' ? 'rgba(210, 153, 34, 0.15)' : 'rgba(88, 166, 255, 0.15)'
      }`,
      color: '#e6edf3',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      minWidth: '80px'
    }
  });

  if (parentId) {
    edges.push({
      id: `edge-${parentId}-${id}`,
      source: parentId,
      target: id,
      style: { stroke: '#30363d', strokeWidth: 2 },
      animated: true
    });
  }

  if (tree.children) {
    const childCount = tree.children.length;
    const spacing = 160;
    const startX = x - ((childCount - 1) * spacing) / 2;

    tree.children.forEach((child, i) => {
      treeToFlow(child, startX + i * spacing, y + 100, id, nodes, edges, counter);
    });
  }

  return { nodes, edges };
}

// 빈 상태 표시
function EmptyState() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#8b949e',
      gap: '16px'
    }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="5" r="3" />
        <line x1="12" y1="8" x2="12" y2="13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="18" r="3" />
        <line x1="12" y1="13" x2="6" y2="15" />
        <line x1="12" y1="13" x2="18" y2="15" />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>파싱 트리 대기 중</div>
        <div style={{ fontSize: '13px' }}>터미널에서 SQL 쿼리를 실행하면<br/>여기에 구문 분석 결과가 표시됩니다</div>
      </div>
    </div>
  );
}

export default function ParseTree({ tree }) {
  const { nodes, edges } = useMemo(() => {
    if (!tree) return { nodes: [], edges: [] };
    return treeToFlow(tree, 300, 30);
  }, [tree]);

  if (!tree) return <EmptyState />;

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      style={{ background: '#0d1117' }}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#21262d" gap={20} />
      <Controls
        style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }}
      />
    </ReactFlow>
  );
}
