import type { NodeTypeInfo } from './types';

/**
 * CSS custom property carrying a node type's accent color. Set as an inline
 * style on canvas nodes and palette items; the stylesheet derives the left
 * accent border, the type-badge tint and the palette accents from it.
 */
export const TYPE_COLOR_CSS_VAR = '--graph-editor-type-color';

/** Accent hue of the LLM primitive — shared by every LLM-backed type alias. */
const LLM_COLOR = 'hsl(271 50% 52%)';

/** RESPONSE_GENERATOR and its reflection variant share a default config. */
const RESPONSE_GENERATOR_DEFAULT_CONFIG = JSON.stringify({
  input_template:
    '{?context}Context:\n{context}\n\n{/context}Question: {query}',
  output_key: 'generated_response',
  response_format: 'text',
  include_conversation_history: true,
  is_streaming: true,
});

/**
 * Library defaults for the runtime node types.
 *
 * The runtime has exactly FOUR primitives — everything else is a pre-made
 * node (a preset config on top of one of these):
 *   LLM (stored as GENERATION) · Retrieval · Web Search · Reflection
 *
 * The remaining entries are `paletteHidden` legacy aliases of the LLM
 * primitive: they keep existing graphs rendering with the right label/color,
 * but are not offered in the palette's "Node types" section.
 *
 * Used whenever `GraphEditorProps.nodeTypes` is absent; entries passed by the
 * app merge field-by-field over these by `nodeType`
 * (see {@link mergeNodeTypeInfos}).
 */
export const DEFAULT_NODE_TYPE_INFOS: NodeTypeInfo[] = [
  // ── The four runtime primitives ────────────────────────────────────────────
  {
    nodeType: 'GENERATION',
    label: 'LLM',
    color: LLM_COLOR,
    hasPrompt: true,
    description:
      'The LLM primitive: one model call, driven entirely by config. Every prompt-style node is this primitive with a different config.',
    requiredAttributes: [
      'Prompt via instruction',
      'input_template renders {state} and {scratch} fields',
      'output_key: a first-class field, or any custom key (lands in scratch — usable as {key} in later templates and as a condition key)',
      'response_format: text | json (+ json_output_mapping) | json_indices',
      "thinking_level (reasoning effort) maps to the serving vendor's native control",
    ],
    defaultConfig: JSON.stringify({
      input_template: '{original_query}',
      response_format: 'text',
    }),
    configFields: [
      {
        key: 'max_tokens',
        label: 'Max output tokens',
        type: 'number',
        min: 1,
        placeholder: '4096',
        hint: "Cap on the call's output; on reasoning models this budget is shared with reasoning tokens.",
      },
    ],
  },
  {
    nodeType: 'MEMORY',
    label: 'Memory',
    color: 'hsl(35 85% 45%)',
    hasPrompt: false,
    description:
      'Injects what the system has learned about this user: core memories on every turn, plus episodic memories semantically recalled for the current message.',
    requiredAttributes: [
      'No model call',
      'Always injects the newest CORE memories',
      'Recalls EPISODIC memories related to the current message (vector search)',
      'Appends them to the response persona and writes {memories} to scratch',
      "Inert unless the request grants memory consent (user's settings)",
    ],
    defaultConfig: '{}',
    configFields: [
      {
        key: 'max_memories',
        label: 'Max core memories',
        type: 'number',
        min: 1,
        max: 100,
        placeholder: '20',
        hint: 'How many of the newest CORE memories are injected every turn.',
      },
      {
        key: 'recall_top_k',
        label: 'Recalled memories',
        type: 'number',
        min: 0,
        max: 20,
        placeholder: '4',
        hint: 'How many related EPISODIC memories one message may recall. 0 turns recall off.',
      },
      {
        key: 'recall_min_score',
        label: 'Recall similarity floor',
        type: 'number',
        min: 0,
        max: 1,
        placeholder: '0.5',
        hint: 'Minimum similarity a recalled memory must reach to be injected.',
      },
    ],
  },
  {
    nodeType: 'RETRIEVAL',
    label: 'Retrieval',
    color: 'hsl(174 60% 35%)',
    hasPrompt: false,
    description: "Vector search over the customer's collections.",
    requiredAttributes: [
      'No prompt',
      'Reads the (rewritten) query',
      'Writes retrieval_results',
    ],
    defaultConfig: '{}',
    configFields: [
      {
        key: 'top_n',
        label: 'Top N results',
        type: 'number',
        min: 1,
        placeholder: '3',
      },
      {
        key: 'similarity_threshold',
        label: 'Similarity threshold',
        type: 'number',
        min: 0,
        max: 1,
        placeholder: '0.6',
      },
    ],
  },
  {
    nodeType: 'WEB_SEARCH',
    label: 'Web Search',
    color: 'hsl(207 70% 45%)',
    hasPrompt: false,
    description: 'Searches the web for extra context.',
    requiredAttributes: [
      'No prompt',
      'Requires api_key in config',
      'Writes web_search_results ({web_context} in templates)',
    ],
    defaultConfig: '{}',
    configFields: [{ key: 'api_key', label: 'API key (Tavily)', type: 'text' }],
  },
  {
    nodeType: 'TOOL_EXECUTOR',
    label: 'Tools',
    color: 'hsl(0 55% 48%)',
    hasPrompt: false,
    description:
      'Executes built-in tools (e.g. generate_pdf) the response generator calls, then loops back for the final answer.',
    requiredAttributes: [
      'No model call',
      'Wire: generator → (Tool calls condition, "builtin" route) → this node → generator',
      'tools: optional list of enabled built-in tool names (default: all)',
      'Produced files are attached to the assistant message',
    ],
    defaultConfig: '{}',
  },
  {
    nodeType: 'RESPONSE_GENERATOR_WITH_REFLECTION',
    label: 'Reflection',
    color: 'hsl(160 50% 30%)',
    hasPrompt: false,
    description:
      'Generates the answer and signals whether the graph should loop.',
    requiredAttributes: [
      'Writes generated_response and needs_more_context',
      'REQUIRED in any graph containing a cycle',
    ],
    defaultConfig: RESPONSE_GENERATOR_DEFAULT_CONFIG,
  },

  // ── Legacy aliases of the LLM primitive (hidden from the palette) ─────────
  {
    nodeType: 'QUERY_ANALYZER',
    label: 'LLM',
    color: LLM_COLOR,
    hasPrompt: true,
    paletteHidden: true,
  },
  {
    nodeType: 'QUERY_REWRITER',
    label: 'LLM',
    color: LLM_COLOR,
    hasPrompt: true,
    paletteHidden: true,
  },
  {
    nodeType: 'RESULT_RANKER',
    label: 'LLM',
    color: LLM_COLOR,
    hasPrompt: true,
    paletteHidden: true,
  },
  {
    nodeType: 'RESPONSE_GENERATOR',
    label: 'LLM',
    color: LLM_COLOR,
    hasPrompt: false,
    paletteHidden: true,
  },
];

