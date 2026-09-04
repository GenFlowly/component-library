import {
  editorStateToGraph,
  graphToEditorState,
  nextTempNodeId,
  parseEdgesJson,
  parseLayoutJson,
  parseNodeConfig,
} from './serialization';
import {
  AgentGraph,
  AgentFlowNode,
  DEFAULT_ROUTE_LABEL,
  END_NODE_ID,
  SOURCE_HANDLE_FALSE,
  SOURCE_HANDLE_TRUE,
} from './types';

const nodeConfig = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    instruction_id: 'inst-1',
    instruction_version: null,
    ...extra,
  });

const buildRagGraph = (): AgentGraph => ({
  graphId: 'graph-1',
  name: 'Default RAG',
  isDefault: true,
  entryPoint: 'n-analyzer',
  maxIterations: 10,
  edges: JSON.stringify({
    edges: [
      { from: 'n-rewriter', to: 'n-retrieval' },
      { from: 'n-retrieval', to: 'n-generator' },
      { from: 'n-generator', to: END_NODE_ID },
    ],
    conditional_edges: [
      {
        from: 'n-analyzer',
        condition_key: 'needs_rewrite',
        routes: { true: 'n-rewriter', false: 'n-retrieval' },
      },
    ],
  }),
  layout: JSON.stringify({
    positions: {
      'n-analyzer': { x: 0, y: 100 },
      'n-rewriter': { x: 300, y: 0 },
      'n-retrieval': { x: 300, y: 200 },
      'n-generator': { x: 600, y: 100 },
      [END_NODE_ID]: { x: 900, y: 100 },
    },
  }),
  nodes: [
    {
      nodeId: 'n-analyzer',
      nodeType: 'QUERY_ANALYZER',
      name: 'Analyzer',
      config: nodeConfig(),
    },
    {
      nodeId: 'n-rewriter',
      nodeType: 'QUERY_REWRITER',
      name: 'Rewriter',
      config: nodeConfig(),
    },
    {
      nodeId: 'n-retrieval',
      nodeType: 'RETRIEVAL',
      name: 'Retrieval',
      config: JSON.stringify({ top_k: 8, collection: 'docs' }),
    },
    {
      nodeId: 'n-generator',
      nodeType: 'RESPONSE_GENERATOR_WITH_REFLECTION',
      name: 'Generator',
      config: nodeConfig({ custom_setting: { nested: true } }),
    },
  ],
});

describe('parseEdgesJson', () => {
  test('parses plain and conditional edges', () => {
    const parsed = parseEdgesJson(buildRagGraph().edges);
    expect(parsed.edges).toHaveLength(3);
    expect(parsed.conditional_edges).toHaveLength(1);
    expect(parsed.conditional_edges[0].condition_key).toBe('needs_rewrite');
  });

  test('tolerates malformed or empty input', () => {
    expect(parseEdgesJson('not json')).toEqual({
      edges: [],
      conditional_edges: [],
    });
    expect(parseEdgesJson('')).toEqual({ edges: [], conditional_edges: [] });
    expect(parseEdgesJson(undefined)).toEqual({
      edges: [],
      conditional_edges: [],
    });
  });
});

describe('parseLayoutJson', () => {
  test('parses positions', () => {
    const layout = parseLayoutJson(buildRagGraph().layout);
    expect(layout.positions['n-analyzer']).toEqual({ x: 0, y: 100 });
  });

  test('tolerates malformed input', () => {
    expect(parseLayoutJson('nope')).toEqual({ positions: {} });
    expect(parseLayoutJson(undefined)).toEqual({ positions: {} });
  });
});

describe('parseNodeConfig', () => {
  test('parses object configs and rejects non-objects', () => {
    expect(parseNodeConfig('{"a":1}')).toEqual({ a: 1 });
    expect(parseNodeConfig('[1,2]')).toEqual({});
    expect(parseNodeConfig('broken')).toEqual({});
  });
});

describe('nextTempNodeId', () => {
  test('starts at new-1', () => {
    expect(nextTempNodeId(['server-id', END_NODE_ID])).toBe('new-1');
  });

  test('increments past the highest existing temp id', () => {
    expect(nextTempNodeId(['new-1', 'new-7', 'n-analyzer'])).toBe('new-8');
  });
});

