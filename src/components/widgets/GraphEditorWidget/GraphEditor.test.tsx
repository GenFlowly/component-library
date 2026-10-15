import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GraphEditor from './GraphEditor';

import { PALETTE_DRAG_MIME } from './NodePalette';
import {
  colorForNodeType,
  DEFAULT_NODE_TYPE_INFOS,
  mergeNodeTypeInfos,
  TYPE_COLOR_CSS_VAR,
} from './nodeTypeInfo';
import {
  AgentGraph,
  ConditionOption,
  END_NODE_ID,
  InstructionOption,
  NodeCatalogEntry,
  NodeTypeInfo,
} from './types';

// The config panel (AgentMaker node flavor) embeds TextEditor, which
// lazy-loads the UIW markdown editor — that does not work in JSDOM, so
// replace it with a plain textarea.
jest.mock('../TextEditorWidget/TextEditor', () => ({
  __esModule: true,
  default: function MockTextEditor(props: any) {
    return (
      <textarea
        data-testid={props['data-testid']}
        value={props.value}
        readOnly={props.readOnly}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          props.onChange(e.target.value)
        }
      />
    );
  },
}));

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

  test('selecting a node collapses the palette; the footer toggle expands/collapses it', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);
    expect(screen.getByTestId('graph-editor-palette')).toBeVisible();

    // Right sidebar opens → palette collapses to the slim strip (content
    // stays mounted but hidden, so search state etc. survive)
    fireEvent.click(screen.getByTestId('graph-editor-node-n-analyzer'));
    expect(screen.getByTestId('graph-editor-palette')).not.toBeVisible();
    expect(screen.getByTestId('graph-editor-config-panel')).toBeInTheDocument();

    // Manual expand via the footer toggle while the config panel stays open
    fireEvent.click(screen.getByTestId('graph-editor-palette-toggle'));
    expect(screen.getByTestId('graph-editor-palette')).toBeVisible();
    expect(screen.getByTestId('graph-editor-config-panel')).toBeInTheDocument();

    // Same toggle collapses again
    fireEvent.click(screen.getByTestId('graph-editor-palette-toggle'));
    expect(screen.getByTestId('graph-editor-palette')).not.toBeVisible();
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

  test('the palette renders "Node types" and "Pre-made nodes" sections', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);
    const palette = screen.getByTestId('graph-editor-palette');
    expect(palette).toHaveTextContent('Node types');
    expect(palette).toHaveTextContent('Pre-made nodes');
  });

  test('the palette tolerates multiple presets sharing a nodeType', () => {
    const catalogWithPresets: NodeCatalogEntry[] = [
      ...nodeCatalog,
      {
        nodeType: 'QUERY_REWRITER',
        label: 'HyDE Rewriter',
        description: 'Rewrites via a hypothetical answer.',
        defaultConfig: '{"style":"hyde"}',
        hasPrompt: true,
      },
    ];
    render(
      <GraphEditor
        {...defaultProps}
        graph={buildGraph()}
        nodeCatalog={catalogWithPresets}
      />
    );
    const items = screen.getAllByTestId(
      'graph-editor-palette-item-QUERY_REWRITER'
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Query Rewriter');
    expect(items[1]).toHaveTextContent('HyDE Rewriter');
    // The type badge names the runtime primitive; the node's own name
    // carries its purpose.
    expect(
      screen.getByTestId('graph-editor-node-n-rewriter')
    ).toHaveTextContent('LLM');
  });

  test('output key field writes output_key and removes it when cleared', () => {
    const onSave = jest.fn();
    render(
      <GraphEditor {...defaultProps} graph={buildGraph()} onSave={onSave} />
    );

    fireEvent.click(screen.getByTestId('graph-editor-node-n-analyzer'));
    const input = screen.getByTestId('graph-editor-config-output-key');
    fireEvent.change(input, { target: { value: 'analysis_verdict' } });
    fireEvent.click(screen.getByTestId('graph-editor-save'));

    let saved = onSave.mock.calls[0][0];
    let analyzer = saved.nodes.find(
      (n: { nodeId: string }) => n.nodeId === 'n-analyzer'
    );
    expect(JSON.parse(analyzer.config).output_key).toBe('analysis_verdict');

    fireEvent.change(input, { target: { value: '' } });
    // Clearing restores the original config (pristine), so dirty the graph
    // another way to re-enable save.
    fireEvent.change(screen.getByTestId('graph-editor-name'), {
      target: { value: 'Renamed' },
    });
    fireEvent.click(screen.getByTestId('graph-editor-save'));
    saved = onSave.mock.calls[1][0];
    analyzer = saved.nodes.find(
      (n: { nodeId: string }) => n.nodeId === 'n-analyzer'
    );
    expect('output_key' in JSON.parse(analyzer.config)).toBe(false);
  });

  test('a value condition exposes editable route rows and a default toggle', () => {
    const graph = buildGraph();
    graph.edges = JSON.stringify({
      edges: [
        { from: 'n-rewriter', to: 'n-generator' },
        { from: 'n-generator', to: END_NODE_ID },
      ],
      conditional_edges: [
        {
          from: 'n-analyzer',
          condition_key: 'intent',
          condition_type: 'value',
          routes: {
            rewrite: 'n-rewriter',
            answer: 'n-generator',
            __default__: 'n-generator',
          },
        },
      ],
    });
    render(<GraphEditor {...defaultProps} graph={graph} />);

    fireEvent.click(screen.getByTestId('graph-editor-node-n-analyzer'));

    expect(
      screen.getByTestId('graph-editor-config-condition-type')
    ).toHaveValue('value');
    expect(screen.getByTestId('graph-editor-config-condition-key')).toHaveValue(
      'intent'
    );
    // Two editable rows (the __default__ route is the toggle, not a row).
    expect(screen.getByTestId('graph-editor-config-route-0')).toHaveValue(
      'rewrite'
    );
    expect(screen.getByTestId('graph-editor-config-route-1')).toHaveValue(
      'answer'
    );
    expect(
      screen.queryByTestId('graph-editor-config-route-2')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('graph-editor-config-route-default-toggle')
    ).toBeChecked();
  });

  test('removing a value route drops its edge on save', () => {
    const onSave = jest.fn();
    const graph = buildGraph();
    graph.edges = JSON.stringify({
      edges: [
        { from: 'n-rewriter', to: 'n-generator' },
        { from: 'n-generator', to: END_NODE_ID },
      ],
      conditional_edges: [
        {
          from: 'n-analyzer',
          condition_key: 'intent',
          condition_type: 'value',
          routes: { rewrite: 'n-rewriter', answer: 'n-generator' },
        },
      ],
    });
    render(<GraphEditor {...defaultProps} graph={graph} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('graph-editor-node-n-analyzer'));
    fireEvent.click(screen.getByTestId('graph-editor-config-route-1-remove'));
    fireEvent.click(screen.getByTestId('graph-editor-save'));

    const saved = onSave.mock.calls[0][0];
    const ce = JSON.parse(saved.edges).conditional_edges[0];
    expect(ce.routes).toEqual({ rewrite: 'n-rewriter' });
  });

  test('typing a free-form condition key updates the conditional edge', () => {
    const onSave = jest.fn();
    render(
      <GraphEditor {...defaultProps} graph={buildGraph()} onSave={onSave} />
    );

    fireEvent.click(screen.getByTestId('graph-editor-node-n-analyzer'));
    fireEvent.change(screen.getByTestId('graph-editor-config-condition-key'), {
      target: { value: 'my_custom_key' },
    });
    fireEvent.click(screen.getByTestId('graph-editor-save'));

    const saved = onSave.mock.calls[0][0];
    const ce = JSON.parse(saved.edges).conditional_edges[0];
    expect(ce.condition_key).toBe('my_custom_key');
    expect(ce.routes).toEqual({ true: 'n-rewriter', false: 'n-generator' });
  });
});

