/**
 * lib/graphTransform.ts – Convert ScenarioGraph (adjacency matrix) to ReactFlow nodes/edges.
 */
import { Node, Edge } from '@xyflow/react';
import { ScenarioGraph } from '@/types';

const NODE_TYPE_MAP: Record<string, string> = {
  root: 'scenarioRootNode',
  comparisonRoot: 'comparisonRootNode',
  unionPath: 'unionPathNode',
  outcome: 'outcomeNode',
  failureFork: 'failureForkNode',
  riskMitigation: 'riskNode',
  default: 'outcomeNode',
};

export function scenarioGraphToFlow(
  graph: ScenarioGraph,
  expandedNodeIds: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const { nodes: graphNodes } = graph;

  // Map graph nodes to ReactFlow nodes structure
  const reactFlowNodes = graphNodes.map((gn) => {
    const rfType = NODE_TYPE_MAP[gn.type] || NODE_TYPE_MAP.default;
    const isExpanded = gn.data.is_expanded || expandedNodeIds.has(gn.id);

    return {
      id: gn.id,
      type: rfType,
      position: gn.position,
      data: {
        ...gn.data,
        nodeId: gn.id,
        nodeType: gn.type,
        isExpanded,
      },
      hidden: false,
    };
  });

  const reactFlowEdges: any[] = [];
  graphNodes.forEach((node) => {
    if (node.children) {
      node.children.forEach((child) => {
        reactFlowEdges.push({
          id: `edge_from_${node.id}_to_${child.target_id}`,
          source: node.id,
          target: child.target_id,
          label: child.label,
          animated: child.animation,
          type: 'default',
          labelStyle: {
            fill: 'rgba(240, 240, 255, 0.7)',
          },
          labelBgStyle: {
            fill: 'transparent',
          }
        });
      });
    }
  });

  return { nodes: reactFlowNodes as Node[], edges: reactFlowEdges as Edge[] };
}

