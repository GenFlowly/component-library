import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Brain,
  FileSearch,
  Globe,
  Sparkles,
  Wrench,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '../../common/Icon/Icon';
import { ICONS } from '../../../constants/icons';
import Chevron from '../../common/SidebarListPanel/Chevron';
import {
  ActivityBeat,
  ActivityCallView,
  ActivityPhaseId,
  ActivityToolFamily,
  ActivityView,
} from './activity.reduce';
import { beatTitle, formatDuration } from './activity.format';
import SourceRow, { SiteIcon } from './SourceRow';
import { isTrainingSource } from '../ConversationWidget/conversation.models';
import styles from './ActivityPanel.module.scss';

const PREVIEW_SOURCES = 3;

const FAMILY_ICONS: Record<ActivityToolFamily, LucideIcon> = {
  search: Globe,
  knowledge: FileSearch,
  subagent: Sparkles,
  plan: Wrench,
  files: Wrench,
  other: Wrench,
};

function beatIcon(beat: ActivityBeat): LucideIcon {
  switch (beat.type) {
    case 'memory':
      return BookOpen;
    case 'tools':
      return FAMILY_ICONS[beat.family];
    case 'answer':
      return Check;
    default:
      return Brain;
  }
}

/** Which phase colour a done beat's time bar uses. */
function beatPhase(
  beat: ActivityBeat,
  index: number,
  beats: ActivityBeat[]
): ActivityPhaseId {
  switch (beat.type) {
    case 'memory':
      return 'memory';
    case 'tools':
      return 'search';
    case 'answer':
      return 'answer';
    case 'plan':
      return beats.slice(0, index).some(b => b.type === 'tools')
        ? 'reason'
        : 'plan';
    case 'input':
      return 'setup';
    default:
      return 'reason';
  }
}

export interface ActivityStoryProps {
  view: ActivityView;
  /** Makes element ids unique when several panels share a page. */
  idPrefix?: string;
  /** Opens the evidence view on one step's sources. */
  onShowEvidence?: (stepId: string) => void;
  /** A beat to highlight (arriving from the evidence view). */
  focusedBeatId?: string | null;
}

/**
 * The turn as a story: one beat per step, with what the agent did, why (its
 * own words), what came back and how long it took. Live beats show their
 * detail; once the turn is over every beat collapses to one line with a
 * proportional time bar and opens on demand.
 */
export default function ActivityStory({
  view,
  idPrefix = 'activity',
  onShowEvidence,
  focusedBeatId,
}: ActivityStoryProps) {
  const isLive = view.status === 'live';
  const longest = Math.max(1, ...view.beats.map(b => b.durationMs ?? 0));
  const showPendingAnswer =
    isLive && !view.beats.some(b => b.type === 'answer');

  return (
    <ol className={styles.timeline} data-testid="activity-story">
      {view.beats.map((beat, i) => (
        <BeatRow
          key={beat.id}
          beat={beat}
          index={i}
          view={view}
          isLast={i === view.beats.length - 1 && !showPendingAnswer}
          compact={!isLive}
          barWidth={Math.round(((beat.durationMs ?? 0) / longest) * 60)}
          elementId={`${idPrefix}-beat-${beat.id}`}
          onShowEvidence={onShowEvidence}
          focused={focusedBeatId === beat.id}
        />
      ))}
      {showPendingAnswer && <PendingAnswer />}
    </ol>
  );
}

function PendingAnswer() {
  const { t } = useTranslation();
  return (
    <li
      className={styles.beat}
      data-testid="activity-beat-pending"
      style={{ opacity: 0.55 }}
    >
      <div className={styles.rail}>
        <span
          className={`${styles.railDot} ${styles.railDotPending}`}
          aria-hidden="true"
        />
      </div>
      <div className={styles.beatBody}>
        <span className={styles.beatHead}>
          <span className={styles.beatTitle}>
            {t('conversation.activity.beat.answer')}
          </span>
        </span>
      </div>
    </li>
  );
}

function RailDot({ status }: { status: ActivityBeat['status'] }) {
  if (status === 'running') {
    return (
      <span className={styles.railDot} aria-hidden="true">
        <span className={styles.pulse} />
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className={styles.railDot} aria-hidden="true">
        <Check size={11} strokeWidth={3} className={styles.statusDone} />
      </span>
    );
  }
  return (
    <span
      className={`${styles.railDot} ${styles.railDotPending}`}
      aria-hidden="true"
    />
  );
}

function hasDetail(beat: ActivityBeat): boolean {
  switch (beat.type) {
    case 'memory':
      return (
        !!beat.texts && beat.texts.core.length + beat.texts.recalled.length > 0
      );
    case 'plan':
      return !!beat.reasoning;
    case 'tools':
      return beat.calls.length > 0 || !!beat.todos?.length;
    case 'answer':
      return beat.citedSources.length > 0;
    default:
      return false;
  }
}

