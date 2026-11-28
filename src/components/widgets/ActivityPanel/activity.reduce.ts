import {
  ACTIVITY_VERSION,
  ActivityCallMode,
  ActivityEvent,
  ActivityLlmOutcome,
  ActivitySource,
  ActivityStepKind,
  ActivityToolCall,
  ActivityToolRequest,
  StepEndEvent,
  TodoItem,
} from './activity.models';
import { domainOf } from './activity.format';

/**
 * activity log → what the panel shows. Pure: the same events (and the same
 * clock) always give the same view, so live streaming, a reloaded
 * conversation and the tests all go through this one function.
 */

export type ActivityTurnStatus = 'live' | 'done' | 'stopped' | 'failed';
export type ActivityStepStatus = 'running' | 'done' | 'stopped' | 'failed';
export type ActivityPhaseId =
  'setup' | 'memory' | 'plan' | 'search' | 'reason' | 'answer';

export interface ActivityPhase {
  id: ActivityPhaseId;
  ms: number;
  /** The phase the agent is in right now (live only). */
  running: boolean;
}

export interface ActivitySourceView extends ActivitySource {
  domain: string;
  /** null while the turn runs: citations are only known once the answer exists. */
  cited: boolean | null;
  stepId: string;
  callSeq: number;
  query?: string;
}

export type ActivityCallStatus =
  'running' | 'done' | 'skipped' | 'denied' | 'failed' | 'stopped';

export interface ActivityCallView {
  key: string;
  seq: number;
  name: string;
  /** The search query, a subagent's task, or another tool's main argument. */
  query?: string;
  /** Why the agent made this call, in its own words. */
  purpose?: string;
  status: ActivityCallStatus;
  mode?: ActivityCallMode;
  durationMs?: number;
  resultCount?: number | null;
  excerpt?: string;
  error?: string;
  sources: ActivitySourceView[];
  hasDetails: boolean;
}

export type ActivityToolFamily =
  'search' | 'knowledge' | 'subagent' | 'plan' | 'files' | 'other';

interface BeatBase {
  id: string;
  status: ActivityStepStatus;
  durationMs: number | null;
}

export type ActivityBeat =
  | (BeatBase & {
      type: 'memory';
      counts: { core: number; recalled: number };
      texts?: { core: string[]; recalled: string[] };
    })
  | (BeatBase & {
      type: 'plan';
      /** 1-based count of tool-calling rounds so far. */
      round: number;
      reasoning?: string;
      requests: ActivityToolRequest[];
      family: ActivityToolFamily;
    })
  | (BeatBase & {
      type: 'tools';
      family: ActivityToolFamily;
      calls: ActivityCallView[];
      found: number;
      cited: number | null;
      budget?: { used: number; max: number };
      todos?: TodoItem[];
    })
  | (BeatBase & { type: 'read'; sourcesRead: number })
  | (BeatBase & {
      type: 'answer';
      outcome: ActivityLlmOutcome;
      citedSources: ActivitySourceView[];
    })
  | (BeatBase & { type: 'thinking'; writing: boolean; name: string })
  | (BeatBase & { type: 'output'; name: string; summary?: string })
  | (BeatBase & { type: 'empty'; name: string })
  | (BeatBase & { type: 'input'; interrupted: boolean });

export interface ActivityEvidenceGroup {
  stepId: string;
  /** Position of this step among the story's beats, for cross-links. */
  beatId: string;
  family: ActivityToolFamily;
  status: ActivityStepStatus;
  durationMs: number | null;
  calls: ActivityCallView[];
  sources: ActivitySourceView[];
  failedCalls: ActivityCallView[];
  found: number;
  cited: number | null;
}

export interface ActivityDeveloperEntry {
  stepId: string;
  name: string;
  prompt?: string;
  response?: string;
}

export type ActivityCurrent =
  | { kind: 'memory' }
  | { kind: 'thinking' }
  | { kind: 'writing' }
  | { kind: 'search'; query?: string }
  | { kind: 'tool'; name: string }
  | { kind: 'input' };

