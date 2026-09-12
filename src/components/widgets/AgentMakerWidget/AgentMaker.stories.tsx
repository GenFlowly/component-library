import type { Meta, StoryObj } from '@storybook/react';
import AgentMaker, {
  AgentMakerInstructionOption,
  AgentMakerVendorOption,
} from './AgentMaker';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const INSTRUCTIONS: AgentMakerInstructionOption[] = [
  { id: 'inst-persona', name: 'Persona Builder', version: 3 },
  { id: 'inst-summary', name: 'Conversation Summarizer', version: 1 },
  { id: 'inst-memory', name: 'Memory Extractor', version: 2 },
];

const VENDORS: AgentMakerVendorOption[] = [
  { id: 'OPENAI', label: 'OpenAI' },
  { id: 'CLAUDE', label: 'Claude' },
  { id: 'GEMINI', label: 'Gemini' },
];

const MODELS: Record<string, string[]> = {
  OPENAI: ['gpt-5', 'gpt-5-mini'],
  CLAUDE: ['claude-fable-5', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  GEMINI: [],
};

const meta: Meta<typeof AgentMaker> = {
  title: 'Components/AgentMaker',
  component: AgentMaker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Create/edit form for prompt-template agents: a prompt instruction wrapped with generation settings (output format, optional vendor/model preference, input template).

### Anatomy / Behavior

- Purely presentational: instruction listing, model listing and persistence are the caller's job via props and async callbacks, so the same UI serves the customer app's Agents page and the admin panel.
- \`onSubmit\` resolves an optional success message (e.g. "Agent created: g-123"); thrown errors surface as the error message.
- \`getModelsForVendor\` is called lazily per vendor and cached. A non-empty list renders the model field as a select (keeping a current model visible even if missing from the list); an empty list — or no callback — leaves it free-text.
- Picking a vendor without a model blocks submit with an inline error; the "Platform default" vendor option skips the model preference entirely.
- Pass \`editing\` to prefill for an existing agent; clearing it resets to create mode.
- The card always fills its container's width. The top-right toggle expands it to the full viewport (Escape collapses); \`newTabHref\` adds an "open in new tab" link next to it.
- All UI text is overridable via \`strings\` (i18n hook-in point).

### Node flavor

Pass \`node\` to switch the same component into the GraphEditor's node-settings panel. The visible fields adapt to the node's type — a **Generation node** (\`catalogEntry.hasPrompt\`) gets the instruction picker (with version pinning and preview) and output key, while a **Retrieval node** gets its type-declared \`configFields\` instead; everything else lands in the raw-JSON expando. Conditional routing, entry point, save-as-preset and delete round it out. Changes apply immediately through the node callbacks — no submit lifecycle.

### When to use

- Agents pages that create or edit prompt-template (GENERATION) agents — the customer app and the admin panel's customer-style Agents page.

### When NOT to use

- Full graph editing (multiple nodes, routing) — use \`GraphEditor\` instead.`,
      },
    },
  },
  args: {
    instructions: INSTRUCTIONS,
    vendors: VENDORS,
    getModelsForVendor: async (vendor: string) => {
      await delay(600);
      return MODELS[vendor] ?? [];
    },
    variableHints: [
      {
        action: 'Learn about User',
        variables: ['userName', 'conversationText'],
      },
      { action: 'Conversation Title', variables: ['conversationText'] },
    ],
    onSubmit: async () => {
      await delay(600);
      return 'Agent created: g-demo-123 — map it on the Default Actions page';
    },
    onCancel: () => {},
    newTabHref: '/agents/new',
  },
};

export default meta;
type Story = StoryObj<typeof AgentMaker>;

/** Create mode: pick an instruction, optionally a vendor + model, and submit. */
export const CreateAgent: Story = {};

