import { conditionRouteLabels, parseEdgesJson } from './serialization';
import {
  AgentGraph,
  BOOL_ROUTE_LABELS,
  END_NODE_ID,
  REFLECTION_NODE_TYPE,
  TOOL_EXECUTOR_NODE_TYPE,
  TOOL_ROUTE_LABELS,
  ValidationIssue,
} from './types';

/**
 * Iterative DFS (white/gray/black) cycle detection over an adjacency map.
 * A back edge to a node on the current DFS stack means a directed cycle.
 */
function hasDirectedCycle(adjacency: Map<string, string[]>): boolean {
  const VISITING = 1;
  const DONE = 2;
  const state = new Map<string, number>();

  for (const root of Array.from(adjacency.keys())) {
    if (state.get(root) !== undefined) continue;
    // Stack of [node, nextNeighborIndex].
    const stack: [string, number][] = [[root, 0]];
    state.set(root, VISITING);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const neighbors = adjacency.get(frame[0]) ?? [];
      if (frame[1] >= neighbors.length) {
        state.set(frame[0], DONE);
        stack.pop();
        continue;
      }
      const next = neighbors[frame[1]];
      frame[1] += 1;
      const nextState = state.get(next);
      if (nextState === VISITING) return true;
      if (nextState === undefined) {
        state.set(next, VISITING);
        stack.push([next, 0]);
      }
    }
  }
  return false;
}

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

    // Any non-blank condition key is legal (nodes can write custom output
    // keys that conditions read) — but blank is not. tool_route ignores the
    // key entirely, so blank is fine there.
    if (
      (ce.condition_type ?? 'bool') !== 'tool_route' &&
      (!ce.condition_key || ce.condition_key.trim() === '')
    ) {
      issues.push({
        code: 'condition-key-blank',
        message: `Node "${nodeName(ce.from)}" has a conditional edge without a condition key.`,
      });
    }

    const type = ce.condition_type ?? 'bool';
    const declaredLabels = Object.keys(ce.routes ?? {});
    if (type === 'value') {
      if (declaredLabels.length === 0) {
        issues.push({
          code: 'condition-routes-invalid',
          message: `Node "${nodeName(ce.from)}" matches a value but declares no routes. Add at least one route.`,
        });
      } else if (declaredLabels.some(label => label.trim() === '')) {
        issues.push({
          code: 'condition-routes-invalid',
          message: `Node "${nodeName(ce.from)}" has a route with a blank label.`,
        });
      }
    } else if (type === 'tool_route') {
      if (
        declaredLabels.length !== TOOL_ROUTE_LABELS.length ||
        !TOOL_ROUTE_LABELS.every(label => declaredLabels.includes(label))
      ) {
        issues.push({
          code: 'condition-routes-invalid',
          message: `Node "${nodeName(ce.from)}" must have exactly a "builtin", a "caller" and a "none" route.`,
        });
      }
    } else if (
      declaredLabels.length !== BOOL_ROUTE_LABELS.length ||
      !BOOL_ROUTE_LABELS.every(label => declaredLabels.includes(label))
    ) {
      issues.push({
        code: 'condition-routes-invalid',
        message: `Node "${nodeName(ce.from)}" must have exactly a "true" and a "false" route.`,
      });
    }

    conditionRouteLabels(ce).forEach(route => {
      const target = ce.routes?.[route];
      if (!target) {
        issues.push({
          code: 'route-target-missing',
          message: `Node "${nodeName(ce.from)}" is missing its "${route}" route. Connect all routes.`,
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

  // Combined adjacency over plain edges and every conditional route.
  const adjacency = new Map<string, string[]>();
  const addEdge = (from: string, to: string) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push(to);
  };
  edges.forEach(e => addEdge(e.from, e.to));
  conditionalEdges.forEach(ce => {
    Object.values(ce.routes ?? {}).forEach(target => {
      if (target) addEdge(ce.from, target);
    });
  });

  // Only a graph containing a DIRECTED CYCLE (over plain + conditional edges
  // combined) requires a loop-terminating node: a reflection-capable
  // generator, or a TOOL_EXECUTOR (its tool_route loop ends when the model
  // stops calling tools). Branching without cycles needs neither.
  if (
    hasDirectedCycle(adjacency) &&
    !graph.nodes.some(
      n =>
        n.nodeType === REFLECTION_NODE_TYPE ||
        n.nodeType === TOOL_EXECUTOR_NODE_TYPE
    )
  ) {
    issues.push({
      code: 'reflection-node-required',
      message: `The graph contains a cycle; loops require a ${REFLECTION_NODE_TYPE} node in the graph.`,
    });
  }

  // Reachability from the entry point.
  if (graph.entryPoint && nodeIds.has(graph.entryPoint)) {
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
