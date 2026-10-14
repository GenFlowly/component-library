import React, { useEffect, useState } from 'react';
import styles from './VendorApiKeysManager.module.scss';
import PillButton from '../../common/PillButton/PillButton';
import { InputTextWithHint } from '../../common/InputTextWithHint/InputTextWithHint';
import { InputSelectWithHint } from '../../common/InputSelectWithHint/InputSelectWithHint';
import {
  CredentialCard,
  CredentialStatusPill,
} from '../../common/CredentialCard/CredentialCard';

export interface VendorApiKeyRowData {
  /** Stable vendor id (e.g. "OPENAI") reported back through the callbacks. */
  vendor: string;
  /** Vendor display label — plain text or a brand component. */
  label: React.ReactNode;
  /** Whether a valid key is currently stored for the vendor. */
  keySet: boolean;
  /**
   * Stored default reasoning effort for this vendor ('' / undefined = vendor
   * default; else "none"|"low"|"medium"|"high"), used to prefill the select.
   */
  savedThinkingLevel?: string;
  /** Stored model selection, used to prefill the model dropdown. */
  savedModel?: string | null;
  /** Stored failover priority (1 = primary), used to prefill the dropdown. */
  savedPriority?: number | null;
  /** Models selectable for this vendor. */
  models?: string[];
  /** Renders the model dropdown in a loading state. */
  modelsLoading?: boolean;
}

export interface VendorKeySaveResult {
  success: boolean;
  /** Message shown under the row; falls back to the default strings. */
  message?: string;
}

export interface VendorApiKeysManagerStrings {
  keySetPill: string;
  keyNotSetPill: string;
  priorityPill: (priority: number) => string;
  keyHint: string;
  keyPlaceholder: string;
  keyReplacePlaceholder: string;
  saveKey: string;
  removeKey: string;
  saving: string;
  keySaved: string;
  keyRejected: string;
  keyEmpty: string;
  keyRemoved: string;
  modelHint: string;
  modelPlaceholder: string;
  modelsLoadingPlaceholder: string;
  reasoningHint: string;
  reasoningDefaultOption: string;
  reasoningNone: string;
  reasoningLow: string;
  reasoningMedium: string;
  reasoningHigh: string;
  priorityHint: string;
  priorityPlaceholder: string;
  saveConfig: string;
  configSaved: (model: string, priority: number) => string;
  genericError: string;
}

const DEFAULT_STRINGS: VendorApiKeysManagerStrings = {
  keySetPill: 'Key set',
  keyNotSetPill: 'Not set',
  priorityPill: priority => `Priority ${priority}`,
  keyHint: 'API Key',
  keyPlaceholder: 'Enter API key…',
  keyReplacePlaceholder: 'Replace key…',
  saveKey: 'Save',
  removeKey: 'Remove',
  saving: 'Saving…',
  keySaved: 'Key validated and saved',
  keyRejected: 'Key rejected by vendor — not saved',
  keyEmpty: 'Enter an API key first',
  keyRemoved: 'Key removed',
  modelHint: 'Model',
  modelPlaceholder: 'Select a model…',
  modelsLoadingPlaceholder: 'Loading models…',
  reasoningHint: 'Reasoning effort',
  reasoningDefaultOption: 'Vendor default',
  reasoningNone: 'None (fastest)',
  reasoningLow: 'Low',
  reasoningMedium: 'Medium',
  reasoningHigh: 'High',
  priorityHint: 'Priority',
  priorityPlaceholder: '—',
  saveConfig: 'Save configuration',
  configSaved: (model, priority) => `Saved: ${model} at priority ${priority}`,
  genericError: 'Something went wrong',
};

export interface VendorApiKeysManagerProps {
  /** One card per vendor, rendered in order. */
  rows: VendorApiKeyRowData[];
  /**
   * Persist a key. Resolve `{success:false}` (optionally with a message) for
   * a vendor-rejected key; throw for transport errors.
   */
  onSaveKey: (vendor: string, apiKey: string) => Promise<VendorKeySaveResult>;
  /**
   * Remove a stored key. Omit to hide the remove button. Resolve `false` to
   * signal the removal was cancelled (e.g. a declined confirm dialog) — no
   * message is shown then.
   */
  onDeleteKey?: (vendor: string) => Promise<void | boolean>;
  /**
   * Persist the model + failover priority (+ default reasoning effort; '' =
   * vendor default) for a keyed vendor. Omit to hide the whole configuration
   * row.
   */
  onSaveConfig?: (
    vendor: string,
    model: string,
    priority: number,
    thinkingLevel: string
  ) => Promise<void>;
  /** Overrides for the built-in English strings (i18n hook-in point). */
  strings?: Partial<VendorApiKeysManagerStrings>;
  /** Base test id; rows derive `-<vendor>-…` suffixed ids. */
  'data-testid'?: string;
}