export interface ActivityView {
  status: ActivityTurnStatus;
  /** True when the log has no events worth showing. */
  isEmpty: boolean;
  /** False when the receipt would only show blanks and zeros (history converted
   * without timings, a plain answer with no tools or memories). */
  hasReceipt: boolean;
  /** Milliseconds the turn took (or has taken so far); null when unknown. */
  totalMs: number | null;
  phases: ActivityPhase[];
  searches: { used: number; max: number | null };
  sources: { found: number; cited: number | null };
  memories: { core: number; recalled: number };
  memoryTexts?: { core: string[]; recalled: string[] };
  beats: ActivityBeat[];
  evidence: ActivityEvidenceGroup[];
  /** Cited from the model's own knowledge: counted with the sources, found by no step. */
  knowledge: ActivitySourceView[];
  developer: ActivityDeveloperEntry[];
  current?: ActivityCurrent;
  /** The answer is streaming, so the agent is done thinking (live only). */
  answering: boolean;
}

export interface ReduceOptions {
  isLive: boolean;
  /** Milliseconds since the turn started, on the server's clock (live only). */
  nowMs?: number;
  /** The message's stop reason; "cancelled" means the user stopped it. */
  stopReason?: string | null;
  /** Cited source indices for logs whose turn.end carries none (older records). */
  citedFallback?: number[] | null;
  /**
   * Sources the answer cites from the model's own knowledge. No step found
   * them, so they come from the message's source list, not the log.
   */
  knowledgeSources?: ActivitySource[] | null;
}

interface StepRecord {
  id: string;
  kind: ActivityStepKind;
  node: string;
  name: string;
  startAt: number | null;
  firstTokenMs?: number;
  /** The step began writing a tool call (`step.calling`). */
  calling?: boolean;
  /** The step wrote more than a preamble's worth of text (`step.writing`). */
  writing?: boolean;
  end?: StepEndEvent;
  liveCalls: Map<string, ActivityToolCall>;
}

const KNOWN_TYPES = new Set([
  'turn.start',
  'step.start',
  'step.progress',
  'step.calling',
  'step.writing',
  'step.call',
  'step.end',
  'turn.end',
]);

const SEARCH_TOOLS = new Set(['web_search']);
const KNOWLEDGE_TOOLS = new Set(['search_knowledge_base']);
const SUBAGENT_TOOLS = new Set(['spawn_agent']);
const PLAN_TOOLS = new Set(['write_todos']);
const FILE_TOOLS = new Set(['fs_read', 'fs_write', 'fs_list']);
/** The step id knowledge sources carry: no step of the log found them. */
const KNOWLEDGE_STEP = 'knowledge';

export function toolFamily(names: string[]): ActivityToolFamily {
  if (names.length === 0) return 'other';
  const all = (set: Set<string>) => names.every(n => set.has(n));
  if (all(SEARCH_TOOLS)) return 'search';
  if (all(KNOWLEDGE_TOOLS)) return 'knowledge';
  if (all(SUBAGENT_TOOLS)) return 'subagent';
  if (all(PLAN_TOOLS)) return 'plan';
  if (all(FILE_TOOLS)) return 'files';
  return 'other';
}

/** Append one streamed event, ignoring anything that is not a v2 activity event. */
export function appendActivity(
  events: ActivityEvent[] | null | undefined,
  event: unknown
): ActivityEvent[] {
  const list = events ?? [];
  return isActivityEvent(event) ? [...list, event] : list;
}

