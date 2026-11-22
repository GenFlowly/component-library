import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Chevron from '../../common/SidebarListPanel/Chevron';
import {
  ActivityBeat,
  ActivityCallView,
  ActivityEvidenceGroup,
  ActivitySourceView,
  ActivityView,
} from './activity.reduce';
import { beatTitle, formatDuration } from './activity.format';
import SourceRow from './SourceRow';
import { MemoryTexts } from './ActivityStory';
import styles from './ActivityPanel.module.scss';

export type EvidenceFilter = 'all' | 'cited' | 'notCited' | 'failed';

export interface ActivityEvidenceProps {
  view: ActivityView;
  /** Makes element ids unique when several panels share a page. */
  idPrefix?: string;
  filter: EvidenceFilter;
  onFilterChange: (filter: EvidenceFilter) => void;
  /** Opens the story view on the step that found these sources. */
  onShowInStory?: (beatId: string) => void;
  /** A group to highlight (arriving from the story). */
  focusedStepId?: string | null;
}

/** The filter a turn opens on: the cited sources once there are any. */
export function defaultEvidenceFilter(view: ActivityView): EvidenceFilter {
  return view.sources.cited && view.sources.cited > 0 ? 'cited' : 'all';
}

/**
 * Every source the agent read, grouped by the step that found it, with the
 * ones the answer cites marked. Below them, the memories it applied and, for
 * the person who sent the message, the raw developer data.
 */