describe('GraphEditor palette node types', () => {
  test('without a nodeTypes prop only the runtime primitives populate the section', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);
    const shown = DEFAULT_NODE_TYPE_INFOS.filter(info => !info.paletteHidden);
    const hidden = DEFAULT_NODE_TYPE_INFOS.filter(info => info.paletteHidden);
    shown.forEach(info => {
      expect(
        screen.getByTestId(`graph-editor-palette-type-${info.nodeType}`)
      ).toBeInTheDocument();
    });
    hidden.forEach(info => {
      expect(
        screen.queryByTestId(`graph-editor-palette-type-${info.nodeType}`)
      ).not.toBeInTheDocument();
    });
    // Exactly the four primitives: LLM (GENERATION), Retrieval, Web Search, Reflection.
    expect(
      screen.getByTestId('graph-editor-palette-type-GENERATION')
    ).toHaveTextContent('LLM');
    expect(
      screen.queryByTestId('graph-editor-palette-type-QUERY_ANALYZER')
    ).not.toBeInTheDocument();
  });

  test('type items show label, raw type, description and contract lines', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);
    const item = screen.getByTestId('graph-editor-palette-type-RETRIEVAL');
    expect(item).toHaveTextContent('Retrieval');
    expect(item).toHaveTextContent('RETRIEVAL');
    expect(item).toHaveTextContent(
      "Vector search over the customer's collections."
    );
    expect(item).toHaveTextContent('Writes retrieval_results');
    // Three contract lines collapse behind a <details> toggle.
    expect(item.querySelector('details')).not.toBeNull();
    // The LLM primitive shows its raw stored type and contract.
    const llm = screen.getByTestId('graph-editor-palette-type-GENERATION');
    expect(llm).toHaveTextContent('LLM');
    expect(llm).toHaveTextContent('GENERATION');
    expect(llm).toHaveTextContent('Prompt via instruction');
  });

  test('type items are draggable and carry the type defaultConfig', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);
    const item = screen.getByTestId('graph-editor-palette-type-GENERATION');
    expect(item).toHaveAttribute('draggable', 'true');

    const setData = jest.fn();
    fireEvent.dragStart(item, {
      dataTransfer: { setData, effectAllowed: 'none' },
    });
    expect(setData).toHaveBeenCalledTimes(1);
    const [mime, payload] = setData.mock.calls[0];
    expect(mime).toBe(PALETTE_DRAG_MIME);
    const preset = JSON.parse(payload);
    expect(preset.nodeType).toBe('GENERATION');
    expect(preset.label).toBe('LLM');
    expect(JSON.parse(preset.defaultConfig)).toEqual({
      input_template: '{original_query}',
      response_format: 'text',
    });
  });

  test('dropping a type payload on the canvas creates a node', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);
    const canvas = screen.getByTestId('graph-editor-canvas');
    const payload = JSON.stringify({
      nodeType: 'WEB_SEARCH',
      label: 'Web Search',
      defaultConfig: '{}',
    });
    fireEvent.drop(canvas, {
      clientX: 300,
      clientY: 200,
      dataTransfer: {
        getData: (type: string) => (type === PALETTE_DRAG_MIME ? payload : ''),
        types: [PALETTE_DRAG_MIME],
      },
    });
    expect(screen.getByTestId('graph-editor-node-new-1')).toHaveTextContent(
      'Web Search'
    );
  });

  test('color accents: canvas nodes and both palette sections expose the type color', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);
    // Legacy alias types resolve to their primitive's hue (LLM).
    expect(
      screen
        .getByTestId('graph-editor-node-n-analyzer')
        .style.getPropertyValue(TYPE_COLOR_CSS_VAR)
    ).toBe('hsl(271 50% 52%)');
    expect(
      screen
        .getByTestId('graph-editor-palette-type-RETRIEVAL')
        .style.getPropertyValue(TYPE_COLOR_CSS_VAR)
    ).toBe('hsl(174 60% 35%)');
    // Pre-made preset items carry the same accent for their nodeType.
    expect(
      screen
        .getByTestId('graph-editor-palette-item-RETRIEVAL')
        .style.getPropertyValue(TYPE_COLOR_CSS_VAR)
    ).toBe('hsl(174 60% 35%)');
  });

  test('nodeTypes entries merge field-by-field over the defaults', () => {
    const overrides: NodeTypeInfo[] = [
      { nodeType: 'RETRIEVAL', label: 'Vector Search', color: 'rgb(1, 2, 3)' },
      { nodeType: 'CUSTOM_STEP', label: 'Custom Step' },
    ];
    render(
      <GraphEditor
        {...defaultProps}
        graph={buildGraph()}
        nodeTypes={overrides}
      />
    );
    const retrieval = screen.getByTestId('graph-editor-palette-type-RETRIEVAL');
    expect(retrieval).toHaveTextContent('Vector Search');
    // Fields not overridden keep their default values.
    expect(retrieval).toHaveTextContent(
      "Vector search over the customer's collections."
    );
    expect(retrieval.style.getPropertyValue(TYPE_COLOR_CSS_VAR)).toBe(
      'rgb(1, 2, 3)'
    );
    // Unknown types are appended and get a deterministic hashed hue.
    const custom = screen.getByTestId('graph-editor-palette-type-CUSTOM_STEP');
    expect(custom.style.getPropertyValue(TYPE_COLOR_CSS_VAR)).toMatch(
      /^hsl\(\d+ 45% 45%\)$/
    );
  });

  test('declared config fields render as dedicated inputs (type-info fallback)', () => {
    const graph = buildGraph();
    graph.nodes.push({
      nodeId: 'n-memory',
      nodeType: 'MEMORY',
      name: 'User Memory',
      config: JSON.stringify({ max_memories: 20 }),
    });
    // Wire it in as the entry so the graph stays valid (reachability).
    const edges = JSON.parse(graph.edges);
    edges.edges.push({ from: 'n-memory', to: 'n-analyzer' });
    graph.edges = JSON.stringify(edges);
    graph.entryPoint = 'n-memory';
    const onSave = jest.fn();
    render(<GraphEditor {...defaultProps} graph={graph} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('graph-editor-node-n-memory'));
    const field = screen.getByTestId('graph-editor-config-field-max_memories');
    expect(field).toHaveValue(20);

    fireEvent.change(field, { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('graph-editor-save'));
    const saved = onSave.mock.calls[0][0];
    const memoryNode = saved.nodes.find((n: any) => n.nodeId === 'n-memory');
    expect(JSON.parse(memoryNode.config)).toEqual({ max_memories: 5 });
  });

  test('a TOOL_EXECUTOR node edits its PDF branding, logo upload included', async () => {
    // The upload resolves asynchronously, so React Flow's animation-frame
    // measuring runs too; it needs DOMMatrixReadOnly, which jsdom lacks
    const win = window as unknown as { DOMMatrixReadOnly?: unknown };
    const originalMatrix = win.DOMMatrixReadOnly;
    win.DOMMatrixReadOnly = class {
      m22 = 1;
    };
    const graph = buildGraph();
    graph.nodes.push({
      nodeId: 'n-tools',
      nodeType: 'TOOL_EXECUTOR',
      name: 'Tools',
      config: JSON.stringify({ tools: ['web_search', 'generate_pdf'] }),
    });
    const edges = JSON.parse(graph.edges);
    edges.edges.push({ from: 'n-tools', to: 'n-analyzer' });
    graph.edges = JSON.stringify(edges);
    graph.entryPoint = 'n-tools';
    const onSave = jest.fn();
    const onUploadImage = jest.fn().mockResolvedValue('att-logo-1');
    render(
      <GraphEditor
        {...defaultProps}
        graph={graph}
        onSave={onSave}
        onUploadImage={onUploadImage}
      />
    );

    fireEvent.click(screen.getByTestId('graph-editor-node-n-tools'));
    fireEvent.change(screen.getByTestId('graph-editor-config-pdf-company'), {
      target: { value: 'Acme GmbH' },
    });
    const logo = new File(['png'], 'logo.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('graph-editor-config-pdf-logo-input'), {
      target: { files: [logo] },
    });
    await waitFor(() =>
      expect(
        screen.getByTestId('graph-editor-config-pdf-logo')
      ).toHaveTextContent('logo.png')
    );
    expect(onUploadImage).toHaveBeenCalledWith(logo);

    fireEvent.click(screen.getByTestId('graph-editor-save'));
    const saved = onSave.mock.calls[0][0];
    const toolsNode = saved.nodes.find((n: any) => n.nodeId === 'n-tools');
    expect(JSON.parse(toolsNode.config)).toEqual({
      tools: ['web_search', 'generate_pdf'],
      tool_settings: {
        generate_pdf: {
          company_name: 'Acme GmbH',
          logo_attachment_id: 'att-logo-1',
        },
      },
    });
    win.DOMMatrixReadOnly = originalMatrix;
  });

  test('preset items show their own contract or inherit the primitive contract', () => {
    const catalog: NodeCatalogEntry[] = [
      {
        nodeType: 'GENERATION',
        label: 'Own Contract',
        defaultConfig: '{}',
        hasPrompt: true,
        requiredAttributes: ['Writes my_custom_key'],
      },
      {
        nodeType: 'RETRIEVAL',
        label: 'Inherits',
        defaultConfig: '{}',
        hasPrompt: false,
      },
    ];
    render(
      <GraphEditor
        {...defaultProps}
        graph={buildGraph()}
        nodeCatalog={catalog}
      />
    );
    expect(
      screen.getByTestId('graph-editor-palette-item-GENERATION')
    ).toHaveTextContent('Writes my_custom_key');
    // No own contract lines → the primitive's contract shows.
    expect(
      screen.getByTestId('graph-editor-palette-item-RETRIEVAL')
    ).toHaveTextContent('Writes retrieval_results');
  });

  test('search filters across both sections and can empty the palette', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);
    const search = screen.getByTestId('graph-editor-palette-search');

    fireEvent.change(search, { target: { value: 'rewriter' } });
    expect(
      screen.getByTestId('graph-editor-palette-item-QUERY_REWRITER')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('graph-editor-palette-type-GENERATION')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('graph-editor-palette-type-WEB_SEARCH')
    ).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'zzz-no-such-node' } });
    expect(screen.getByTestId('graph-editor-palette')).toHaveTextContent(
      'No matching nodes.'
    );
    expect(
      screen.queryByTestId('graph-editor-palette-type-RETRIEVAL')
    ).not.toBeInTheDocument();
  });

  test('the footer note stays visible in the palette', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);
    expect(screen.getByTestId('graph-editor-palette-footer')).toHaveTextContent(
      'Graphs must produce generated_response · cycles require a Reflection node'
    );
  });

  test('the palette sits inside a resizable sidebar', () => {
    render(<GraphEditor {...defaultProps} graph={buildGraph()} />);
    const sidebar = screen.getByTestId('graph-editor-palette-sidebar');
    expect(sidebar).toContainElement(
      screen.getByTestId('graph-editor-palette')
    );
    expect(
      screen.getByTestId('graph-editor-palette-resize-handle')
    ).toBeInTheDocument();
  });
});

