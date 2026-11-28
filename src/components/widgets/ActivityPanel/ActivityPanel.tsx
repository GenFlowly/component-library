import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import Chevron from '../../common/SidebarListPanel/Chevron';
import {
  WebSource,
  isTrainingSource,
} from '../ConversationWidget/conversation.models';
import { ActivityEvent } from './activity.models';
import { reduceActivity } from './activity.reduce';
import { headerParts } from './activity.format';
import ActivityReceipt from './ActivityReceipt';
import ActivityStory from './ActivityStory';
import ActivityEvidence, {
  EvidenceFilter,
  defaultEvidenceFilter,
} from './ActivityEvidence';
import styles from './ActivityPanel.module.scss';

export type ActivityPanelView = 'story' | 'evidence';

export interface ActivityPanelProps {
  /** The turn's activity log, in stream order. */
  events?: ActivityEvent[] | null;
  /** The turn is still generating. Drives the live clock and, with the log, the open state. */
  isLive: boolean;
  /**
   * The message's sources. Older logs carry no citations on turn.end; for a
   * finished turn this list then stands in for what the answer cites.
   */
  citedSources?: WebSource[] | null;
  /** The message's stop reason ("cancelled" when the user stopped it). */
  stopReason?: string | null;
  /** The view the panel opens on. */
  defaultView?: ActivityPanelView;
  /** Start expanded. Defaults to open while the agent thinks and folded otherwise. */
  defaultOpen?: boolean;
  className?: string;
  'data-testid'?: string;
}

const LIVE_TICK_MS = 250;
const FOCUS_HIGHLIGHT_MS = 1600;

/**
 * Milliseconds since the turn started on the server's clock, ticking while
 * live. Anchored to the newest event's `at`, so network delay never makes
 * the clock run behind the events it shows.
 */
function useLiveNow(
  events: ActivityEvent[],
  isLive: boolean
): number | undefined {
  const lastAt = events.reduce(
    (max, e) => (typeof e.at === 'number' && e.at > max ? e.at : max),
    0
  );
  const anchor = useRef<{ at: number; local: number } | null>(null);
  if (!anchor.current || lastAt > anchor.current.at) {
    anchor.current = { at: lastAt, local: performance.now() };
  }
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isLive) return undefined;
    const id = setInterval(() => setTick(n => n + 1), LIVE_TICK_MS);
    return () => clearInterval(id);
  }, [isLive]);
  if (!isLive) return undefined;
  return anchor.current.at + (performance.now() - anchor.current.local);
}

/**
 * The agent's activity for one response: what it thought, what it ran and
 * why, what came back, how long each step took, and which sources the answer
 * rests on. Open while the agent thinks, folded to one summary line once the
 * answer streams (the log says so, never the answer text, so a tool-call
 * preamble can't fold it) or the turn ends, and reopened on demand. Two views
 * of the same turn: Story, the step-by-step narrative, and Evidence, every
 * source grouped by the step that found it.
 */
