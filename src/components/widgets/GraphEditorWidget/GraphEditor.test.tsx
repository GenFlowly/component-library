import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GraphEditor from './GraphEditor';
import {
  AgentGraph,
  ConditionOption,
  END_NODE_ID,
  InstructionOption,
  NodeCatalogEntry,
} from './types';

const nodeCatalog: NodeCatalogEntry[] = [
  {
    nodeType: 'QUERY_ANALYZER',
    label: 'Query Analyzer',
    description: 'Decides whether the query needs rewriting.',
    defaultConfig: '{}',
    hasPrompt: true,
  },
  {
    nodeType: 'QUERY_REWRITER',
    label: 'Query Rewriter',
    defaultConfig: '{}',
    hasPrompt: true,
  },
  {
    nodeType: 'RETRIEVAL',
    label: 'Retrieval',
    defaultConfig: '{"top_k":8}',
    hasPrompt: false,
  },
  {
    nodeType: 'RESPONSE_GENERATOR_WITH_REFLECTION',
    label: 'Generator (Reflection)',
    defaultConfig: '{}',
    hasPrompt: true,
  },
];

const instructions: InstructionOption[] = [
  {
    instructionId: 'inst-analyzer',
    name: 'Analyzer prompt',
    latestVersion: 4,
    preview: 'Decide whether the user query needs rewriting.',
  },
  {
    instructionId: 'inst-generator',
    name: 'Generator prompt',
    latestVersion: 2,
  },
];

const conditionOptions: ConditionOption[] = [
  { key: 'needs_rewrite', type: 'bool', label: 'Needs rewrite' },
  {
    key: 'retrieval_results',
    type: 'list_empty',
    label: 'Retrieval results empty',
  },
];

const buildGraph = (): AgentGraph => ({
  graphId: 'graph-1',
  name: 'Default RAG',
  entryPoint: 'n-analyzer',
  maxIterations: 10,
  edges: JSON.stringify({
    edges: [
      { from: 'n-rewriter', to: 'n-generator' },
      { from: 'n-generator', to: END_NODE_ID },
    ],
    conditional_edges: [
      {
        from: 'n-analyzer',
        condition_key: 'needs_rewrite',
        routes: { true: 'n-rewriter', false: 'n-generator' },
      },
    ],
  }),
  layout: JSON.stringify({
    positions: {
      'n-analyzer': { x: 0, y: 100 },
      'n-rewriter': { x: 300, y: 0 },
      'n-generator': { x: 600, y: 100 },
      [END_NODE_ID]: { x: 900, y: 100 },
    },
  }),
  nodes: [
    {
      nodeId: 'n-analyzer',
      nodeType: 'QUERY_ANALYZER',
      name: 'Analyzer',
      config: JSON.stringify({
        instruction_id: 'inst-analyzer',
        instruction_version: null,
      }),
    },
    {
      nodeId: 'n-rewriter',
      nodeType: 'QUERY_REWRITER',
      name: 'Rewriter',
      config: JSON.stringify({ system_prompt: 'Rewrite the query.' }),
    },
    {
      nodeId: 'n-generator',
      nodeType: 'RESPONSE_GENERATOR_WITH_REFLECTION',
      name: 'Generator',
      config: '{}',
    },
  ],
});

const defaultProps = {
  nodeCatalog,
  instructions,
  conditionOptions,
  onSave: jest.fn(),
};

