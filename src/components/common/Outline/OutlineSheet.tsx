import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import IconButton from '../IconButton/IconButton';
import OutlineList from './OutlineList';
import { OutlineItem } from './outline.models';
import { ICONS } from '../../../constants/icons';
import styles from './Outline.module.scss';

export interface OutlineSheetProps {
  isOpen: boolean;
  items: OutlineItem[];
  currentId?: string | null;
  /** Called with the chosen turn; the sheet then closes itself. */
  onSelect: (id: string) => void;
  onClose: () => void;
  'data-testid'?: string;
}

/** 📱 The conversation's turns in a bottom sheet over a scrim. */
export default function OutlineSheet({
  isOpen,
  items,
  currentId,
  onSelect,
  onClose,
  'data-testid': testId,
}: OutlineSheetProps): React.ReactElement | null {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.sheetLayer} data-testid={testId}>
      <div
        className={styles.scrim}
        onClick={onClose}
        aria-hidden="true"
        data-testid={testId ? `${testId}-scrim` : undefined}
      />
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={t('conversation.outline.title')}
      >
        <span className={styles.grabber} aria-hidden="true" />
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>
            {t('conversation.outline.title')}
          </span>
          <span className={styles.count}>
            {t('conversation.outline.turns', { count: items.length })}
          </span>
          <span className={styles.headerSpacer} />
          <IconButton
            icon={ICONS.CLOSE}
            label={t('conversation.outline.close')}
            onClick={onClose}
            className={styles.sheetClose}
            data-testid={testId ? `${testId}-close` : undefined}
          />
        </div>
        <div className={styles.sheetBody}>
          <OutlineList
            items={items}
            currentId={currentId}
            onSelect={id => {
              onSelect(id);
              onClose();
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