describe('graphToEditorState', () => {
  test('null graph produces a blank state with only the END node', () => {
    const { state, hasLayout } = graphToEditorState(null);
    expect(hasLayout).toBe(false);
    expect(state.name).toBe('New agent');
    expect(state.entryPoint).toBe('');
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].id).toBe(END_NODE_ID);
    expect(state.nodes[0].deletable).toBe(false);
    expect(state.edges).toHaveLength(0);
  });

  test('maps nodes, positions and conditional data', () => {
    const { state, hasLayout } = graphToEditorState(buildRagGraph());
    expect(hasLayout).toBe(true);
    expect(state.nodes).toHaveLength(5); // 4 agents + END
    const analyzer = state.nodes.find(
      n => n.id === 'n-analyzer'
    ) as AgentFlowNode;
    expect(analyzer.position).toEqual({ x: 0, y: 100 });
    expect(analyzer.data.conditional).toEqual({
      key: 'needs_rewrite',
      type: 'bool',
      routes: ['true', 'false'],
    });
    const retrieval = state.nodes.find(
      n => n.id === 'n-retrieval'
    ) as AgentFlowNode;
    expect(retrieval.data.conditional).toBeNull();
    // 3 plain + 2 conditional route edges
    expect(state.edges).toHaveLength(5);
    const trueEdge = state.edges.find(
      e => e.source === 'n-analyzer' && e.sourceHandle === 'route:true'
    );
    expect(trueEdge?.target).toBe('n-rewriter');
  });

  test('a graph without layout reports hasLayout=false', () => {
    const graph = { ...buildRagGraph(), layout: undefined };
    const { hasLayout } = graphToEditorState(graph);
    expect(hasLayout).toBe(false);
  });
});

