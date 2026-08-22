import React from 'react';
import styles from './InstructionEditor.module.scss';
import PillButton from '../../common/PillButton/PillButton';
import { InputTextWithHint } from '../../common/InputTextWithHint/InputTextWithHint';
import TextEditor from '../TextEditorWidget/TextEditor';

export interface InstructionEditorLabels {
  back: string;
  createTitle: string;
  editTitle: string;
  share: string;
  delete: string;
  save: string;
  saving: string;
  readonlyBanner: string;
  nameHint: string;
  namePlaceholder: string;
  instructionPrompt: string;
}

const DEFAULT_LABELS: InstructionEditorLabels = {
  back: '← Back',
  createTitle: 'Create Instruction',
  editTitle: 'Edit Instruction',
  share: 'Share',
  delete: 'Delete',
  save: 'Save',
  saving: 'Saving…',
  readonlyBanner: 'You have view-only access to this instruction.',
  nameHint: 'Name',
  namePlaceholder: 'e.g. Marketing copy editor',
  instructionPrompt: 'Instruction',
};

export interface InstructionEditorProps {
  /** Instruction name (controlled). */
  name: string;
  onNameChange: (name: string) => void;
  /** Instruction body text (controlled). */
  instructionText: string;
  onInstructionTextChange: (text: string) => void;
  /**
   * Whether a new instruction is being created. Switches the title and
   * hides the Share/Delete actions, which only apply to saved instructions.
   * @default false
   */
  isNew?: boolean;
  /**
   * View-only mode: shows the readonly banner and hides every action
   * except Back; the name input and editor become non-editable.
   * @default false
   */
  readOnly?: boolean;
  /** Disables all actions while a save/share/delete request is in flight. */
  isLoading?: boolean;
  /** Show the Share action (requires `onShare`). @default false */
  canShare?: boolean;
  /** Show the Delete action (requires `onDelete`). @default false */
  canDelete?: boolean;
  onSave: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  /** Renders a back button in the header when provided. */
  onBack?: () => void;
  /** Override any of the default English strings (e.g. with i18n values). */
  labels?: Partial<InstructionEditorLabels>;
  /** DOM id passed to the underlying TextEditor. @default 'instruction-editor' */
  editorId?: string;
  'data-testid'?: string;
}

/**
 * Full instruction create/edit surface: header with title and
 * Share/Delete/Save actions, an optional readonly banner, a name input and
 * the markdown TextEditor. Purely presentational — the host app owns the
 * name/text state and wires persistence, navigation and sharing through
 * the callbacks, so the same editor can back different auth and sharing
 * models (per-user sharing, public instructions, ...).
 */
export default function InstructionEditor({
  name,
  onNameChange,
  instructionText,
  onInstructionTextChange,
  isNew = false,
  readOnly = false,
  isLoading = false,
  canShare = false,
  canDelete = false,
  onSave,
  onShare,
  onDelete,
  onBack,
  labels,
  editorId = 'instruction-editor',
  'data-testid': testId,
}: InstructionEditorProps): React.ReactElement {
  const text: InstructionEditorLabels = { ...DEFAULT_LABELS, ...labels };
  const showShare = !readOnly && !isNew && canShare && !!onShare;
  const showDelete = !readOnly && !isNew && canDelete && !!onDelete;

  return (
    <div className={styles.instructionEditor} data-testid={testId}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          {onBack && (
            <button
              className={styles.backButton}
              onClick={onBack}
              data-testid={testId ? `${testId}-back` : undefined}
            >
              {text.back}
            </button>
          )}
          <h2>{isNew ? text.createTitle : text.editTitle}</h2>
        </div>

        <div className={styles.actions}>
          {showShare && (
            <PillButton
              label={text.share}
              variant="secondary"
              onClick={onShare}
              disabled={isLoading}
              data-testid={testId ? `${testId}-share` : undefined}
            />
          )}
          {showDelete && (
            <PillButton
              label={text.delete}
              variant="danger"
              onClick={onDelete}
              disabled={isLoading}
              data-testid={testId ? `${testId}-delete` : undefined}
            />
          )}
          {!readOnly && (
            <PillButton
              label={isLoading ? text.saving : text.save}
              variant="primary"
              onClick={onSave}
              disabled={isLoading || !instructionText.trim()}
              data-testid={testId ? `${testId}-save` : undefined}
            />
          )}
        </div>
      </div>

      <div className={styles.content}>
        {readOnly && (
          <div
            className={styles.readonlyBanner}
            data-testid={testId ? `${testId}-readonly-banner` : undefined}
          >
            {text.readonlyBanner}
          </div>
        )}
        <div className={styles.inputGroup}>
          <InputTextWithHint
            hint={text.nameHint}
            value={name}
            onChange={e => onNameChange(e.target.value)}
            placeholder={text.namePlaceholder}
            disabled={readOnly}
            data-testid={testId ? `${testId}-name` : undefined}
          />
        </div>

        <div className={styles.editorContainer}>
          <label className={styles.editorLabel}>{text.instructionPrompt}</label>
          <TextEditor
            id={editorId}
            value={instructionText}
            onChange={onInstructionTextChange}
            disableCache={true}
            height="100%"
            readOnly={readOnly}
            data-testid={testId ? `${testId}-editor` : undefined}
          />
        </div>
      </div>
    </div>
  );
}
