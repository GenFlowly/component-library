import React, { useMemo, useState } from 'react';
import styles from './GraphEditor.module.scss';
import { parseNodeConfig } from './serialization';
import {
  AgentFlowNode,
  ConditionOption,
  GraphEditorLabels,
  InstructionOption,
  NodeCatalogEntry,
} from './types';

/** Config keys the panel edits with dedicated fields; everything else is "raw". */
const KNOWN_CONFIG_KEYS = [
  'instruction_id',
  'instruction_version',
  'system_prompt',
  'input_template',
  'model_override',
];

function splitConfig(config: string): {
  parsed: Record<string, unknown>;
  rest: Record<string, unknown>;
} {
  const parsed = parseNodeConfig(config);
  const rest: Record<string, unknown> = {};
  Object.keys(parsed).forEach(key => {
    if (!KNOWN_CONFIG_KEYS.includes(key)) rest[key] = parsed[key];
  });
  return { parsed, rest };
}

interface NodeConfigPanelProps {
  node: AgentFlowNode;
  isEntry: boolean;
  catalogEntry?: NodeCatalogEntry;
  instructions: InstructionOption[];
  conditionOptions: ConditionOption[];
  labels: GraphEditorLabels;
  onRename: (name: string) => void;
  onConfigChange: (config: string) => void;
  onSetEntryPoint: () => void;
  onConditionalChange: (option: ConditionOption | null) => void;
  onDelete: () => void;
  onRequestCreateInstruction?: () => void;
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
  instructions,
  conditionOptions,
  labels,
  onRename,
  onConfigChange,
  onSetEntryPoint,
  onConditionalChange,
  onDelete,
  onRequestCreateInstruction,
}: NodeConfigPanelProps) {
  const { parsed, rest } = useMemo(
    () => splitConfig(node.data.config),
    [node.data.config]
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
    KNOWN_CONFIG_KEYS.forEach(key => {
      if (key in parsed) known[key] = parsed[key];
    });
    onConfigChange(
      JSON.stringify({ ...known, ...(parsedRaw as Record<string, unknown>) })
    );
  };

  const conditional = node.data.conditional;

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
            onChange={e =>
              onConditionalChange(
                e.target.checked ? (conditionOptions[0] ?? null) : null
              )
            }
            disabled={conditionOptions.length === 0}
            data-testid="graph-editor-config-conditional-toggle"
          />
          {labels.conditionEnable}
        </label>
        {conditional && (
          <label className={styles.fieldLabel}>
            {labels.conditionPickLabel}
            <select
              className={styles.fieldInput}
              value={conditional.key}
              onChange={e => {
                const option = conditionOptions.find(
                  c => c.key === e.target.value
                );
                if (option) onConditionalChange(option);
              }}
              data-testid="graph-editor-config-condition-select"
            >
              {conditionOptions.map(option => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

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
