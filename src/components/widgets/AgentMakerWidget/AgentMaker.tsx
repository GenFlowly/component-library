import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './AgentMaker.module.scss';
import PillButton from '../../common/PillButton/PillButton';
import { InputTextWithHint } from '../../common/InputTextWithHint/InputTextWithHint';
import { InputSelectWithHint } from '../../common/InputSelectWithHint/InputSelectWithHint';
import TextEditor from '../TextEditorWidget/TextEditor';
import { parseNodeConfig } from '../GraphEditorWidget/serialization';
import {
  ConditionOption,
  ConditionType,
  DEFAULT_ROUTE_LABEL,
  NodeCatalogEntry,
  NodeConditional,
  NodeConfigField,
  TOOL_ROUTE_LABELS,
} from '../GraphEditorWidget/types';

/** Form values for a prompt-template agent (an instruction wrapped with generation settings). */
export interface AgentMakerValues {
  name: string;
  /** Id of the prompt instruction serving as the system prompt template. */
  instructionId: string;
  outputFormat: 'text' | 'json';
  /** Vendor id (e.g. "OPENAI"); '' = platform default / system failover. */
  vendor: string;
  /** Model for the chosen vendor; ignored when `vendor` is empty. */
  model: string;
  /** User-message template (e.g. "{{instructionText}}"). */
  inputTemplate: string;
}

export const emptyAgentMakerValues = (): AgentMakerValues => ({
  name: '',
  instructionId: '',
  outputFormat: 'text',
  vendor: '',
  model: '',
  inputTemplate: '',
});

export interface AgentMakerInstructionOption {
  id: string;
  name: string;
  version: number;
  /** Instruction text preview shown in the node flavor's expando. */
  preview?: string;
}

export interface AgentMakerVendorOption {
  /** Stable vendor id reported back through the form values. */
  id: string;
  label: string;
}

/** Per-action template-variable hint rendered under the form. */
export interface AgentMakerActionHint {
  /** Action display name (e.g. "Learn about User"). */
  action: string;
  variables: string[];
}

/** The graph node the node flavor edits. */
export interface AgentMakerNode {
  id: string;
  name: string;
  nodeType: string;
  /** Config JSON string. */
  config: string;
  conditional: NodeConditional | null;
  isEntry: boolean;
}

export interface AgentMakerStrings {
  titleCreate: string;
  titleEdit: (agentId: string) => string;
  nameHint: string;
  namePlaceholder: string;
  instructionHint: string;
  instructionPlaceholder: string;
  instructionOption: (option: AgentMakerInstructionOption) => string;
  outputFormatHint: string;
  outputFormatText: string;
  outputFormatJson: string;
  vendorHint: string;
  vendorDefaultOption: string;
  modelHint: string;
  modelPlaceholder: string;
  modelSelectPlaceholder: string;
  modelsLoadingPlaceholder: string;
  inputTemplateHint: string;
  inputTemplatePlaceholder: string;
  hintsTitle: string;
  submitCreate: string;
  submitEdit: string;
  submitting: string;
  cancel: string;
  modelRequired: string;
  saved: string;
  genericError: string;
  enterFullHeight: string;
  exitFullHeight: string;
  openInNewTab: string;
  // Node flavor
  nodeSettingsTitle: string;
  nodeNameHint: string;
  setAsEntryPoint: string;
  instructionNone: string;
  followLatest: string;
  pinToVersion: string;
  previewToggle: string;
  createInstruction: string;
  outputKeyHint: string;
  outputKeyHelp: string;
  inputTemplateHelp: string;
  rawConfigToggle: string;
  rawConfigApply: string;
  rawConfigInvalid: string;
  conditionSectionLabel: string;
  conditionEnable: string;
  conditionTypeLabel: string;
  conditionTypeBool: string;
  conditionTypeListEmpty: string;
  conditionTypeValue: string;
  conditionTypeToolRoute: string;
  conditionPickLabel: string;
  routeListLabel: string;
  addRoute: string;
  removeRoute: string;
  includeDefaultRoute: string;
  saveAsPreset: string;
  deleteNode: string;
}

