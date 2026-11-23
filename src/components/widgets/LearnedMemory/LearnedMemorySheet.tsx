import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../common/Icon/Icon';
import SwipeableRow, {
  SwipeRowsContext,
} from '../../common/SidebarListPanel/SwipeableRow';
import { ICONS } from '../../../constants/icons';
import type { LearnedFact } from '../ConversationWidget/conversation.models';
import styles from './LearnedMemory.module.scss';

export interface LearnedMemorySheetProps {
  facts: LearnedFact[];
  /** Memory ids being deleted: their rows are dimmed. */
  deletingIds?: ReadonlySet<string>;
  /** Tapping a row: the fact's "how it was inferred" page (or the memory when no run was recorded). */
  onOpenFact: (fact: LearnedFact) => void;
  /** Swipe left → Delete. The section asks for confirmation. */
  onDelete: (fact: LearnedFact) => void;
  onManage?: () => void;
  onClose: () => void;
}

/**
 * Phones: the facts a turn added to memory, in a sheet from the bottom of
 * the screen. Rows are the sidebar's swipe rows: tap to see how a fact was
 * inferred, swipe left to delete it.
 */
export function LearnedMemorySheet({
  facts,
  deletingIds,
  onOpenFact,
  onDelete,
  onManage,
  onClose,
}: LearnedMemorySheetProps): React.ReactElement {
  const { t } = useTranslation();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const swipeContext = useMemo(
    () => ({ swipeRows: true, openRowId, setOpenRowId }),
    [openRowId]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // On document.body: the response pager transforms the card the sheet is
  // opened from, which would turn position: fixed into "fixed to the card"
  // and leave it under the follow-up editor
  return createPortal(
    <div className={styles.sheetLayer} data-testid="learned-memory-sheet">
      <button
        type="button"
        className={styles.sheetScrim}
        aria-label={t('conversation.learnedMemory.done')}
        onClick={onClose}
      />
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={t('conversation.learnedMemory.sheetTitle', {
          count: facts.length,
        })}
      >
        <span className={styles.sheetGrip} aria-hidden="true" />
        <div className={styles.sheetHead}>
          <Icon src={ICONS.BRAIN} size={16} aria-hidden={true} />
          {t('conversation.learnedMemory.sheetTitle', { count: facts.length })}
        </div>
        <p className={styles.sheetHint}>
          {t('conversation.learnedMemory.sheetHint')}
        </p>
        <SwipeRowsContext.Provider value={swipeContext}>
          <ul className={styles.sheetRows}>
            {facts.map(fact => (
              <li
                key={fact.memoryId}
                className={`${styles.sheetRow} ${deletingIds?.has(fact.memoryId) ? styles.sheetRowBusy : ''}`}
                data-testid="learned-memory-sheet-row"
              >
                <SwipeableRow
                  rowId={fact.memoryId}
                  trailingActions={[
                    {
                      icon: (
                        <Icon src={ICONS.TRASH} size={18} aria-hidden={true} />
                      ),
                      label: t('conversation.learnedMemory.delete'),
                      tone: 'muted',
                      onClick: () => onDelete(fact),
                      testId: 'learned-memory-sheet-delete',
                    },
                  ]}
                >
                  <button
                    type="button"
                    className={styles.sheetRowButton}
                    onClick={() => onOpenFact(fact)}
                    data-testid="learned-memory-sheet-open"
                  >
                    <span className={styles.sheetRowText}>{fact.text}</span>
                    <Icon
                      src={ICONS.ALT_ARROW_RIGHT}
                      size={16}
                      className={styles.sheetRowChevron}
                      aria-hidden={true}
                    />
                  </button>
                </SwipeableRow>
              </li>
            ))}
          </ul>
        </SwipeRowsContext.Provider>
        <div className={styles.sheetFoot}>
          {onManage && (
            <button
              type="button"
              className={styles.sheetAction}
              onClick={() => {
                onClose();
                onManage();
              }}
              data-testid="learned-memory-sheet-manage"
            >
              <Icon src={ICONS.ALT_ARROW_RIGHT} size={18} aria-hidden={true} />
              {t('conversation.learnedMemory.manage')}
            </button>
          )}
          <button
            type="button"
            className={`${styles.sheetAction} ${styles.sheetDone}`}
            onClick={onClose}
            data-testid="learned-memory-sheet-done"
          >
            {t('conversation.learnedMemory.done')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LearnedMemorySheet;
