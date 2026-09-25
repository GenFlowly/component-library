import React from 'react';
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

/** Collapsed-by-default monospace block for a step's prompt or raw response. */
function StepExpander({
  label,
  text,
  testId,
}: {
  label: string;
  text: string;
  testId: string;
}) {
  return (
    <details className={styles.expander} data-testid={testId}>
      <summary className={styles.expanderSummary}>{label}</summary>
      <ScrollArea as="pre" className={styles.expanderContent}>
        {text}
      </ScrollArea>
    </details>
  );
}

/** `web_search(query="...", topic="news")` — mirrors the backend's own
 * plain-text fallback formatting so a call reads the same way whether it
 * arrives via `detail`/`items` (older backend) or the structured fields. */
function formatToolCall(call: {
  name: string;
  args?: Record<string, unknown>;
}): string {
  const entries = Object.entries(call.args || {});
  if (entries.length === 0) return call.name;
  const parts = entries.map(([key, value]) => {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    const truncated = raw.length > 60 ? `${raw.slice(0, 57)}...` : raw;
    return typeof value === 'string'
      ? `${key}="${truncated}"`
      : `${key}=${truncated}`;
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
 * Structured per-node steps of the agent graph's thinking phase, in arrival
 * order. Running steps show their live label with a pulse; finished ones show
 * the node name, a detail line, retrieved items, and (for LLM-backed nodes)
 * prompt/response expanders.
 */
export default function ThinkingSteps({ steps }: { steps: ThinkingStep[] }) {
  const { t } = useTranslation();

  if (steps.length === 0) return null;

  return (
    <ol className={styles.steps} data-testid="thinking-step-list">
      {steps.map((step, i) => {
        const isRunning = step.status === 'running';
        // A known kind gets its icon; legacy flat strings have none
        const KindIcon = step.kind ? KIND_ICONS[step.kind] : undefined;
        const heading = isRunning ? step.label || step.name : step.name;

        // A tool-calling generator turn: reasoning + structured call
        // signatures replace the generic "Calling tools: x, y, z" detail
        // string when present, rather than showing both.
        const hasStructuredToolCalls = !isRunning && !!step.tool_calls?.length;
        // TOOL_EXECUTOR's own per-call breakdown (query + that call's own
        // sources) replaces the flattened, cross-call items list.
        const hasStructuredCalls = !isRunning && !!step.calls?.length;
        // WEB_SEARCH's full untruncated {index,title,url} list replaces its
        // capped, title-only items list.
        const hasStructuredSources = !isRunning && !!step.sources?.length;

        return (
          <li
            // Cycles legitimately repeat a node id — suffix with the
            // position; the list is append-only so this stays stable
            key={`${step.node}-${i}`}
            className={styles.step}
            data-testid="thinking-step"
            data-status={step.status}
          >
            <span className={styles.stepHeader}>
              {KindIcon && (
                <KindIcon
                  className={styles.kindIcon}
                  size={14}
                  aria-hidden="true"
                />
              )}
              {isRunning && (
                <span
                  className={styles.pulse}
                  data-testid="thinking-step-pulse"
                />
              )}
              <span className={styles.stepName}>{heading}</span>
            </span>
            {!isRunning && step.reasoning && (
              <span
                className={styles.reasoning}
                data-testid="thinking-step-reasoning"
              >
                {step.reasoning}
              </span>
            )}
            {!isRunning && step.detail && !hasStructuredToolCalls && (
              <span className={styles.detail}>{step.detail}</span>
            )}
            {hasStructuredToolCalls && (
              <ul
                className={styles.items}
                data-testid="thinking-step-tool-calls"
              >
                {step.tool_calls!.map((call, j) => (
                  <li key={j}>{formatToolCall(call)}</li>
                ))}
              </ul>
            )}
            {hasStructuredCalls && (
              <div
                className={styles.toolCalls}
                data-testid="thinking-step-calls"
              >
                {step.calls!.map((call, j) => (
                  <ToolCallBlock key={j} call={call} />
                ))}
              </div>
            )}
            {!isRunning &&
              step.items &&
              step.items.length > 0 &&
              !hasStructuredCalls &&
              !hasStructuredSources && (
                <ul className={styles.items} data-testid="thinking-step-items">
                  {step.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
            {hasStructuredSources && <SourceLinks sources={step.sources!} />}
            {!isRunning && step.prompt && (
              <StepExpander
                label={t('conversation.response.thinkingPrompt')}
                text={step.prompt}
                testId="thinking-step-prompt"
              />
            )}
            {!isRunning && step.response && (
              <StepExpander
                label={t('conversation.response.thinkingResponse')}
                text={step.response}
                testId="thinking-step-response"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
