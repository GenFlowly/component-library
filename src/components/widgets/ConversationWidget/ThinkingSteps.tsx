import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Brain,
  FileSearch,
  Globe,
  LucideIcon,
  Sparkles,
  Wrench,
} from 'lucide-react';
import ScrollArea from '../../common/ScrollArea/ScrollArea';
import TextContainer from '../../common/TextContainer/TextContainer';
import {
  ThinkingStep,
  ThinkingStepKind,
  ThinkingStepToolCall,
  WebSource,
} from './conversation.models';
import styles from './ThinkingSteps.module.scss';

const KIND_ICONS: Record<ThinkingStepKind, LucideIcon> = {
  LLM: Brain,
  MEMORY: BookOpen,
  RETRIEVAL: FileSearch,
  WEB_SEARCH: Globe,
  REFLECTION: Sparkles,
  TOOL: Wrench,
};

/** `web_search(query="...", topic="news")` — mirrors the backend's own
 * plain-text fallback formatting so a call reads the same way whether it
 * arrives via `detail`/`items` (older backend) or the structured fields.
 * Args are shown in full, untruncated — the query text is often the one
 * thing worth reading a tool call for. */
function formatToolCall(call: {
  name: string;
  args?: Record<string, unknown>;
}): string {
  const entries = Object.entries(call.args || {});
  if (entries.length === 0) return call.name;
  const parts = entries.map(([key, value]) => {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    return typeof value === 'string' ? `${key}="${raw}"` : `${key}=${raw}`;
  });
  return `${call.name}(${parts.join(', ')})`;
}

/** {index, title, url} results as clickable links — shared by a tool call's
 * own sources and a WEB_SEARCH step's full result list. */
