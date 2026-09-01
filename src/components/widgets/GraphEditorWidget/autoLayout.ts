import dagre from '@dagrejs/dagre';
import { EditorFlowEdge, EditorFlowNode } from './types';

// Fallback sizes used before React Flow has measured the DOM nodes.
const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 88;
const END_NODE_SIZE = 64;

/**
 * Left-to-right dagre layout. Returns new node objects with updated
 * `position`s; nodes/edges are not mutated.
 */
export function applyAutoLayout(
  nodes: EditorFlowNode[],
  edges: EditorFlowEdge[]
): EditorFlowNode[] {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120 });
  graph.setDefaultEdgeLabel(() => ({}));

  const sizeOf = (node: EditorFlowNode) => ({
    width:
      node.measured?.width ??
      (node.type === 'end' ? END_NODE_SIZE : DEFAULT_NODE_WIDTH),
    height:
      node.measured?.height ??
      (node.type === 'end' ? END_NODE_SIZE : DEFAULT_NODE_HEIGHT),
  });

  nodes.forEach(node => graph.setNode(node.id, sizeOf(node)));
  edges.forEach(edge => graph.setEdge(edge.source, edge.target));

  dagre.layout(graph);

  return nodes.map(node => {
    const placed = graph.node(node.id);
    if (!placed) return node;
    const { width, height } = sizeOf(node);
    return {
      ...node,
      // dagre positions are centers; React Flow positions are top-left corners.
      position: {
        x: Math.round(placed.x - width / 2),
        y: Math.round(placed.y - height / 2),
      },
    };
  });
}
