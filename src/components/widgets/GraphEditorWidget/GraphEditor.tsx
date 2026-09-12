import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import type { Connection, Edge, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styles from './GraphEditor.module.scss';
import AgentNode from './AgentNode';
import EndNode from './EndNode';
import NodePalette, { PALETTE_DRAG_MIME, PalettePreset } from './NodePalette';
import AgentMaker from '../AgentMakerWidget/AgentMaker';
import ResizableSidebar from '../../common/ResizableSidebar/ResizableSidebar';
import { colorForNodeType, mergeNodeTypeInfos } from './nodeTypeInfo';
import { applyAutoLayout } from './autoLayout';
import {
  conditionalEdgeId,
  editorStateToGraph,
  graphToEditorState,
  nextTempNodeId,
  parseNodeConfig,
  plainEdgeId,
} from './serialization';
import { validateAgentGraph } from './validation';
import {
  AgentFlowNode,
  DEFAULT_ROUTE_LABEL,
  EditorFlowEdge,
  EditorFlowNode,
  EditorGraphState,
  END_NODE_ID,
  GraphEditorLabels,
  GraphEditorProps,
  NodeConditional,
  routeHandleId,
  routeLabelFromHandle,
  SOURCE_HANDLE_PLAIN,
  SOURCE_HANDLE_TRUE,
} from './types';

const DEFAULT_LABELS: GraphEditorLabels = {
  newAgentName: 'New agent',
  nameHint: 'Agent name',
  maxIterationsHint: 'Max iterations',
  save: 'Save',
  saving: 'Saving…',
  autoLayout: 'Auto-layout',
  valid: 'Valid',
  invalidCount: '{count} issue(s)',
  validationTitle: 'Validation',
  dismiss: 'Dismiss',
  paletteTypesTitle: 'Node types',
  palettePresetsTitle: 'Pre-made nodes',
  paletteSearchPlaceholder: 'Search nodes…',
  paletteEmpty: 'No matching nodes.',
  paletteContractToggle: 'Contract',
  paletteFooterNote:
    'Graphs must produce generated_response · cycles require a Reflection node',
  configTitle: 'Node settings',
  nodeNameLabel: 'Name',
  setAsEntryPoint: 'Set as entry point',
  entryPointBadge: 'START',
  endNodeLabel: 'END',
  instructionLabel: 'Instruction',
  instructionSearchPlaceholder: 'Search instructions…',
  instructionNone: 'Select an instruction…',
  instructionEmpty: 'No matching instructions.',
  followLatest: 'Follow latest',
  pinToVersion: 'Pin to version',
  previewToggle: 'Preview instruction',
  createInstruction: '+ Create new instruction',
  inputTemplateLabel: 'Input template',
  inputTemplateHint:
    '{field} inserts a value ({query}, {context}, {web_context}, {memories}, custom output keys). {?field}…{/field} renders its section only when the field has a value — e.g. {?context}Context:\n{context}\n\n{/context} skips the Context block when retrieval found nothing.',
  modelOverrideLabel: 'Model override',
  rawConfigToggle: 'Advanced config (JSON)',
  rawConfigApply: 'Apply JSON',
  rawConfigInvalid: 'Not valid JSON — expected an object.',
  conditionSectionLabel: 'Condition',
  conditionEnable: 'Conditional routing',
  conditionPickLabel: 'Condition key',
  conditionTypeLabel: 'Condition type',
  conditionTypeBool: 'Boolean (true / false)',
  conditionTypeListEmpty: 'List empty (true / false)',
  conditionTypeValue: 'Match value',
  conditionTypeToolRoute: 'Tool calls (builtin / caller / none)',
  routeListLabel: 'Routes',
  addRoute: '+ Add route',
  removeRoute: 'Remove route',
  includeDefaultRoute: 'Include a default route',
  outputKeyLabel: 'Output key',
  outputKeyHint:
    'Other nodes can use this value as {<key>} in templates or as a condition key.',
  saveAsPreset: 'Save as pre-made node',
  deleteNode: 'Delete node',
  trueRoute: 'true',
  falseRoute: 'false',
  defaultRoute: 'default',
};

const flowNodeTypes: NodeTypes = {
  agent: AgentNode as unknown as NodeTypes['agent'],
  end: EndNode as unknown as NodeTypes['end'],
};

// Palette sidebar bounds (px): ~12rem min / ~14rem default / ~24rem max.
const PALETTE_MIN_WIDTH = 192;
const PALETTE_DEFAULT_WIDTH = 224;
const PALETTE_MAX_WIDTH = 384;

/** localStorage key the palette width persists under (rem, via the sidebar). */
const PALETTE_WIDTH_STORAGE_KEY = 'graph-editor.palette-width';

// Node-settings sidebar bounds (px): ~18rem min / ~22rem default; no upper
// bound — the user may take the whole canvas if they want.
const CONFIG_MIN_WIDTH = 288;
const CONFIG_DEFAULT_WIDTH = 352;
const CONFIG_MAX_WIDTH = Number.POSITIVE_INFINITY;

/** localStorage key the node-settings width persists under (rem). */
const CONFIG_WIDTH_STORAGE_KEY = 'graph-editor.config-width';

/** MiniMap color of the END node (matches its muted canvas look). */
const MINIMAP_END_NODE_COLOR = '#9ca3af';

function GraphEditorInner({
  graph,
  nodeCatalog,
  nodeTypes: nodeTypesProp,
  instructions,
  conditionOptions,
  vendors,
  getModelsForVendor,
  readOnly = false,
  saving = false,
  errorMessage = null,
  onSave,
  onDirtyChange,
  onNodeSelect,
  onRequestCreateInstruction,
  onSaveAsPreset,
  labels: labelsProp,
  'data-testid': testId = 'graph-editor',
}: GraphEditorProps) {
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelsProp }),
    [labelsProp]
  );

  // App-provided type infos merge field-by-field over the library defaults.
  const typeInfos = useMemo(
    () => mergeNodeTypeInfos(nodeTypesProp),
    [nodeTypesProp]
  );
  const typeInfoByType = useMemo(
    () => new Map(typeInfos.map(info => [info.nodeType, info])),
    [typeInfos]
  );
  const typeColor = useCallback(
    (nodeType: string) =>
      colorForNodeType(nodeType, typeInfoByType.get(nodeType)),
    [typeInfoByType]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<EditorFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EditorFlowEdge>([]);
  const [name, setName] = useState('');
  const [maxIterations, setMaxIterations] = useState(25);
  const [entryPoint, setEntryPoint] = useState('');
  const [meta, setMeta] = useState<{ graphId?: string; isDefault?: boolean }>(
    {}
  );
  const [baseline, setBaseline] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dismissedIssues, setDismissedIssues] = useState<string | null>(null);

  const { deleteElements, screenToFlowPosition } = useReactFlow();

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  // (Re-)initialize the editor whenever the graph prop changes. The baseline
  // for dirty-tracking is captured after the initial parse + auto-layout so a
  // graph without stored positions does not start dirty.
  useEffect(() => {
    const { state, hasLayout } = graphToEditorState(
      graph,
      labelsRef.current.newAgentName
    );
    const laidOutNodes = hasLayout
      ? state.nodes
      : applyAutoLayout(state.nodes, state.edges);
    setNodes(laidOutNodes);
    setEdges(state.edges);
    setName(state.name);
    setMaxIterations(state.maxIterations);
    setEntryPoint(state.entryPoint);
    setMeta({ graphId: state.graphId, isDefault: state.isDefault });
    setSelectedNodeId(null);
    setDismissedIssues(null);
    setBaseline(
      JSON.stringify(editorStateToGraph({ ...state, nodes: laidOutNodes }))
    );
  }, [graph, setNodes, setEdges]);

  const currentState: EditorGraphState = useMemo(
    () => ({
      graphId: meta.graphId,
      isDefault: meta.isDefault,
      name,
      entryPoint,
      maxIterations,
      nodes,
      edges,
    }),
    [meta, name, entryPoint, maxIterations, nodes, edges]
  );
  const currentGraph = useMemo(
    () => editorStateToGraph(currentState),
    [currentState]
  );
  const issues = useMemo(
    () => validateAgentGraph(currentGraph),
    [currentGraph]
  );

  const dirty = useMemo(
    () => baseline !== null && JSON.stringify(currentGraph) !== baseline,
    [baseline, currentGraph]
  );
  const prevDirtyRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevDirtyRef.current !== dirty) {
      prevDirtyRef.current = dirty;
      onDirtyChange?.(dirty);
    }
  }, [dirty, onDirtyChange]);

  // Keep the selection consistent when nodes disappear. The entry point is
  // only cleared on actual deletion (onNodesDelete): an unknown entryPoint
  // coming from the server must stay visible as a validation error.
  useEffect(() => {
    if (selectedNodeId && !nodes.some(n => n.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  const onNodesDelete = useCallback((deleted: { id: string }[]) => {
    const deletedIds = new Set(deleted.map(n => n.id));
    setEntryPoint(prev => (deletedIds.has(prev) ? '' : prev));
  }, []);

  // Report tapped/selected node to the host app (used e.g. for mobile sheets).
  useEffect(() => {
    if (!onNodeSelect) return;
    const node = nodesRef.current.find(
      (n): n is AgentFlowNode => n.id === selectedNodeId && n.type === 'agent'
    );
    onNodeSelect(
      node
        ? {
            nodeId: node.id,
            nodeType: node.data.nodeType,
            name: node.data.name,
            config: node.data.config,
          }
        : null
    );
  }, [selectedNodeId, onNodeSelect]);

  const renameNode = useCallback(
    (nodeId: string, newName: string) => {
      setNodes(nds =>
        nds.map(n =>
          n.id === nodeId && n.type === 'agent'
            ? { ...n, data: { ...n.data, name: newName } }
            : n
        )
      );
    },
    [setNodes]
  );

  const changeNodeConfig = useCallback(
    (nodeId: string, config: string) => {
      setNodes(nds =>
        nds.map(n =>
          n.id === nodeId && n.type === 'agent'
            ? { ...n, data: { ...n.data, config } }
            : n
        )
      );
    },
    [setNodes]
  );

  /** Display text of a route label, i18n-mapped for true/false/default. */
  const routeDisplay = useCallback((label: string): string => {
    const l = labelsRef.current;
    if (label === 'true') return l.trueRoute;
    if (label === 'false') return l.falseRoute;
    if (label === DEFAULT_ROUTE_LABEL) return l.defaultRoute;
    return label;
  }, []);

  /**
   * Sets/updates/clears a node's conditional routing and reconciles its
   * outgoing edges: kept for surviving route labels, rewired through
   * `renames` (old label → new label), dropped for removed labels. Enabling
   * converts the plain edge into the first route; disabling collapses the
   * first surviving route back into a plain edge.
   */
  const changeNodeConditional = useCallback(
    (
      nodeId: string,
      conditional: NodeConditional | null,
      renames?: Record<string, string>
    ) => {
      setNodes(nds =>
        nds.map(n =>
          n.id === nodeId && n.type === 'agent'
            ? { ...n, data: { ...n.data, conditional } }
            : n
        )
      );
      setEdges(eds => {
        const outgoing = eds.filter(e => e.source === nodeId);
        const others = eds.filter(e => e.source !== nodeId);
        if (!conditional) {
          // Disabling: collapse back to a plain edge, preferring the "true"
          // route target, else the first remaining route.
          const kept =
            outgoing.find(e => e.sourceHandle === SOURCE_HANDLE_TRUE) ??
            outgoing.find(e => routeLabelFromHandle(e.sourceHandle) !== null);
          if (!kept) return others;
          return [
            ...others,
            {
              id: plainEdgeId(nodeId, kept.target),
              source: nodeId,
              target: kept.target,
              sourceHandle: SOURCE_HANDLE_PLAIN,
            },
          ];
        }

        const labelSet = new Set(conditional.routes);
        const usedHandles = new Set<string>();
        const next: EditorFlowEdge[] = [];
        outgoing.forEach(e => {
          let label = routeLabelFromHandle(e.sourceHandle);
          if (label === null) {
            // Was a plain edge: convert it into the first route.
            const first = conditional.routes[0];
            if (first === undefined) return;
            label = first;
          } else if (renames && renames[label] !== undefined) {
            label = renames[label];
          }
          if (!labelSet.has(label)) return; // route dropped → edge dropped
          const handle = routeHandleId(label);
          if (usedHandles.has(handle)) return; // one edge per route
          usedHandles.add(handle);
          next.push({
            ...e,
            id: conditionalEdgeId(nodeId, label),
            sourceHandle: handle,
            label: routeDisplay(label),
          });
        });
        return [...others, ...next];
      });
    },
    [setNodes, setEdges, routeDisplay]
  );

  const isValidConnection = useCallback((conn: Edge | Connection): boolean => {
    if (!conn.source || !conn.target) return false;
    if (conn.source === END_NODE_ID) return false;
    const sourceNode = nodesRef.current.find(n => n.id === conn.source);
    if (!sourceNode || sourceNode.type !== 'agent') return false;
    const handle = conn.sourceHandle ?? SOURCE_HANDLE_PLAIN;
    if (handle === SOURCE_HANDLE_PLAIN) {
      // No plain self-loops, and at most one outgoing edge overall.
      if (conn.source === conn.target) return false;
      return !edgesRef.current.some(e => e.source === conn.source);
    }
    // Conditional routes: one edge per route handle.
    return !edgesRef.current.some(
      e => e.source === conn.source && e.sourceHandle === handle
    );
  }, []);

  const onConnect = useCallback(
    (conn: Connection) => {
      const handle = conn.sourceHandle ?? SOURCE_HANDLE_PLAIN;
      const routeLabel = routeLabelFromHandle(handle);
      const edge: EditorFlowEdge =
        routeLabel === null
          ? {
              id: plainEdgeId(conn.source, conn.target),
              source: conn.source,
              target: conn.target,
              sourceHandle: SOURCE_HANDLE_PLAIN,
            }
          : {
              id: conditionalEdgeId(conn.source, routeLabel),
              source: conn.source,
              target: conn.target,
              sourceHandle: handle,
              label: routeDisplay(routeLabel),
            };
      setEdges(eds => [...eds, edge]);
    },
    [setEdges, routeDisplay]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes(PALETTE_DRAG_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const payload = event.dataTransfer.getData(PALETTE_DRAG_MIME);
      if (!payload) return;
      event.preventDefault();
      // The payload is a JSON preset (nodeType + label + defaultConfig).
      // Legacy plain-nodeType payloads fall back to the first catalog entry
      // of that type — first match is fine, presets need not be unique.
      let preset: PalettePreset | null = null;
      try {
        const parsed = JSON.parse(payload);
        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.nodeType === 'string'
        ) {
          preset = {
            nodeType: parsed.nodeType,
            label:
              typeof parsed.label === 'string' ? parsed.label : parsed.nodeType,
            defaultConfig:
              typeof parsed.defaultConfig === 'string'
                ? parsed.defaultConfig
                : '{}',
          };
        }
      } catch {
        // Not JSON: treat as a plain nodeType string.
      }
      if (!preset) {
        const entry =
          nodeCatalog.find(c => c.nodeType === payload) ??
          typeInfoByType.get(payload);
        if (!entry) return;
        preset = {
          nodeType: entry.nodeType,
          label: entry.label,
          defaultConfig: entry.defaultConfig ?? '{}',
        };
      }
      const id = nextTempNodeId(nodesRef.current.map(n => n.id));
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode: AgentFlowNode = {
        id,
        type: 'agent',
        position,
        data: {
          // The preset's label becomes the node name so multiple presets of
          // the same nodeType stay distinguishable on the canvas.
          name: preset.label,
          nodeType: preset.nodeType,
          config: preset.defaultConfig,
          conditional: null,
        },
      };
      setNodes(nds => [...nds, newNode]);
      // First node of a blank graph becomes the entry point.
      setEntryPoint(prev => prev || id);
      setSelectedNodeId(id);
    },
    [nodeCatalog, typeInfoByType, screenToFlowPosition, setNodes]
  );

  const handleAutoLayout = useCallback(() => {
    setNodes(nds => applyAutoLayout(nds, edgesRef.current));
  }, [setNodes]);

  const handleSave = useCallback(() => {
    onSave(
      editorStateToGraph({
        graphId: meta.graphId,
        isDefault: meta.isDefault,
        name,
        entryPoint,
        maxIterations,
        nodes: nodesRef.current,
        edges: edgesRef.current,
      })
    );
  }, [onSave, meta, name, entryPoint, maxIterations]);

  const selectedNode = useMemo(
    () =>
      nodes.find(
        (n): n is AgentFlowNode => n.id === selectedNodeId && n.type === 'agent'
      ) ?? null,
    [nodes, selectedNodeId]
  );

  const displayNodes = useMemo(
    () =>
      nodes.map(node => {
        if (node.type !== 'agent') {
          return { ...node, data: { label: labels.endNodeLabel } };
        }
        const config = parseNodeConfig(node.data.config);
        const instructionId =
          typeof config.instruction_id === 'string'
            ? config.instruction_id
            : '';
        const instruction = instructions.find(
          i => i.instructionId === instructionId
        );
        // First catalog match is fine: presets may repeat a nodeType.
        const catalogEntry = nodeCatalog.find(
          c => c.nodeType === node.data.nodeType
        );
        return {
          ...node,
          data: {
            ...node.data,
            // The badge names the runtime primitive (LLM / Retrieval / …) —
            // the node's own name carries its purpose, so preset labels stay
            // out of the badge.
            typeLabel:
              typeInfoByType.get(node.data.nodeType)?.label ??
              catalogEntry?.label ??
              node.data.nodeType,
            typeColor: typeColor(node.data.nodeType),
            instructionName: instruction?.name ?? (instructionId || null),
            isEntry: node.id === entryPoint,
            editable: !readOnly,
            entryBadgeLabel: labels.entryPointBadge,
            routeHandles: (node.data.conditional?.routes ?? []).map(label => ({
              id: routeHandleId(label),
              label: routeDisplay(label),
            })),
            onRename: renameNode,
          },
        };
      }),
    [
      nodes,
      entryPoint,
      instructions,
      nodeCatalog,
      typeInfoByType,
      typeColor,
      readOnly,
      labels,
      renameNode,
      routeDisplay,
    ]
  );

  const miniMapNodeColor = useCallback(
    (node: { type?: string; data?: Record<string, unknown> }): string =>
      node.type === 'agent' && typeof node.data?.nodeType === 'string'
        ? typeColor(node.data.nodeType)
        : MINIMAP_END_NODE_COLOR,
    [typeColor]
  );

  const displayEdges = useMemo(
    () =>
      edges.map(edge => ({
        ...edge,
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    [edges]
  );

  const issuesSignature = useMemo(
    () =>
      issues.map(i => i.message).join('|') +
      (errorMessage ? `|${errorMessage}` : ''),
    [issues, errorMessage]
  );
  const showIssuesPanel =
    (issues.length > 0 || Boolean(errorMessage)) &&
    dismissedIssues !== issuesSignature;

  const structurallyValid = issues.length === 0;

  return (
    <div className={styles.graphEditor} data-testid={testId}>
      <div className={styles.topBar}>
        {readOnly ? (
          <span className={styles.topBarName}>{name}</span>
        ) : (
          <>
            <label className={styles.topBarField}>
              <span className={styles.topBarHint}>{labels.nameHint}</span>
              <input
                className={styles.topBarInput}
                value={name}
                onChange={e => setName(e.target.value)}
                data-testid={`${testId}-name`}
              />
            </label>
            <label className={styles.topBarField}>
              <span className={styles.topBarHint}>
                {labels.maxIterationsHint}
              </span>
              <input
                className={`${styles.topBarInput} ${styles.topBarNumberInput}`}
                type="number"
                min={1}
                max={100}
                value={maxIterations}
                onChange={e => setMaxIterations(Number(e.target.value))}
                data-testid={`${testId}-max-iterations`}
              />
            </label>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleAutoLayout}
              data-testid={`${testId}-auto-layout`}
            >
              {labels.autoLayout}
            </button>
            <span
              className={
                structurallyValid ? styles.statusValid : styles.statusInvalid
              }
              data-testid={`${testId}-status`}
            >
              {structurallyValid
                ? labels.valid
                : labels.invalidCount.replace('{count}', String(issues.length))}
            </span>
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
              disabled={!dirty || !structurallyValid || saving}
              data-testid={`${testId}-save`}
            >
              {saving && <span className={styles.spinner} aria-hidden="true" />}
              {saving ? labels.saving : labels.save}
            </button>
          </>
        )}
      </div>

      <div className={styles.body}>
        {!readOnly && (
          <ResizableSidebar
            storageKey={PALETTE_WIDTH_STORAGE_KEY}
            minWidth={PALETTE_MIN_WIDTH}
            defaultWidth={PALETTE_DEFAULT_WIDTH}
            maxWidth={PALETTE_MAX_WIDTH}
            data-testid={`${testId}-palette-sidebar`}
            handleTestId={`${testId}-palette-resize-handle`}
          >
            <NodePalette
              typeInfos={typeInfos}
              catalog={nodeCatalog}
              typesTitle={labels.paletteTypesTitle}
              presetsTitle={labels.palettePresetsTitle}
              searchPlaceholder={labels.paletteSearchPlaceholder}
              emptyLabel={labels.paletteEmpty}
              contractToggleLabel={labels.paletteContractToggle}
              footerNote={labels.paletteFooterNote}
              colorForType={typeColor}
            />
          </ResizableSidebar>
        )}

        <div
          className={styles.canvas}
          onDragOver={onDragOver}
          onDrop={onDrop}
          data-testid={`${testId}-canvas`}
        >
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={flowNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={(_event, node) =>
              setSelectedNodeId(node.type === 'agent' ? node.id : null)
            }
            onPaneClick={() => setSelectedNodeId(null)}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            edgesFocusable={!readOnly}
            deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
            zoomOnDoubleClick={false}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
          >
            <Background gap={16} />
            <MiniMap pannable zoomable nodeColor={miniMapNodeColor} />
            <Controls showInteractive={!readOnly} />
          </ReactFlow>

          {showIssuesPanel && (
            <div
              className={styles.issuesPanel}
              data-testid={`${testId}-issues`}
            >
              <div className={styles.issuesHeader}>
                <span>{labels.validationTitle}</span>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setDismissedIssues(issuesSignature)}
                  data-testid={`${testId}-issues-dismiss`}
                >
                  {labels.dismiss}
                </button>
              </div>
              <ul className={styles.issuesList}>
                {errorMessage && (
                  <li className={styles.issueServer}>{errorMessage}</li>
                )}
                {issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {!readOnly && selectedNode && (
          <ResizableSidebar
            side="right"
            storageKey={CONFIG_WIDTH_STORAGE_KEY}
            minWidth={CONFIG_MIN_WIDTH}
            defaultWidth={CONFIG_DEFAULT_WIDTH}
            maxWidth={CONFIG_MAX_WIDTH}
            data-testid="graph-editor-config-panel"
            handleTestId="graph-editor-config-resize"
          >
            {/* AgentMaker renders as-is (own strings, own card look) — the
                wrapper div is purely a scroll viewport for the sidebar. */}
            <div className={styles.configScroll}>
              <AgentMaker
                key={selectedNode.id}
                data-testid="graph-editor-config"
                node={{
                  id: selectedNode.id,
                  name: selectedNode.data.name,
                  nodeType: selectedNode.data.nodeType,
                  config: selectedNode.data.config,
                  conditional: selectedNode.data.conditional,
                  isEntry: selectedNode.id === entryPoint,
                }}
                configFields={
                  nodeCatalog.find(
                    c => c.nodeType === selectedNode.data.nodeType
                  )?.configFields ??
                  typeInfoByType.get(selectedNode.data.nodeType)?.configFields
                }
                catalogEntry={
                  nodeCatalog.find(
                    c => c.nodeType === selectedNode.data.nodeType
                  ) ??
                  // Bare primitives dropped from the "Node types" section have
                  // no catalog preset — synthesize one from the type info so the
                  // config panel (instruction selector etc.) works for them too.
                  (() => {
                    const info = typeInfoByType.get(selectedNode.data.nodeType);
                    return info
                      ? {
                          nodeType: info.nodeType,
                          label: info.label,
                          defaultConfig: info.defaultConfig ?? '{}',
                          hasPrompt: info.hasPrompt ?? false,
                        }
                      : undefined;
                  })()
                }
                instructions={instructions.map(option => ({
                  id: option.instructionId,
                  name: option.name,
                  version: option.latestVersion ?? 1,
                  preview: option.preview,
                }))}
                vendors={vendors}
                getModelsForVendor={getModelsForVendor}
                conditionOptions={conditionOptions}
                onRename={newName => renameNode(selectedNode.id, newName)}
                onConfigChange={config =>
                  changeNodeConfig(selectedNode.id, config)
                }
                onSetEntryPoint={() => setEntryPoint(selectedNode.id)}
                onConditionalChange={(conditional, renames) =>
                  changeNodeConditional(selectedNode.id, conditional, renames)
                }
                onSaveAsPreset={
                  onSaveAsPreset
                    ? () =>
                        onSaveAsPreset({
                          nodeId: selectedNode.id,
                          nodeType: selectedNode.data.nodeType,
                          name: selectedNode.data.name,
                          config: selectedNode.data.config,
                        })
                    : undefined
                }
                onDeleteNode={() =>
                  deleteElements({ nodes: [{ id: selectedNode.id }] })
                }
                onRequestCreateInstruction={onRequestCreateInstruction}
              />
            </div>
          </ResizableSidebar>
        )}
      </div>
    </div>
  );
}

/**
 * Drag-and-drop agent-graph editor for LangGraph graphs stored in the
 * backend. Purely data-in/callback-out: the host app loads the graph, node
 * catalog, instructions and condition options, and persists via `onSave`.
 */
export default function GraphEditor(props: GraphEditorProps) {
  return (
    <ReactFlowProvider>
      <GraphEditorInner {...props} />
    </ReactFlowProvider>
  );
}
