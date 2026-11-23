import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../common/Modal/Modal';
import PillButton from '../../common/PillButton/PillButton';
import styles from './LearnedMemory.module.scss';

export interface ConfirmDeleteMemoryProps {
  /** The memory's text, quoted so the viewer knows which one goes. */
  text: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** The Memory page's delete confirmation, for a memory deleted from a chat. */
export function ConfirmDeleteMemory({
  text,
  onCancel,
  onConfirm,
}: ConfirmDeleteMemoryProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={t('memoryPage.delete.title')}
      maxWidth="28rem"
    >
      <div
        className={styles.confirm}
        data-testid="learned-memory-confirm-delete"
      >
        <p className={styles.confirmQuote}>{text}</p>
        <p className={styles.confirmText}>{t('memoryPage.delete.confirm')}</p>
        <div className={styles.confirmActions}>
          <PillButton
            variant="secondary"
            label={t('memoryPage.move.cancel')}
            onClick={onCancel}
            data-testid="learned-memory-confirm-cancel"
          />
          <PillButton
            variant="danger"
            label={t('memoryPage.delete.delete')}
            onClick={onConfirm}
            data-testid="learned-memory-confirm-delete-button"
          />
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDeleteMemory;