describe('GraphEditor', () => {
  test('renders graph nodes, END node, palette and top bar', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);

    expect(screen.getByTestId('graph-editor-name')).toHaveValue('Default RAG');
    expect(screen.getByTestId('graph-editor-max-iterations')).toHaveValue(10);
    expect(
      screen.getByTestId('graph-editor-node-n-analyzer')
    ).toBeInTheDocument();
    expect(screen.getByTestId('graph-editor-node-end')).toBeInTheDocument();
    expect(screen.getByTestId('graph-editor-palette')).toBeInTheDocument();
    expect(
      screen.getByTestId('graph-editor-palette-item-RETRIEVAL')
    ).toBeInTheDocument();
  });

  test('shows the entry-point badge and instruction summary', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);

    expect(
      screen.getByTestId('graph-editor-node-n-analyzer-entry-badge')
    ).toHaveTextContent('START');
    expect(
      screen.getByTestId('graph-editor-node-n-analyzer-instruction')
    ).toHaveTextContent('Analyzer prompt');
    // Legacy inline system_prompt configs get no badge — instructions are
    // the only prompt affordance surfaced on the canvas.
    expect(
      screen.queryByTestId('graph-editor-node-n-rewriter-inline-prompt')
    ).not.toBeInTheDocument();
  });

  test('save is disabled while pristine and enables after an edit', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);

    const save = screen.getByTestId('graph-editor-save');
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByTestId('graph-editor-name'), {
      target: { value: 'Renamed RAG' },
    });
    expect(save).toBeEnabled();
  });

  test('save calls onSave with the rebuilt AgentGraph shape', () => {
    const onSave = jest.fn();
    render(
      <GraphEditor {...defaultProps} graph={buildGraph()} onSave={onSave} />
    );

    fireEvent.change(screen.getByTestId('graph-editor-name'), {
      target: { value: 'Renamed RAG' },
    });
    fireEvent.click(screen.getByTestId('graph-editor-save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.name).toBe('Renamed RAG');
    expect(saved.graphId).toBe('graph-1');
    expect(saved.entryPoint).toBe('n-analyzer');
    expect(saved.nodes).toHaveLength(3);
    expect(JSON.parse(saved.edges).conditional_edges).toHaveLength(1);
    expect(JSON.parse(saved.layout).positions[END_NODE_ID]).toBeDefined();
  });

  test('reports dirty state through onDirtyChange', () => {
    const onDirtyChange = jest.fn();
    render(
      <GraphEditor
        {...defaultProps}
        graph={buildGraph()}
        onDirtyChange={onDirtyChange}
      />
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByTestId('graph-editor-max-iterations'), {
      target: { value: '20' },
    });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  test('structural problems surface in the validation panel and block save', () => {
    const graph = buildGraph();
    graph.entryPoint = 'ghost';
    render(<GraphEditor {...defaultProps} graph={graph} />);

    const issues = screen.getByTestId('graph-editor-issues');
    expect(issues).toBeInTheDocument();
    expect(issues.textContent).toContain('ghost');

    fireEvent.change(screen.getByTestId('graph-editor-name'), {
      target: { value: 'Still invalid' },
    });
    expect(screen.getByTestId('graph-editor-save')).toBeDisabled();

    fireEvent.click(screen.getByTestId('graph-editor-issues-dismiss'));
    expect(screen.queryByTestId('graph-editor-issues')).not.toBeInTheDocument();
  });

  test('displays a server error message', () => {
    render(
      <GraphEditor
        {...defaultProps}
        graph={buildGraph()}
        errorMessage="Server rejected the graph"
      />
    );
    expect(screen.getByTestId('graph-editor-issues').textContent).toContain(
      'Server rejected the graph'
    );
  });

  test('clicking a node opens the config panel and fires onNodeSelect', () => {
    const onNodeSelect = jest.fn();
    render(
      <GraphEditor
        {...defaultProps}
        graph={buildGraph()}
        onNodeSelect={onNodeSelect}
      />
    );

    fireEvent.click(screen.getByTestId('graph-editor-node-n-analyzer'));

    expect(screen.getByTestId('graph-editor-config-panel')).toBeInTheDocument();
    expect(screen.getByTestId('graph-editor-config-name')).toHaveValue(
      'Analyzer'
    );
    expect(onNodeSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nodeId: 'n-analyzer',
        nodeType: 'QUERY_ANALYZER',
      })
    );
  });

  test('readOnly hides palette, save and config panel but still reports taps', () => {
    const onNodeSelect = jest.fn();
    render(
      <GraphEditor
        {...defaultProps}
        graph={buildGraph()}
        readOnly
        onNodeSelect={onNodeSelect}
      />
    );

    expect(
      screen.queryByTestId('graph-editor-palette')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('graph-editor-save')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('graph-editor-node-n-generator'));
    expect(
      screen.queryByTestId('graph-editor-config-panel')
    ).not.toBeInTheDocument();
    expect(onNodeSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ nodeId: 'n-generator' })
    );
  });

  test('null graph starts blank with only the END node', () => {
    render(<GraphEditor {...defaultProps} graph={null} />);

    expect(screen.getByTestId('graph-editor-name')).toHaveValue('New agent');
    expect(screen.getByTestId('graph-editor-node-end')).toBeInTheDocument();
    // Blank graph is invalid (no entry point) so save stays blocked.
    expect(screen.getByTestId('graph-editor-save')).toBeDisabled();
  });

  test('saving state disables the button and shows the saving label', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} saving />);
    const save = screen.getByTestId('graph-editor-save');
    expect(save).toBeDisabled();
    expect(save).toHaveTextContent('Saving…');
  });
});
