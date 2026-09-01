import { validateAgentGraph } from './validation';
import {
  AgentGraph,
  ConditionalEdgeSpec,
  END_NODE_ID,
  PlainEdgeSpec,
  REFLECTION_NODE_TYPE,
} from './types';

interface BuildOptions {
  name?: string;
  entryPoint?: string;
  maxIterations?: number;
  edges?: PlainEdgeSpec[];
  conditionalEdges?: ConditionalEdgeSpec[];
  nodeIds?: string[];
  nodeTypes?: Record<string, string>;
  edgesJson?: string;
}

function buildGraph({
  name = 'Agent',
  entryPoint = 'a',
  maxIterations = 10,
  edges = [
    { from: 'a', to: 'b' },
    { from: 'b', to: END_NODE_ID },
  ],
  conditionalEdges = [],
  nodeIds = ['a', 'b'],
  nodeTypes = {},
  edgesJson,
}: BuildOptions = {}): AgentGraph {
  return {
    name,
    entryPoint,
    maxIterations,
    edges:
      edgesJson ??
      JSON.stringify({ edges, conditional_edges: conditionalEdges }),
    nodes: nodeIds.map(id => ({
      nodeId: id,
      nodeType: nodeTypes[id] ?? 'GENERATION',
      name: `Node ${id}`,
      config: '{}',
    })),
  };
}

const codes = (graph: AgentGraph) =>
  validateAgentGraph(graph).map(issue => issue.code);

describe('validateAgentGraph', () => {
  test('a well-formed graph has no issues', () => {
    expect(validateAgentGraph(buildGraph())).toEqual([]);
  });

  test('blank name', () => {
    expect(codes(buildGraph({ name: '   ' }))).toContain('name-blank');
    expect(codes(buildGraph({ name: '' }))).toContain('name-blank');
  });

  test('maxIterations must be within 1..100', () => {
    expect(codes(buildGraph({ maxIterations: 0 }))).toContain(
      'max-iterations-range'
    );
    expect(codes(buildGraph({ maxIterations: 101 }))).toContain(
      'max-iterations-range'
    );
    expect(codes(buildGraph({ maxIterations: NaN }))).toContain(
      'max-iterations-range'
    );
    expect(codes(buildGraph({ maxIterations: 1 }))).not.toContain(
      'max-iterations-range'
    );
    expect(codes(buildGraph({ maxIterations: 100 }))).not.toContain(
      'max-iterations-range'
    );
  });

  test('invalid edges JSON', () => {
    expect(codes(buildGraph({ edgesJson: '{broken' }))).toContain(
      'edges-json-invalid'
    );
  });

  test('entry point must be set', () => {
    expect(codes(buildGraph({ entryPoint: '' }))).toContain(
      'entry-point-missing'
    );
  });

  test('entry point must be an existing node', () => {
    expect(codes(buildGraph({ entryPoint: 'ghost' }))).toContain(
      'entry-point-unknown'
    );
  });

  test('edge endpoints must exist; targets may be __end__', () => {
    expect(
      codes(buildGraph({ edges: [{ from: 'ghost', to: 'b' }] }))
    ).toContain('edge-from-unknown');
    expect(
      codes(buildGraph({ edges: [{ from: 'a', to: 'ghost' }] }))
    ).toContain('edge-to-unknown');
    expect(
      codes(buildGraph({ edges: [{ from: 'a', to: END_NODE_ID }] }))
    ).not.toContain('edge-to-unknown');
  });

  test('plain self-loops are rejected', () => {
    expect(codes(buildGraph({ edges: [{ from: 'a', to: 'a' }] }))).toContain(
      'self-loop'
    );
  });

  test('at most one plain outgoing edge per node', () => {
    expect(
      codes(
        buildGraph({
          edges: [
            { from: 'a', to: 'b' },
            { from: 'a', to: END_NODE_ID },
          ],
        })
      )
    ).toContain('multiple-outgoing');
  });

  test('a node cannot mix a plain edge with a conditional edge', () => {
    expect(
      codes(
        buildGraph({
          nodeTypes: { b: REFLECTION_NODE_TYPE },
          edges: [
            { from: 'a', to: 'b' },
            { from: 'b', to: END_NODE_ID },
          ],
          conditionalEdges: [
            {
              from: 'a',
              condition_key: 'needs_rewrite',
              routes: { true: 'b', false: END_NODE_ID },
            },
          ],
        })
      )
    ).toContain('multiple-outgoing');
  });

  test('conditional edges require a reflection generator node', () => {
    const graph = buildGraph({
      edges: [{ from: 'b', to: END_NODE_ID }],
      conditionalEdges: [
        {
          from: 'a',
          condition_key: 'needs_rewrite',
          routes: { true: 'b', false: END_NODE_ID },
        },
      ],
    });
    expect(codes(graph)).toContain('reflection-node-required');

    const withReflection = buildGraph({
      nodeTypes: { b: REFLECTION_NODE_TYPE },
      edges: [{ from: 'b', to: END_NODE_ID }],
      conditionalEdges: [
        {
          from: 'a',
          condition_key: 'needs_rewrite',
          routes: { true: 'b', false: END_NODE_ID },
        },
      ],
    });
    expect(codes(withReflection)).not.toContain('reflection-node-required');
  });

  test('both conditional routes must be connected', () => {
    const graph = buildGraph({
      nodeTypes: { b: REFLECTION_NODE_TYPE },
      edges: [{ from: 'b', to: END_NODE_ID }],
      conditionalEdges: [
        {
          from: 'a',
          condition_key: 'needs_rewrite',
          routes: { true: 'b', false: '' },
        },
      ],
    });
    expect(codes(graph)).toContain('route-target-missing');
  });

  test('conditional route targets must exist', () => {
    const graph = buildGraph({
      nodeTypes: { b: REFLECTION_NODE_TYPE },
      edges: [{ from: 'b', to: END_NODE_ID }],
      conditionalEdges: [
        {
          from: 'a',
          condition_key: 'needs_rewrite',
          routes: { true: 'b', false: 'ghost' },
        },
      ],
    });
    expect(codes(graph)).toContain('edge-to-unknown');
  });

  test('unreachable nodes are reported with their names', () => {
    const graph = buildGraph({
      nodeIds: ['a', 'b', 'c'],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: END_NODE_ID },
      ],
    });
    const issues = validateAgentGraph(graph);
    const unreachable = issues.find(i => i.code === 'unreachable-nodes');
    expect(unreachable).toBeDefined();
    expect(unreachable!.message).toContain('Node c');
  });

  test('reachability follows conditional routes', () => {
    const graph = buildGraph({
      nodeIds: ['a', 'b', 'c'],
      nodeTypes: { c: REFLECTION_NODE_TYPE },
      edges: [
        { from: 'b', to: END_NODE_ID },
        { from: 'c', to: END_NODE_ID },
      ],
      conditionalEdges: [
        {
          from: 'a',
          condition_key: 'needs_rewrite',
          routes: { true: 'b', false: 'c' },
        },
      ],
    });
    expect(codes(graph)).not.toContain('unreachable-nodes');
  });
});
