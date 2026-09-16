import type { Edge, Node } from '@xyflow/react';

/** Sentinel node id the server uses for the terminal node of a graph. */
export const END_NODE_ID = '__end__';

/** Prefix of temporary ids given to nodes created in the current session. */
export const TEMP_NODE_ID_PREFIX = 'new-';

/**
 * Node type that must be present in a graph whenever the graph contains a
 * directed cycle (server-side rule mirrored by the client validation).
 */
export const REFLECTION_NODE_TYPE = 'RESPONSE_GENERATOR_WITH_REFLECTION';
export const TOOL_EXECUTOR_NODE_TYPE = 'TOOL_EXECUTOR';

/**
 * Special route label of `value` conditions acting as the fallback route when
 * no other label matches. Rendered as "default" in the editor.
 */
export const DEFAULT_ROUTE_LABEL = '__default__';

// ---------------------------------------------------------------------------
// Server domain model (exact shapes, do not change)
// ---------------------------------------------------------------------------

export interface AgentGraphNode {
  /** Server id, or temp id `new-<n>` for nodes created in this session. */
  nodeId: string;
  nodeType: string;
  name: string;
  /** JSON string. */
  config: string;
}

export interface AgentGraph {
  graphId?: string;
  name: string;
  isDefault?: boolean;
  /** A nodeId. */
  entryPoint: string;
  maxIterations: number;
  /** JSON string, see {@link EdgesJson}. */
  edges: string;
  /** JSON string, see {@link LayoutJson}. */
  layout?: string;
  nodes: AgentGraphNode[];
}

export type ConditionType = 'bool' | 'list_empty' | 'value' | 'tool_route';

export interface PlainEdgeSpec {
  from: string;
  /** A nodeId or `__end__`. */
  to: string;
}

export interface ConditionalEdgeSpec {
  from: string;
  condition_key: string;
  /** Optional, defaults to `bool`. */
  condition_type?: ConditionType;
  /**
   * Route label → target nodeId (or `__end__`).
   * - `bool` / `list_empty`: labels are EXACTLY `true` and `false`.
   * - `value`: arbitrary labels (at least one); the state field's value is
   *   matched as a string against the labels. The optional special label
   *   {@link DEFAULT_ROUTE_LABEL} is the fallback route.
   * - `tool_route`: labels are EXACTLY `builtin`, `caller` and `none` — the
   *   runtime routes on the response generator's tool calls (built-in tools →
   *   the TOOL_EXECUTOR node, caller-defined → exit, no calls → exit). The
   *   condition key is ignored by the runtime.
   */
  routes: Record<string, string>;
}

/** Parsed shape of {@link AgentGraph.edges}. */
export interface EdgesJson {
  edges: PlainEdgeSpec[];
  conditional_edges: ConditionalEdgeSpec[];
}

/** Parsed shape of {@link AgentGraph.layout}. */
export interface LayoutJson {
  positions: Record<string, { x: number; y: number }>;
}

// ---------------------------------------------------------------------------
// Editor props
// ---------------------------------------------------------------------------

/**
 * A config key a node type (or preset) exposes as a dedicated input in the
 * config panel — instead of burying it in the raw-JSON editor.
 */
export interface NodeConfigField {
  /** Config JSON key, e.g. "max_memories". */
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean';
  placeholder?: string;
  min?: number;
  max?: number;
  /** Optional hint rendered under the input. */
  hint?: string;
}

export interface NodeCatalogEntry {
  nodeType: string;
  label: string;
  description?: string;
  /** JSON string used as the config of newly dropped nodes. */
  defaultConfig: string;
  /** Show the instruction selector in the config panel. */
  hasPrompt: boolean;
  /**
   * Contract lines shown on the palette item. Absent → the preset inherits
   * the contract of its underlying node type (NodeTypeInfo.requiredAttributes).
   */
  requiredAttributes?: string[];
  /**
   * Config keys edited via dedicated panel inputs. Absent → the preset
   * inherits its underlying node type's fields (NodeTypeInfo.configFields).
   */
  configFields?: NodeConfigField[];
}