function BeatRow({
  beat,
  index,
  view,
  isLast,
  compact,
  barWidth,
  elementId,
  onShowEvidence,
  focused,
}: {
  beat: ActivityBeat;
  index: number;
  view: ActivityView;
  isLast: boolean;
  compact: boolean;
  barWidth: number;
  elementId: string;
  onShowEvidence?: (stepId: string) => void;
  focused: boolean;
}) {
  const { t } = useTranslation();
  // Memory texts are personal: they open on request even while live, so they
  // never sit on screen during a turn (a shared screen, a demo).
  const onDemand = compact || beat.type === 'memory';
  const expandable = onDemand && hasDetail(beat);
  // Done turns collapse to one line per beat, except the answer, whose cited
  // sources tie the research to the reply.
  const [open, setOpen] = useState(beat.type === 'answer');
  const showDetail = !onDemand || open || focused;
  const KindIcon = beatIcon(beat);
  const title = beatTitle(t, beat);
  const running = beat.status === 'running';
  const time = formatDuration(beat.durationMs);
  // An open llm step says it in its title ("Stopped while writing").
  const statusWord =
    beat.type === 'thinking'
      ? null
      : beat.status === 'stopped'
        ? t('conversation.activity.status.stopped')
        : beat.status === 'failed'
          ? t('conversation.activity.status.failed')
          : null;

  const head = (
    <>
      <KindIcon className={styles.beatIcon} size={14} aria-hidden="true" />
      <span
        className={`${styles.beatTitle} ${compact ? styles.beatTitleCompact : ''}`}
      >
        {title}
      </span>
      {statusWord && <span className={styles.beatTime}>{statusWord}</span>}
      {compact && beat.durationMs != null && (
        <span className={styles.beatBar} aria-hidden="true">
          <span
            className={`${styles.beatBarFill} ${styles[`phase-${beatPhase(beat, index, view.beats)}`]}`}
            style={{ width: Math.max(3, barWidth) }}
          />
        </span>
      )}
      {time && (
        <span
          className={`${styles.beatTime} ${running ? styles.beatTimeLive : ''}`}
        >
          {time}
        </span>
      )}
      {expandable && <Chevron expanded={showDetail} />}
      {onDemand && !expandable && (
        // Keeps the time bars aligned with the rows that can open.
        <span className={styles.chevronSlot} aria-hidden="true" />
      )}
    </>
  );

  return (
    <li
      className={`${styles.beat} ${focused ? styles.beatFocused : ''}`}
      id={elementId}
      data-testid="activity-beat"
      data-beat-type={beat.type}
      data-status={beat.status}
    >
      <div className={styles.rail}>
        <RailDot status={beat.status} />
        {!isLast && <div className={styles.railLine} />}
      </div>
      <div className={styles.beatBody}>
        {expandable ? (
          <button
            type="button"
            className={styles.beatHead}
            onClick={() => setOpen(o => !o)}
            aria-expanded={showDetail}
            data-testid="activity-beat-toggle"
          >
            {head}
          </button>
        ) : (
          <span className={styles.beatHead}>{head}</span>
        )}
        {showDetail && (
          <BeatDetail beat={beat} onShowEvidence={onShowEvidence} />
        )}
      </div>
    </li>
  );
}

function BeatDetail({
  beat,
  onShowEvidence,
}: {
  beat: ActivityBeat;
  onShowEvidence?: (stepId: string) => void;
}) {
  const { t } = useTranslation();
  switch (beat.type) {
    case 'memory':
      return beat.texts ? <MemoryTexts texts={beat.texts} /> : null;
    case 'plan':
      return beat.reasoning ? (
        <p className={styles.quote}>“{beat.reasoning}”</p>
      ) : null;
    case 'tools':
      return <ToolsDetail beat={beat} onShowEvidence={onShowEvidence} />;
    case 'answer':
      return beat.citedSources.length > 0 ? (
        <div className={styles.chips} data-testid="activity-answer-sources">
          {beat.citedSources.map(source =>
            isTrainingSource(source) ? (
              <span
                key={source.index}
                className={styles.chip}
                title={source.title}
              >
                <SiteIcon
                  url={source.url}
                  favicon={source.favicon}
                  origin={source.origin}
                />
                {/* No site to name, so the chip names the reference itself. */}
                [{source.index}]{' '}
                {source.title.trim() ||
                  t('conversation.activity.evidence.training')}
              </span>
            ) : (
              <a
                key={source.index}
                className={styles.chip}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                title={source.title}
              >
                <SiteIcon url={source.url} favicon={source.favicon} />[
                {source.index}] {source.domain}
              </a>
            )
          )}
        </div>
      ) : null;
    default:
      return null;
  }
}