const DEFAULT_STRINGS: AgentMakerStrings = {
  titleCreate: 'New agent',
  titleEdit: agentId => `Edit agent ${agentId}`,
  nameHint: 'Name',
  namePlaceholder: 'e.g. Persona Generator v2',
  instructionHint: 'Prompt instruction',
  instructionPlaceholder: 'Select an instruction…',
  instructionOption: option =>
    `${option.name} (${option.id}, v${option.version})`,
  outputFormatHint: 'Output format',
  outputFormatText: 'Text',
  outputFormatJson: 'JSON',
  vendorHint: 'Model preference',
  vendorDefaultOption: 'Platform default',
  modelHint: 'Model',
  modelPlaceholder: 'e.g. gpt-5',
  modelSelectPlaceholder: 'Select a model…',
  modelsLoadingPlaceholder: 'Loading models…',
  inputTemplateHint: 'Input template',
  inputTemplatePlaceholder: 'e.g. {{instructionText}}',
  hintsTitle:
    'Available template variables (system prompt + input template) by action:',
  submitCreate: 'Create agent',
  submitEdit: 'Save changes',
  submitting: 'Saving…',
  cancel: 'Cancel',
  modelRequired: 'Pick a model for the selected vendor (or clear the vendor)',
  saved: 'Agent saved',
  genericError: 'Failed to save agent',
  enterFullHeight: 'Expand to full page',
  exitFullHeight: 'Exit full page',
  openInNewTab: 'Open in new tab',
  // Node flavor
  nodeSettingsTitle: 'Node settings',
  nodeNameHint: 'Node name',
  setAsEntryPoint: 'Set as entry point',
  instructionNone: 'No instruction selected',
  followLatest: 'Follow latest version',
  pinToVersion: 'Pin to version',
  previewToggle: 'Preview instruction',
  createInstruction: '＋ Create new instruction…',
  outputKeyHint: 'Output key',
  outputKeyHelp: 'State key the node writes its output to',
  inputTemplateHelp: 'Template for the message passed into the node',
  rawConfigToggle: 'Advanced config (JSON)',
  rawConfigApply: 'Apply',
  rawConfigInvalid: 'Config must be a JSON object',
  conditionSectionLabel: 'Conditional routing',
  conditionEnable: 'Route by a condition',
  conditionTypeLabel: 'Condition type',
  conditionTypeBool: 'Boolean',
  conditionTypeListEmpty: 'List empty',
  conditionTypeValue: 'Value match',
  conditionTypeToolRoute: 'Tool route',
  conditionPickLabel: 'Condition key',
  routeListLabel: 'Routes',
  addRoute: '＋ Add route',
  removeRoute: 'Remove route',
  includeDefaultRoute: 'Include default route',
  saveAsPreset: 'Save as preset',
  deleteNode: 'Delete node',
};

export interface AgentMakerProps {
  // ── Agent flavor (standalone create/edit form) ──────────────────────────
  /** Pass to edit an existing agent; omit/null for create mode. */
  editing?: { agentId: string; initial: AgentMakerValues } | null;
  /** Instructions selectable as the system prompt template. */
  instructions?: AgentMakerInstructionOption[];
  /** Vendors selectable as a model preference. */
  vendors?: AgentMakerVendorOption[];
  /**
   * List the models available for a vendor (fetched lazily, cached per
   * vendor). Omit — or resolve an empty list / reject — and the model field
   * stays free-text.
   */
  getModelsForVendor?: (vendor: string) => Promise<string[]>;
  /** Per-action template-variable hints shown under the form. */
  variableHints?: AgentMakerActionHint[];
  /**
   * Persist the agent. Resolve a string to show it as the success message
   * (e.g. "Agent created: g-123"); throw to show the error message.
   * Required for the agent flavor; unused by the node flavor.
   */
  onSubmit?: (values: AgentMakerValues) => Promise<string | void>;
  /** Omit to hide the cancel button. */
  onCancel?: () => void;

  // ── Node flavor (graph-node settings, immediate-apply) ──────────────────
  /**
   * Pass to edit a graph node instead of a standalone agent. The visible
   * fields adapt to the node's type via `catalogEntry` and `configFields`.
   * Changes apply immediately through the node callbacks below — there is no
   * submit lifecycle. Mount with `key={node.id}` so per-node local state
   * (raw-JSON draft) resets when the selection changes.
   */
  node?: AgentMakerNode;
  /** Catalog entry of the node's type; `hasPrompt` shows the instruction fields. */
  catalogEntry?: NodeCatalogEntry;
  /** Config keys edited with dedicated inputs instead of the raw-JSON editor. */
  configFields?: NodeConfigField[];
  /** Suggestions for the conditional-routing key. */
  conditionOptions?: ConditionOption[];
  onRename?: (name: string) => void;
  /** Called with the node's full config JSON string on every field change. */
  onConfigChange?: (config: string) => void;
  onSetEntryPoint?: () => void;
  /**
   * `renames` maps old route labels to new ones so the editor can rewire
   * (rather than drop) the edges of renamed routes.
   */
  onConditionalChange?: (
    conditional: NodeConditional | null,
    renames?: Record<string, string>
  ) => void;
  onDeleteNode?: () => void;
  onRequestCreateInstruction?: () => void;
  onSaveAsPreset?: () => void;