/**
 * Static metadata about a runtime node type: how it is labeled and colored in
 * the editor, and the human-readable contract the type imposes on the graph.
 * The library ships defaults for the built-in types
 * ({@link DEFAULT_NODE_TYPE_INFOS} in `nodeTypeInfo.ts`); entries passed via
 * {@link GraphEditorProps.nodeTypes} merge over those defaults by `nodeType`.
 */
export interface NodeTypeInfo {
  nodeType: string;
  label: string;
  /** Accent color (any CSS color) used to identify this type on the canvas and palette. */
  color?: string;
  description?: string;
  /** Human-readable contract lines: what the node requires / writes / rules the graph must follow. */
  requiredAttributes?: string[];
  /** Config for dragging a bare node of this type onto the canvas. */
  defaultConfig?: string;
  /**
   * Excluded from the palette's "Node types" section. Used for legacy type
   * strings that are aliases of a runtime primitive (e.g. QUERY_ANALYZER is
   * the LLM primitive) — they still resolve colors/labels for existing
   * graphs, but only real primitives are offered for dropping.
   */
  paletteHidden?: boolean;
  /** Shows the instruction selector in the config panel for bare nodes of this type. */
  hasPrompt?: boolean;
  /** Config keys the panel edits with dedicated inputs for this type. */
  configFields?: NodeConfigField[];
}

export interface InstructionOption {
  instructionId: string;
  name: string;
  latestVersion?: number;
  preview?: string;
}

export interface ConditionOption {
  key: string;
  type: ConditionType;
  label: string;
}

/** Every user-facing string of the editor, overridable for i18n. */
export interface GraphEditorLabels {
  newAgentName: string;
  nameHint: string;
  maxIterationsHint: string;
  save: string;
  saving: string;
  autoLayout: string;
  valid: string;
  invalidCount: string; // uses {count}
  validationTitle: string;
  dismiss: string;
  paletteTypesTitle: string;
  palettePresetsTitle: string;
  paletteSearchPlaceholder: string;
  paletteEmpty: string;
  /** Summary label of the collapsed contract list on palette type items. */
  paletteContractToggle: string;
  /** Always-visible note at the bottom of the palette. */
  paletteFooterNote: string;
  collapsePalette: string;
  expandPalette: string;
  configTitle: string;
  nodeNameLabel: string;
  setAsEntryPoint: string;
  entryPointBadge: string;
  endNodeLabel: string;
  instructionLabel: string;
  instructionSearchPlaceholder: string;
  instructionNone: string;
  instructionEmpty: string;
  followLatest: string;
  pinToVersion: string;
  previewToggle: string;
  createInstruction: string;
  inputTemplateLabel: string;
  inputTemplateHint: string;
  modelOverrideLabel: string;
  rawConfigToggle: string;
  rawConfigApply: string;
  rawConfigInvalid: string;
  conditionSectionLabel: string;
  conditionEnable: string;
  conditionPickLabel: string;
  conditionTypeLabel: string;
  conditionTypeBool: string;
  conditionTypeListEmpty: string;
  conditionTypeValue: string;
  conditionTypeToolRoute: string;
  routeListLabel: string;
  addRoute: string;
  removeRoute: string;
  includeDefaultRoute: string;
  outputKeyLabel: string;
  outputKeyHint: string;
  saveAsPreset: string;
  deleteNode: string;
  trueRoute: string;
  falseRoute: string;
  defaultRoute: string;
}

export interface GraphEditorProps {
  /** Graph to edit; `null` starts blank ("New agent"). */
  graph: AgentGraph | null;
  nodeCatalog: NodeCatalogEntry[];
  /**
   * Metadata for the runtime node types (palette "Node types" section, type
   * colors, contract hints). Optional: entries merge field-by-field over the
   * library defaults by `nodeType`, so apps only pass additions/overrides.
   */
  nodeTypes?: NodeTypeInfo[];
  instructions: InstructionOption[];
  conditionOptions: ConditionOption[];
  /**
   * Vendors selectable as a node's model preference (passed through to the
   * node-settings panel). Omit to offer only the platform default.
   */
  vendors?: { id: string; label: string }[];
  /** Lazily lists the models available for a vendor (passed through). */
  getModelsForVendor?: (vendor: string) => Promise<string[]>;
  /** Mobile/view mode: pan/zoom + tap only, no drag/connect/palette. */
  readOnly?: boolean;
  saving?: boolean;
  /** Server-side validation error to display. */
  errorMessage?: string | null;
  /**
   * Called with the full desired state; new nodes keep `new-<n>` ids
   * referenced consistently in edges/entryPoint/layout.
   */
  onSave: (graph: AgentGraph) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onNodeSelect?: (node: AgentGraphNode | null) => void;
  /** Renders a "create new instruction" link when provided. */
  onRequestCreateInstruction?: () => void;
  /**
   * Renders a "save as pre-made node" action in the config panel (admin
   * surfaces): called with the selected node's current type/name/config.
   */
  onSaveAsPreset?: (node: AgentGraphNode) => void;
  /** Override any of the default English strings (e.g. with i18n values). */
  labels?: Partial<GraphEditorLabels>;
  'data-testid'?: string;
}

