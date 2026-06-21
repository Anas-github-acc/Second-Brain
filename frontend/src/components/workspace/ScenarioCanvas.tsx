'use client';
import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
} from '@xyflow/react';
import { useSessionStore } from '@/store/sessionStore';
import { scenarioGraphToFlow } from '@/lib/graphTransform';
import ScenarioNodeComponent from '@/components/nodes/ScenarioNode';
import { ScenarioGraphNode } from '@/types';

const nodeTypes = {
  scenarioRootNode: ScenarioNodeComponent,
  comparisonRootNode: ScenarioNodeComponent,
  unionPathNode: ScenarioNodeComponent,
  outcomeNode: ScenarioNodeComponent,
  failureForkNode: ScenarioNodeComponent,
  riskNode: ScenarioNodeComponent,
};

export default function ScenarioCanvas() {
  const scenarioGraph = useSessionStore((s) => s.scenarioGraph);
  const expandedNodeIds = useSessionStore((s) => s.expandedNodeIds);
  const setSelectedNode = useSessionStore((s) => s.setSelectedNode);
  const selectedNode = useSessionStore((s) => s.selectedNode);
  const isLoading = useSessionStore((s) => s.isLoading);
  const session = useSessionStore((s) => s.session);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!scenarioGraph || scenarioGraph.node_count === 0) {
      return { nodes: [], edges: [] };
    }
    const flow = scenarioGraphToFlow(scenarioGraph, expandedNodeIds);
    if (selectedNode) {
      flow.nodes = flow.nodes.map((n) => {
        if (n.id === String(selectedNode.id)) {
          return { ...n, zIndex: 1000 };
        }
        return { ...n, zIndex: 0 };
      });
    }
    return flow;
  }, [scenarioGraph, expandedNodeIds, selectedNode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Find the corresponding ScenarioGraphNode
      const graphNode = scenarioGraph?.nodes.find((n) => String(n.id) === node.id);
      if (graphNode) {
        setSelectedNode(graphNode);
      }
      // Instantly bring the clicked node to front
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            return { ...n, zIndex: 1000 };
          }
          return { ...n, zIndex: 0 };
        })
      );
    },
    [scenarioGraph, setSelectedNode, setNodes]
  );

  // Empty state
  if (!scenarioGraph || scenarioGraph.node_count === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {isLoading ? (
          <>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '3px solid rgba(108,99,255,0.2)',
                borderTopColor: '#6c63ff',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Generating your scenario graph...</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>This may take 15-30 seconds</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, opacity: 0.3 }}>✦</div>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              {session?.status === 'questioning'
                ? 'Answer the discovery questions to generate your scenario graph'
                : 'Your career path scenario graph will appear here'}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: 'relative', background: 'var(--bg)' }}>
      {/* Node count badge */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          padding: '4px 12px',
          borderRadius: 20,
          background: 'rgba(108,99,255,0.15)',
          border: '1px solid rgba(108,99,255,0.3)',
          fontSize: 11,
          color: 'var(--accent)',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
        }}
      >
        ✦ {scenarioGraph.node_count} nodes
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const typeColorMap: Record<string, string> = {
              scenarioRootNode: '#6c63ff',
              comparisonRootNode: '#22d3ee',
              unionPathNode: '#a78bfa',
              outcomeNode: '#22c55e',
              failureForkNode: '#ef4444',
              riskNode: '#f59e0b',
            };
            return typeColorMap[node.type || ''] || '#8888aa';
          }}
          maskColor="rgba(10,10,15,0.85)"
        />
      </ReactFlow>
    </div>
  );
}