/**
 * Merges app-provided type infos over {@link DEFAULT_NODE_TYPE_INFOS} by
 * `nodeType`. Known types are merged field-by-field (fields left undefined in
 * the override keep the default value); unknown types are appended in the
 * order given. `undefined` (or absent) overrides therefore never erase a
 * default field.
 */
export function mergeNodeTypeInfos(overrides?: NodeTypeInfo[]): NodeTypeInfo[] {
  if (!overrides || overrides.length === 0) return DEFAULT_NODE_TYPE_INFOS;
  const byType = new Map<string, NodeTypeInfo>(
    DEFAULT_NODE_TYPE_INFOS.map(info => [info.nodeType, info])
  );
  overrides.forEach(override => {
    const definedFields = Object.fromEntries(
      Object.entries(override).filter(([, value]) => value !== undefined)
    ) as unknown as NodeTypeInfo;
    const base = byType.get(override.nodeType);
    byType.set(
      override.nodeType,
      base ? { ...base, ...definedFields } : definedFields
    );
  });
  return Array.from(byType.values());
}

/** Deterministic 0–359 hue from a string (for types without a color). */
function hashHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

/**
 * Accent color of a node type: the (merged) info's `color` when set,
 * otherwise a deterministic mid-saturation hue derived from the type string,
 * so unknown types stay visually stable across sessions.
 */
export function colorForNodeType(
  nodeType: string,
  info?: NodeTypeInfo
): string {
  return info?.color ?? `hsl(${hashHue(nodeType)} 45% 45%)`;
}
