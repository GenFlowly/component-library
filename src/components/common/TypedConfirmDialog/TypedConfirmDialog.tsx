import React, { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import PillButton from '../PillButton/PillButton';
import styles from './TypedConfirmDialog.module.scss';

export interface TypedConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** What will happen, in a sentence or a short list. */
  message: React.ReactNode;
  /** The word to type exactly, e.g. "DELETE" or "LOCK". */
  confirmWord: string;
  /** Label of the input, e.g. "Type DELETE to confirm". */
  inputLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Red confirm button. @default true */
  danger?: boolean;
  /** Disables both buttons while the action runs. */
  busy?: boolean;
  'data-testid'?: string;
}

/**
 * Confirmation for actions that can't be undone: the confirm button stays
 * disabled until the exact word is typed.
 */
export default function TypedConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmWord,
  inputLabel,
  confirmLabel,
  cancelLabel,
  danger = true,
  busy = false,
  'data-testid': testId,
}: TypedConfirmDialogProps): React.ReactElement {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (isOpen) setTyped('');
  }, [isOpen]);

  const matches = typed.trim() === confirmWord;

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => undefined : onClose}
      title={title}
      maxWidth="440px"
    >
      <form
        className={styles.body}
        data-testid={testId}
        onSubmit={event => {
          event.preventDefault();
          if (matches && !busy) onConfirm();
        }}
      >
        <div className={styles.message}>{message}</div>
        <label className={styles.field}>
          <span className={styles.label}>{inputLabel}</span>
          <input
            className={styles.input}
            value={typed}
            onChange={event => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={busy}
            data-testid={testId ? `${testId}-input` : undefined}
          />
        </label>
        <div className={styles.actions}>
          <PillButton
            label={cancelLabel}
            variant="secondary"
            onClick={onClose}
            disabled={busy}
            data-testid={testId ? `${testId}-cancel` : undefined}
          />
          <PillButton
            type="submit"
            label={confirmLabel}
            variant={danger ? 'danger' : 'primary'}
            disabled={!matches || busy}
            data-testid={testId ? `${testId}-confirm` : undefined}
          />
        </div>
      </form>
    </Modal>
  );
}
