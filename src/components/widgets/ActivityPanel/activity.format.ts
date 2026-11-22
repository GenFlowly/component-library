import type { TFunction } from 'i18next';
import type {
  ActivityBeat,
  ActivityCurrent,
  ActivityPhaseId,
  ActivityToolFamily,
  ActivityView,
} from './activity.reduce';

/** "0.4s", "4.8s", "14s", "1m 05s". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '';
  const value = Math.max(0, ms);
  if (value < 10_000) return `${Math.max(0.1, value / 1000).toFixed(1)}s`;
  if (value < 60_000) return `${Math.round(value / 1000)}s`;
  const minutes = Math.floor(value / 60_000);
  const seconds = Math.round((value % 60_000) / 1000);
  return seconds === 60
    ? `${minutes + 1}m 00s`
    : `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

/** "docs.python.org" for https://docs.python.org/3/…; the raw url when unparsable. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** The letter shown when a site has no usable icon. */
export function monogramOf(domain: string): string {
  const match = domain.match(/[a-z0-9]/i);
  return match ? match[0].toUpperCase() : '?';
}

/** Only https icons load: http ones are mixed content and blocked on iOS. */
export function usableFavicon(favicon?: string | null): string | undefined {
  return favicon && favicon.startsWith('https://') ? favicon : undefined;
}

/**
 * A source's publish date as a short calendar date ("Oct 25, 2026").
 * Providers send midnight UTC for a calendar date, so it is shown in UTC;
 * the viewer's timezone would move it to the previous day west of Greenwich.
 */
