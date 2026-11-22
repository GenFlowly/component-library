import { WebSource } from '../ConversationWidget/conversation.models';

/**
 * The agent activity log (contract v2): the retrieval server's `activity`
 * events for one turn, in stream order. Streamed live as `ac` frames and
 * persisted with the message; this is everything the thinking panel shows.
 * The shapes mirror retrieval-server/activity/schema.py; the JSON files in
 * ./fixtures are copies of that contract's golden logs.
 */
export const ACTIVITY_VERSION = 2;

export type ActivityStepKind = 'memory' | 'llm' | 'tools' | 'input';

/**
 * Why an llm step ended: it asked for tools, it wrote the answer (plain or
 * structured), it produced state for later nodes, or it returned nothing.
 */
export type ActivityLlmOutcome =
  'tool_calls' | 'answer' | 'structured' | 'output' | 'empty';

/**
 * How the tool executor treated a call under the per-turn web-search budget:
 * ran it, ran it with a consolidation note, skipped it, or denied it past the
 * hard cap.
 */
export type ActivityCallMode = 'run' | 'note' | 'skip' | 'exhausted';

/** A citable source with the site icon and publish date when the tool had them. */
export interface ActivitySource extends WebSource {
  favicon?: string;
  /** As the provider sent it (RFC 1123 or ISO); a calendar date, shown in UTC. */
  published_date?: string;
}

/** A tool call as the model requested it. */
export interface ActivityToolRequest {
  id: string;
  name: string;
  args?: Record<string, unknown>;
}

/** One executed tool call: what ran, how the budget treated it, what came back. */
export interface ActivityToolCall {
  id?: string;
  /** 1-based position in the model's call order. */
  seq?: number;
  name: string;
  args?: Record<string, unknown>;
  mode: ActivityCallMode;
  duration_ms?: number | null;
  /** Sources the call returned; null when it failed or does not return sources. */
  result_count?: number | null;
  /** The start of the tool's own result text (a provider error, "no results", …). */
  result_excerpt?: string | null;
  sources?: ActivitySource[];
  artifacts?: unknown[];
  error?: string | null;
  /** Author-only extras, e.g. a subagent's own trace. */
  details?: Record<string, unknown>;
}

/** One item of the agent's plan (the write_todos tool). */
export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface ActivityEventBase {
  v: number;
  /** Milliseconds since the turn started; null for history converted from the old format. */
  at: number | null;
}

export interface TurnStartEvent extends ActivityEventBase {
  type: 'turn.start';
}

export interface StepStartEvent extends ActivityEventBase {
  type: 'step.start';
  id: string;
  kind: ActivityStepKind;
  node: string;
  name: string;
}

/** A streaming llm step wrote its first text (a tool-call preamble or the answer). */
export interface StepProgressEvent extends ActivityEventBase {
  type: 'step.progress';
  id: string;
  first_token_ms: number;
}

/** One call of a running tools step finished; its sources arrive with the step's end. */
export interface StepCallEvent extends ActivityEventBase {
  type: 'step.call';
  id: string;
  call: ActivityToolCall;
}

export interface StepEndEvent extends ActivityEventBase {
  type: 'step.end';
  id: string;
  kind: ActivityStepKind;
  node: string;
  name: string;
  duration_ms?: number;
  /** The run paused for human input while this step was open. */
  interrupted?: boolean;
  /** memory */
  counts?: { core: number; recalled: number };
  /** memory; present only for the turn's author */
  memories?: { core: string[]; recalled: string[] };
  /** llm */
  outcome?: ActivityLlmOutcome;
  first_token_ms?: number;
  reasoning?: string;
  tool_calls?: ActivityToolRequest[];
  summary?: string;
  /** llm; present only for the turn's author */
  developer?: { prompt_excerpt?: string; response_excerpt?: string };
  /** tools */
  calls?: ActivityToolCall[];
  budget?: { used: number; max: number };
  todos?: TodoItem[];
}

export interface TurnEndEvent extends ActivityEventBase {
  type: 'turn.end';
  duration_ms?: number;
  outcome: 'completed' | 'error';
  /** Source indices the final answer cites; present when the turn found any sources. */
  cited?: number[];
}

export type ActivityEvent =
  | TurnStartEvent
  | StepStartEvent
  | StepProgressEvent
  | StepCallEvent
  | StepEndEvent
  | TurnEndEvent;