export default function ActivityEvidence({
  view,
  idPrefix = 'activity',
  filter,
  onFilterChange,
  onShowInStory,
  focusedStepId,
}: ActivityEvidenceProps) {
  const { t } = useTranslation();
  const citationsKnown = view.sources.cited != null;
  const all = view.evidence.flatMap(g => g.sources);
  const counts = {
    all: all.length,
    cited: all.filter(s => s.cited).length,
    notCited: all.filter(s => s.cited === false).length,
    failed: view.evidence.reduce((n, g) => n + g.failedCalls.length, 0),
  };
  const options = [
    {
      id: 'all',
      label: t('conversation.activity.evidence.all', { count: counts.all }),
    },
    ...(citationsKnown
      ? [
          {
            id: 'cited',
            label: t('conversation.activity.evidence.cited', {
              count: counts.cited,
            }),
          },
          {
            id: 'notCited',
            label: t('conversation.activity.evidence.notCited', {
              count: counts.notCited,
            }),
          },
        ]
      : []),
    {
      id: 'failed',
      label: t('conversation.activity.evidence.failed', {
        count: counts.failed,
      }),
    },
  ];
  const activeFilter: EvidenceFilter =
    !citationsKnown && (filter === 'cited' || filter === 'notCited')
      ? 'all'
      : filter;
  const stepNumbers = useMemo(() => {
    const numbers = new Map<string, number>();
    view.beats.forEach((beat, i) => numbers.set(beat.id, i + 1));
    return numbers;
  }, [view.beats]);

  const groups = view.evidence.filter(g => g.calls.length > 0);
  const anyRows = groups.some(g => rowsOf(g, activeFilter).length > 0);

  return (
    <div className={styles.evidence} data-testid="activity-evidence">
      {groups.length > 0 && (
        <div
          className={styles.filters}
          role="radiogroup"
          aria-label={t('conversation.activity.evidence.filterLabel')}
          data-testid="activity-evidence-filter"
        >
          {options.map(option => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={activeFilter === option.id}
              className={`${styles.filterChip} ${activeFilter === option.id ? styles.filterChipOn : ''}`}
              onClick={() => onFilterChange(option.id as EvidenceFilter)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {groups.length === 0 && (
        <p className={styles.emptyNote}>
          {t('conversation.activity.evidence.noSources')}
        </p>
      )}
      {groups.length > 0 && !anyRows && (
        <p className={styles.emptyNote} data-testid="activity-evidence-empty">
          {t('conversation.activity.evidence.none')}
        </p>
      )}
      {groups.map(group => (
        <EvidenceGroupView
          key={group.stepId}
          group={group}
          elementId={`${idPrefix}-evidence-${group.stepId}`}
          filter={activeFilter}
          stepNumber={stepNumbers.get(group.beatId) ?? 0}
          beat={view.beats.find(b => b.id === group.beatId)}
          onShowInStory={onShowInStory}
          focused={focusedStepId === group.stepId}
        />
      ))}
      <div className={styles.sections}>
        <MemorySection view={view} />
        {view.developer.length > 0 && <DeveloperSection view={view} />}
      </div>
    </div>
  );
}

type Row =
  | { kind: 'source'; source: ActivitySourceView }
  | { kind: 'failed'; call: ActivityCallView };

function rowsOf(group: ActivityEvidenceGroup, filter: EvidenceFilter): Row[] {
  const sources = group.sources.map(source => ({
    kind: 'source' as const,
    source,
  }));
  const failed = group.failedCalls.map(call => ({
    kind: 'failed' as const,
    call,
  }));
  switch (filter) {
    case 'cited':
      return sources.filter(r => r.source.cited);
    case 'notCited':
      return sources.filter(r => r.source.cited === false);
    case 'failed':
      return failed;
    default:
      return [...sources, ...failed];
  }
}

function EvidenceGroupView({
  group,
  elementId,
  filter,
  stepNumber,
  beat,
  onShowInStory,
  focused,
}: {
  group: ActivityEvidenceGroup;
  elementId: string;
  filter: EvidenceFilter;
  stepNumber: number;
  beat?: ActivityBeat;
  onShowInStory?: (beatId: string) => void;
  focused: boolean;
}) {
  const { t } = useTranslation();
  const [showNotCited, setShowNotCited] = useState(false);
  const rows = rowsOf(group, filter);
  const notCited = filter === 'cited' ? rowsOf(group, 'notCited') : [];
  const visible = showNotCited ? [...rows, ...notCited] : rows;
  if (visible.length === 0 && notCited.length === 0 && filter !== 'all')
    return null;

  const meta = [
    group.cited != null
      ? t('conversation.activity.evidence.stepSummary', {
          found: group.found,
          cited: group.cited,
        })
      : t('conversation.activity.evidence.stepFound', { count: group.found }),
    formatDuration(group.durationMs),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`${styles.group} ${focused ? styles.beatFocused : ''}`}
      id={elementId}
      data-testid="activity-evidence-group"
    >
      <button
        type="button"
        className={styles.groupHead}
        onClick={() => onShowInStory?.(group.beatId)}
        title={t('conversation.activity.evidence.openStep')}
        data-testid="activity-evidence-group-head"
      >
        {stepNumber > 0 && (
          <span className={styles.groupStep}>
            {t('conversation.activity.evidence.step', { n: stepNumber })}
          </span>
        )}
        <span className={styles.groupTitle}>
          {beat ? beatTitle(t, beat) : group.stepId}
        </span>
        <span className={styles.groupMeta}>{meta}</span>
      </button>
      <ul className={styles.groupRows}>
        {visible.map(row =>
          row.kind === 'source' ? (
            <SourceRow
              key={`s-${row.source.index}`}
              source={row.source}
              cited={row.source.cited}
              variant="ledger"
              meta={t('conversation.activity.evidence.query', {
                seq: row.source.callSeq,
              })}
              data-testid="activity-evidence-source"
            />
          ) : (
            <li
              key={`f-${row.call.key}`}
              className={styles.failedRow}
              data-testid="activity-evidence-failed"
            >
              <span className={styles.callQuery}>
                {row.call.query ?? row.call.name}
              </span>
              <span
                className={
                  row.call.status === 'failed'
                    ? styles.callError
                    : styles.callNote
                }
              >
                {row.call.status === 'failed'
                  ? t('conversation.activity.call.failed', {
                      error: row.call.error ?? '',
                    })
                  : row.call.status === 'skipped'
                    ? t('conversation.activity.call.skipped')
                    : t('conversation.activity.call.denied')}
              </span>
            </li>
          )
        )}
      </ul>
      {notCited.length > 0 && !showNotCited && (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setShowNotCited(true)}
          data-testid="activity-show-not-cited"
        >
          {t('conversation.activity.evidence.showNotCited', {
            count: notCited.length,
          })}
        </button>
      )}
    </div>
  );
}

function MemorySection({ view }: { view: ActivityView }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { core, recalled } = view.memories;
  const total = core + recalled;
  return (
    <div className={styles.section} data-testid="activity-memory-section">
      <button
        type="button"
        className={styles.sectionHead}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        disabled={total === 0}
      >
        {total > 0 && <Chevron expanded={open} />}
        <span>
          {t('conversation.activity.evidence.memory', { count: total })}
        </span>
        {total > 0 && (
          <span className={styles.sectionSub}>
            {t('conversation.activity.evidence.memorySplit', {
              core,
              recalled,
            })}
          </span>
        )}
      </button>
      {open &&
        (view.memoryTexts ? (
          <MemoryTexts texts={view.memoryTexts} />
        ) : (
          <p
            className={styles.emptyNote}
            data-testid="activity-memory-redacted"
          >
            {t('conversation.activity.beat.memoryRedacted')}
          </p>
        ))}
    </div>
  );
}

function DeveloperSection({ view }: { view: ActivityView }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.section} data-testid="activity-developer-section">
      <button
        type="button"
        className={styles.sectionHead}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <Chevron expanded={open} />
        <span>{t('conversation.activity.evidence.developer')}</span>
        <span className={styles.sectionSub}>
          {t('conversation.activity.evidence.developerSub')}
        </span>
      </button>
      {open &&
        view.developer.map(entry => (
          <div key={entry.stepId} className={styles.developerBlock}>
            <span className={styles.groupLabel}>{entry.name}</span>
            {entry.prompt && (
              <>
                <span className={styles.groupLabel}>
                  {t('conversation.activity.evidence.prompt')}
                </span>
                <pre className={styles.pre}>{entry.prompt}</pre>
              </>
            )}
            {entry.response && (
              <>
                <span className={styles.groupLabel}>
                  {t('conversation.activity.evidence.response')}
                </span>
                <pre className={styles.pre}>{entry.response}</pre>
              </>
            )}
          </div>
        ))}
    </div>
  );
}