export function MemoryTexts({
  texts,
}: {
  texts: { core: string[]; recalled: string[] };
}) {
  const { t } = useTranslation();
  const groups = [
    {
      label: t('conversation.activity.evidence.recalledLabel'),
      items: texts.recalled,
    },
    { label: t('conversation.activity.evidence.coreLabel'), items: texts.core },
  ].filter(g => g.items.length > 0);
  return (
    <div data-testid="activity-memory-texts">
      {groups.map(group => (
        <div key={group.label} className={styles.memoryGroup}>
          <span className={styles.groupLabel}>{group.label}</span>
          <ul>
            {group.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ToolsDetail({
  beat,
  onShowEvidence,
}: {
  beat: Extract<ActivityBeat, { type: 'tools' }>;
  onShowEvidence?: (stepId: string) => void;
}) {
  const { t } = useTranslation();
  const hidden = beat.calls.reduce(
    (n, c) => n + Math.max(0, c.sources.length - PREVIEW_SOURCES),
    0
  );
  const total = beat.calls.reduce((n, c) => n + c.sources.length, 0);
  return (
    <>
      {beat.todos && beat.todos.length > 0 && (
        <ul className={styles.todoList} data-testid="activity-todos">
          {beat.todos.map((todo, i) => (
            <li key={i} className={styles.todoItem} data-status={todo.status}>
              <span aria-hidden="true">
                {todo.status === 'completed'
                  ? '☑'
                  : todo.status === 'in_progress'
                    ? '◐'
                    : '☐'}
              </span>
              <span className={styles.todoContent}>{todo.content}</span>
            </li>
          ))}
        </ul>
      )}
      {beat.calls.length > 0 && (
        <div className={styles.well} data-testid="activity-calls">
          {beat.calls.map(call => (
            <CallRow key={call.key} call={call} />
          ))}
          {total > 0 && onShowEvidence && (
            <div className={styles.wellFooter}>
              {beat.cited != null && (
                <span>
                  {t('conversation.activity.evidence.stepSummary', {
                    found: total,
                    cited: beat.cited,
                  })}
                </span>
              )}
              {hidden > 0 && beat.cited == null && (
                <span>
                  {t('conversation.activity.beat.moreResults', {
                    count: hidden,
                  })}
                </span>
              )}
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => onShowEvidence(beat.id)}
                data-testid="activity-show-evidence"
              >
                {t('conversation.activity.beat.moreInEvidence', {
                  count: total,
                })}
              </button>
            </div>
          )}
          {beat.budget && beat.family === 'search' && (
            <div className={styles.wellFooter}>
              <span>{t('conversation.activity.beat.budget', beat.budget)}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function CallRow({ call }: { call: ActivityCallView }) {
  const { t } = useTranslation();
  const preview = call.sources.slice(0, PREVIEW_SOURCES);
  let meta: string | undefined;
  let note: React.ReactNode = null;
  switch (call.status) {
    case 'running':
      meta = t('conversation.activity.call.running');
      break;
    case 'done':
      meta = [
        call.resultCount != null
          ? call.resultCount > 0
            ? t('conversation.activity.call.results', {
                count: call.resultCount,
              })
            : t('conversation.activity.call.noResults')
          : null,
        call.durationMs != null ? formatDuration(call.durationMs) : null,
      ]
        .filter(Boolean)
        .join(' · ');
      break;
    case 'skipped':
      note = (
        <span className={styles.callNote}>
          {t('conversation.activity.call.skipped')}
        </span>
      );
      break;
    case 'denied':
      note = (
        <span className={styles.callNote}>
          {t('conversation.activity.call.denied')}
        </span>
      );
      break;
    case 'failed':
      note = (
        <span className={styles.callError}>
          {t('conversation.activity.call.failed', { error: call.error ?? '' })}
        </span>
      );
      break;
    case 'stopped':
      meta = t('conversation.activity.call.stopped');
      break;
    default:
      break;
  }
  const leading =
    call.status === 'running' ? (
      <span className={styles.callDot} aria-hidden="true" />
    ) : call.status === 'done' ? (
      <Check
        size={13}
        className={`${styles.callIcon} ${styles.statusDone}`}
        aria-hidden="true"
      />
    ) : (
      <Icon src={ICONS.SEARCH} size={13} className={styles.callIcon} />
    );
  return (
    <div
      className={styles.callRow}
      data-testid="activity-call"
      data-call-status={call.status}
    >
      <div className={styles.callHead}>
        {leading}
        <span className={styles.callText}>
          <span className={styles.callQuery}>{call.query ?? call.name}</span>
          {call.purpose && (
            <span className={styles.callPurpose}>{call.purpose}</span>
          )}
          {note}
        </span>
        {meta && <span className={styles.callMeta}>{meta}</span>}
      </div>
      {preview.length > 0 && (
        <ul className={styles.sourceList}>
          {preview.map(source => (
            <SourceRow
              key={source.index}
              source={source}
              cited={source.cited}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