/** Edit mode: form prefilled from an existing GENERATION agent. */
export const EditAgent: Story = {
  args: {
    editing: {
      agentId: 'g-9f21',
      initial: {
        name: 'Persona Generator v2',
        instructionId: 'inst-persona',
        outputFormat: 'json',
        vendor: 'CLAUDE',
        model: 'claude-fable-5',
        inputTemplate: '{{instructionText}}',
      },
    },
    onSubmit: async () => {
      await delay(600);
      return 'Agent g-9f21 updated — mapped request types pick it up within ~1 minute';
    },
  },
};

/** Free-text model: the vendor has no fetched model list. */
export const FreeTextModel: Story = {
  args: {
    getModelsForVendor: async () => {
      await delay(300);
      return [];
    },
  },
};

/** Error path: submitting rejects and the message renders inline. */
export const SubmitFails: Story = {
  args: {
    onSubmit: async () => {
      await delay(600);
      throw new Error('An agent with this name already exists');
    },
  },
};

/** No cancel callback: the cancel button is hidden (e.g. a standalone page). */
export const WithoutCancel: Story = {
  args: {
    onCancel: undefined,
  },
};

const NODE_INSTRUCTIONS = [
  {
    id: 'inst-analyzer',
    name: 'Query Analyzer Prompt',
    version: 4,
    preview: 'Decide whether the user query needs rewriting…',
  },
  { id: 'inst-generator', name: 'Response Generator Prompt', version: 2 },
];

/**
 * Generation node (the prompt-bearing LLM primitive): instruction picker
 * with version pinning and preview, input template, model override, output
 * key, conditional routing. Changes apply immediately via the node
 * callbacks.
 */
export const GenerationNodeSettings: Story = {
  args: {
    instructions: NODE_INSTRUCTIONS,
    node: {
      id: 'n-generation',
      name: 'Analyzer',
      nodeType: 'GENERATION',
      config: JSON.stringify({
        instruction_id: 'inst-analyzer',
        instruction_version: null,
        input_template: '{original_query}',
        output_key: 'analysis',
      }),
      conditional: {
        key: 'needs_rewrite',
        type: 'bool',
        routes: ['true', 'false'],
      },
      isEntry: true,
    },
    catalogEntry: {
      nodeType: 'GENERATION',
      label: 'Generation Node',
      defaultConfig: '{}',
      hasPrompt: true,
    },
    conditionOptions: [
      { key: 'needs_rewrite', type: 'bool', label: 'Needs rewrite' },
      { key: 'documents', type: 'list_empty', label: 'Documents empty' },
    ],
    onRename: () => {},
    onConfigChange: () => {},
    onSetEntryPoint: () => {},
    onConditionalChange: () => {},
    onDeleteNode: () => {},
    onRequestCreateInstruction: () => {},
    onSaveAsPreset: () => {},
  },
};

/**
 * Retrieval node (promptless): no instruction/output-key fields — instead
 * the type's declared config fields plus the raw-JSON expando.
 */
export const RetrievalNodeSettings: Story = {
  args: {
    instructions: [],
    node: {
      id: 'n-retrieval',
      name: 'Retrieval',
      nodeType: 'RETRIEVAL',
      config: JSON.stringify({ top_k: 8, rerank: true, exotic_flag: 'kept' }),
      conditional: null,
      isEntry: false,
    },
    catalogEntry: {
      nodeType: 'RETRIEVAL',
      label: 'Retrieval Node',
      defaultConfig: '{"top_k":8}',
      hasPrompt: false,
    },
    configFields: [
      {
        key: 'top_k',
        label: 'Top K results',
        type: 'number' as const,
        min: 1,
        max: 50,
      },
      { key: 'rerank', label: 'Rerank results', type: 'boolean' as const },
    ],
    conditionOptions: [
      { key: 'documents', type: 'list_empty', label: 'Documents empty' },
    ],
    onRename: () => {},
    onConfigChange: () => {},
    onSetEntryPoint: () => {},
    onConditionalChange: () => {},
    onDeleteNode: () => {},
  },
};
