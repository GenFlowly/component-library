import {
  AgentGraph,
  AgentFlowNode,
  ConditionalEdgeSpec,
  EdgesJson,
  EditorFlowEdge,
  EditorFlowNode,
  EditorGraphState,
  END_NODE_ID,
  LayoutJson,
  NodeConditional,
  PlainEdgeSpec,
  SOURCE_HANDLE_FALSE,
  SOURCE_HANDLE_PLAIN,
  SOURCE_HANDLE_TRUE,
  TEMP_NODE_ID_PREFIX,
} from './types';

export const DEFAULT_MAX_ITERATIONS = 25;

/** Tolerant parse of the `edges` JSON string; malformed input yields an empty shape. */
export function parseEdgesJson(edges: string | undefined | null): EdgesJson {
  const empty: EdgesJson = { edges: [], conditional_edges: [] };
  if (!edges) return empty;
  try {
    const parsed = JSON.parse(edges);
    if (typeof parsed !== 'object' || parsed === null) return empty;
    return {
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      conditional_edges: Array.isArray(parsed.conditional_edges)
        ? parsed.conditional_edges
        : [],
    };
  } catch {
    return empty;
  }
}

/** Tolerant parse of the `layout` JSON string. */
export function parseLayoutJson(layout: string | undefined | null): LayoutJson {
  const empty: LayoutJson = { positions: {} };
  if (!layout) return empty;
  try {
    const parsed = JSON.parse(layout);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.positions !== 'object' ||
      parsed.positions === null
    ) {
      return empty;
    }
    return { positions: parsed.positions };
  } catch {
    return empty;
  }
}

/** Tolerant parse of a node `config` JSON string; non-object input yields `{}`. */
export function parseNodeConfig(config: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(config);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

export function plainEdgeId(from: string, to: string): string {
  return `edge:${from}->${to}`;
}

export function conditionalEdgeId(
  from: string,
  route: 'true' | 'false'
): string {
  return `edge:${from}:${route}`;
}

/** Next unused `new-<n>` temp id given the ids already present. */
export function nextTempNodeId(existingIds: string[]): string {
  let max = 0;
  existingIds.forEach(id => {
    if (id.startsWith(TEMP_NODE_ID_PREFIX)) {
      const n = Number(id.slice(TEMP_NODE_ID_PREFIX.length));
      if (Number.isInteger(n) && n > max) max = n;
    }
  });
  return `${TEMP_NODE_ID_PREFIX}${max + 1}`;
}

export interface ParsedGraph {
  state: EditorGraphState;
  /** True when the graph carried at least one stored position. */
  hasLayout: boolean;
}

/**
 * Parses a server AgentGraph (or `null` for a blank editor) into the editor's
 * React Flow state. The permanent END node is always present.
 */
export function graphToEditorState(
  graph: AgentGraph | null,
  newAgentName: string = 'New agent'
): ParsedGraph {
  const layout = parseLayoutJson(graph?.layout);
  const positions = layout.positions;
  const hasLayout = Object.keys(positions).length > 0;

  const endNode: EditorFlowNode = {
    id: END_NODE_ID,
    type: 'end',
    position: positions[END_NODE_ID] ?? { x: 0, y: 0 },
    deletable: false,
    data: {},
  };

  if (!graph) {
    return {
      state: {
        name: newAgentName,
        entryPoint: '',
        maxIterations: DEFAULT_MAX_ITERATIONS,
        nodes: [endNode],
        edges: [],
      },
      hasLayout: false,
    };
  }

  const edgesJson = parseEdgesJson(graph.edges);
  const conditionalByFrom = new Map<string, ConditionalEdgeSpec>();
  edgesJson.conditional_edges.forEach(ce => conditionalByFrom.set(ce.from, ce));

  const nodes: EditorFlowNode[] = graph.nodes.map(n => {
    const ce = conditionalByFrom.get(n.nodeId);
    const conditional: NodeConditional | null = ce
      ? { key: ce.condition_key, type: ce.condition_type ?? 'bool' }
      : null;
    const agentNode: AgentFlowNode = {
      id: n.nodeId,
      type: 'agent',
      position: positions[n.nodeId] ?? { x: 0, y: 0 },
      data: {
        name: n.name,
        nodeType: n.nodeType,
        config: n.config,
        conditional,
      },
    };
    return agentNode;
  });
  nodes.push(endNode);

  const edges: EditorFlowEdge[] = [];
  edgesJson.edges.forEach(e => {
    edges.push({
      id: plainEdgeId(e.from, e.to),
      source: e.from,
      target: e.to,
      sourceHandle: SOURCE_HANDLE_PLAIN,
    });
  });
  edgesJson.conditional_edges.forEach(ce => {
    (['true', 'false'] as const).forEach(route => {
      const target = ce.routes?.[route];
      if (!target) return;
      edges.push({
        id: conditionalEdgeId(ce.from, route),
        source: ce.from,
        target,
        sourceHandle:
          route === 'true' ? SOURCE_HANDLE_TRUE : SOURCE_HANDLE_FALSE,
        label: route,
      });
    });
  });

  return {
    state: {
      graphId: graph.graphId,
      isDefault: graph.isDefault,
      name: graph.name,
      entryPoint: graph.entryPoint,
      maxIterations: graph.maxIterations,
      nodes,
      edges,
    },
    hasLayout,
  };
}

function isAgentNode(node: EditorFlowNode): node is AgentFlowNode {
  return node.type === 'agent';
}

/**
 * Rebuilds the exact server AgentGraph shape from the current editor state.
 * `condition_type` is included only when it differs from the default `bool`;
 * unknown config keys survive because configs are kept as verbatim strings.
 */
export function editorStateToGraph(state: EditorGraphState): AgentGraph {
  const agentNodes = state.nodes.filter(isAgentNode);

  const plainEdges: PlainEdgeSpec[] = [];
  const conditionalEdges: ConditionalEdgeSpec[] = [];

  agentNodes.forEach(node => {
    const outgoing = state.edges.filter(e => e.source === node.id);
    if (node.data.conditional) {
      const routeTarget = (handle: string): string =>
        outgoing.find(e => e.sourceHandle === handle)?.target ?? '';
      const spec: ConditionalEdgeSpec = {
        from: node.id,
        condition_key: node.data.conditional.key,
        routes: {
          true: routeTarget(SOURCE_HANDLE_TRUE),
          false: routeTarget(SOURCE_HANDLE_FALSE),
        },
      };
      if (node.data.conditional.type !== 'bool') {
        spec.condition_type = node.data.conditional.type;
      }
      conditionalEdges.push(spec);
    } else {
      outgoing.forEach(e => plainEdges.push({ from: e.source, to: e.target }));
    }
  });

  const positions: LayoutJson['positions'] = {};
  state.nodes.forEach(n => {
    positions[n.id] = {
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    };
  });

  const edgesJson: EdgesJson = {
    edges: plainEdges,
    conditional_edges: conditionalEdges,
  };

  const graph: AgentGraph = {
    name: state.name,
    entryPoint: state.entryPoint,
    maxIterations: state.maxIterations,
    edges: JSON.stringify(edgesJson),
    layout: JSON.stringify({ positions }),
    nodes: agentNodes.map(n => ({
      nodeId: n.id,
      nodeType: n.data.nodeType,
      name: n.data.name,
      config: n.data.config,
    })),
  };
  if (state.graphId !== undefined) graph.graphId = state.graphId;
  if (state.isDefault !== undefined) graph.isDefault = state.isDefault;
  return graph;
}
