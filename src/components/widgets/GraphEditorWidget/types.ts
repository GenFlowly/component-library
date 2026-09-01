import type { Edge, Node } from '@xyflow/react';

/** Sentinel node id the server uses for the terminal node of a graph. */
export const END_NODE_ID = '__end__';

/** Prefix of temporary ids given to nodes created in the current session. */
export const TEMP_NODE_ID_PREFIX = 'new-';

/**
 * Node type that must be present in a graph whenever conditional routing is
 * used (server-side rule mirrored by the client validation).
 */
export const REFLECTION_NODE_TYPE = 'RESPONSE_GENERATOR_WITH_REFLECTION';

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

export type ConditionType = 'bool' | 'list_empty';

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
  /** Keys are ALWAYS exactly `true` and `false`. */
  routes: { true: string; false: string };
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

export interface NodeCatalogEntry {
  nodeType: string;
  label: string;
  description?: string;
  /** JSON string used as the config of newly dropped nodes. */
  defaultConfig: string;
  /** Show the instruction selector in the config panel. */
  hasPrompt: boolean;
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
  paletteTitle: string;
  paletteSearchPlaceholder: string;
  paletteEmpty: string;
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
  modelOverrideLabel: string;
  rawConfigToggle: string;
  rawConfigApply: string;
  rawConfigInvalid: string;
  conditionSectionLabel: string;
  conditionEnable: string;
  conditionPickLabel: string;
  deleteNode: string;
  trueRoute: string;
  falseRoute: string;
}

export interface GraphEditorProps {
  /** Graph to edit; `null` starts blank ("New agent"). */
  graph: AgentGraph | null;
  nodeCatalog: NodeCatalogEntry[];
  instructions: InstructionOption[];
  conditionOptions: ConditionOption[];
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
export const SOURCE_HANDLE_TRUE = 'true';
export const SOURCE_HANDLE_FALSE = 'false';

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
    | 'multiple-outgoing'
    | 'self-loop'
    | 'reflection-node-required'
    | 'unreachable-nodes';
  message: string;
}
