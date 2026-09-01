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
import NodePalette, { PALETTE_DRAG_MIME } from './NodePalette';
import NodeConfigPanel from './NodeConfigPanel';
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
  ConditionOption,
  EditorFlowEdge,
  EditorFlowNode,
  EditorGraphState,
  END_NODE_ID,
  GraphEditorLabels,
  GraphEditorProps,
  SOURCE_HANDLE_FALSE,
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
  paletteTitle: 'Nodes',
  paletteSearchPlaceholder: 'Search nodes…',
  paletteEmpty: 'No matching nodes.',
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
  legacyPromptLabel: 'Inline prompt (legacy)',
  legacyPromptHint:
    'This node uses a legacy inline prompt. Convert it to an instruction to share and version it — selecting an instruction above replaces the inline prompt.',
  inlinePromptBadge: 'inline prompt',
  inputTemplateLabel: 'Input template',
  modelOverrideLabel: 'Model override',
  rawConfigToggle: 'Advanced config (JSON)',
  rawConfigApply: 'Apply JSON',
  rawConfigInvalid: 'Not valid JSON — expected an object.',
  conditionSectionLabel: 'Condition',
  conditionEnable: 'Conditional routing',
  conditionPickLabel: 'Condition',
  deleteNode: 'Delete node',
  trueRoute: 'true',
  falseRoute: 'false',
};

const nodeTypes: NodeTypes = {
  agent: AgentNode as unknown as NodeTypes['agent'],
  end: EndNode as unknown as NodeTypes['end'],
};

function GraphEditorInner({
  graph,
  nodeCatalog,
  instructions,
  conditionOptions,
  readOnly = false,
  saving = false,
  errorMessage = null,
  onSave,
  onDirtyChange,
  onNodeSelect,
  onRequestCreateInstruction,
  labels: labelsProp,
  'data-testid': testId = 'graph-editor',
}: GraphEditorProps) {
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelsProp }),
    [labelsProp]
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

  const changeNodeConditional = useCallback(
    (nodeId: string, option: ConditionOption | null) => {
      setNodes(nds =>
        nds.map(n =>
          n.id === nodeId && n.type === 'agent'
            ? {
                ...n,
                data: {
                  ...n.data,
                  conditional: option
                    ? { key: option.key, type: option.type }
                    : null,
                },
              }
            : n
        )
      );
      setEdges(eds => {
        const outgoing = eds.filter(e => e.source === nodeId);
        const others = eds.filter(e => e.source !== nodeId);
        if (option) {
          // Already conditional (only the condition changed): keep the routes.
          if (
            outgoing.some(
              e =>
                e.sourceHandle === SOURCE_HANDLE_TRUE ||
                e.sourceHandle === SOURCE_HANDLE_FALSE
            )
          ) {
            return eds;
          }
          // Convert the plain outgoing edge (if any) into the "true" route.
          const plain = outgoing[0];
          if (!plain) return eds;
          return [
            ...others,
            {
              id: conditionalEdgeId(nodeId, 'true'),
              source: nodeId,
              target: plain.target,
              sourceHandle: SOURCE_HANDLE_TRUE,
              label: labelsRef.current.trueRoute,
            },
          ];
        }
        // Disabling: collapse back to a plain edge keeping the "true" target.
        const trueEdge = outgoing.find(
          e => e.sourceHandle === SOURCE_HANDLE_TRUE
        );
        if (!trueEdge) return others;
        return [
          ...others,
          {
            id: plainEdgeId(nodeId, trueEdge.target),
            source: nodeId,
            target: trueEdge.target,
            sourceHandle: SOURCE_HANDLE_PLAIN,
          },
        ];
      });
    },
    [setNodes, setEdges]
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
      const edge: EditorFlowEdge =
        handle === SOURCE_HANDLE_PLAIN
          ? {
              id: plainEdgeId(conn.source, conn.target),
              source: conn.source,
              target: conn.target,
              sourceHandle: SOURCE_HANDLE_PLAIN,
            }
          : {
              id: conditionalEdgeId(
                conn.source,
                handle === SOURCE_HANDLE_TRUE ? 'true' : 'false'
              ),
              source: conn.source,
              target: conn.target,
              sourceHandle: handle,
              label:
                handle === SOURCE_HANDLE_TRUE
                  ? labelsRef.current.trueRoute
                  : labelsRef.current.falseRoute,
            };
      setEdges(eds => [...eds, edge]);
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes(PALETTE_DRAG_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const nodeType = event.dataTransfer.getData(PALETTE_DRAG_MIME);
      if (!nodeType) return;
      event.preventDefault();
      const entry = nodeCatalog.find(c => c.nodeType === nodeType);
      if (!entry) return;
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
          name: entry.label,
          nodeType: entry.nodeType,
          config: entry.defaultConfig,
          conditional: null,
        },
      };
      setNodes(nds => [...nds, newNode]);
      // First node of a blank graph becomes the entry point.
      setEntryPoint(prev => prev || id);
      setSelectedNodeId(id);
    },
    [nodeCatalog, screenToFlowPosition, setNodes]
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
        const catalogEntry = nodeCatalog.find(
          c => c.nodeType === node.data.nodeType
        );
        return {
          ...node,
          data: {
            ...node.data,
            typeLabel: catalogEntry?.label ?? node.data.nodeType,
            instructionName: instruction?.name ?? (instructionId || null),
            hasInlinePrompt:
              !instructionId &&
              typeof config.system_prompt === 'string' &&
              config.system_prompt.length > 0,
            isEntry: node.id === entryPoint,
            editable: !readOnly,
            entryBadgeLabel: labels.entryPointBadge,
            inlinePromptBadgeLabel: labels.inlinePromptBadge,
            trueRouteLabel: labels.trueRoute,
            falseRouteLabel: labels.falseRoute,
            onRename: renameNode,
          },
        };
      }),
    [nodes, entryPoint, instructions, nodeCatalog, readOnly, labels, renameNode]
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
          <NodePalette
            catalog={nodeCatalog}
            title={labels.paletteTitle}
            searchPlaceholder={labels.paletteSearchPlaceholder}
            emptyLabel={labels.paletteEmpty}
          />
        )}

        <div className={styles.canvas} onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
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
            <MiniMap pannable zoomable />
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
          <NodeConfigPanel
            key={selectedNode.id}
            node={selectedNode}
            isEntry={selectedNode.id === entryPoint}
            catalogEntry={nodeCatalog.find(
              c => c.nodeType === selectedNode.data.nodeType
            )}
            instructions={instructions}
            conditionOptions={conditionOptions}
            labels={labels}
            onRename={newName => renameNode(selectedNode.id, newName)}
            onConfigChange={config => changeNodeConfig(selectedNode.id, config)}
            onSetEntryPoint={() => setEntryPoint(selectedNode.id)}
            onConditionalChange={option =>
              changeNodeConditional(selectedNode.id, option)
            }
            onDelete={() =>
              deleteElements({ nodes: [{ id: selectedNode.id }] })
            }
            onRequestCreateInstruction={onRequestCreateInstruction}
          />
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
