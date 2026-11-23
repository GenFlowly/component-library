import React from 'react';
import { useTranslation } from 'react-i18next';
import { Grid, GridCol } from '../../common/Grid/Grid';
import { Icon } from '../../common/Icon/Icon';
import PillButton from '../../common/PillButton/PillButton';
import { ICONS } from '../../../constants/icons';
import type {
  MemoryInference as MemoryInferenceData,
  MemoryRunOperation,
} from './memoryInference.models';
import styles from './MemoryInference.module.scss';

export interface MemoryInferenceProps {
  inference: MemoryInferenceData;
  /** Vendor id → display name; title-cased when absent. */
  vendorName?: (vendorId: string) => string;
  /** ISO time → the viewer's local date and time. */
  formatDateTime?: (iso: string) => string;
  /** ISO time → the viewer's local date. */
  formatDate?: (iso: string) => string;
  onOpenConversation?: (
    conversationId: string,
    messageId?: string | null
  ) => void;
  onOpenMemory?: (memoryId: string) => void;
  onOpenAgent?: (agentId: string) => void;
  onDelete?: () => void;
}

const titleCase = (id: string) =>
  id.length <= 3
    ? id.toUpperCase()
    : id.charAt(0).toUpperCase() + id.slice(1).toLowerCase();

const defaultDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const defaultDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

type Phase = 'trigger' | 'read' | 'decide' | 'save';

function Beat({
  phase,
  title,
  meta,
  last = false,
  children,
}: {
  phase: Phase;
  title: string;
  meta?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className={styles.beat}>
      <div className={styles.rail} aria-hidden="true">
        <span className={styles.railDot}>
          <i className={styles[`dot-${phase}`]} />
        </span>
        {!last && <span className={styles.railLine} />}
      </div>
      <div className={styles.beatBody}>
        <div className={styles.beatHead}>
          <span>{title}</span>
          {meta && <span className={styles.beatMeta}>{meta}</span>}
        </div>
        {children}
      </div>
    </li>
  );
}

/**
 * How one memory was inferred: the extraction run told as a story (what
 * triggered it, what the agent read, what it decided and why, what was
 * saved) beside the run's facts (source, agent, model, time, tokens, cost).
 * Lays out on the library grid: story and side cards side by side from a
 * 1024 px container, stacked below.
 */