// ---------------------------------------------------------------------------
// Internal React Flow representation
// ---------------------------------------------------------------------------

/** Conditional routing attached to a node. */
export interface NodeConditional {
  key: string;
  type: ConditionType;
  /**
   * Ordered route labels (rendered as handles top → bottom, serialized in
   * this order). `bool` / `list_empty`: always `['true', 'false']`. `value`:
   * arbitrary labels, optionally ending with {@link DEFAULT_ROUTE_LABEL}.
   * `tool_route`: always {@link TOOL_ROUTE_LABELS}.
   */
  routes: string[];
}

export interface AgentNodeData extends Record<string, unknown> {
  name: string;
  nodeType: string;
  /** JSON string (kept verbatim so unknown keys survive round-trips). */
  config: string;
  /** Set when the node routes conditionally through true/false handles. */
  conditional: NodeConditional | null;
}

export type AgentFlowNode = Node<AgentNodeData, 'agent'>;
export type EndFlowNode = Node<Record<string, unknown>, 'end'>;
export type EditorFlowNode = AgentFlowNode | EndFlowNode;
export type EditorFlowEdge = Edge;

/** Source-handle ids used on agent nodes. */
export const SOURCE_HANDLE_PLAIN = 'out';

/** Conditional route handles follow the `route:<label>` id convention. */
export const ROUTE_HANDLE_PREFIX = 'route:';

export function routeHandleId(label: string): string {
  return `${ROUTE_HANDLE_PREFIX}${label}`;
}

/** The route label of a `route:<label>` handle id, or `null` for other ids. */
export function routeLabelFromHandle(
  handle: string | null | undefined
): string | null {
  if (!handle || !handle.startsWith(ROUTE_HANDLE_PREFIX)) return null;
  return handle.slice(ROUTE_HANDLE_PREFIX.length);
}

/** Legacy true/false handle ids, mapped onto the `route:<label>` scheme. */
export const SOURCE_HANDLE_TRUE = routeHandleId('true');
export const SOURCE_HANDLE_FALSE = routeHandleId('false');

/** Route labels of `bool` / `list_empty` conditions (fixed). */
export const BOOL_ROUTE_LABELS: readonly string[] = ['true', 'false'];

/** Route labels of `tool_route` conditions (fixed). */
export const TOOL_ROUTE_LABELS: readonly string[] = [
  'builtin',
  'caller',
  'none',
];

/** Canonical editor state: everything needed to rebuild an AgentGraph. */
export interface EditorGraphState {
  graphId?: string;
  isDefault?: boolean;
  name: string;
  /** Empty string when unset (validation error until assigned). */
  entryPoint: string;
  maxIterations: number;
  /** Includes the permanent END node (type `end`). */
  nodes: EditorFlowNode[];
  edges: EditorFlowEdge[];
}

export interface ValidationIssue {
  code:
    | 'edges-json-invalid'
    | 'name-blank'
    | 'max-iterations-range'
    | 'entry-point-missing'
    | 'entry-point-unknown'
    | 'edge-from-unknown'
    | 'edge-to-unknown'
    | 'route-target-missing'
    | 'condition-key-blank'
    | 'condition-routes-invalid'
    | 'multiple-outgoing'
    | 'self-loop'
    | 'reflection-node-required'
    | 'unreachable-nodes';
  message: string;
}