export default function ActivityPanel({
  events,
  isLive,
  citedSources,
  stopReason,
  defaultView = 'story',
  defaultOpen,
  className = '',
  'data-testid': testId = 'activity-panel',
}: ActivityPanelProps) {
  const { t } = useTranslation();
  const uid = useId();
  const log = useMemo(() => events ?? [], [events]);
  const nowMs = useLiveNow(log, isLive);
  const view = useMemo(
    () =>
      reduceActivity(log, {
        isLive,
        nowMs,
        stopReason,
        citedFallback: citedSources?.map(s => s.index) ?? null,
        knowledgeSources: citedSources?.filter(isTrainingSource) ?? null,
      }),
    [log, isLive, nowMs, stopReason, citedSources]
  );

  const isThinking = view.status === 'live' && !view.answering;
  const [open, setOpen] = useState(defaultOpen ?? isThinking);
  const wasThinking = useRef(isThinking);
  useEffect(() => {
    if (isThinking && !wasThinking.current) setOpen(true);
    if (!isThinking && wasThinking.current) setOpen(false);
    wasThinking.current = isThinking;
  }, [isThinking]);

  const [mode, setMode] = useState<ActivityPanelView>(defaultView);
  const [filter, setFilter] = useState<EvidenceFilter | null>(null);
  const [focus, setFocus] = useState<{ beat?: string; step?: string } | null>(
    null
  );
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    },
    []
  );

  const jump = useCallback(
    (
      to: ActivityPanelView,
      target: { beat?: string; step?: string },
      elementId: string
    ) => {
      setMode(to);
      setFocus(target);
      if (focusTimer.current) clearTimeout(focusTimer.current);
      focusTimer.current = setTimeout(() => setFocus(null), FOCUS_HIGHLIGHT_MS);
      requestAnimationFrame(() => {
        const el = document.getElementById(elementId);
        el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      });
    },
    []
  );

  if (view.isEmpty && !isLive) return null;

  const { title, summary } = headerParts(t, view);
  const bodyId = `${uid}-activity-body`;
  const evidenceCount = view.sources.found;
  const evidenceFilter = filter ?? defaultEvidenceFilter(view);

  return (
    <section
      className={`${styles.panel} ${className}`}
      aria-label={t('conversation.activity.panelLabel')}
      data-testid={testId}
      data-status={view.status}
      data-thinking={isThinking || undefined}
    >
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={
          open
            ? t('conversation.activity.header.hide')
            : t('conversation.activity.header.show')
        }
        data-testid="activity-header"
      >
        {view.status === 'live' && (
          <span className={styles.pulse} aria-hidden="true" />
        )}
        {view.status === 'done' && (
          <span
            className={`${styles.statusIcon} ${styles.statusDone}`}
            aria-hidden="true"
          >
            <Check size={14} strokeWidth={3} />
          </span>
        )}
        <span className={styles.headerText}>
          <span className={styles.headerTitle}>{title}</span>
          {summary.map((part, i) => (
            <span key={i} className={styles.headerSummary}>
              {` · ${part}`}
            </span>
          ))}
        </span>
        <span className={styles.headerChevron}>
          <Chevron expanded={open} />
        </span>
      </button>

      {open && (
        <div id={bodyId} className={styles.panel} style={{ margin: 0 }}>
          {view.hasReceipt && <ActivityReceipt view={view} />}
          {!view.isEmpty && (
            <>
              <div
                className={styles.switch}
                role="tablist"
                aria-label={t('conversation.activity.view.label')}
              >
                <button
                  type="button"
                  role="tab"
                  id={`${uid}-tab-story`}
                  aria-selected={mode === 'story'}
                  aria-controls={`${uid}-panel-story`}
                  className={`${styles.switchTab} ${mode === 'story' ? styles.switchTabOn : ''}`}
                  onClick={() => setMode('story')}
                  data-testid="activity-tab-story"
                >
                  {t('conversation.activity.view.story')}
                  <span className={styles.countBadge}>{view.beats.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  id={`${uid}-tab-evidence`}
                  aria-selected={mode === 'evidence'}
                  aria-controls={`${uid}-panel-evidence`}
                  className={`${styles.switchTab} ${mode === 'evidence' ? styles.switchTabOn : ''}`}
                  onClick={() => setMode('evidence')}
                  data-testid="activity-tab-evidence"
                >
                  {t('conversation.activity.view.evidence')}
                  <span className={styles.countBadge}>{evidenceCount}</span>
                </button>
              </div>
              {mode === 'story' ? (
                <div
                  role="tabpanel"
                  id={`${uid}-panel-story`}
                  aria-labelledby={`${uid}-tab-story`}
                >
                  <ActivityStory
                    view={view}
                    idPrefix={uid}
                    focusedBeatId={focus?.beat ?? null}
                    onShowEvidence={stepId => {
                      setFilter('all');
                      jump(
                        'evidence',
                        { step: stepId },
                        `${uid}-evidence-${stepId}`
                      );
                    }}
                  />
                </div>
              ) : (
                <div
                  role="tabpanel"
                  id={`${uid}-panel-evidence`}
                  aria-labelledby={`${uid}-tab-evidence`}
                >
                  <ActivityEvidence
                    view={view}
                    idPrefix={uid}
                    filter={evidenceFilter}
                    onFilterChange={setFilter}
                    focusedStepId={focus?.step ?? null}
                    onShowInStory={beatId =>
                      jump('story', { beat: beatId }, `${uid}-beat-${beatId}`)
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