  // ── Shared ──────────────────────────────────────────────────────────────
  /**
   * URL of a standalone page hosting this form. When set, an "open in new
   * tab" action renders in the header; omit to hide it.
   */
  newTabHref?: string;
  /** Overrides for the built-in English strings (i18n hook-in point). */
  strings?: Partial<AgentMakerStrings>;
  /** Extra class(es) on the root card, e.g. to restyle it as a host panel. */
  className?: string;
  /** Base test id; fields derive suffixed ids. */
  'data-testid'?: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Shared model preference (vendor + model) fields
// ───────────────────────────────────────────────────────────────────────────

/** Per-vendor model lists, fetched lazily and cached. */
function useVendorModels(
  getModelsForVendor?: (vendor: string) => Promise<string[]>
) {
  const [vendorModels, setVendorModels] = useState<Record<string, string[]>>(
    {}
  );
  const loadModelsForVendor = useCallback(
    async (vendor: string) => {
      if (!vendor || !getModelsForVendor) return;
      try {
        const models = await getModelsForVendor(vendor);
        setVendorModels(prev => ({ ...prev, [vendor]: models }));
      } catch {
        // No model list for this vendor — the field stays free-text.
        setVendorModels(prev => ({ ...prev, [vendor]: [] }));
      }
    },
    [getModelsForVendor]
  );
  return { vendorModels, loadModelsForVendor };
}

interface ModelPreferenceFieldsProps {
  vendor: string;
  model: string;
  vendors: AgentMakerVendorOption[];
  vendorModels: Record<string, string[]>;
  /** Whether a model-list loader was provided (drives the loading placeholder). */
  hasLoader: boolean;
  disabled?: boolean;
  /** Show the model field even with no vendor (legacy bare model strings). */
  allowBareModel?: boolean;
  onVendorChange: (vendor: string) => void;
  onModelChange: (model: string) => void;
  strings: AgentMakerStrings;
  testId: string;
}

/** The vendor dropdown + model picker pair, identical in both flavors. */
function ModelPreferenceFields({
  vendor,
  model,
  vendors,
  vendorModels,
  hasLoader,
  disabled = false,
  allowBareModel = false,
  onVendorChange,
  onModelChange,
  strings,
  testId,
}: ModelPreferenceFieldsProps) {
  const models = vendor ? (vendorModels[vendor] ?? []) : [];
  const modelOptions = [
    // Keep the current model visible even if it's missing from the fetched
    // list (e.g. a deprecated model on an existing agent)
    ...(model && !models.includes(model)
      ? [{ label: model, value: model }]
      : []),
    ...models.map(m => ({ label: m, value: m })),
  ];
  const modelsKnown = vendor in vendorModels;
  const showModel = Boolean(vendor) || (allowBareModel && Boolean(model));

  return (
    <>
      <InputSelectWithHint
        hint={strings.vendorHint}
        placeholder={strings.vendorDefaultOption}
        value={vendor}
        onChange={onVendorChange}
        options={[
          { label: strings.vendorDefaultOption, value: '' },
          ...vendors.map(v => ({ label: v.label, value: v.id })),
        ]}
        className={styles.vendorSelect}
        data-testid={`${testId}-vendor`}
      />
      {showModel &&
        (modelOptions.length > 0 && vendor ? (
          <InputSelectWithHint
            hint={strings.modelHint}
            placeholder={strings.modelSelectPlaceholder}
            value={model}
            onChange={onModelChange}
            options={modelOptions}
            className={styles.modelField}
            data-testid={`${testId}-model`}
          />
        ) : (
          <InputTextWithHint
            hint={strings.modelHint}
            placeholder={
              modelsKnown || !hasLoader || !vendor
                ? strings.modelPlaceholder
                : strings.modelsLoadingPlaceholder
            }
            value={model}
            disabled={disabled}
            onChange={e => onModelChange(e.target.value)}
            className={styles.modelField}
            data-testid={`${testId}-model`}
          />
        ))}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Node flavor
// ───────────────────────────────────────────────────────────────────────────

/** Config keys edited with dedicated fields; everything else is "raw". */
const KNOWN_CONFIG_KEYS = [
  'instruction_id',
  'instruction_version',
  'system_prompt',
  'input_template',
  'model_preference',
  'model_override',
  'output_key',
];

/** Route labels of a freshly enabled condition of the given type. */
function defaultRoutesFor(type: ConditionType): string[] {
  if (type === 'value') return [DEFAULT_ROUTE_LABEL];
  if (type === 'tool_route') return [...TOOL_ROUTE_LABELS];
  return ['true', 'false'];
}

function splitConfig(
  config: string,
  fieldKeys: string[]
): { parsed: Record<string, unknown>; rest: Record<string, unknown> } {
  const parsed = parseNodeConfig(config);
  const rest: Record<string, unknown> = {};
  Object.keys(parsed).forEach(key => {
    if (!KNOWN_CONFIG_KEYS.includes(key) && !fieldKeys.includes(key)) {
      rest[key] = parsed[key];
    }
  });
  return { parsed, rest };
}

interface NodeFlavorProps {
  node: AgentMakerNode;
  catalogEntry?: NodeCatalogEntry;
  configFields: NodeConfigField[];
  instructions: AgentMakerInstructionOption[];
  vendors: AgentMakerVendorOption[];
  getModelsForVendor?: (vendor: string) => Promise<string[]>;
  conditionOptions: ConditionOption[];
  strings: AgentMakerStrings;
  testId: string;
  onRename?: (name: string) => void;
  onConfigChange?: (config: string) => void;
  onSetEntryPoint?: () => void;
  onConditionalChange?: (
    conditional: NodeConditional | null,
    renames?: Record<string, string>
  ) => void;
  onDeleteNode?: () => void;
  onRequestCreateInstruction?: () => void;
  onSaveAsPreset?: () => void;
}

function NodeFlavor({
  node,
  catalogEntry,
  configFields,
  instructions,
  vendors,
  getModelsForVendor,
  conditionOptions,
  strings,
  testId,
  onRename,
  onConfigChange,
  onSetEntryPoint,
  onConditionalChange,
  onDeleteNode,
  onRequestCreateInstruction,
  onSaveAsPreset,
}: NodeFlavorProps) {
  const { parsed, rest } = useMemo(
    () =>
      splitConfig(
        node.config,
        configFields.map(f => f.key)
      ),
    [node.config, configFields]
  );

  const [rawDraft, setRawDraft] = useState(() => JSON.stringify(rest, null, 2));
  const [rawError, setRawError] = useState(false);

  const { vendorModels, loadModelsForVendor } =
    useVendorModels(getModelsForVendor);

  // Vendor + model, seeded from the canonical model_preference (falling back
  // to a legacy bare model_override string). The component remounts per node
  // (key={node.id}), so a one-time seed is enough.
  const [modelPref, setModelPref] = useState<{
    vendor: string;
    model: string;
  }>(() => {
    const mp = parsed.model_preference;
    if (mp && typeof mp === 'object' && !Array.isArray(mp)) {
      const { vendor, model } = mp as { vendor?: unknown; model?: unknown };
      return {
        vendor: typeof vendor === 'string' ? vendor : '',
        model: typeof model === 'string' ? model : '',
      };
    }
    return {
      vendor: '',
      model:
        typeof parsed.model_override === 'string' ? parsed.model_override : '',
    };
  });

  useEffect(() => {
    if (modelPref.vendor) void loadModelsForVendor(modelPref.vendor);
    // Seed-time load only — vendor changes load explicitly below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * model_preference {vendor, model} is the source of truth; the model is
   * mirrored into model_override, the key the graph runtime reads.
   */
  const applyModelPreference = (vendor: string, model: string) => {
    const trimmed = model.trim();
    if (vendor && trimmed) {
      updateConfig({
        model_preference: { vendor, model: trimmed },
        model_override: trimmed,
      });
    } else if (!vendor && trimmed) {
      // Legacy bare model string (no vendor known)
      updateConfig({ model_preference: undefined, model_override: trimmed });
    } else {
      updateConfig({ model_preference: undefined, model_override: undefined });
    }
  };

  const updateConfig = (patch: Record<string, unknown>) => {
    const next: Record<string, unknown> = { ...parsed };
    Object.keys(patch).forEach(key => {
      if (patch[key] === undefined) {
        delete next[key];
      } else {
        next[key] = patch[key];
      }
    });
    onConfigChange?.(JSON.stringify(next));
  };

  const instructionId =
    typeof parsed.instruction_id === 'string' ? parsed.instruction_id : '';
  const instructionVersion =
    typeof parsed.instruction_version === 'number'
      ? parsed.instruction_version
      : null;
  const inputTemplate =
    typeof parsed.input_template === 'string' ? parsed.input_template : '';
  const outputKey =
    typeof parsed.output_key === 'string' ? parsed.output_key : '';

  const selectedInstruction = instructions.find(i => i.id === instructionId);

  const selectInstruction = (id: string) => {
    const option = instructions.find(i => i.id === id);
    // Selecting an instruction always clears any legacy inline prompt.
    updateConfig({
      instruction_id: id,
      instruction_version:
        instructionVersion === null ? null : (option?.version ?? 1),
      system_prompt: undefined,
    });
  };

  const applyRawConfig = () => {
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(rawDraft || '{}');
    } catch {
      setRawError(true);
      return;
    }
    if (
      typeof parsedRaw !== 'object' ||
      parsedRaw === null ||
      Array.isArray(parsedRaw)
    ) {
      setRawError(true);
      return;
    }
    setRawError(false);
    const known: Record<string, unknown> = {};
    [...KNOWN_CONFIG_KEYS, ...configFields.map(f => f.key)].forEach(key => {
      if (key in parsed) known[key] = parsed[key];
    });
    onConfigChange?.(
      JSON.stringify({ ...known, ...(parsedRaw as Record<string, unknown>) })
    );
  };

  const conditional = node.conditional;
  const conditionKeyListId = `${testId}-condition-keys-${node.id}`;

  /** Editable (non-default) route labels of a `value` condition. */
  const valueRoutes = conditional
    ? conditional.routes.filter(label => label !== DEFAULT_ROUTE_LABEL)
    : [];
  const hasDefaultRoute =
    conditional?.routes.includes(DEFAULT_ROUTE_LABEL) ?? false;

  const changeConditionType = (value: string) => {
    if (!conditional) return;
    const type = value as ConditionType;
    if (type === conditional.type) return;
    let routes = conditional.routes;
    let key = conditional.key;
    if (type === 'tool_route') {
      routes = [...TOOL_ROUTE_LABELS];
      // The runtime ignores the key for tool_route; keep the serialized spec
      // self-describing.
      key = 'tool_calls';
    } else if (type !== 'value') {
      routes = ['true', 'false'];
    } else if (routes.length === 0) {
      routes = defaultRoutesFor('value');
    }
    // bool ↔ value keeps matching labels' edges (true/false survive as
    // value labels); everything else is dropped by the editor.
    onConditionalChange?.({ ...conditional, type, key, routes });
  };

  const changeConditionKey = (key: string) => {
    if (!conditional) return;
    const next: NodeConditional = { ...conditional, key };
    // Picking a suggestion adopts its type — but never silently discards a
    // custom value-route setup.
    const match = conditionOptions.find(o => o.key === key);
    if (
      match &&
      match.type !== conditional.type &&
      match.type !== 'value' &&
      conditional.type !== 'value'
    ) {
      next.type = match.type;
    }
    onConditionalChange?.(next);
  };

  const renameRoute = (oldLabel: string, newLabel: string) => {
    if (!conditional || newLabel === DEFAULT_ROUTE_LABEL) return;
    onConditionalChange?.(
      {
        ...conditional,
        routes: conditional.routes.map(l => (l === oldLabel ? newLabel : l)),
      },
      { [oldLabel]: newLabel }
    );
  };

  const addRoute = () => {
    if (!conditional) return;
    let n = valueRoutes.length + 1;
    while (conditional.routes.includes(`route${n}`)) n += 1;
    // The default route stays last.
    onConditionalChange?.({
      ...conditional,
      routes: [
        ...valueRoutes,
        `route${n}`,
        ...(hasDefaultRoute ? [DEFAULT_ROUTE_LABEL] : []),
      ],
    });
  };

  const removeRoute = (label: string) => {
    if (!conditional) return;
    onConditionalChange?.({
      ...conditional,
      routes: conditional.routes.filter(l => l !== label),
    });
  };

  const toggleDefaultRoute = (include: boolean) => {
    if (!conditional) return;
    onConditionalChange?.({
      ...conditional,
      routes: include
        ? [...valueRoutes, DEFAULT_ROUTE_LABEL]
        : [...valueRoutes],
    });
  };

  const hasPrompt = catalogEntry?.hasPrompt ?? false;

  const instructionSelectOptions = [
    // Keep an unknown stored id visible so the select doesn't silently blank
    ...(instructionId && !selectedInstruction
      ? [{ label: instructionId, value: instructionId }]
      : []),
    ...instructions.map(option => ({ label: option.name, value: option.id })),
    ...(onRequestCreateInstruction
      ? [
          {
            label: strings.createInstruction,
            value: '__create__',
            isCta: true,
            ctaAction: onRequestCreateInstruction,
          },
        ]
      : []),
  ];

  return (
    <>
      <InputTextWithHint
        hint={strings.nodeNameHint}
        value={node.name}
        onChange={e => onRename?.(e.target.value)}
        data-testid={`${testId}-name`}
      />

      <div className={styles.actions}>
        <PillButton
          label={strings.setAsEntryPoint}
          variant="secondary"
          disabled={node.isEntry}
          onClick={() => onSetEntryPoint?.()}
          data-testid={`${testId}-set-entry`}
        />
      </div>

      {hasPrompt && (
        <section className={styles.section}>
          <InputSelectWithHint
            hint={strings.instructionHint}
            placeholder={strings.instructionNone}
            value={instructionId}
            onChange={selectInstruction}
            options={instructionSelectOptions}
            data-testid={`${testId}-instruction`}
          />

          {instructionId && (
            <div className={styles.versionMode}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name={`${testId}-instruction-version-${node.id}`}
                  checked={instructionVersion === null}
                  onChange={() => updateConfig({ instruction_version: null })}
                  data-testid={`${testId}-follow-latest`}
                />
                {strings.followLatest}
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name={`${testId}-instruction-version-${node.id}`}
                  checked={instructionVersion !== null}
                  onChange={() =>
                    updateConfig({
                      instruction_version: selectedInstruction?.version ?? 1,
                    })
                  }
                  data-testid={`${testId}-pin-version`}
                />
                {strings.pinToVersion}
                {instructionVersion !== null && (
                  <input
                    className={styles.versionInput}
                    type="number"
                    min={1}
                    value={instructionVersion}
                    onChange={e =>
                      updateConfig({
                        instruction_version: Math.max(
                          1,
                          Number(e.target.value) || 1
                        ),
                      })
                    }
                    data-testid={`${testId}-version-input`}
                  />
                )}
              </label>
            </div>
          )}

          {selectedInstruction?.preview && (
            <details className={styles.expando}>
              <summary>{strings.previewToggle}</summary>
              <pre
                className={styles.previewText}
                data-testid={`${testId}-instruction-preview`}
              >
                {selectedInstruction.preview}
              </pre>
            </details>
          )}
        </section>
      )}

      <div className={styles.templateField}>
        <span className={styles.fieldLabel}>
          {strings.inputTemplateHint}{' '}
          <span className={styles.fieldLabelHint}>
            {strings.inputTemplateHelp}
          </span>
        </span>
        <TextEditor
          id={`${testId}-input-template-${node.id}`}
          value={inputTemplate}
          onChange={value =>
            updateConfig({ input_template: value || undefined })
          }
          disableCache={true}
          height="8rem"
          fullWidth
          data-testid={`${testId}-input-template`}
        />
      </div>

      <div className={styles.configRow}>
        <ModelPreferenceFields
          vendor={modelPref.vendor}
          model={modelPref.model}
          vendors={vendors}
          vendorModels={vendorModels}
          hasLoader={Boolean(getModelsForVendor)}
          allowBareModel
          onVendorChange={vendor => {
            setModelPref({ vendor, model: '' });
            if (vendor && !(vendor in vendorModels)) {
              void loadModelsForVendor(vendor);
            }
            applyModelPreference(vendor, '');
          }}
          onModelChange={model => {
            setModelPref(prev => ({ ...prev, model }));
            applyModelPreference(modelPref.vendor, model);
          }}
          strings={strings}
          testId={testId}
        />
      </div>

      {hasPrompt && (
        <div className={styles.templateField}>
          <InputTextWithHint
            hint={strings.outputKeyHint}
            value={outputKey}
            onChange={e =>
              updateConfig({ output_key: e.target.value || undefined })
            }
            data-testid={`${testId}-output-key`}
          />
          <span className={styles.fieldLabelHint}>{strings.outputKeyHelp}</span>
        </div>
      )}

      {configFields.map(field => {
        const raw = parsed[field.key];
        if (field.type === 'boolean') {
          return (
            <label key={field.key} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={raw === true}
                onChange={e =>
                  updateConfig({ [field.key]: e.target.checked || undefined })
                }
                data-testid={`${testId}-field-${field.key}`}
              />
              {field.label}
              {field.hint && (
                <span className={styles.fieldLabelHint}>{field.hint}</span>
              )}
            </label>
          );
        }
        const value =
          field.type === 'number'
            ? typeof raw === 'number'
              ? raw
              : ''
            : typeof raw === 'string'
              ? raw
              : '';
        return (
          <label key={field.key} className={styles.fieldLabel}>
            {field.label}
            <input
              className={styles.plainInput}
              type={field.type}
              value={value}
              min={field.min}
              max={field.max}
              step={field.type === 'number' ? 'any' : undefined}
              placeholder={field.placeholder}
              onChange={e => {
                if (field.type === 'number') {
                  const parsedNumber = Number(e.target.value);
                  updateConfig({
                    [field.key]:
                      e.target.value === '' || Number.isNaN(parsedNumber)
                        ? undefined
                        : parsedNumber,
                  });
                } else {
                  updateConfig({ [field.key]: e.target.value || undefined });
                }
              }}
              data-testid={`${testId}-field-${field.key}`}
            />
            {field.hint && (
              <span className={styles.fieldLabelHint}>{field.hint}</span>
            )}
          </label>
        );
      })}

      <details className={styles.expando}>
        <summary>{strings.rawConfigToggle}</summary>
        <textarea
          className={styles.rawTextarea}
          value={rawDraft}
          rows={6}
          onChange={e => setRawDraft(e.target.value)}
          data-testid={`${testId}-raw`}
        />
        {rawError && (
          <p
            className={`${styles.message} ${styles.error}`}
            data-testid={`${testId}-raw-error`}
          >
            {strings.rawConfigInvalid}
          </p>
        )}
        <div className={styles.actions}>
          <PillButton
            label={strings.rawConfigApply}
            variant="secondary"
            onClick={applyRawConfig}
            data-testid={`${testId}-raw-apply`}
          />
        </div>
      </details>

      <section className={styles.section}>
        <span className={styles.fieldLabel}>
          {strings.conditionSectionLabel}
        </span>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={conditional !== null}
            onChange={e => {
              if (!e.target.checked) {
                onConditionalChange?.(null);
                return;
              }
              // Seed from the first suggestion when available; arbitrary
              // keys are legal, so no suggestions is fine too.
              const first: ConditionOption | undefined = conditionOptions[0];
              const type = first?.type ?? 'bool';
              onConditionalChange?.({
                key: first?.key ?? '',
                type,
                routes: defaultRoutesFor(type),
              });
            }}
            data-testid={`${testId}-conditional-toggle`}
          />
          {strings.conditionEnable}
        </label>
        {conditional && (
          <>
            <InputSelectWithHint
              hint={strings.conditionTypeLabel}
              value={conditional.type}
              onChange={changeConditionType}
              options={[
                { label: strings.conditionTypeBool, value: 'bool' },
                { label: strings.conditionTypeListEmpty, value: 'list_empty' },
                { label: strings.conditionTypeValue, value: 'value' },
                { label: strings.conditionTypeToolRoute, value: 'tool_route' },
              ]}
              data-testid={`${testId}-condition-type`}
            />

            {/* tool_route inspects tool_calls directly — no condition key. */}
            {conditional.type !== 'tool_route' && (
              <label className={styles.fieldLabel}>
                {strings.conditionPickLabel}
                <input
                  className={styles.plainInput}
                  list={conditionKeyListId}
                  value={conditional.key}
                  onChange={e => changeConditionKey(e.target.value)}
                  data-testid={`${testId}-condition-key`}
                />
                <datalist id={conditionKeyListId}>
                  {conditionOptions.map(option => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </datalist>
              </label>
            )}

            {conditional.type === 'value' && (
              <>
                <span className={styles.fieldLabel}>
                  {strings.routeListLabel}
                </span>
                {valueRoutes.map((label, index) => (
                  <div
                    // Index keys keep focus stable while a label is typed.
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className={styles.routeRow}
                  >
                    <input
                      className={styles.plainInput}
                      value={label}
                      onChange={e => renameRoute(label, e.target.value)}
                      data-testid={`${testId}-route-${index}`}
                    />
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => removeRoute(label)}
                      disabled={conditional.routes.length <= 1}
                      aria-label={strings.removeRoute}
                      title={strings.removeRoute}
                      data-testid={`${testId}-route-${index}-remove`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={addRoute}
                  data-testid={`${testId}-route-add`}
                >
                  {strings.addRoute}
                </button>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={hasDefaultRoute}
                    onChange={e => toggleDefaultRoute(e.target.checked)}
                    data-testid={`${testId}-route-default-toggle`}
                  />
                  {strings.includeDefaultRoute}
                </label>
              </>
            )}
          </>
        )}
      </section>

      <div className={styles.actions}>
        {onSaveAsPreset && (
          <PillButton
            label={strings.saveAsPreset}
            variant="secondary"
            onClick={onSaveAsPreset}
            data-testid={`${testId}-save-preset`}
          />
        )}
        {onDeleteNode && (
          <PillButton
            label={strings.deleteNode}
            variant="danger"
            onClick={onDeleteNode}
            data-testid={`${testId}-delete`}
          />
        )}
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Agent flavor
// ───────────────────────────────────────────────────────────────────────────

interface AgentFlavorProps {
  editing: { agentId: string; initial: AgentMakerValues } | null;
  instructions: AgentMakerInstructionOption[];
  vendors: AgentMakerVendorOption[];
  getModelsForVendor?: (vendor: string) => Promise<string[]>;
  variableHints?: AgentMakerActionHint[];
  onSubmit?: (values: AgentMakerValues) => Promise<string | void>;
  onCancel?: () => void;
  strings: AgentMakerStrings;
  testId: string;
}

function AgentFlavor({
  editing,
  instructions,
  vendors,
  getModelsForVendor,
  variableHints,
  onSubmit,
  onCancel,
  strings,
  testId,
}: AgentFlavorProps) {
  const [form, setForm] = useState<AgentMakerValues>(
    editing?.initial ?? emptyAgentMakerValues()
  );
  const updateForm = (patch: Partial<AgentMakerValues>) =>
    setForm(prev => ({ ...prev, ...patch }));

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'success' | 'error' | null>(
    null
  );
  const { vendorModels, loadModelsForVendor } =
    useVendorModels(getModelsForVendor);

  // Sync the form with the agent the parent wants edited (or reset to create
  // mode when it clears).
  useEffect(() => {
    setMessage(null);
    setMessageKind(null);
    setForm(editing?.initial ?? emptyAgentMakerValues());
    if (editing?.initial.vendor)
      void loadModelsForVendor(editing.initial.vendor);
  }, [editing, loadModelsForVendor]);

  const handleSubmit = async () => {
    if (busy || !form.name.trim() || !form.instructionId || !onSubmit) return;
    if (form.vendor && !form.model.trim()) {
      setMessage(strings.modelRequired);
      setMessageKind('error');
      return;
    }
    setBusy(true);
    setMessage(null);
    setMessageKind(null);
    try {
      const result = await onSubmit({
        ...form,
        name: form.name.trim(),
        model: form.vendor ? form.model.trim() : '',
      });
      setMessage(result ?? strings.saved);
      setMessageKind('success');
    } catch (e) {
      setMessage(
        e instanceof Error && e.message ? e.message : strings.genericError
      );
      setMessageKind('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <InputTextWithHint
        hint={strings.nameHint}
        placeholder={strings.namePlaceholder}
        value={form.name}
        disabled={busy}
        onChange={e => updateForm({ name: e.target.value })}
        data-testid={`${testId}-name`}
      />

      <InputSelectWithHint
        hint={strings.instructionHint}
        placeholder={strings.instructionPlaceholder}
        value={form.instructionId}
        onChange={value => updateForm({ instructionId: value })}
        options={instructions.map(option => ({
          label: strings.instructionOption(option),
          value: option.id,
        }))}
        data-testid={`${testId}-instruction`}
      />

      <div className={styles.configRow}>
        <InputSelectWithHint
          hint={strings.outputFormatHint}
          value={form.outputFormat}
          onChange={value =>
            updateForm({ outputFormat: value === 'json' ? 'json' : 'text' })
          }
          options={[
            { label: strings.outputFormatText, value: 'text' },
            { label: strings.outputFormatJson, value: 'json' },
          ]}
          className={styles.outputFormat}
          data-testid={`${testId}-output-format`}
        />
        <ModelPreferenceFields
          vendor={form.vendor}
          model={form.model}
          vendors={vendors}
          vendorModels={vendorModels}
          hasLoader={Boolean(getModelsForVendor)}
          disabled={busy}
          onVendorChange={value => {
            updateForm({ vendor: value, model: '' });
            if (value && !(value in vendorModels)) {
              void loadModelsForVendor(value);
            }
          }}
          onModelChange={model => updateForm({ model })}
          strings={strings}
          testId={testId}
        />
      </div>

      <div className={styles.templateField}>
        <span className={styles.fieldLabel}>
          {strings.inputTemplateHint}{' '}
          <span className={styles.fieldLabelHint}>
            {strings.inputTemplatePlaceholder}
          </span>
        </span>
        <TextEditor
          id={`${testId}-input-template`}
          value={form.inputTemplate}
          onChange={value => updateForm({ inputTemplate: value })}
          disableCache={true}
          height="8rem"
          readOnly={busy}
          fullWidth
          data-testid={`${testId}-input-template`}
        />
      </div>

      {variableHints && variableHints.length > 0 && (
        <div className={styles.hints} data-testid={`${testId}-hints`}>
          {strings.hintsTitle}
          {variableHints.map(hint => (
            <div key={hint.action} className={styles.hintRow}>
              <strong>{hint.action}</strong>: {hint.variables.join(', ')}
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <PillButton
          label={
            busy
              ? strings.submitting
              : editing
                ? strings.submitEdit
                : strings.submitCreate
          }
          disabled={busy || !form.name.trim() || !form.instructionId}
          onClick={() => void handleSubmit()}
          data-testid={`${testId}-submit`}
        />
        {onCancel && (
          <PillButton
            label={strings.cancel}
            variant="secondary"
            disabled={busy}
            onClick={onCancel}
            data-testid={`${testId}-cancel`}
          />
        )}
      </div>

      {message && (
        <div
          className={`${styles.message} ${
            messageKind === 'error' ? styles.error : styles.success
          }`}
          data-testid={`${testId}-message`}
        >
          {message}
        </div>
      )}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Shell
// ───────────────────────────────────────────────────────────────────────────

/**
 * Agent configuration form with two flavors sharing one shell (full-width
 * card, full-page toggle, open-in-new-tab):
 *
 * - **Agent flavor** (default): standalone create/edit form for
 *   prompt-template agents — instruction, output format, vendor/model
 *   preference, input template — with a submit lifecycle via `onSubmit`.
 * - **Node flavor** (pass `node`): settings editor for a graph-editor node.
 *   The visible fields adapt to the node's type (`catalogEntry.hasPrompt`,
 *   `configFields`): name, entry point, instruction with version pinning and
 *   preview, input template, model override, output key, type-declared
 *   fields, raw-JSON config, conditional routing, save-as-preset and delete.
 *   Changes apply immediately through the node callbacks.
 *
 * Purely presentational: instruction/model listing and persistence are the
 * caller's job via props and async callbacks.
 */
export default function AgentMaker({
  editing = null,
  instructions = [],
  vendors = [],
  getModelsForVendor,
  variableHints,
  onSubmit,
  onCancel,
  node,
  catalogEntry,
  configFields = [],
  conditionOptions = [],
  onRename,
  onConfigChange,
  onSetEntryPoint,
  onConditionalChange,
  onDeleteNode,
  onRequestCreateInstruction,
  onSaveAsPreset,
  newTabHref,
  strings: stringOverrides,
  className = '',
  'data-testid': testId = 'agent-maker',
}: AgentMakerProps) {
  const strings = { ...DEFAULT_STRINGS, ...stringOverrides };

  const [fullHeight, setFullHeight] = useState(false);

  // Escape leaves full-page mode
  useEffect(() => {
    if (!fullHeight) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullHeight(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullHeight]);

  const title = node
    ? strings.nodeSettingsTitle
    : editing
      ? strings.titleEdit(editing.agentId)
      : strings.titleCreate;

  return (
    <div
      className={`${styles.formCard} ${fullHeight ? styles.fullHeight : ''} ${className}`}
      data-testid={testId}
    >
      <div className={styles.header}>
        <h4 className={styles.title} data-testid={`${testId}-title`}>
          {title}
        </h4>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setFullHeight(prev => !prev)}
            aria-pressed={fullHeight}
            aria-label={
              fullHeight ? strings.exitFullHeight : strings.enterFullHeight
            }
            title={
              fullHeight ? strings.exitFullHeight : strings.enterFullHeight
            }
            data-testid={`${testId}-toggle-height`}
          >
            {fullHeight ? '⤡' : '⤢'}
          </button>
          {newTabHref && (
            <a
              href={newTabHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.iconBtn}
              aria-label={strings.openInNewTab}
              title={strings.openInNewTab}
              data-testid={`${testId}-new-tab`}
            >
              ↗
            </a>
          )}
        </div>
      </div>

      {node ? (
        <NodeFlavor
          node={node}
          catalogEntry={catalogEntry}
          configFields={configFields}
          instructions={instructions}
          vendors={vendors}
          getModelsForVendor={getModelsForVendor}
          conditionOptions={conditionOptions}
          strings={strings}
          testId={testId}
          onRename={onRename}
          onConfigChange={onConfigChange}
          onSetEntryPoint={onSetEntryPoint}
          onConditionalChange={onConditionalChange}
          onDeleteNode={onDeleteNode}
          onRequestCreateInstruction={onRequestCreateInstruction}
          onSaveAsPreset={onSaveAsPreset}
        />
      ) : (
        <AgentFlavor
          editing={editing}
          instructions={instructions}
          vendors={vendors}
          getModelsForVendor={getModelsForVendor}
          variableHints={variableHints}
          onSubmit={onSubmit}
          onCancel={onCancel}
          strings={strings}
          testId={testId}
        />
      )}
    </div>
  );
}