export function isActivityEvent(event: unknown): event is ActivityEvent {
  if (!event || typeof event !== 'object') return false;
  const e = event as { v?: unknown; type?: unknown };
  return (
    e.v === ACTIVITY_VERSION &&
    typeof e.type === 'string' &&
    KNOWN_TYPES.has(e.type)
  );
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** The argument that says what a call is about: a query, a task, a path. */
function mainArgument(args?: Record<string, unknown>): string | undefined {
  if (!args) return undefined;
  return (
    str(args.query) ??
    str(args.prompt) ??
    str(args.path) ??
    str(args.title) ??
    str(args.filename)
  );
}

function callStatus(
  call: ActivityToolCall,
  stepStatus: ActivityStepStatus
): ActivityCallStatus {
  if (call.error) return 'failed';
  if (call.mode === 'skip') return 'skipped';
  if (call.mode === 'exhausted') return 'denied';
  return stepStatus === 'running' || stepStatus === 'done'
    ? 'done'
    : stepStatus;
}

export function reduceActivity(
  events: ActivityEvent[] | null | undefined,
  options: ReduceOptions
): ActivityView {
  const log = (events ?? []).filter(isActivityEvent);
  const steps: StepRecord[] = [];
  const byId = new Map<string, StepRecord>();
  let turnEnd: Extract<ActivityEvent, { type: 'turn.end' }> | undefined;
  let lastAt = 0;

  const stepFor = (
    id: string,
    kind: ActivityStepKind,
    node: string,
    name: string,
    at: number | null
  ): StepRecord => {
    let step = byId.get(id);
    if (!step) {
      step = { id, kind, node, name, startAt: at, liveCalls: new Map() };
      byId.set(id, step);
      steps.push(step);
    }
    return step;
  };

  for (const event of log) {
    if (typeof event.at === 'number') lastAt = Math.max(lastAt, event.at);
    switch (event.type) {
      case 'step.start':
        stepFor(event.id, event.kind, event.node, event.name, event.at);
        break;
      case 'step.progress': {
        const step = byId.get(event.id);
        if (step) step.firstTokenMs = event.first_token_ms;
        break;
      }
      case 'step.calling': {
        const step = byId.get(event.id);
        if (step) step.calling = true;
        break;
      }
      case 'step.writing': {
        const step = byId.get(event.id);
        if (step) step.writing = true;
        break;
      }
      case 'step.call': {
        const step = byId.get(event.id);
        if (step && event.call) {
          const key =
            event.call.id || `seq-${event.call.seq ?? step.liveCalls.size + 1}`;
          step.liveCalls.set(key, event.call);
        }
        break;
      }
      case 'step.end': {
        const startAt =
          typeof event.at === 'number' && typeof event.duration_ms === 'number'
            ? event.at - event.duration_ms
            : null;
        const step = stepFor(
          event.id,
          event.kind,
          event.node,
          event.name,
          startAt
        );
        step.end = event;
        if (event.first_token_ms != null)
          step.firstTokenMs = event.first_token_ms;
        break;
      }
      case 'turn.end':
        turnEnd = event;
        break;
      default:
        break;
    }
  }

  let status: ActivityTurnStatus;
  if (turnEnd) status = turnEnd.outcome === 'error' ? 'failed' : 'done';
  else if (options.isLive) status = 'live';
  else status = 'stopped';

  const nowMs =
    status === 'live' ? Math.max(options.nowMs ?? lastAt, lastAt) : undefined;
  const totalMs =
    turnEnd?.duration_ms ?? (status === 'live' ? nowMs! : lastAt || null);

  const openStatus: ActivityStepStatus =
    status === 'live' ? 'running' : status === 'failed' ? 'failed' : 'stopped';
  const stepStatus = (step: StepRecord): ActivityStepStatus =>
    step.end ? (step.end.interrupted ? 'stopped' : 'done') : openStatus;
  const stepDuration = (step: StepRecord): number | null => {
    if (step.end?.duration_ms != null) return step.end.duration_ms;
    if (step.startAt == null) return null;
    const until = status === 'live' ? nowMs! : (totalMs ?? lastAt);
    return Math.max(0, until - step.startAt);
  };

  // Interim source lists hold every result, so citations come from turn.end;
  // only a finished turn's own source list may stand in for older records.
  const citedIndices: Set<number> | null = turnEnd?.cited
    ? new Set(turnEnd.cited)
    : status === 'done' && options.citedFallback
      ? new Set(options.citedFallback)
      : null;
  const isCited = (index: number): boolean | null =>
    citedIndices ? citedIndices.has(index) : null;

  // Pair each tools step with the requests of the llm step that asked for it.
  const requestsFor = new Map<string, ActivityToolRequest[]>();
  let pending: ActivityToolRequest[] = [];
  for (const step of steps) {
    if (step.kind === 'llm' && step.end?.outcome === 'tool_calls') {
      pending = step.end.tool_calls ?? [];
    } else if (step.kind === 'tools') {
      requestsFor.set(step.id, pending);
      pending = [];
    }
  }

  const callsOf = (step: StepRecord): ActivityCallView[] => {
    const status = stepStatus(step);
    const requests = requestsFor.get(step.id) ?? [];
    const purposeOf = (id?: string) =>
      str(requests.find(r => r.id === id)?.args?.purpose);
    if (step.end) {
      return (step.end.calls ?? []).map((call, i) => {
        const seq = call.seq ?? i + 1;
        const query = mainArgument(call.args);
        return {
          key: call.id || `seq-${seq}`,
          seq,
          name: call.name,
          query,
          purpose: str(call.args?.purpose) ?? purposeOf(call.id),
          status: callStatus(call, status),
          mode: call.mode,
          durationMs: call.duration_ms ?? undefined,
          resultCount: call.result_count,
          excerpt: str(call.result_excerpt),
          error: str(call.error),
          sources: (call.sources ?? []).map(source => ({
            ...source,
            domain: domainOf(source.url),
            cited: isCited(source.index),
            stepId: step.id,
            callSeq: seq,
            query,
          })),
          hasDetails: !!call.details && Object.keys(call.details).length > 0,
        };
      });
    }
    // Running (or cut off): the requested calls, ticked off as they finish.
    return requests.map((request, i) => {
      const live =
        step.liveCalls.get(request.id) ?? step.liveCalls.get(`seq-${i + 1}`);
      const seq = live?.seq ?? i + 1;
      const base: ActivityCallView = {
        key: request.id || `seq-${seq}`,
        seq,
        name: request.name,
        query: mainArgument(request.args),
        purpose: str(request.args?.purpose),
        status: status === 'running' ? 'running' : status,
        sources: [],
        hasDetails: false,
      };
      if (!live) return base;
      return {
        ...base,
        status: callStatus(live, 'done'),
        mode: live.mode,
        durationMs: live.duration_ms ?? undefined,
        resultCount: live.result_count,
        error: str(live.error),
      };
    });
  };

  const finalAnswer = [...steps]
    .reverse()
    .find(
      s =>
        s.kind === 'llm' &&
        (s.end?.outcome === 'answer' || s.end?.outcome === 'structured')
    );

  // ----- beats, evidence, totals ---------------------------------------------
  const beats: ActivityBeat[] = [];
  const evidence: ActivityEvidenceGroup[] = [];
  const developer: ActivityDeveloperEntry[] = [];
  const foundSources = new Map<number, ActivitySourceView>();
  let memories = { core: 0, recalled: 0 };
  let memoryTexts: { core: string[]; recalled: string[] } | undefined;
  let searchesUsed = 0;
  let searchMax: number | null = null;
  let toolRounds = 0;
  let sawTools = false;

  for (const step of steps) {
    const st = stepStatus(step);
    const durationMs = stepDuration(step);
    const end = step.end;
    if (
      end?.developer &&
      (end.developer.prompt_excerpt || end.developer.response_excerpt)
    ) {
      developer.push({
        stepId: step.id,
        name: step.name,
        prompt: end.developer.prompt_excerpt,
        response: end.developer.response_excerpt,
      });
    }

    if (step.kind === 'memory') {
      const counts = end?.counts ?? { core: 0, recalled: 0 };
      memories = {
        core: memories.core + counts.core,
        recalled: memories.recalled + counts.recalled,
      };
      if (end?.memories) {
        memoryTexts = {
          core: [...(memoryTexts?.core ?? []), ...end.memories.core],
          recalled: [
            ...(memoryTexts?.recalled ?? []),
            ...end.memories.recalled,
          ],
        };
      }
      beats.push({
        type: 'memory',
        id: step.id,
        status: st,
        durationMs,
        counts,
        texts: end?.memories,
      });
      continue;
    }

    if (step.kind === 'input') {
      beats.push({
        type: 'input',
        id: step.id,
        status: st,
        durationMs,
        interrupted: !!end?.interrupted,
      });
      continue;
    }

    if (step.kind === 'tools') {
      sawTools = true;
      const calls = callsOf(step);
      for (const call of calls) {
        // The backend's budget counts every search it dispatched; skipped and
        // denied calls never reached the provider.
        if (
          SEARCH_TOOLS.has(call.name) &&
          call.status !== 'skipped' &&
          call.status !== 'denied'
        ) {
          searchesUsed += 1;
        }
        for (const source of call.sources) {
          if (!foundSources.has(source.index))
            foundSources.set(source.index, source);
        }
      }
      if (end?.budget) searchMax = end.budget.max;
      const sources = calls.flatMap(c => c.sources);
      const citedCount = citedIndices
        ? sources.filter(s => s.cited).length
        : null;
      const family = toolFamily(calls.map(c => c.name));
      beats.push({
        type: 'tools',
        id: step.id,
        status: st,
        durationMs,
        family,
        calls,
        found: sources.length,
        cited: citedCount,
        budget: end?.budget,
        todos: end?.todos,
      });
      evidence.push({
        stepId: step.id,
        beatId: step.id,
        family,
        status: st,
        durationMs,
        calls,
        sources,
        failedCalls: calls.filter(
          c =>
            c.status === 'failed' ||
            c.status === 'skipped' ||
            c.status === 'denied'
        ),
        found: sources.length,
        cited: citedCount,
      });
      continue;
    }

    // llm
    if (!end) {
      beats.push({
        type: 'thinking',
        id: step.id,
        status: st,
        durationMs,
        writing: step.firstTokenMs != null,
        name: step.name,
      });
      continue;
    }
    if (end.outcome === 'tool_calls') {
      toolRounds += 1;
      const requests = end.tool_calls ?? [];
      beats.push({
        type: 'plan',
        id: step.id,
        status: st,
        durationMs,
        round: toolRounds,
        reasoning: str(end.reasoning),
        requests,
        family: toolFamily(requests.map(r => r.name)),
      });
      continue;
    }
    if (step === finalAnswer) {
      const first = step.firstTokenMs;
      const split =
        sawTools && first != null && durationMs != null && first < durationMs;
      if (split) {
        beats.push({
          type: 'read',
          id: `${step.id}#read`,
          status: st,
          durationMs: first!,
          sourcesRead: foundSources.size,
        });
      }
      beats.push({
        type: 'answer',
        id: step.id,
        status: st,
        durationMs: split ? durationMs! - first! : durationMs,
        outcome: end.outcome!,
        citedSources: [],
      });
      continue;
    }
    if (end.outcome === 'output') {
      beats.push({
        type: 'output',
        id: step.id,
        status: st,
        durationMs,
        name: step.name,
        summary: str(end.summary),
      });
      continue;
    }
    if (end.outcome === 'answer' || end.outcome === 'structured') {
      beats.push({
        type: 'output',
        id: step.id,
        status: st,
        durationMs,
        name: step.name,
      });
      continue;
    }
    beats.push({
      type: 'empty',
      id: step.id,
      status: st,
      durationMs,
      name: step.name,
    });
  }

  const cited = citedIndices
    ? Array.from(foundSources.values()).filter(s => citedIndices.has(s.index))
    : null;
  const knowledge: ActivitySourceView[] =
    status === 'live'
      ? []
      : (options.knowledgeSources ?? []).map(source => ({
          ...source,
          domain: '',
          cited: true,
          stepId: KNOWLEDGE_STEP,
          callSeq: 0,
        }));
  const citedCount =
    cited || knowledge.length > 0
      ? (cited?.length ?? 0) + knowledge.length
      : null;
  for (const beat of beats) {
    if (beat.type === 'answer' && citedCount != null) {
      beat.citedSources = [...(cited ?? []), ...knowledge].sort(
        (a, b) => a.index - b.index
      );
    }
  }

  return {
    status,
    isEmpty: steps.length === 0,
    hasReceipt:
      status === 'live' ||
      totalMs != null ||
      searchesUsed > 0 ||
      foundSources.size > 0 ||
      knowledge.length > 0 ||
      memories.core + memories.recalled > 0,
    totalMs,
    phases: phasesOf(steps, {
      status,
      totalMs,
      stepStatus,
      stepDuration,
      finalAnswer,
    }),
    searches: { used: searchesUsed, max: searchMax },
    sources: {
      found: foundSources.size + knowledge.length,
      cited: citedCount,
    },
    memories,
    memoryTexts,
    beats,
    evidence,
    knowledge,
    developer,
    current:
      status === 'live' ? currentOf(steps, stepStatus, callsOf) : undefined,
    answering: status === 'live' && isAnswering(steps, finalAnswer),
  };
}

/**
 * The newest step is the answer: an llm step past a preamble's worth of text
 * with no tool call (`step.writing`, never `step.calling`), or the answer step
 * that just ended.
 */
function isAnswering(steps: StepRecord[], finalAnswer?: StepRecord): boolean {
  const latest = steps[steps.length - 1];
  if (!latest || latest.kind !== 'llm') return false;
  if (latest.end) return latest === finalAnswer;
  return !!latest.writing && !latest.calling;
}

const PHASE_ORDER: ActivityPhaseId[] = [
  'setup',
  'memory',
  'plan',
  'search',
  'reason',
  'answer',
];

function phasesOf(
  steps: StepRecord[],
  ctx: {
    status: ActivityTurnStatus;
    totalMs: number | null;
    stepStatus: (s: StepRecord) => ActivityStepStatus;
    stepDuration: (s: StepRecord) => number | null;
    finalAnswer?: StepRecord;
  }
): ActivityPhase[] {
  const ms: Record<ActivityPhaseId, number> = {
    setup: 0,
    memory: 0,
    plan: 0,
    search: 0,
    reason: 0,
    answer: 0,
  };
  let running: ActivityPhaseId | undefined;
  let sawTools = false;
  let counted = 0;

  for (const step of steps) {
    const duration = ctx.stepDuration(step) ?? 0;
    const live = ctx.stepStatus(step) === 'running';
    counted += duration;
    if (step.kind === 'memory') {
      ms.memory += duration;
      if (live) running = 'memory';
    } else if (step.kind === 'tools') {
      sawTools = true;
      ms.search += duration;
      if (live) running = 'search';
    } else if (step.kind === 'input') {
      ms.setup += duration;
    } else {
      const outcome = step.end?.outcome;
      const first = step.firstTokenMs;
      if (step === ctx.finalAnswer && first != null && first <= duration) {
        ms.reason += first;
        ms.answer += duration - first;
      } else if (live && first != null && first <= duration) {
        ms[sawTools ? 'reason' : 'plan'] += first;
        ms.answer += duration - first;
        running = 'answer';
      } else if (step === ctx.finalAnswer) {
        ms.answer += duration;
      } else if (outcome === 'tool_calls' || (live && !sawTools)) {
        ms[sawTools ? 'reason' : 'plan'] += duration;
        if (live) running = sawTools ? 'reason' : 'plan';
      } else {
        ms.reason += duration;
        if (live) running = 'reason';
      }
    }
  }
  if (ctx.totalMs != null && ctx.totalMs > counted) {
    ms.setup += ctx.totalMs - counted;
  }
  // Live with no step open: the agent is between steps or not started yet.
  if (ctx.status === 'live' && !running) running = 'setup';
  return PHASE_ORDER.filter(id => ms[id] > 0 || running === id).map(id => ({
    id,
    ms: ms[id],
    running: running === id,
  }));
}

function currentOf(
  steps: StepRecord[],
  stepStatus: (s: StepRecord) => ActivityStepStatus,
  callsOf: (s: StepRecord) => ActivityCallView[]
): ActivityCurrent | undefined {
  const open = [...steps].reverse().find(s => stepStatus(s) === 'running');
  if (!open) return undefined;
  if (open.kind === 'memory') return { kind: 'memory' };
  if (open.kind === 'input') return { kind: 'input' };
  if (open.kind === 'tools') {
    const calls = callsOf(open);
    const next = calls.find(c => c.status === 'running') ?? calls[0];
    if (next && SEARCH_TOOLS.has(next.name))
      return { kind: 'search', query: next.query };
    return { kind: 'tool', name: next?.name ?? open.name };
  }
  return open.firstTokenMs != null ? { kind: 'writing' } : { kind: 'thinking' };
}
