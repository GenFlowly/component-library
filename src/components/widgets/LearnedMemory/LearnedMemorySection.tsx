import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid, GridCol } from '../../common/Grid/Grid';
import { Icon } from '../../common/Icon/Icon';
import MemoryCard, {
  MemoryCardAction,
} from '../../common/MemoryCard/MemoryCard';
import { ICONS } from '../../../constants/icons';
import type { LearnedFact } from '../ConversationWidget/conversation.models';
import ConfirmDeleteMemory from './ConfirmDeleteMemory';
import LearnedMemorySheet from './LearnedMemorySheet';
import styles from './LearnedMemory.module.scss';

export interface LearnedMemorySectionProps {
  /** `pending` while the turn's memory extraction runs. */
  status: 'pending' | 'done';
  facts: LearnedFact[];
  /** The turn has several responses: the header says the facts came from all of them. */
  multiVendor?: boolean;
  /** Phones: a one-line chip that opens the swipe-row sheet instead of the cards. */
  compact?: boolean;
  /** Deletes the fact's memory. Resolves when it is gone; rejects to keep it listed. */
  onDelete?: (fact: LearnedFact) => Promise<void>;
  onOpenMemory?: (fact: LearnedFact) => void;
  /** "How it was inferred"; facts without a run id fall back to [onOpenMemory]. */
  onOpenInference?: (fact: LearnedFact) => void;
  /** The Memory page itself ("Manage in Memory" in the phone sheet). */
  onManage?: () => void;
  /** The card foot's date: "Just now" for a turn learned this session, else the turn's date. */
  dateLabel?: string;
}

/**
 * What one turn added to memory: a learning line while extraction runs, a
 * muted line when nothing was learned, else the facts as Memory page cards in
 * the library grid (one per row in narrow containers, two from 640 px, three
 * from 1024 px). Text clamps at four lines. Deleting asks first.
 */
export function LearnedMemorySection({
  status,
  facts,
  multiVendor = false,
  compact = false,
  onDelete,
  onOpenMemory,
  onOpenInference,
  onManage,
  dateLabel,
}: LearnedMemorySectionProps): React.ReactElement {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState<LearnedFact | null>(null);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(
    new Set()
  );

  if (status === 'pending') {
    return (
      <div
        className={styles.line}
        data-testid="learned-memory-pending"
        role="status"
      >
        <Icon src={ICONS.BRAIN} size={12} aria-hidden={true} />
        <span className={styles.pulse} aria-hidden="true" />
        {t('conversation.learnedMemory.learning')}
      </div>
    );
  }

  if (facts.length === 0) {
    return (
      <div
        className={`${styles.line} ${styles.lineNone}`}
        data-testid="learned-memory-none"
      >
        <Icon src={ICONS.BRAIN} size={12} aria-hidden={true} />
        {t('conversation.learnedMemory.none')}
      </div>
    );
  }

  const openFact = (fact: LearnedFact) => {
    if (fact.runId && onOpenInference) onOpenInference(fact);
    else onOpenMemory?.(fact);
  };

  const confirmDelete = async () => {
    const fact = confirming;
    setConfirming(null);
    if (!fact || !onDelete) return;
    setDeletingIds(prev => new Set(prev).add(fact.memoryId));
    try {
      await onDelete(fact);
    } catch {
      // The host reported the failure; the fact stays listed for a retry
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(fact.memoryId);
        return next;
      });
    }
  };

  const actionsFor = (fact: LearnedFact): MemoryCardAction[] => [
    ...(fact.runId && onOpenInference
      ? [
          {
            id: 'inference',
            label: t('conversation.learnedMemory.howInferred'),
            icon: ICONS.INFO,
            onSelect: () => onOpenInference(fact),
          },
        ]
      : []),
    ...(onOpenMemory
      ? [
          {
            id: 'open',
            label: t('conversation.learnedMemory.openInMemory'),
            icon: ICONS.ALT_ARROW_RIGHT,
            onSelect: () => onOpenMemory(fact),
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            id: 'delete',
            label: t('conversation.learnedMemory.delete'),
            icon: ICONS.TRASH,
            danger: true,
            onSelect: () => setConfirming(fact),
          },
        ]
      : []),
  ];

  const kindTag = (fact: LearnedFact) =>
    fact.kind === 'CORE'
      ? [{ label: t('memoryPage.kinds.core'), variant: 'kind' as const }]
      : fact.kind === 'EPISODIC'
        ? [{ label: t('memoryPage.kinds.episodic'), variant: 'kind' as const }]
        : [];

  const confirmDialog = confirming && (
    <ConfirmDeleteMemory
      text={confirming.text}
      onCancel={() => setConfirming(null)}
      onConfirm={confirmDelete}
    />
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          className={styles.chipLine}
          onClick={() => setSheetOpen(true)}
          data-testid="learned-memory-chip"
        >
          <span className={styles.chip}>
            <Icon src={ICONS.BRAIN} size={12} aria-hidden={true} />
            {facts.length}
          </span>
          {t('conversation.learnedMemory.chipText', { count: facts.length })}
        </button>
        {sheetOpen && (
          <LearnedMemorySheet
            facts={facts}
            deletingIds={deletingIds}
            onOpenFact={fact => {
              setSheetOpen(false);
              openFact(fact);
            }}
            onDelete={fact => setConfirming(fact)}
            onManage={onManage}
            onClose={() => setSheetOpen(false)}
          />
        )}
        {confirmDialog}
      </>
    );
  }

  return (
    <section
      className={styles.section}
      aria-label={t('conversation.learnedMemory.header', {
        count: facts.length,
      })}
      data-testid="learned-memory-section"
    >
      <div className={styles.header}>
        <Icon src={ICONS.BRAIN} size={12} aria-hidden={true} />
        <span className={styles.headerText}>
          {t('conversation.learnedMemory.header', { count: facts.length })}
          {multiVendor && (
            <span className={styles.headerNote}>
              {' · '}
              {t('conversation.learnedMemory.fromAllResponses')}
            </span>
          )}
        </span>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={!hidden}
          onClick={() => setHidden(h => !h)}
          data-testid="learned-memory-toggle"
        >
          {hidden
            ? t('conversation.learnedMemory.showAll')
            : t('conversation.learnedMemory.hide')}
          <Icon
            src={ICONS.ALT_ARROW_RIGHT}
            size={12}
            className={
              hidden ? styles.toggleChevronDown : styles.toggleChevronUp
            }
            aria-hidden={true}
          />
        </button>
      </div>
      {!hidden && (
        <Grid gap="md" className={styles.grid}>
          {facts.map(fact => (
            <GridCol key={fact.memoryId} span={12} md={6} lg={4}>
              <MemoryCard
                text={fact.text}
                tags={kindTag(fact)}
                actions={actionsFor(fact)}
                onOpen={() => openFact(fact)}
                date={dateLabel ?? t('conversation.learnedMemory.justNow')}
                clampLines={4}
                busyLabel={
                  deletingIds.has(fact.memoryId)
                    ? t('memoryPage.delete.deleting')
                    : undefined
                }
                testId="learned-memory-card"
                actionTestIdPrefix="learned-memory-action"
              />
            </GridCol>
          ))}
        </Grid>
      )}
      {confirmDialog}
    </section>
  );
}

export default LearnedMemorySection;