describe('nodeTypeInfo helpers', () => {
  test('mergeNodeTypeInfos returns the defaults untouched without overrides', () => {
    expect(mergeNodeTypeInfos()).toBe(DEFAULT_NODE_TYPE_INFOS);
    expect(mergeNodeTypeInfos([])).toBe(DEFAULT_NODE_TYPE_INFOS);
  });

  test('mergeNodeTypeInfos never lets explicit undefined erase a default', () => {
    const merged = mergeNodeTypeInfos([
      { nodeType: 'RETRIEVAL', label: 'Override', color: undefined },
    ]);
    const retrieval = merged.find(i => i.nodeType === 'RETRIEVAL');
    expect(retrieval?.label).toBe('Override');
    expect(retrieval?.color).toBe('hsl(174 60% 35%)');
    expect(merged).toHaveLength(DEFAULT_NODE_TYPE_INFOS.length);
  });

  test('colorForNodeType prefers the info color and hashes deterministically', () => {
    expect(
      colorForNodeType('X', { nodeType: 'X', label: 'X', color: 'tomato' })
    ).toBe('tomato');
    const hashed = colorForNodeType('SOME_UNKNOWN_TYPE');
    expect(hashed).toMatch(/^hsl\(\d+ 45% 45%\)$/);
    expect(colorForNodeType('SOME_UNKNOWN_TYPE')).toBe(hashed);
  });
});
