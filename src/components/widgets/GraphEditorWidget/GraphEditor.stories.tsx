import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import GraphEditor from './GraphEditor';
import {
  AgentGraph,
  ConditionOption,
  END_NODE_ID,
  InstructionOption,
  NodeCatalogEntry,
} from './types';

const meta: Meta<typeof GraphEditor> = {
  title: 'Components/GraphEditor',
  component: GraphEditor,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `Drag-and-drop agent-graph editor (Langflow-style) for the LangGraph graphs stored in the backend, built on React Flow.

### Data in, callbacks out

The component is purely presentational: the host app loads the \`AgentGraph\`, the node catalog, the instruction list and the condition options, and persists changes through \`onSave\`, which receives the full rebuilt \`AgentGraph\` (nodes, \`edges\` JSON with \`conditional_edges\`, \`layout\` JSON from the current positions). Nodes created in a session keep temp ids \`new-1\`, \`new-2\`, … referenced consistently in edges/entryPoint/layout.

### Editing model

- **Palette (left):** searchable catalog; drag a type onto the canvas to create a node with its \`defaultConfig\`.
- **Canvas:** grid background, minimap, controls. The permanent END node renders \`__end__\`; the entry node wears a START badge. Double-click a node name to rename inline.
- **Config panel (right):** opens on selection — name, entry-point action, instruction selector (follow latest vs pin to a version, preview, create-new link), input template, model override, raw-JSON editor for unknown config keys, conditional routing and delete.
- **Conditional routing:** enabling the condition on a node swaps its single source handle for labeled true/false handles; the previous plain edge becomes the "true" route.
- **Validation:** the server's structural rules run live (entry point, single outgoing edge, reachability, reflection-node requirement, …); Save stays disabled while the graph is structurally invalid or pristine.

### Sizing

The editor fills its container (\`width/height: 100%\`) — give it an explicit height.`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof GraphEditor>;

const nodeCatalog: NodeCatalogEntry[] = [
  {
    nodeType: 'QUERY_ANALYZER',
    label: 'Query Analyzer',
    description: 'Classifies the query and decides whether it needs rewriting.',
    defaultConfig: JSON.stringify({
      instruction_id: '',
      instruction_version: null,
    }),
    hasPrompt: true,
  },
  {
    nodeType: 'QUERY_REWRITER',
    label: 'Query Rewriter',
    description: 'Rewrites the query for better retrieval.',
    defaultConfig: JSON.stringify({
      instruction_id: '',
      instruction_version: null,
    }),
    hasPrompt: true,
  },
  {
    nodeType: 'RETRIEVAL',
    label: 'Retrieval',
    description: 'Fetches relevant chunks from the vector store.',
    defaultConfig: JSON.stringify({ top_k: 8 }),
    hasPrompt: false,
  },
  {
    nodeType: 'RESULT_RANKER',
    label: 'Result Ranker',
    description: 'Re-ranks retrieved chunks by relevance.',
    defaultConfig: JSON.stringify({ max_results: 5 }),
    hasPrompt: false,
  },
  {
    nodeType: 'RESPONSE_GENERATOR',
    label: 'Response Generator',
    description: 'Generates the final answer from the ranked context.',
    defaultConfig: JSON.stringify({
      instruction_id: '',
      instruction_version: null,
      input_template: '{context}\n\nQuestion: {query}',
    }),
    hasPrompt: true,
  },
  {
    nodeType: 'RESPONSE_GENERATOR_WITH_REFLECTION',
    label: 'Generator (Reflection)',
    description:
      'Generates an answer and reflects on it; required for conditional routing.',
    defaultConfig: JSON.stringify({
      instruction_id: '',
      instruction_version: null,
    }),
    hasPrompt: true,
  },
  {
    nodeType: 'WEB_SEARCH',
    label: 'Web Search',
    description: 'Searches the web for additional context.',
    defaultConfig: JSON.stringify({ max_results: 3 }),
    hasPrompt: false,
  },
  {
    nodeType: 'GENERATION',
    label: 'Generation',
    description: 'Plain LLM generation step.',
    defaultConfig: JSON.stringify({
      instruction_id: '',
      instruction_version: null,
    }),
    hasPrompt: true,
  },
];

const instructions: InstructionOption[] = [
  {
    instructionId: 'inst-analyzer',
    name: 'Query analysis prompt',
    latestVersion: 4,
    preview:
      'You are a query analyst. Given the user query and conversation history, decide whether the query needs rewriting before retrieval. Answer with needs_rewrite true/false and a short reason.',
  },
  {
    instructionId: 'inst-rewriter',
    name: 'Query rewriting prompt',
    latestVersion: 2,
    preview:
      'Rewrite the user query into a standalone, retrieval-friendly search query. Keep entities, expand pronouns, drop chit-chat.',
  },
  {
    instructionId: 'inst-generator',
    name: 'RAG answer prompt',
    latestVersion: 7,
    preview:
      'Answer the question using ONLY the provided context. Cite the sources you used. If the context is insufficient, say so, then reflect on whether a rewrite could help.',
  },
  {
    instructionId: 'inst-tone',
    name: 'Brand tone of voice',
    latestVersion: 1,
    preview: 'Friendly, concise, no exclamation marks.',
  },
];

const conditionOptions: ConditionOption[] = [
  { key: 'needs_rewrite', type: 'bool', label: 'Needs rewrite' },
  { key: 'needs_more_context', type: 'bool', label: 'Needs more context' },
  {
    key: 'retrieval_results',
    type: 'list_empty',
    label: 'Retrieval results empty',
  },
  { key: 'error', type: 'bool', label: 'Error' },
];

/**
 * Default seeded RAG pipeline: QUERY_ANALYZER → conditional(needs_rewrite) →
 * QUERY_REWRITER (true) / RETRIEVAL (false) → RESULT_RANKER →
 * generator → __end__. The generator uses the reflection variant, which the
 * server requires whenever a conditional edge exists.
 */
const ragGraph: AgentGraph = {
  graphId: 'graph-rag-default',
  name: 'Default RAG pipeline',
  isDefault: true,
  entryPoint: 'node-analyzer',
  maxIterations: 10,
  edges: JSON.stringify({
    edges: [
      { from: 'node-rewriter', to: 'node-retrieval' },
      { from: 'node-retrieval', to: 'node-ranker' },
      { from: 'node-ranker', to: 'node-generator' },
      { from: 'node-generator', to: END_NODE_ID },
    ],
    conditional_edges: [
      {
        from: 'node-analyzer',
        condition_key: 'needs_rewrite',
        routes: { true: 'node-rewriter', false: 'node-retrieval' },
      },
    ],
  }),
  nodes: [
    {
      nodeId: 'node-analyzer',
      nodeType: 'QUERY_ANALYZER',
      name: 'Analyze query',
      config: JSON.stringify({
        instruction_id: 'inst-analyzer',
        instruction_version: null,
      }),
    },
    {
      nodeId: 'node-rewriter',
      nodeType: 'QUERY_REWRITER',
      name: 'Rewrite query',
      config: JSON.stringify({
        system_prompt: 'Rewrite the user query into a standalone search query.',
      }),
    },
    {
      nodeId: 'node-retrieval',
      nodeType: 'RETRIEVAL',
      name: 'Retrieve context',
      config: JSON.stringify({ top_k: 8, score_threshold: 0.35 }),
    },
    {
      nodeId: 'node-ranker',
      nodeType: 'RESULT_RANKER',
      name: 'Rank results',
      config: JSON.stringify({ max_results: 5 }),
    },
    {
      nodeId: 'node-generator',
      nodeType: 'RESPONSE_GENERATOR_WITH_REFLECTION',
      name: 'Generate answer',
      config: JSON.stringify({
        instruction_id: 'inst-generator',
        instruction_version: 7,
        input_template: '{context}\n\nQuestion: {query}',
        model_override: 'claude-sonnet-4-5',
      }),
    },
  ],
};

type GraphEditorArgs = React.ComponentProps<typeof GraphEditor>;

const EditorFrame = (args: GraphEditorArgs) => (
  <div style={{ height: '90vh', padding: '0.5rem' }}>
    <GraphEditor {...args} />
  </div>
);

export const DefaultRagGraph: Story = {
  render: args => <EditorFrame {...args} />,
  args: {
    graph: ragGraph,
    nodeCatalog,
    instructions,
    conditionOptions,
    onRequestCreateInstruction: () => alert('App opens the instruction editor'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'The seeded 5-node RAG pipeline with a conditional edge on `needs_rewrite`. The graph carries no stored layout, so dagre auto-layout (left-to-right) positions it on load. The rewriter still uses a legacy inline prompt — select it to see the conversion hint; the generator pins its instruction to version 7.',
      },
    },
  },
};

export const NewAgent: Story = {
  render: args => <EditorFrame {...args} />,
  args: {
    graph: null,
    nodeCatalog,
    instructions,
    conditionOptions,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Blank editor (`graph: null`). Drag node types from the palette onto the canvas — the first dropped node becomes the entry point, and new nodes get temp ids `new-1`, `new-2`, … that survive into `onSave`.',
      },
    },
  },
};

export const ReadOnly: Story = {
  render: args => <EditorFrame {...args} />,
  args: {
    graph: ragGraph,
    nodeCatalog,
    instructions,
    conditionOptions,
    readOnly: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'View mode for mobile: pan/zoom and node taps only (taps fire `onNodeSelect` so the app can open a bottom sheet). Palette, config panel and save are hidden; nodes cannot be dragged or connected.',
      },
    },
  },
};

export const WithServerError: Story = {
  render: args => <EditorFrame {...args} />,
  args: {
    graph: ragGraph,
    nodeCatalog,
    instructions,
    conditionOptions,
    saving: false,
    errorMessage:
      'Server: graph rejected — node "Retrieve context" references a deleted collection.',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A server-side validation error passed via `errorMessage` shows in the dismissable validation panel alongside any live structural issues.',
      },
    },
  },
};