export function MemoryInference({
  inference,
  vendorName = titleCase,
  formatDateTime = defaultDateTime,
  formatDate = defaultDate,
  onOpenConversation,
  onOpenMemory,
  onOpenAgent,
  onDelete,
}: MemoryInferenceProps): React.ReactElement {
  const { t } = useTranslation();
  const {
    memory,
    change,
    run,
    excerpts,
    conversationTitle,
    conversationDeleted,
  } = inference;
  const isNote = run.source === 'note';
  const vendors = run.responsesRead.map(r => vendorName(r.vendor));
  const taken = excerpts.find(e => e.taken);
  const turnResponseIds = new Set(run.responsesRead.map(r => r.messageId));
  const turnResponses = excerpts.filter(e => turnResponseIds.has(e.messageId));
  const userLines = excerpts.filter(e => e.role === 'user').length;
  const placement = memory.placements[0];
  const where = placement?.projectId
    ? t('memoryPage.scopes.unknownProject')
    : t('memoryPage.scopes.profile');
  const kind =
    memory.kind === 'CORE'
      ? t('memoryPage.kinds.core')
      : t('memoryPage.kinds.episodic');
  const title = conversationDeleted
    ? t('memoryPage.changes.deletedConversation')
    : conversationTitle || t('memoryPage.changes.untitledConversation');

  const opLabel = (op: MemoryRunOperation) =>
    op.op === 'ADD'
      ? t('memoryInference.opAdd')
      : op.op === 'UPDATE'
        ? t('memoryInference.opUpdate')
        : op.op === 'DELETE'
          ? t('memoryInference.opDelete')
          : op.op;

  const story = (
    <ol className={styles.timeline}>
      <Beat
        phase="trigger"
        title={
          isNote
            ? t('memoryInference.triggeredByNote')
            : t('memoryInference.triggeredTitle')
        }
        meta={formatDateTime(run.startedAt)}
      >
        <p className={styles.beatText}>
          {isNote
            ? t('memoryInference.triggeredNoteText')
            : vendors.length > 0
              ? t('memoryInference.triggeredText', {
                  count: vendors.length,
                  title,
                  vendors: vendors.join(', '),
                })
              : t('memoryInference.triggeredTextSingle', { title })}
        </p>
      </Beat>
      <Beat
        phase="read"
        title={t('memoryInference.readTitle')}
        meta={t('memoryInference.readMeta', {
          lines: run.messageIds.length,
          memories: run.existingShown,
        })}
      >
        <p className={styles.beatText}>
          {isNote
            ? t('memoryInference.readNoteText')
            : t('memoryInference.readText', { userLines })}
        </p>
        {conversationDeleted && (
          <p className={styles.beatNote}>
            {t('memoryInference.conversationGone')}
          </p>
        )}
        {taken && (
          <blockquote
            className={`${styles.quote} ${styles.quoteTaken}`}
            data-testid="memory-inference-taken"
          >
            <span className={styles.quoteText}>“{taken.text}”</span>
            <small className={styles.quoteMeta}>
              {t('memoryInference.takenFrom', { index: taken.index })}
            </small>
          </blockquote>
        )}
        {turnResponses.map(excerpt => (
          <blockquote
            key={excerpt.messageId}
            className={styles.quote}
            data-testid="memory-inference-response"
          >
            <span className={styles.quoteText}>“{excerpt.text}”</span>
            <small className={styles.quoteMeta}>
              {t('memoryInference.responseLine', {
                vendor: excerpt.vendor
                  ? vendorName(excerpt.vendor)
                  : t('memoryInference.assistant'),
                index: excerpt.index,
              })}
            </small>
          </blockquote>
        ))}
      </Beat>
      <Beat
        phase="decide"
        title={t('memoryInference.decidedTitle')}
        meta={t('memoryInference.seconds', {
          value: (run.durationMs / 1000).toFixed(1),
        })}
      >
        <p className={styles.beatText}>
          {run.operations.length === 0
            ? t('memoryInference.decidedNone')
            : t('memoryInference.decidedText', {
                count: run.operations.length,
              })}
        </p>
        <ul className={styles.ops}>
          {run.operations.map((op, i) => {
            const isThis = op.memoryId === memory.memoryId;
            const canOpen =
              !isThis &&
              !op.memoryDeleted &&
              op.outcome === 'applied' &&
              op.op !== 'DELETE' &&
              !!op.memoryId &&
              !!onOpenMemory;
            return (
              <li
                key={`${op.op}-${op.memoryId ?? i}`}
                className={`${styles.op} ${isThis ? styles.opThis : ''}`}
                data-testid="memory-inference-op"
              >
                <span
                  className={`${styles.opTag} ${styles[`opTag-${op.op.toLowerCase()}`] ?? ''}`}
                >
                  {opLabel(op)}
                </span>
                <span className={styles.opBody}>
                  {op.text && <span className={styles.opText}>{op.text}</span>}
                  {op.reason && (
                    <span className={styles.opWhy}>
                      {t('memoryInference.why', { reason: op.reason })}
                    </span>
                  )}
                  <span className={styles.opFoot}>
                    {isThis && (
                      <strong>{t('memoryInference.thisMemory')}</strong>
                    )}
                    {op.outcome === 'noop' && (
                      <span>{t('memoryInference.notApplied')}</span>
                    )}
                    {op.outcome === 'error' && (
                      <span className={styles.opError}>
                        {t('memoryInference.failed')}
                      </span>
                    )}
                    {op.memoryDeleted && (
                      <span>{t('memoryInference.memoryDeleted')}</span>
                    )}
                    {canOpen && (
                      <button
                        type="button"
                        className={styles.link}
                        onClick={() => onOpenMemory!(op.memoryId!)}
                      >
                        {t('memoryInference.openMemory')}
                      </button>
                    )}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        {run.truncated && (
          <p className={styles.beatNote}>{t('memoryInference.truncated')}</p>
        )}
      </Beat>
      <Beat
        phase="save"
        title={t('memoryInference.savedTitle')}
        meta={t('memoryPage.list.version', {
          version: change?.version ?? memory.version,
        })}
        last
      >
        <p className={styles.beatText}>
          {t('memoryInference.savedText', { where, kind })}
        </p>
      </Beat>
    </ol>
  );

  const fact = (label: string, value: React.ReactNode) => (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );

  return (
    <div className={styles.inference} data-testid="memory-inference">
      <Grid gap="md">
        <GridCol span={12} lg={8}>
          <div className={styles.main}>
            <article className={styles.memoryCard}>
              <div className={styles.memoryTags}>
                <span className={`${styles.tag} ${styles.tagKind}`}>
                  {kind}
                </span>
                {memory.category && (
                  <span className={styles.tag}>{memory.category}</span>
                )}
              </div>
              <p className={styles.memoryText}>{memory.text}</p>
              <div className={styles.memoryMeta}>
                <span className={styles.memoryVersion}>
                  {t('memoryInference.version', {
                    version: change?.version ?? memory.version,
                  })}
                </span>
                <span>
                  · {formatDate(change?.createdAt || memory.createdAt)}
                </span>
              </div>
            </article>
            <section aria-label={t('memoryInference.title')}>
              <h2 className={styles.sectionTitle}>
                {t('memoryInference.title')}
              </h2>
              {story}
            </section>
          </div>
        </GridCol>
        <GridCol span={12} lg={4}>
          <aside className={styles.side}>
            {!isNote && (
              <section
                className={styles.sideCard}
                data-testid="memory-inference-source"
              >
                <h3 className={styles.sideTitle}>
                  <Icon src={ICONS.INFO} size={13} aria-hidden={true} />
                  {t('memoryInference.sourceTitle')}
                </h3>
                <dl className={styles.facts}>
                  {fact(t('memoryInference.conversation'), title)}
                  {taken &&
                    fact(
                      t('memoryInference.line'),
                      t('memoryInference.youLine', { index: taken.index })
                    )}
                </dl>
                {!conversationDeleted &&
                  run.conversationId &&
                  onOpenConversation && (
                    <button
                      type="button"
                      className={styles.link}
                      onClick={() =>
                        onOpenConversation(
                          run.conversationId!,
                          run.turnMessageId
                        )
                      }
                      data-testid="memory-inference-open-conversation"
                    >
                      {t('memoryInference.openConversation')}
                      <Icon
                        src={ICONS.ALT_ARROW_RIGHT}
                        size={12}
                        aria-hidden={true}
                      />
                    </button>
                  )}
              </section>
            )}
            <section
              className={styles.sideCard}
              data-testid="memory-inference-run"
            >
              <h3 className={styles.sideTitle}>
                <Icon src={ICONS.BRAIN} size={13} aria-hidden={true} />
                {t('memoryInference.runTitle')}
              </h3>
              <dl className={styles.facts}>
                {fact(
                  t('memoryInference.agent'),
                  t('memoryInference.agentName')
                )}
                {run.model &&
                  fact(
                    t('memoryInference.model'),
                    run.vendor
                      ? t('memoryInference.modelOn', {
                          model: run.model,
                          vendor: vendorName(run.vendor),
                        })
                      : run.model
                  )}
                {vendors.length > 0 &&
                  fact(t('memoryInference.responsesRead'), vendors.join(' · '))}
                {fact(
                  t('memoryInference.took'),
                  t('memoryInference.seconds', {
                    value: (run.durationMs / 1000).toFixed(1),
                  })
                )}
                {run.inputTokens != null &&
                  fact(
                    t('memoryInference.tokens'),
                    t('memoryInference.tokensValue', {
                      input: run.inputTokens.toLocaleString(),
                      output: (run.outputTokens ?? 0).toLocaleString(),
                    })
                  )}
                {run.costUsd != null &&
                  fact(t('memoryInference.cost'), `$${run.costUsd.toFixed(4)}`)}
                {fact(
                  t('memoryInference.run'),
                  <code className={styles.runId}>{run.runId.slice(0, 8)}</code>
                )}
              </dl>
              {run.agentId && onOpenAgent && (
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => onOpenAgent(run.agentId!)}
                >
                  {t('memoryInference.openAgent')}
                  <Icon
                    src={ICONS.ALT_ARROW_RIGHT}
                    size={12}
                    aria-hidden={true}
                  />
                </button>
              )}
            </section>
            <section className={styles.sideCard}>
              <h3 className={styles.sideTitle}>
                <Icon src={ICONS.INFO} size={13} aria-hidden={true} />
                {t('memoryInference.privacyTitle')}
              </h3>
              <p className={styles.sideText}>
                {t('memoryInference.privacyText')}
              </p>
            </section>
            {onDelete && (
              <PillButton
                variant="secondary"
                className={styles.deleteButton}
                icon={ICONS.TRASH}
                iconSize={14}
                label={t('memoryInference.deleteMemory')}
                onClick={onDelete}
                data-testid="memory-inference-delete"
              />
            )}
          </aside>
        </GridCol>
      </Grid>
    </div>
  );
}

export default MemoryInference;