function SourceLinks({ sources }: { sources: WebSource[] }) {
  return (
    <ul className={styles.sourceLinks}>
      {sources.map(source => (
        <li key={source.index}>
          <span className={styles.sourceIndex}>[{source.index}]</span>
          <a
            className={styles.sourceLink}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={source.url}
          >
            {source.title || source.url}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** One individual tool call's breakdown: its call signature, then either its
 * error or its own sources — never a merged list across calls. */
function ToolCallBlock({ call }: { call: ThinkingStepToolCall }) {
  return (
    <div className={styles.toolCall} data-testid="thinking-step-tool-call">
      <span className={styles.toolCallSignature}>{formatToolCall(call)}</span>
      {call.error ? (
        <span className={styles.toolCallError}>{call.error}</span>
      ) : (
        call.sources &&
        call.sources.length > 0 && <SourceLinks sources={call.sources} />
      )}
    </div>
  );
}

/**
 * One step row. Owns its own expand/collapse: expanded by default while the
 * turn is actively thinking, one-shot auto-collapses to a compact summary
 * (icon + name + detail) the instant the turn's final answer lands — the
 * same expand-then-collapse hook the whole panel used to apply once, now
 * fanned out per row so each step's prompt/response is independently
 * inspectable afterward. A step needs its own component (not inlined in the
 * parent's .map()) so this hook state is stable per row across re-renders.
 */
function ThinkingStepRow({
  step,
  isThinking,
  isFinalAnswer,
  isOrphanAnswer,
}: {
  step: ThinkingStep;
  isThinking: boolean;
  /** True for the terminal generator step whose response IS the message's
   * answer, already rendered in full by the outer TextContainer below —
   * its response block is skipped rather than shown twice, and its
   * "Response generated" detail line is dropped as stating the obvious. */
  isFinalAnswer: boolean;
  /** Terminal answer step on a turn whose message has NO answer text
   * (errored/aborted) — its response is the only surviving copy, so it
   * renders even though it would otherwise be considered redundant. */
  isOrphanAnswer: boolean;
}) {
  const { t } = useTranslation();
  const isRunning = step.status === 'running';
  const [expanded, setExpanded] = useState(isThinking);

  useEffect(() => {
    if (!isThinking) setExpanded(false);
  }, [isThinking]);

  const KindIcon = step.kind ? KIND_ICONS[step.kind] : undefined;
  const heading = isRunning ? step.label || step.name : step.name;

  const hasStructuredToolCalls = !isRunning && !!step.tool_calls?.length;
  const hasStructuredCalls = !isRunning && !!step.calls?.length;
  const hasStructuredSources = !isRunning && !!step.sources?.length;
  const hasItems = !isRunning && !!step.items && step.items.length > 0;
  // The response block only earns its place when it says something the row
  // doesn't already: a tool-calling round's response is the preamble shown
  // as narration above, and pipeline nodes' detail line ("Intent: …",
  // "Rewrote the query to: …") already carries their outcome. The one
  // override is an errored turn's terminal step, where the response is the
  // only copy of the answer left.
  const showResponse =
    !isRunning &&
    !!step.response &&
    !isFinalAnswer &&
    (isOrphanAnswer ||
      (!step.tool_calls?.length &&
        !step.detail &&
        step.response !== step.reasoning));

  // reasoning is deliberately NOT part of this: it renders always-visible
  // below (it's the turn's narration), so it alone never warrants a toggle.
  const hasDetails =
    !isRunning &&
    (hasStructuredToolCalls ||
      hasStructuredCalls ||
      hasStructuredSources ||
      hasItems ||
      !!step.prompt ||
      showResponse);

  return (
    <li
      className={styles.step}
      data-testid="thinking-step"
      data-status={step.status}
    >
      <span className={styles.stepHeader}>
        {KindIcon && (
          <KindIcon className={styles.kindIcon} size={14} aria-hidden="true" />
        )}
        {isRunning && (
          <span className={styles.pulse} data-testid="thinking-step-pulse" />
        )}
        <span className={styles.stepName}>{heading}</span>
        {hasDetails && (
          <button
            type="button"
            className={styles.rowToggle}
            onClick={() => setExpanded(prev => !prev)}
            aria-expanded={expanded}
            data-testid="thinking-step-toggle"
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
      </span>
      {/* Narration the model wrote alongside its tool calls ("Let me look
          up…") stays visible in the flow even when the row is collapsed —
          it's part of the turn's story, like the detail line, not a debug
          artifact to tuck behind the expander. */}
      {!isRunning && step.reasoning && (
        <span
          className={styles.reasoning}
          data-testid="thinking-step-reasoning"
        >
          {step.reasoning}
        </span>
      )}
      {/* The terminal step's "Response generated" detail is dropped — the
          answer sitting right below already says so. */}
      {!isRunning &&
        step.detail &&
        !hasStructuredToolCalls &&
        !isFinalAnswer && <span className={styles.detail}>{step.detail}</span>}
      {expanded && (
        <>
          {hasStructuredToolCalls && (
            <ul className={styles.items} data-testid="thinking-step-tool-calls">
              {step.tool_calls!.map((call, j) => (
                <li key={j}>{formatToolCall(call)}</li>
              ))}
            </ul>
          )}
          {hasStructuredCalls && (
            <div className={styles.toolCalls} data-testid="thinking-step-calls">
              {step.calls!.map((call, j) => (
                <ToolCallBlock key={j} call={call} />
              ))}
            </div>
          )}
          {!hasStructuredCalls && !hasStructuredSources && hasItems && (
            <ul className={styles.items} data-testid="thinking-step-items">
              {step.items!.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )}
          {hasStructuredSources && <SourceLinks sources={step.sources!} />}
          {step.prompt && (
            <div
              className={styles.promptBlock}
              data-testid="thinking-step-prompt"
            >
              <span className={styles.blockLabel}>
                {t('conversation.response.thinkingPrompt')}
              </span>
              <ScrollArea as="pre" className={styles.expanderContent}>
                {step.prompt}
              </ScrollArea>
            </div>
          )}
          {showResponse && (
            <div
              className={styles.responseBlock}
              data-testid="thinking-step-response"
            >
              <TextContainer
                title={step.name}
                content={step.response!}
                showCopyButton
                data-testid="thinking-step-response-container"
              />
            </div>
          )}
        </>
      )}
    </li>
  );
}

/**
 * Structured per-node steps of the agent graph's thinking phase, in arrival
 * order. Each step is its own row (see ThinkingStepRow) — expanded while the
 * turn is thinking, collapsing to a one-line summary once the final answer
 * lands. Historical/loaded conversations (isThinking always false) render
 * every step collapsed by default; the user can still expand any of them.
 */
/** Index of the terminal generator step — the LAST completed LLM-backed step
 * that produced answer text rather than tool calls. Its `response` IS the
 * message's answer (modulo server-side trace truncation, which is why this
 * is structural instead of comparing text), so its response block is never
 * rendered inside the thinking flow. -1 when no step qualifies. */
function finalAnswerStepIndex(steps: ThinkingStep[]): number {
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (
      step.status === 'done' &&
      (step.kind === 'LLM' || step.kind === 'REFLECTION') &&
      !!step.response &&
      !step.tool_calls?.length
    ) {
      return i;
    }
  }
  return -1;
}

export default function ThinkingSteps({
  steps,
  isThinking = false,
  finalText = '',
}: {
  steps: ThinkingStep[];
  isThinking?: boolean;
  finalText?: string;
}) {
  if (steps.length === 0) return null;

  // Only dedup against an answer the message actually shows — on an errored
  // turn with no answer text, the terminal step's response is the only copy
  // left and renders instead (isOrphanAnswer).
  const terminalIdx = finalAnswerStepIndex(steps);
  const hasFinalText = finalText.trim().length > 0;

  return (
    <ol className={styles.steps} data-testid="thinking-step-list">
      {steps.map((step, i) => (
        // Cycles legitimately repeat a node id — suffix with the position;
        // the list is append-only so this stays a stable key.
        <ThinkingStepRow
          key={`${step.node}-${i}`}
          step={step}
          isThinking={isThinking}
          isFinalAnswer={i === terminalIdx && hasFinalText}
          isOrphanAnswer={i === terminalIdx && !hasFinalText}
        />
      ))}
    </ol>
  );
}
