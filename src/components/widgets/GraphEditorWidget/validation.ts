import { parseEdgesJson } from './serialization';
import {
  AgentGraph,
  END_NODE_ID,
  REFLECTION_NODE_TYPE,
  ValidationIssue,
} from './types';

/**
 * Validates an AgentGraph against the server's structural rules. Returns an
 * empty array when the graph is valid. Mirrors (client-side) the rules the
 * backend enforces so problems surface before saving.
 */
export function validateAgentGraph(graph: AgentGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!graph.name || graph.name.trim() === '') {
    issues.push({
      code: 'name-blank',
      message: 'Agent name must not be blank.',
    });
  }

  if (
    !Number.isFinite(graph.maxIterations) ||
    graph.maxIterations < 1 ||
    graph.maxIterations > 100
  ) {
    issues.push({
      code: 'max-iterations-range',
      message: 'Max iterations must be between 1 and 100.',
    });
  }

  let edgesShape;
  try {
    edgesShape = JSON.parse(graph.edges);
  } catch {
    edgesShape = null;
  }
  if (edgesShape === null || typeof edgesShape !== 'object') {
    issues.push({
      code: 'edges-json-invalid',
      message: 'Edges definition is not valid JSON.',
    });
  }
  const { edges, conditional_edges: conditionalEdges } = parseEdgesJson(
    graph.edges
  );

  const nodeIds = new Set(graph.nodes.map(n => n.nodeId));
  const nodeName = (id: string): string =>
    graph.nodes.find(n => n.nodeId === id)?.name ?? id;
  const isValidTarget = (id: string): boolean =>
    id === END_NODE_ID || nodeIds.has(id);

  // Entry point must exist and be a node.
  if (!graph.entryPoint) {
    issues.push({
      code: 'entry-point-missing',
      message: 'No entry point set. Mark a node as the entry point.',
    });
  } else if (!nodeIds.has(graph.entryPoint)) {
    issues.push({
      code: 'entry-point-unknown',
      message: `Entry point "${graph.entryPoint}" is not a node in the graph.`,
    });
  }

  // Edge endpoints.
  edges.forEach(e => {
    if (!nodeIds.has(e.from)) {
      issues.push({
        code: 'edge-from-unknown',
        message: `Edge starts at unknown node "${e.from}".`,
      });
    }
    if (!isValidTarget(e.to)) {
      issues.push({
        code: 'edge-to-unknown',
        message: `Edge points to unknown node "${e.to}".`,
      });
    }
    if (e.from === e.to) {
      issues.push({
        code: 'self-loop',
        message: `Node "${nodeName(e.from)}" must not connect to itself.`,
      });
    }
  });

  conditionalEdges.forEach(ce => {
    if (!nodeIds.has(ce.from)) {
      issues.push({
        code: 'edge-from-unknown',
        message: `Conditional edge starts at unknown node "${ce.from}".`,
      });
    }
    (['true', 'false'] as const).forEach(route => {
      const target = ce.routes?.[route];
      if (!target) {
        issues.push({
          code: 'route-target-missing',
          message: `Node "${nodeName(ce.from)}" is missing its "${route}" route. Connect both routes.`,
        });
      } else if (!isValidTarget(target)) {
        issues.push({
          code: 'edge-to-unknown',
          message: `The "${route}" route of "${nodeName(ce.from)}" points to unknown node "${target}".`,
        });
      }
    });
  });

  // At most ONE plain outgoing edge OR one conditional edge per node.
  const plainCounts = new Map<string, number>();
  edges.forEach(e =>
    plainCounts.set(e.from, (plainCounts.get(e.from) ?? 0) + 1)
  );
  const conditionalCounts = new Map<string, number>();
  conditionalEdges.forEach(ce =>
    conditionalCounts.set(ce.from, (conditionalCounts.get(ce.from) ?? 0) + 1)
  );
  const froms = new Set([
    ...Array.from(plainCounts.keys()),
    ...Array.from(conditionalCounts.keys()),
  ]);
  froms.forEach(from => {
    const plain = plainCounts.get(from) ?? 0;
    const conditional = conditionalCounts.get(from) ?? 0;
    if (plain > 1 || conditional > 1 || (plain > 0 && conditional > 0)) {
      issues.push({
        code: 'multiple-outgoing',
        message: `Node "${nodeName(from)}" has more than one outgoing connection. A node may have one plain edge or one conditional edge.`,
      });
    }
  });

  // A conditional edge requires a reflection-capable generator in the graph.
  if (
    conditionalEdges.length > 0 &&
    !graph.nodes.some(n => n.nodeType === REFLECTION_NODE_TYPE)
  ) {
    issues.push({
      code: 'reflection-node-required',
      message: `Conditional routing requires a ${REFLECTION_NODE_TYPE} node in the graph.`,
    });
  }

  // Reachability from the entry point.
  if (graph.entryPoint && nodeIds.has(graph.entryPoint)) {
    const adjacency = new Map<string, string[]>();
    const addEdge = (from: string, to: string) => {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from)!.push(to);
    };
    edges.forEach(e => addEdge(e.from, e.to));
    conditionalEdges.forEach(ce => {
      if (ce.routes?.true) addEdge(ce.from, ce.routes.true);
      if (ce.routes?.false) addEdge(ce.from, ce.routes.false);
    });

    const visited = new Set<string>();
    const queue = [graph.entryPoint];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      (adjacency.get(current) ?? []).forEach(next => {
        if (!visited.has(next)) queue.push(next);
      });
    }

    const unreachable = graph.nodes.filter(n => !visited.has(n.nodeId));
    if (unreachable.length > 0) {
      issues.push({
        code: 'unreachable-nodes',
        message: `Unreachable from the entry point: ${unreachable
          .map(n => n.name)
          .join(', ')}.`,
      });
    }
  }

  return issues;
}
