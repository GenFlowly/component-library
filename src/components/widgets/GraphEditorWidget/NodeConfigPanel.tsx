import React, { useMemo, useState } from 'react';
import styles from './GraphEditor.module.scss';
import { parseNodeConfig } from './serialization';
import {
  AgentFlowNode,
  ConditionOption,
  ConditionType,
  DEFAULT_ROUTE_LABEL,
  GraphEditorLabels,
  InstructionOption,
  NodeCatalogEntry,
  NodeConfigField,
  NodeConditional,
  TOOL_ROUTE_LABELS,
} from './types';

/** Config keys the panel edits with dedicated fields; everything else is "raw". */
const KNOWN_CONFIG_KEYS = [
  'instruction_id',
  'instruction_version',
  'system_prompt',
  'input_template',
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
): {
  parsed: Record<string, unknown>;
  rest: Record<string, unknown>;
} {
  const parsed = parseNodeConfig(config);
  const rest: Record<string, unknown> = {};
  Object.keys(parsed).forEach(key => {
    if (!KNOWN_CONFIG_KEYS.includes(key) && !fieldKeys.includes(key)) {
      rest[key] = parsed[key];
    }
  });
  return { parsed, rest };
}

interface NodeConfigPanelProps {
  node: AgentFlowNode;
  isEntry: boolean;
  catalogEntry?: NodeCatalogEntry;
  /** Dedicated inputs for type/preset-declared config keys. */
  configFields?: NodeConfigField[];
  instructions: InstructionOption[];
  conditionOptions: ConditionOption[];
  labels: GraphEditorLabels;
  onRename: (name: string) => void;
  onConfigChange: (config: string) => void;
  onSetEntryPoint: () => void;
  /**
   * `renames` maps old route labels to new ones so the editor can rewire
   * (rather than drop) the edges of renamed routes.
   */
  onConditionalChange: (
    conditional: NodeConditional | null,
    renames?: Record<string, string>
  ) => void;
  onDelete: () => void;
  onRequestCreateInstruction?: () => void;
  onSaveAsPreset?: () => void;
}

/**
 * Right-hand side panel for the selected node: name, entry-point action,
 * instruction selection (with latest/pinned version), template/model fields,
 * a raw-JSON editor for unknown config keys, conditional routing and delete.
 *
 * Mount with `key={node.id}` so per-node local state (search text, raw JSON
 * draft) resets when the selection changes.
 */