describe('round-trip', () => {
  test('parse → serialize reproduces the graph, including conditional edges', () => {
    const original = buildRagGraph();
    const { state } = graphToEditorState(original);
    const rebuilt = editorStateToGraph(state);

    expect(rebuilt.graphId).toBe(original.graphId);
    expect(rebuilt.isDefault).toBe(original.isDefault);
    expect(rebuilt.name).toBe(original.name);
    expect(rebuilt.entryPoint).toBe(original.entryPoint);
    expect(rebuilt.maxIterations).toBe(original.maxIterations);
    expect(rebuilt.nodes).toEqual(original.nodes);
    expect(JSON.parse(rebuilt.edges)).toEqual(JSON.parse(original.edges));
    expect(JSON.parse(rebuilt.layout!)).toEqual(JSON.parse(original.layout!));
  });

  test('old bool graphs round-trip byte-stable', () => {
    const original = buildRagGraph();
    const rebuilt = editorStateToGraph(graphToEditorState(original).state);
    expect(rebuilt.edges).toBe(original.edges);
    expect(rebuilt.layout).toBe(original.layout);
  });

  test('a multi-way "value" condition with __default__ round-trips', () => {
    const graph: AgentGraph = {
      name: 'Router',
      entryPoint: 'n-classifier',
      maxIterations: 5,
      edges: JSON.stringify({
        edges: [
          { from: 'n-search', to: END_NODE_ID },
          { from: 'n-summarize', to: END_NODE_ID },
          { from: 'n-fallback', to: END_NODE_ID },
        ],
        conditional_edges: [
          {
            from: 'n-classifier',
            condition_key: 'intent',
            condition_type: 'value',
            routes: {
              search: 'n-search',
              summarize: 'n-summarize',
              [DEFAULT_ROUTE_LABEL]: 'n-fallback',
            },
          },
        ],
      }),
      nodes: [
        {
          nodeId: 'n-classifier',
          nodeType: 'GENERATION',
          name: 'Classifier',
          config: JSON.stringify({ output_key: 'intent' }),
        },
        {
          nodeId: 'n-search',
          nodeType: 'WEB_SEARCH',
          name: 'Search',
          config: '{}',
        },
        {
          nodeId: 'n-summarize',
          nodeType: 'GENERATION',
          name: 'Summarize',
          config: '{}',
        },
        {
          nodeId: 'n-fallback',
          nodeType: 'GENERATION',
          name: 'Fallback',
          config: '{}',
        },
      ],
    };

    const { state } = graphToEditorState(graph);
    const classifier = state.nodes.find(
      n => n.id === 'n-classifier'
    ) as AgentFlowNode;
    expect(classifier.data.conditional).toEqual({
      key: 'intent',
      type: 'value',
      routes: ['search', 'summarize', DEFAULT_ROUTE_LABEL],
    });
    // One labeled route:<label> edge per route.
    const routeEdges = state.edges.filter(e => e.source === 'n-classifier');
    expect(routeEdges.map(e => e.sourceHandle)).toEqual([
      'route:search',
      'route:summarize',
      `route:${DEFAULT_ROUTE_LABEL}`,
    ]);
    // The default route's handle label renders as "default".
    expect(routeEdges.map(e => e.label)).toEqual([
      'search',
      'summarize',
      'default',
    ]);

    const rebuilt = editorStateToGraph(state);
    expect(JSON.parse(rebuilt.edges)).toEqual(JSON.parse(graph.edges));
    const rebuiltCe = JSON.parse(rebuilt.edges).conditional_edges[0];
    expect(rebuiltCe.condition_type).toBe('value');
    expect(Object.keys(rebuiltCe.routes)).toEqual([
      'search',
      'summarize',
      DEFAULT_ROUTE_LABEL,
    ]);
  });

  test('legacy true/false handles map onto the route:<label> scheme', () => {
    expect(SOURCE_HANDLE_TRUE).toBe('route:true');
    expect(SOURCE_HANDLE_FALSE).toBe('route:false');
    const { state } = graphToEditorState(buildRagGraph());
    const trueEdge = state.edges.find(
      e => e.source === 'n-analyzer' && e.sourceHandle === SOURCE_HANDLE_TRUE
    );
    expect(trueEdge?.target).toBe('n-rewriter');
  });

  test('an unconnected "value" route serializes as an empty target', () => {
    const graph = buildRagGraph();
    const edges = JSON.parse(graph.edges);
    edges.conditional_edges[0] = {
      from: 'n-analyzer',
      condition_key: 'intent',
      condition_type: 'value',
      routes: { search: 'n-rewriter', summarize: '' },
    };
    graph.edges = JSON.stringify(edges);
    const rebuilt = editorStateToGraph(graphToEditorState(graph).state);
    expect(JSON.parse(rebuilt.edges).conditional_edges[0].routes).toEqual({
      search: 'n-rewriter',
      summarize: '',
    });
  });

  test('unknown config keys are preserved untouched', () => {
    const original = buildRagGraph();
    const { state } = graphToEditorState(original);
    const rebuilt = editorStateToGraph(state);
    const generator = rebuilt.nodes.find(n => n.nodeId === 'n-generator')!;
    expect(JSON.parse(generator.config).custom_setting).toEqual({
      nested: true,
    });
    const retrieval = rebuilt.nodes.find(n => n.nodeId === 'n-retrieval')!;
    expect(JSON.parse(retrieval.config)).toEqual({
      top_k: 8,
      collection: 'docs',
    });
  });

  test('condition_type list_empty survives, default bool stays omitted', () => {
    const graph = buildRagGraph();
    const edges = JSON.parse(graph.edges);
    edges.conditional_edges[0].condition_type = 'list_empty';
    graph.edges = JSON.stringify(edges);

    const rebuilt = editorStateToGraph(graphToEditorState(graph).state);
    const rebuiltEdges = JSON.parse(rebuilt.edges);
    expect(rebuiltEdges.conditional_edges[0].condition_type).toBe('list_empty');

    // Default bool: condition_type key is omitted entirely.
    const rebuiltBool = editorStateToGraph(
      graphToEditorState(buildRagGraph()).state
    );
    expect(
      'condition_type' in JSON.parse(rebuiltBool.edges).conditional_edges[0]
    ).toBe(false);
  });

  test('temp new-<n> ids survive in nodes, edges, entryPoint and layout', () => {
    const graph: AgentGraph = {
      name: 'Draft',
      entryPoint: 'new-1',
      maxIterations: 5,
      edges: JSON.stringify({
        edges: [
          { from: 'new-1', to: 'new-2' },
          { from: 'new-2', to: END_NODE_ID },
        ],
        conditional_edges: [],
      }),
      layout: JSON.stringify({
        positions: {
          'new-1': { x: 10, y: 20 },
          'new-2': { x: 200, y: 20 },
          [END_NODE_ID]: { x: 400, y: 20 },
        },
      }),
      nodes: [
        { nodeId: 'new-1', nodeType: 'RETRIEVAL', name: 'One', config: '{}' },
        { nodeId: 'new-2', nodeType: 'GENERATION', name: 'Two', config: '{}' },
      ],
    };
    const rebuilt = editorStateToGraph(graphToEditorState(graph).state);
    expect(rebuilt.entryPoint).toBe('new-1');
    expect(rebuilt.nodes.map(n => n.nodeId)).toEqual(['new-1', 'new-2']);
    expect(JSON.parse(rebuilt.edges)).toEqual(JSON.parse(graph.edges));
    expect(JSON.parse(rebuilt.layout!).positions['new-2']).toEqual({
      x: 200,
      y: 20,
    });
    expect('graphId' in rebuilt).toBe(false);
    expect('isDefault' in rebuilt).toBe(false);
  });

  test('layout positions are rounded to integers on serialize', () => {
    const { state } = graphToEditorState(buildRagGraph());
    state.nodes = state.nodes.map(n =>
      n.id === 'n-analyzer' ? { ...n, position: { x: 12.4, y: 99.6 } } : n
    );
    const rebuilt = editorStateToGraph(state);
    expect(JSON.parse(rebuilt.layout!).positions['n-analyzer']).toEqual({
      x: 12,
      y: 100,
    });
  });

  test('an unconnected conditional route serializes as an empty target', () => {
    const graph = buildRagGraph();
    const edges = JSON.parse(graph.edges);
    edges.conditional_edges[0].routes.false = '';
    graph.edges = JSON.stringify(edges);
    const rebuilt = editorStateToGraph(graphToEditorState(graph).state);
    expect(JSON.parse(rebuilt.edges).conditional_edges[0].routes).toEqual({
      true: 'n-rewriter',
      false: '',
    });
  });
});