export function formatSourceDate(
  raw: string | null | undefined,
  locale?: string
): string | undefined {
  if (!raw) return undefined;
  const time = Date.parse(raw);
  if (Number.isNaN(time)) return undefined;
  return new Date(time).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const FRIENDLY_TOOLS: Record<string, string> = {
  web_search: 'conversation.activity.tool.webSearch',
  search_knowledge_base: 'conversation.activity.tool.knowledge',
  spawn_agent: 'conversation.activity.tool.subagent',
  write_todos: 'conversation.activity.tool.plan',
  fs_read: 'conversation.activity.tool.fileRead',
  fs_write: 'conversation.activity.tool.fileWrite',
  fs_list: 'conversation.activity.tool.fileList',
  generate_pdf: 'conversation.activity.tool.pdf',
};

export function toolLabel(t: TFunction, name: string): string {
  const key = FRIENDLY_TOOLS[name];
  return key ? t(key) : name;
}

function toolList(t: TFunction, names: string[]): string {
  return names
    .filter((n, i) => names.indexOf(n) === i)
    .map(n => toolLabel(t, n))
    .join(', ');
}

export function phaseLabel(
  t: TFunction,
  id: ActivityPhaseId,
  view: ActivityView
): string {
  if (id === 'search') {
    const families = view.beats
      .filter(b => b.type === 'tools')
      .map(b => (b as { family: ActivityToolFamily }).family);
    const onlySearch =
      families.length > 0 && families.every(f => f === 'search');
    return t(
      onlySearch
        ? 'conversation.activity.phase.search'
        : 'conversation.activity.phase.tools'
    );
  }
  return t(`conversation.activity.phase.${id}`);
}

/** The bold one-line title of a story beat. */
export function beatTitle(t: TFunction, beat: ActivityBeat): string {
  switch (beat.type) {
    case 'memory': {
      const { core, recalled } = beat.counts;
      if (core + recalled === 0)
        return t('conversation.activity.beat.memoryNone');
      if (recalled > 0)
        return t('conversation.activity.beat.memoryRecalled', {
          core,
          recalled,
        });
      return t('conversation.activity.beat.memoryCore', { count: core });
    }
    case 'plan': {
      const count = beat.requests.length;
      if (beat.family === 'search')
        return t(
          beat.round > 1
            ? 'conversation.activity.beat.planMoreSearches'
            : 'conversation.activity.beat.planSearches',
          { count }
        );
      if (beat.family === 'subagent')
        return t('conversation.activity.beat.planDelegate', { count });
      if (beat.family === 'plan')
        return t('conversation.activity.beat.planPlan');
      return t('conversation.activity.beat.planTools', {
        tools: toolList(
          t,
          beat.requests.map(r => r.name)
        ),
      });
    }
    case 'tools': {
      const count = beat.calls.length;
      switch (beat.family) {
        case 'search':
          return t('conversation.activity.beat.toolsSearch', { count });
        case 'knowledge':
          return t('conversation.activity.beat.toolsKnowledge', { count });
        case 'subagent':
          return t('conversation.activity.beat.toolsSubagent', { count });
        case 'plan':
          return t('conversation.activity.beat.toolsPlan');
        case 'files':
          return t('conversation.activity.beat.toolsFiles');
        default:
          return t('conversation.activity.beat.toolsOther', {
            count,
            tools: toolList(
              t,
              beat.calls.map(c => c.name)
            ),
          });
      }
    }
    case 'read':
      return beat.sourcesRead > 0
        ? t('conversation.activity.beat.read', { count: beat.sourcesRead })
        : t('conversation.activity.beat.readNone');
    case 'answer':
      if (beat.outcome === 'structured')
        return t('conversation.activity.beat.answerStructured');
      return beat.citedSources.length > 0
        ? t('conversation.activity.beat.answerFromSources', {
            count: beat.citedSources.length,
          })
        : t('conversation.activity.beat.answer');
    case 'thinking': {
      const doing = beat.writing ? 'Writing' : 'Thinking';
      if (beat.status === 'stopped')
        return t(`conversation.activity.beat.stopped${doing}`);
      if (beat.status === 'failed')
        return t(`conversation.activity.beat.failed${doing}`);
      return t(
        beat.writing
          ? 'conversation.activity.beat.writing'
          : 'conversation.activity.beat.thinking'
      );
    }
    case 'output':
      return (
        beat.summary ??
        t('conversation.activity.beat.output', { name: beat.name })
      );
    case 'empty':
      return t('conversation.activity.beat.empty', { name: beat.name });
    case 'input':
      return t('conversation.activity.beat.input');
    default:
      return '';
  }
}

/** What the agent is doing right now, for the live header ("searching: …"). */
export function currentLabel(
  t: TFunction,
  current?: ActivityCurrent
): string | undefined {
  if (!current) return undefined;
  switch (current.kind) {
    case 'memory':
      return t('conversation.activity.current.memory');
    case 'thinking':
      return t('conversation.activity.current.thinking');
    case 'writing':
      return t('conversation.activity.current.writing');
    case 'search':
      return current.query
        ? t('conversation.activity.current.searchQuery', {
            query: current.query,
          })
        : t('conversation.activity.current.search');
    case 'tool':
      return t('conversation.activity.current.tool', {
        tool: toolLabel(t, current.name),
      });
    case 'input':
      return t('conversation.activity.current.input');
    default:
      return undefined;
  }
}

/** The collapsed header: "Thought for 22s · 6 searches · 31 sources, 6 cited". */
export function headerParts(
  t: TFunction,
  view: ActivityView
): { title: string; summary: string[] } {
  const time = formatDuration(view.totalMs);
  const summary: string[] = [];
  let title: string;
  switch (view.status) {
    case 'live':
      title = t('conversation.activity.header.thinking');
      if (time) summary.push(time);
      {
        const now = currentLabel(t, view.current);
        if (now) summary.push(now);
      }
      return { title, summary };
    case 'failed':
      title = time
        ? t('conversation.activity.header.failedAfter', { time })
        : t('conversation.activity.header.failed');
      break;
    case 'stopped':
      title = time
        ? t('conversation.activity.header.stoppedAfter', { time })
        : t('conversation.activity.header.stopped');
      break;
    default:
      title = time
        ? t('conversation.activity.header.thoughtFor', { time })
        : t('conversation.activity.header.thought');
  }
  if (view.searches.used > 0)
    summary.push(
      t('conversation.activity.header.searches', { count: view.searches.used })
    );
  if (view.sources.found > 0) {
    summary.push(
      view.sources.cited != null
        ? t('conversation.activity.header.sourcesCited', {
            count: view.sources.found,
            cited: view.sources.cited,
          })
        : t('conversation.activity.header.sources', {
            count: view.sources.found,
          })
    );
  }
  return { title, summary };
}