export default function NodeConfigPanel({
  node,
  isEntry,
  catalogEntry,
  configFields = [],
  instructions,
  conditionOptions,
  labels,
  onRename,
  onConfigChange,
  onSetEntryPoint,
  onConditionalChange,
  onDelete,
  onRequestCreateInstruction,
  onSaveAsPreset,
}: NodeConfigPanelProps) {
  const { parsed, rest } = useMemo(
    () =>
      splitConfig(
        node.data.config,
        configFields.map(f => f.key)
      ),
    [node.data.config, configFields]
  );

  const [instructionSearch, setInstructionSearch] = useState('');
  const [instructionListOpen, setInstructionListOpen] = useState(false);
  const [rawDraft, setRawDraft] = useState(() => JSON.stringify(rest, null, 2));
  const [rawError, setRawError] = useState(false);

  const updateConfig = (patch: Record<string, unknown>) => {
    const next: Record<string, unknown> = { ...parsed };
    Object.keys(patch).forEach(key => {
      if (patch[key] === undefined) {
        delete next[key];
      } else {
        next[key] = patch[key];
      }
    });
    onConfigChange(JSON.stringify(next));
  };

  const instructionId =
    typeof parsed.instruction_id === 'string' ? parsed.instruction_id : '';
  const instructionVersion =
    typeof parsed.instruction_version === 'number'
      ? parsed.instruction_version
      : null;
  const inputTemplate =
    typeof parsed.input_template === 'string' ? parsed.input_template : '';
  const modelOverride =
    typeof parsed.model_override === 'string' ? parsed.model_override : '';
  const outputKey =
    typeof parsed.output_key === 'string' ? parsed.output_key : '';

  const selectedInstruction = instructions.find(
    i => i.instructionId === instructionId
  );
  const filteredInstructions = useMemo(() => {
    const query = instructionSearch.trim().toLowerCase();
    if (!query) return instructions;
    return instructions.filter(i => i.name.toLowerCase().includes(query));
  }, [instructions, instructionSearch]);

  const selectInstruction = (option: InstructionOption) => {
    // Selecting an instruction always clears any legacy inline prompt.
    updateConfig({
      instruction_id: option.instructionId,
      instruction_version:
        instructionVersion === null ? null : (option.latestVersion ?? 1),
      system_prompt: undefined,
    });
    setInstructionListOpen(false);
    setInstructionSearch('');
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
    onConfigChange(
      JSON.stringify({ ...known, ...(parsedRaw as Record<string, unknown>) })
    );
  };

  const conditional = node.data.conditional;
  const conditionKeyListId = `graph-editor-condition-keys-${node.id}`;

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
    onConditionalChange({ ...conditional, type, key, routes });
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
    onConditionalChange(next);
  };

  const renameRoute = (oldLabel: string, newLabel: string) => {
    if (!conditional || newLabel === DEFAULT_ROUTE_LABEL) return;
    onConditionalChange(
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
    onConditionalChange({
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
    onConditionalChange({
      ...conditional,
      routes: conditional.routes.filter(l => l !== label),
    });
  };

  const toggleDefaultRoute = (include: boolean) => {
    if (!conditional) return;
    onConditionalChange({
      ...conditional,
      routes: include
        ? [...valueRoutes, DEFAULT_ROUTE_LABEL]
        : [...valueRoutes],
    });
  };

  return (
    <aside
      className={styles.configPanel}
      data-testid="graph-editor-config-panel"
    >
      <div className={styles.configTitle}>{labels.configTitle}</div>

      <label className={styles.fieldLabel}>
        {labels.nodeNameLabel}
        <input
          className={styles.fieldInput}
          value={node.data.name}
          onChange={e => onRename(e.target.value)}
          data-testid="graph-editor-config-name"
        />
      </label>

      <button
        type="button"
        className={styles.secondaryButton}
        onClick={onSetEntryPoint}
        disabled={isEntry}
        data-testid="graph-editor-config-set-entry"
      >
        {labels.setAsEntryPoint}
      </button>

      {catalogEntry?.hasPrompt && (
        <section className={styles.configSection}>
          <div className={styles.fieldLabel}>{labels.instructionLabel}</div>
          <button
            type="button"
            className={styles.instructionSelected}
            onClick={() => setInstructionListOpen(open => !open)}
            data-testid="graph-editor-config-instruction-toggle"
          >
            {selectedInstruction?.name ??
              (instructionId || labels.instructionNone)}
          </button>
          {instructionListOpen && (
            <div className={styles.instructionDropdown}>
              <input
                className={styles.fieldInput}
                type="search"
                value={instructionSearch}
                placeholder={labels.instructionSearchPlaceholder}
                onChange={e => setInstructionSearch(e.target.value)}
                data-testid="graph-editor-config-instruction-search"
              />
              <ul className={styles.instructionList}>
                {filteredInstructions.length === 0 && (
                  <li className={styles.instructionEmpty}>
                    {labels.instructionEmpty}
                  </li>
                )}
                {filteredInstructions.map(option => (
                  <li key={option.instructionId}>
                    <button
                      type="button"
                      className={styles.instructionOption}
                      onClick={() => selectInstruction(option)}
                      data-testid={`graph-editor-config-instruction-${option.instructionId}`}
                    >
                      {option.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {instructionId && (
            <div className={styles.versionMode}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name={`instruction-version-${node.id}`}
                  checked={instructionVersion === null}
                  onChange={() => updateConfig({ instruction_version: null })}
                  data-testid="graph-editor-config-follow-latest"
                />
                {labels.followLatest}
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name={`instruction-version-${node.id}`}
                  checked={instructionVersion !== null}
                  onChange={() =>
                    updateConfig({
                      instruction_version:
                        selectedInstruction?.latestVersion ?? 1,
                    })
                  }
                  data-testid="graph-editor-config-pin-version"
                />
                {labels.pinToVersion}
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
                    data-testid="graph-editor-config-version-input"
                  />
                )}
              </label>
            </div>
          )}

          {selectedInstruction?.preview && (
            <details className={styles.expando}>
              <summary>{labels.previewToggle}</summary>
              <pre
                className={styles.previewText}
                data-testid="graph-editor-config-instruction-preview"
              >
                {selectedInstruction.preview}
              </pre>
            </details>
          )}

          {onRequestCreateInstruction && (
            <button
              type="button"
              className={styles.linkButton}
              onClick={onRequestCreateInstruction}
              data-testid="graph-editor-config-create-instruction"
            >
              {labels.createInstruction}
            </button>
          )}
        </section>
      )}

      <label className={styles.fieldLabel}>
        {labels.inputTemplateLabel}
        <textarea
          className={styles.fieldTextarea}
          value={inputTemplate}
          rows={3}
          onChange={e =>
            updateConfig({ input_template: e.target.value || undefined })
          }
          data-testid="graph-editor-config-input-template"
        />
        <span className={styles.hintText}>{labels.inputTemplateHint}</span>
      </label>

      <label className={styles.fieldLabel}>
        {labels.modelOverrideLabel}
        <input
          className={styles.fieldInput}
          value={modelOverride}
          onChange={e =>
            updateConfig({ model_override: e.target.value || undefined })
          }
          data-testid="graph-editor-config-model-override"
        />
      </label>

      {catalogEntry?.hasPrompt && (
        <label className={styles.fieldLabel}>
          {labels.outputKeyLabel}
          <input
            className={styles.fieldInput}
            value={outputKey}
            onChange={e =>
              updateConfig({ output_key: e.target.value || undefined })
            }
            data-testid="graph-editor-config-output-key"
          />
          <span className={styles.hintText}>{labels.outputKeyHint}</span>
        </label>
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
                data-testid={`graph-editor-config-field-${field.key}`}
              />
              {field.label}
              {field.hint && (
                <span className={styles.hintText}>{field.hint}</span>
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
              className={styles.fieldInput}
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
              data-testid={`graph-editor-config-field-${field.key}`}
            />
            {field.hint && (
              <span className={styles.hintText}>{field.hint}</span>
            )}
          </label>
        );
      })}

      <details className={styles.expando}>
        <summary>{labels.rawConfigToggle}</summary>
        <textarea
          className={`${styles.fieldTextarea} ${styles.rawConfigTextarea}`}
          value={rawDraft}
          rows={6}
          onChange={e => setRawDraft(e.target.value)}
          data-testid="graph-editor-config-raw"
        />
        {rawError && (
          <p
            className={styles.errorText}
            data-testid="graph-editor-config-raw-error"
          >
            {labels.rawConfigInvalid}
          </p>
        )}
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={applyRawConfig}
          data-testid="graph-editor-config-raw-apply"
        >
          {labels.rawConfigApply}
        </button>
      </details>

      <section className={styles.configSection}>
        <div className={styles.fieldLabel}>{labels.conditionSectionLabel}</div>
        <label className={styles.radioLabel}>
          <input
            type="checkbox"
            checked={conditional !== null}
            onChange={e => {
              if (!e.target.checked) {
                onConditionalChange(null);
                return;
              }
              // Seed from the first suggestion when available; arbitrary
              // keys are legal, so no suggestions is fine too.
              const first: ConditionOption | undefined = conditionOptions[0];
              const type = first?.type ?? 'bool';
              onConditionalChange({
                key: first?.key ?? '',
                type,
                routes: defaultRoutesFor(type),
              });
            }}
            data-testid="graph-editor-config-conditional-toggle"
          />
          {labels.conditionEnable}
        </label>
        {conditional && (
          <>
            <label className={styles.fieldLabel}>
              {labels.conditionTypeLabel}
              <select
                className={styles.fieldInput}
                value={conditional.type}
                onChange={e => changeConditionType(e.target.value)}
                data-testid="graph-editor-config-condition-type"
              >
                <option value="bool">{labels.conditionTypeBool}</option>
                <option value="list_empty">
                  {labels.conditionTypeListEmpty}
                </option>
                <option value="value">{labels.conditionTypeValue}</option>
                <option value="tool_route">
                  {labels.conditionTypeToolRoute}
                </option>
              </select>
            </label>

            {/* tool_route inspects tool_calls directly — no condition key. */}
            {conditional.type !== 'tool_route' && (
              <label className={styles.fieldLabel}>
                {labels.conditionPickLabel}
                <input
                  className={styles.fieldInput}
                  list={conditionKeyListId}
                  value={conditional.key}
                  onChange={e => changeConditionKey(e.target.value)}
                  data-testid="graph-editor-config-condition-key"
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
                <div className={styles.fieldLabel}>{labels.routeListLabel}</div>
                {valueRoutes.map((label, index) => (
                  <div
                    // Index keys keep focus stable while a label is typed.
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    className={styles.routeRow}
                  >
                    <input
                      className={styles.fieldInput}
                      value={label}
                      onChange={e => renameRoute(label, e.target.value)}
                      data-testid={`graph-editor-config-route-${index}`}
                    />
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => removeRoute(label)}
                      disabled={conditional.routes.length <= 1}
                      aria-label={labels.removeRoute}
                      title={labels.removeRoute}
                      data-testid={`graph-editor-config-route-${index}-remove`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={addRoute}
                  data-testid="graph-editor-config-route-add"
                >
                  {labels.addRoute}
                </button>
                <label className={styles.radioLabel}>
                  <input
                    type="checkbox"
                    checked={hasDefaultRoute}
                    onChange={e => toggleDefaultRoute(e.target.checked)}
                    data-testid="graph-editor-config-route-default-toggle"
                  />
                  {labels.includeDefaultRoute}
                </label>
              </>
            )}
          </>
        )}
      </section>

      {onSaveAsPreset && (
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onSaveAsPreset}
          data-testid="graph-editor-config-save-preset"
        >
          {labels.saveAsPreset}
        </button>
      )}

      <button
        type="button"
        className={styles.dangerButton}
        onClick={onDelete}
        data-testid="graph-editor-config-delete"
      >
        {labels.deleteNode}
      </button>
    </aside>
  );
}