type RowState = {
  keyInput: string;
  busy: boolean;
  message: string | null;
  messageKind: 'success' | 'error' | null;
  selectedModel: string;
  priority: string;
  thinkingLevel: string;
  savingConfig: boolean;
};

const emptyRowState = (): RowState => ({
  keyInput: '',
  busy: false,
  message: null,
  messageKind: null,
  selectedModel: '',
  priority: '',
  thinkingLevel: '',
  savingConfig: false,
});

/**
 * Per-vendor AI API key management cards: store/replace (and optionally
 * remove) a key, and — once a key is set — pick the model and failover
 * priority used for that vendor. Purely presentational: persistence,
 * validation and model listing are the caller's job via the async callbacks,
 * so the same UI serves both system-wide (admin) and per-customer settings.
 */
export default function VendorApiKeysManager({
  rows,
  onSaveKey,
  onDeleteKey,
  onSaveConfig,
  strings: stringOverrides,
  'data-testid': testId = 'vendor-api-keys',
}: VendorApiKeysManagerProps) {
  const strings = { ...DEFAULT_STRINGS, ...stringOverrides };
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  const stateFor = (vendor: string): RowState =>
    rowStates[vendor] ?? emptyRowState();

  const updateRow = (vendor: string, patch: Partial<RowState>) =>
    setRowStates(prev => ({
      ...prev,
      [vendor]: { ...(prev[vendor] ?? emptyRowState()), ...patch },
    }));

  // Seed the dropdowns with the stored config (without clobbering edits)
  useEffect(() => {
    setRowStates(prev => {
      const next = { ...prev };
      rows.forEach(row => {
        const current = next[row.vendor] ?? emptyRowState();
        next[row.vendor] = {
          ...current,
          selectedModel: current.selectedModel || row.savedModel || '',
          priority:
            current.priority ||
            (row.savedPriority != null ? String(row.savedPriority) : ''),
          thinkingLevel: current.thinkingLevel || row.savedThinkingLevel || '',
        };
      });
      return next;
    });
  }, [rows]);

  const errorMessage = (e: unknown) =>
    e instanceof Error && e.message ? e.message : strings.genericError;

  const handleSaveKey = async (vendor: string) => {
    const key = stateFor(vendor).keyInput.trim();
    if (!key) {
      updateRow(vendor, { message: strings.keyEmpty, messageKind: 'error' });
      return;
    }
    updateRow(vendor, { busy: true, message: null, messageKind: null });
    try {
      const result = await onSaveKey(vendor, key);
      if (result.success) {
        updateRow(vendor, {
          busy: false,
          keyInput: '',
          message: result.message ?? strings.keySaved,
          messageKind: 'success',
        });
      } else {
        updateRow(vendor, {
          busy: false,
          message: result.message ?? strings.keyRejected,
          messageKind: 'error',
        });
      }
    } catch (e) {
      updateRow(vendor, {
        busy: false,
        message: errorMessage(e),
        messageKind: 'error',
      });
    }
  };

  const handleDeleteKey = async (vendor: string) => {
    if (!onDeleteKey) return;
    updateRow(vendor, { busy: true, message: null, messageKind: null });
    try {
      const result = await onDeleteKey(vendor);
      if (result === false) {
        updateRow(vendor, { busy: false });
        return;
      }
      updateRow(vendor, {
        busy: false,
        message: strings.keyRemoved,
        messageKind: 'success',
        selectedModel: '',
        priority: '',
        thinkingLevel: '',
      });
    } catch (e) {
      updateRow(vendor, {
        busy: false,
        message: errorMessage(e),
        messageKind: 'error',
      });
    }
  };

  const handleSaveConfig = async (vendor: string) => {
    if (!onSaveConfig) return;
    const row = stateFor(vendor);
    if (!row.selectedModel || !row.priority) return;
    updateRow(vendor, { savingConfig: true, message: null, messageKind: null });
    try {
      await onSaveConfig(
        vendor,
        row.selectedModel,
        Number(row.priority),
        row.thinkingLevel
      );
      updateRow(vendor, {
        savingConfig: false,
        message: strings.configSaved(row.selectedModel, Number(row.priority)),
        messageKind: 'success',
      });
    } catch (e) {
      updateRow(vendor, {
        savingConfig: false,
        message: errorMessage(e),
        messageKind: 'error',
      });
    }
  };

  const priorityOptions = rows.map((_, i) => ({
    label: String(i + 1),
    value: String(i + 1),
  }));

  return (
    <div className={styles.vendorList} data-testid={testId}>
      {rows.map(row => {
        const state = stateFor(row.vendor);
        const rowId = `${testId}-${row.vendor}`;
        const configDirty =
          state.selectedModel !== (row.savedModel ?? '') ||
          state.priority !==
            (row.savedPriority != null ? String(row.savedPriority) : '') ||
          state.thinkingLevel !== (row.savedThinkingLevel ?? '');
        const models = row.models ?? [];
        const modelOptions = [
          // Keep a stored model visible even if it's missing from the
          // currently fetched list
          ...(state.selectedModel && !models.includes(state.selectedModel)
            ? [{ label: state.selectedModel, value: state.selectedModel }]
            : []),
          ...models.map(model => ({ label: model, value: model })),
        ];
        return (
          <CredentialCard
            key={row.vendor}
            data-testid={rowId}
            label={row.label}
            pills={
              <>
                {row.keySet && row.savedPriority != null && (
                  <CredentialStatusPill
                    kind="neutral"
                    data-testid={`${rowId}-priority-pill`}
                  >
                    {strings.priorityPill(row.savedPriority)}
                  </CredentialStatusPill>
                )}
                <CredentialStatusPill
                  kind={row.keySet ? 'ok' : 'unset'}
                  data-testid={`${rowId}-status-pill`}
                >
                  {row.keySet ? strings.keySetPill : strings.keyNotSetPill}
                </CredentialStatusPill>
              </>
            }
            message={state.message}
            messageKind={state.messageKind}
          >
            <div className={styles.keyRow}>
              <InputTextWithHint
                hint={strings.keyHint}
                type="password"
                placeholder={
                  row.keySet
                    ? strings.keyReplacePlaceholder
                    : strings.keyPlaceholder
                }
                value={state.keyInput}
                disabled={state.busy}
                onChange={e =>
                  updateRow(row.vendor, { keyInput: e.target.value })
                }
                className={styles.keyInput}
                data-testid={`${rowId}-key-input`}
              />
              <PillButton
                label={state.busy ? strings.saving : strings.saveKey}
                disabled={state.busy || !state.keyInput.trim()}
                onClick={() => void handleSaveKey(row.vendor)}
                data-testid={`${rowId}-save-key`}
              />
              {row.keySet && onDeleteKey && (
                <PillButton
                  label={strings.removeKey}
                  variant="danger"
                  disabled={state.busy}
                  onClick={() => void handleDeleteKey(row.vendor)}
                  data-testid={`${rowId}-remove-key`}
                />
              )}
            </div>

            {row.keySet && onSaveConfig && (
              <div className={styles.configRow} data-testid={`${rowId}-config`}>
                <InputSelectWithHint
                  hint={strings.modelHint}
                  placeholder={
                    row.modelsLoading
                      ? strings.modelsLoadingPlaceholder
                      : strings.modelPlaceholder
                  }
                  value={state.selectedModel}
                  onChange={value =>
                    updateRow(row.vendor, { selectedModel: value })
                  }
                  options={modelOptions}
                  className={styles.modelSelect}
                  data-testid={`${rowId}-model`}
                />
                <InputSelectWithHint
                  hint={strings.reasoningHint}
                  placeholder={strings.reasoningDefaultOption}
                  value={state.thinkingLevel}
                  onChange={value =>
                    updateRow(row.vendor, { thinkingLevel: value })
                  }
                  options={[
                    { label: strings.reasoningDefaultOption, value: '' },
                    { label: strings.reasoningNone, value: 'none' },
                    { label: strings.reasoningLow, value: 'low' },
                    { label: strings.reasoningMedium, value: 'medium' },
                    { label: strings.reasoningHigh, value: 'high' },
                  ]}
                  className={styles.modelSelect}
                  data-testid={`${rowId}-thinking`}
                />
                <InputSelectWithHint
                  hint={strings.priorityHint}
                  placeholder={strings.priorityPlaceholder}
                  value={state.priority}
                  onChange={value => updateRow(row.vendor, { priority: value })}
                  options={priorityOptions}
                  className={styles.prioritySelect}
                  data-testid={`${rowId}-priority`}
                />
                <PillButton
                  label={
                    state.savingConfig ? strings.saving : strings.saveConfig
                  }
                  disabled={
                    state.savingConfig ||
                    !state.selectedModel ||
                    !state.priority ||
                    !configDirty
                  }
                  onClick={() => void handleSaveConfig(row.vendor)}
                  data-testid={`${rowId}-save-config`}
                />
              </div>
            )}
          </CredentialCard>
        );
      })}
    </div>
  );
}
