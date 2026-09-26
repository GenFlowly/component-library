import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '../../../constants/icons';
import styles from './Response.module.scss';
import {
  useConversation,
  useConversationAuth,
  useConversationLayout,
  useConversationServices,
} from './ConversationWidgetContext';
import TextContainer from '../../common/TextContainer/TextContainer';
import { Icon } from '../../common/Icon/Icon';
import {
  LearnedFact,
  Message,
  ThinkingStep,
  WebSource,
} from './conversation.models';
import { AttachmentRef } from './attachment.models';
import AttachmentCard from '../../common/AttachmentCard/AttachmentCard';
import ThinkingSteps from './ThinkingSteps';
import { useLearnedFacts } from './useLearnedFacts';
import RectangleButton from '../../common/RectangleButton/RectangleButton';
import Tooltip from '../../common/Tooltip/Tooltip';
import { VendorBrandName } from './BrandName';
import { useVendorDisplayNames } from './useVendorDisplayNames';
import { AIVendor } from './vendors';
import { useMaxVendors } from './useMaxVendors';
import { ToggleOption } from '../../common/PillButtonGroup/PillButtonGroup';
import CheckboxButtonGroup from '../../common/PillButtonGroup/CheckboxButtonGroup';

/**
 * Turn bare [n] citation markers into markdown links to their web source, so
 * the markdown renderer makes them clickable. Only indices that exist in
 * webSources are linked — the model can occasionally emit a stray marker, and
 * an unknown index is left as plain text rather than a dead link. Markers
 * already followed by "(" are part of an existing markdown link and skipped.
 */
function linkifyCitations(
  text: string,
  webSources?: WebSource[] | null
): string {
  if (!text || !webSources || webSources.length === 0) return text;
  const byIndex = new Map(webSources.map(s => [s.index, s.url]));
  return text.replace(/\[(\d{1,3})\](?!\()/g, (marker, n) => {
    const url = byIndex.get(Number(n));
    return url ? `[${marker}](${url})` : marker;
  });
}

/** "$1.23" / "$0.0421" — sub-dollar amounts keep enough decimals for sub-cent turn costs. */
function formatUsd(cost: number): string {
  return cost >= 1 ? `$${cost.toFixed(2)}` : `$${cost.toFixed(4)}`;
}

// Raw vendor finish reasons grouped by how they should read to the user. A
// refusal/block means "no (or partial) answer, here's why"; a length cap means
// "cut off"; everything else is a normal completion shown as a quiet footnote.
// Unknown reasons fall through to the quiet footnote too — better to show the
// raw reason than to hide it.
const REFUSAL_STOP_REASONS = new Set([
  'refusal',
  'content_filter',
  'safety',
  'recitation',
  'blocklist',
  'prohibited_content',
  'malformed_function_call',
]);
const TRUNCATION_STOP_REASONS = new Set([
  'max_tokens',
  'length',
  'model_length',
  'max_output_tokens',
]);

/**
 * A note under the answer explaining why generation ended, from the vendor's
 * raw finish reason. Refusals/blocks read as a prominent warning (the card may
 * otherwise be blank), a length cap as a muted "cut off" line, and normal
 * finishes as a quiet footnote carrying the raw reason — always shown, so the
 * user can see how every turn terminated.
 */
function StopReasonNote({ reason }: { reason: string }) {
  const r = reason.trim().toLowerCase();
  if (!r) return null;
  if (REFUSAL_STOP_REASONS.has(r)) {
    return (
      <div
        className={styles.stopReasonRefusal}
        role="status"
        data-testid="stop-reason"
        data-reason={r}
      >
        The model declined to answer this request (finish reason:&nbsp;
        <code>{r}</code>). Try rephrasing, or start a new conversation — an
        earlier turn in this thread may have triggered it.
      </div>
    );
  }
  if (TRUNCATION_STOP_REASONS.has(r)) {
    return (
      <div
        className={styles.stopReasonTruncated}
        data-testid="stop-reason"
        data-reason={r}
      >
        The response was cut off because it reached the length limit (finish
        reason:&nbsp;<code>{r}</code>).
      </div>
    );
  }
  return (
    <span
      className={styles.stopReasonInfo}
      data-testid="stop-reason"
      data-reason={r}
    >
      Finished · {r}
    </span>
  );
}

/** Numbered link list rendered under the response text. */
function SourcesSection({ sources }: { sources: WebSource[] }) {
  const { t } = useTranslation();
  return (
    <div className={styles.sourcesSection} data-testid="sources-section">
      <div className={styles.sourcesLabel}>
        {t('conversation.response.sources')}
      </div>
      <ul className={styles.sourcesList}>
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
    </div>
  );
}

/**
 * Download cards for files built-in tools produced during the turn (e.g.
 * generated PDFs). URLs are short-lived presigned GETs, resolved on click
 * through the host's injected getAttachmentViewUrl service.
 */
function GeneratedAttachmentsSection({
  attachments,
}: {
  attachments: AttachmentRef[];
}) {
  const { getAccessTokenSilently } = useConversationAuth();
  const { getAttachmentViewUrl } = useConversationServices();
  if (!getAttachmentViewUrl) return null;
  return (
    <div
      className={styles.generatedAttachments}
      data-testid="generated-attachments"
    >
      {attachments.map(attachment => (
        <AttachmentCard
          key={attachment.attachmentId}
          filename={attachment.filename ?? 'attachment'}
          mediaType={attachment.mediaType}
          sizeBytes={attachment.sizeBytes}
          getDownloadUrl={async () =>
            getAttachmentViewUrl(
              await getAccessTokenSilently(),
              attachment.attachmentId
            )
          }
        />
      ))}
    </div>
  );
}

/**
 * Placeholder message ids assigned client-side before the backend echoes the
 * real one (stream placeholders / synthesized error cards). There is nothing
 * to poll for under such an id.
 */
const PLACEHOLDER_MESSAGE_ID = /^(resp|error)-/;

/**
 * "Facts learned about the user" item in the response footer stats row,
 * rendered as a brain icon + count. Pending → muted pulsing brain while the
 * async extraction runs; done → the count, with a tooltip that carries the
 * wording ("N facts added to memory" / "No new facts…") and, when there are
 * facts, an interactive list with a ✗ that deletes each from memory.
 */
function LearnedFactsStat({
  conversationId,
  messageId,
  initialFacts,
  isFreshResponse,
}: {
  conversationId: string;
  messageId: string;
  initialFacts: LearnedFact[] | null | undefined;
  isFreshResponse: boolean;
}) {
  const { t } = useTranslation();
  const { status, facts, removeFact } = useLearnedFacts(
    conversationId,
    messageId,
    initialFacts,
    isFreshResponse
  );

  const handleDelete = async (memoryId: string) => {
    try {
      await removeFact(memoryId);
    } catch (e) {
      // Real failure (not a 404): keep the fact listed so the user can retry
      console.error('Failed to delete memory fact', e);
    }
  };

  if (status === 'pending') {
    return (
      <Tooltip content={t('conversation.response.learningFacts')}>
        <span
          className={`${styles.tokenItem} ${styles.learnedFactsPending}`}
          aria-label={t('conversation.response.learningFacts')}
          data-testid="learned-facts-pending"
        >
          <Icon src={ICONS.BRAIN} size={12} />
          <span className={styles.pulse} />
        </span>
      </Tooltip>
    );
  }

  if (facts.length === 0) {
    return (
      <Tooltip content={t('conversation.response.noNewFacts')}>
        <span
          className={`${styles.tokenItem} ${styles.learnedFactsNone}`}
          aria-label={t('conversation.response.noNewFacts')}
          data-testid="learned-facts-none"
        >
          <Icon src={ICONS.BRAIN} size={12} />0
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      interactive
      content={
        <div className={styles.learnedFactsTooltip}>
          <div className={styles.learnedFactsLabel}>
            {t('conversation.response.factsAddedToMemory', {
              count: facts.length,
            })}
          </div>
          <ul
            className={styles.learnedFactsList}
            data-testid="learned-facts-list"
          >
            {facts.map(fact => (
              <li key={fact.memoryId} className={styles.learnedFactItem}>
                <span className={styles.learnedFactText}>{fact.text}</span>
                <button
                  className={styles.learnedFactDelete}
                  onClick={() => handleDelete(fact.memoryId)}
                  aria-label={t('conversation.response.deleteFact', {
                    fact: fact.text,
                  })}
                  data-testid="learned-fact-delete"
                >
                  ✗
                </button>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <span
        className={styles.tokenItem}
        aria-label={t('conversation.response.factsAddedToMemory', {
          count: facts.length,
        })}
        data-testid="learned-facts-count"
      >
        <Icon src={ICONS.BRAIN} size={12} />
        {facts.length}
      </span>
    </Tooltip>
  );
}

interface ResponseProps {
  blockId: string;
  responseMessages: Message[];
  onFollowUp?: (selectedMessageId: string) => void;
  disabled?: boolean;
  isLastResponseBlock?: boolean;
}

/**
 * Thinking summary shown inside each response card, between the header and
 * the response text (formerly the separate ResponseThinking widget). Each
 * step now manages its own expand/collapse (see ThinkingSteps) — this wrapper
 * just merges the legacy flat step list with the structured one and shows the
 * overall "thinking" / "Thought for Ns" label.
 */
function ThinkingSection({
  steps,
  stepList,
  isThinking,
  durationMs,
  text,
}: {
  steps: string[];
  stepList?: ThinkingStep[] | null;
  isThinking: boolean;
  durationMs?: number | null;
  text: string;
}) {
  const { t } = useTranslation();

  // Legacy flat "k" strings become plain steps (label only, no icon) so the
  // whole section renders through one component; structured "ks" steps follow
  const displaySteps: ThinkingStep[] = useMemo(
    () => [
      ...steps.map((step, i): ThinkingStep => ({
        node: `legacy-${i}`,
        name: step,
        status: 'done',
      })),
      ...(stepList ?? []),
    ],
    [steps, stepList]
  );

  if (displaySteps.length === 0 && !isThinking) return null;

  // Once thinking completes, show how long it took (measured by the
  // retrieval server: request receipt → first generated token)
  let label = t('conversation.response.thinking');
  if (!isThinking && durationMs != null) {
    const seconds = Math.max(1, Math.round(durationMs / 1000));
    label = t('conversation.response.thoughtForSeconds', { count: seconds });
  }

  return (
    <div className={styles.thinkingSection} data-testid="thinking-section">
      <div className={styles.thinkingHeader}>
        {isThinking && <span className={styles.pulse} />}
        <span className={styles.thinkingLabel}>{label}</span>
      </div>
      <ThinkingSteps
        steps={displaySteps}
        isThinking={isThinking}
        finalText={text}
      />
    </div>
  );
}

// Memoized (see export): responseMessages keeps its identity for blocks a
// stream isn't touching, so parent re-renders skip unchanged responses
function Response({
  blockId,
  responseMessages,
  onFollowUp,
  disabled = false,
  isLastResponseBlock = true,
  'data-testid': testId,
}: ResponseProps & { 'data-testid'?: string }) {
  const { t } = useTranslation();
  const { isLeftSidebarExpanded, isRightSidebarExpanded } =
    useConversationLayout();
  const {
    setSelectedResponseForBlock,
    getSelectedResponseForBlock,
    generateResponsesStream,
    getVendorSelectionForBlock,
    setVendorSelectionForBlock,
    stopGenerating,
    conversationBlockList = [],
    conversationId = '',
  } = useConversation();
  const { getLearnedFacts } = useConversationServices();

  // Running per-vendor totals (tokens + exact cost) up to and including each
  // response, keyed by messageId. The badge shows these conversation-so-far
  // numbers on every response; a single turn's usage is the difference
  // between consecutive responses of the same vendor.
  const cumulativeByMessage = useMemo(() => {
    type Totals = {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      tokensReadFromCache: number;
      costUsd: number | null;
    };
    const perVendor: Partial<Record<string, Totals>> = {};
    const byMessage: Partial<Record<string, Totals>> = {};
    for (const block of conversationBlockList) {
      for (const msg of block.responseMessages) {
        if (!msg.aiVendor) continue;
        const hasUsage =
          msg.inputTokens != null ||
          msg.outputTokens != null ||
          msg.totalTokens != null ||
          msg.costUsd != null;
        if (!hasUsage) continue;
        const prev = perVendor[msg.aiVendor] ?? {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          tokensReadFromCache: 0,
          costUsd: null,
        };
        const next: Totals = {
          inputTokens: prev.inputTokens + (msg.inputTokens ?? 0),
          outputTokens: prev.outputTokens + (msg.outputTokens ?? 0),
          totalTokens: prev.totalTokens + (msg.totalTokens ?? 0),
          tokensReadFromCache:
            prev.tokensReadFromCache + (msg.tokensReadFromCache ?? 0),
          costUsd:
            msg.costUsd != null
              ? (prev.costUsd ?? 0) + msg.costUsd
              : prev.costUsd,
        };
        perVendor[msg.aiVendor] = next;
        byMessage[msg.messageId] = next;
      }
    }
    return byMessage;
  }, [conversationBlockList]);

  const selectedResponseId = getSelectedResponseForBlock(blockId);
  const sidebarsHidden = !isLeftSidebarExpanded && !isRightSidebarExpanded;

  const visibleMessages = useMemo(
    () =>
      responseMessages.filter(
        // A refusal has no text and no error but must still render — its
        // stopReason note is the only thing explaining the empty answer.
        msg =>
          msg.text.length > 0 || msg.isLoading || msg.error || msg.stopReason
      ),
    [responseMessages]
  );

  // The vendor failover priority (Settings → LLM API Keys, 1 = primary)
  // orders responses left to right; vendors without a saved priority come
  // after prioritized ones, keeping arrival order among themselves.
  const { aiVendorAPIKeyStatusList } = useConversationAuth();
  const vendorPriority = useMemo(() => {
    const map = new Map<string, number>();
    aiVendorAPIKeyStatusList.forEach(s => {
      if (s.priority != null) map.set(s.aiVendor, s.priority);
    });
    return map;
  }, [aiVendorAPIKeyStatusList]);

  const byVendorPriority = useCallback(
    (a: string, b: string) =>
      (vendorPriority.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (vendorPriority.get(b) ?? Number.MAX_SAFE_INTEGER),
    [vendorPriority]
  );

  const availableVendors = useMemo(() => {
    const vendors = new Set<string>();
    visibleMessages.forEach(msg => {
      if (msg.aiVendor) vendors.add(msg.aiVendor);
    });
    return Array.from(vendors).sort(byVendorPriority);
  }, [visibleMessages, byVendorPriority]);

  // Keep a ref to the latest context selection to avoid stale closure in the effect below
  const selectionRef = useRef<string[]>([]);
  selectionRef.current = getVendorSelectionForBlock(blockId);

  // Auto-select any vendor that appears for the first time in this block.
  // Each vendor is auto-selected at most ONCE (tracked in autoSelectedRef):
  // this effect re-runs on every stream chunk (availableVendors gets a new
  // identity), and re-adding anything merely missing from the selection
  // would instantly undo the user's toggles while a response streams.
  const autoSelectedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const newVendors = availableVendors.filter(
      v => !autoSelectedRef.current.has(v) && !selectionRef.current.includes(v)
    );
    availableVendors.forEach(v => autoSelectedRef.current.add(v));
    if (newVendors.length > 0) {
      setVendorSelectionForBlock(blockId, [
        ...selectionRef.current,
        ...newVendors,
      ]);
    }
  }, [availableVendors, blockId, setVendorSelectionForBlock]);

  const selectedVendors = getVendorSelectionForBlock(blockId);

  // The response container spans the conversation widget, so its width IS
  // the conversation viewport — a callback ref keeps the measurement alive
  // even when the container switches between the empty and normal branches
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const maxVendors = useMaxVendors(containerEl);
  const vendorDisplayName = useVendorDisplayNames();

  // 📱 The vendor toggle row scrolls horizontally when the pills overflow
  // (many vendors on a narrow screen). Each edge gets a fade mask ONLY
  // while more pills are hidden past it — the CSS mask reads these
  // custom properties, updated on scroll and resize.
  const toggleWrapperRef = useRef<HTMLDivElement | null>(null);
  const updateToggleFades = useCallback(() => {
    const el = toggleWrapperRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.style.setProperty('--fade-l', el.scrollLeft > 2 ? '16px' : '0px');
    el.style.setProperty(
      '--fade-r',
      maxScroll - el.scrollLeft > 2 ? '16px' : '0px'
    );
  }, []);
  useEffect(() => {
    const el = toggleWrapperRef.current;
    if (!el) return;
    updateToggleFades();
    const observer = new ResizeObserver(updateToggleFades);
    observer.observe(el);
    return () => observer.disconnect();
    // Re-bind when the row mounts/unmounts (it only renders with >1 vendor)
  }, [updateToggleFades, availableVendors.length]);

  const toggleOptions: ToggleOption[] = useMemo(
    () =>
      availableVendors.map(vendor => ({
        id: vendor,
        label: vendorDisplayName(vendor),
      })),
    [availableVendors, vendorDisplayName]
  );
  const rawSelectedVendors =
    selectedVendors.length > 0 ? selectedVendors : availableVendors;
  // Priority also decides WHICH vendors survive the display cap
  const effectiveSelectedVendors = [...rawSelectedVendors]
    .sort(byVendorPriority)
    .slice(0, maxVendors);
  const filteredResponseList = useMemo(() => {
    const vendorMap = new Map<string, Message>();
    for (const msg of visibleMessages) {
      if (msg.aiVendor && effectiveSelectedVendors.includes(msg.aiVendor)) {
        vendorMap.set(msg.aiVendor, msg); // This will overwrite older messages, keeping the latest one
      }
    }
    return Array.from(vendorMap.values()).sort((a, b) =>
      byVendorPriority(a.aiVendor ?? '', b.aiVendor ?? '')
    );
  }, [visibleMessages, effectiveSelectedVendors, byVendorPriority]);

  if (!visibleMessages || visibleMessages.length === 0) {
    return (
      <div
        ref={setContainerEl}
        className={styles.container}
        data-response-block-id={blockId}
        data-testid={testId || 'empty-response-block'}
      >
        <div
          style={{
            textAlign: 'left',
            padding: '1rem',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {t('conversation.response.noResponsesGenerated')}
        </div>
      </div>
    );
  }

  const handleFollowUp = (messageId: string) => {
    if (disabled) return;
    setSelectedResponseForBlock(blockId, messageId);
    onFollowUp?.(messageId);
  };

  const handleRegenerate = async (vendor: AIVendor) => {
    if (disabled) return;
    await generateResponsesStream(blockId, undefined, undefined, vendor);
  };

  return (
    <div
      ref={setContainerEl}
      className={styles.container}
      data-response-block-id={blockId}
      data-testid={testId}
    >
      {availableVendors.length > 1 && (
        <div
          className={styles.toggleWrapper}
          ref={toggleWrapperRef}
          onScroll={updateToggleFades}
          data-testid="vendor-toggle-scroller"
        >
          {/* Capped multi-select: as many vendors as columns fit the
                        conversation width (2, or 1 on narrow screens); at the
                        cap a new pick evicts the oldest selection */}
          <CheckboxButtonGroup
            options={toggleOptions}
            selectedValues={effectiveSelectedVendors}
            onChange={vendors => setVendorSelectionForBlock(blockId, vendors)}
            allowEmpty={false}
            maxSelection={maxVendors}
            showCheckbox
            data-testid="vendor-checkbox-group"
          />
        </div>
      )}

      <div
        className={`${styles.inner} ${sidebarsHidden ? styles.sideBySide : ''}`}
      >
        {filteredResponseList.map(
          ({
            aiVendor,
            model,
            text,
            messageId,
            isLoading,
            error,
            thinkingSteps,
            thinkingStepList,
            thinkingDurationMs,
            webSources,
            generatedAttachments,
            inputTokens,
            outputTokens,
            totalTokens,
            tokensReadFromCache,
            costUsd,
            learnedFacts,
            stopReason,
          }) => {
            const isSelected = selectedResponseId === messageId;
            const isThinkingPhase = !!isLoading && text.trim().length === 0;

            // Only a response generated in THIS session (learnedFacts
            // never set — historical loads always set it, if only to
            // null) with a real backend message id has an async memory
            // extraction worth polling for. Errored/aborted messages
            // never reached extraction.
            const isFreshResponse =
              learnedFacts === undefined &&
              !error &&
              !!conversationId &&
              !!messageId &&
              !PLACEHOLDER_MESSAGE_ID.test(messageId);

            // Conversation-so-far totals for this response's vendor; a
            // response not (yet) in the block list — e.g. rendered in
            // isolation — falls back to its own per-turn values.
            const hasOwnUsage =
              inputTokens != null ||
              outputTokens != null ||
              totalTokens != null ||
              tokensReadFromCache != null ||
              costUsd != null;
            const usageTotals =
              cumulativeByMessage[messageId] ??
              (hasOwnUsage
                ? {
                    inputTokens: inputTokens ?? 0,
                    outputTokens: outputTokens ?? 0,
                    totalTokens: totalTokens ?? 0,
                    tokensReadFromCache: tokensReadFromCache ?? 0,
                    costUsd: costUsd ?? null,
                  }
                : undefined);

            // The learned-facts stat is only meaningful when the host either
            // preloaded facts on the message or injected the polling service
            const showLearnedFacts =
              learnedFacts !== undefined || !!getLearnedFacts;

            let HeaderComponent: React.ReactNode = null;
            if (aiVendor) {
              const brand: React.ReactNode = (
                <VendorBrandName vendorId={aiVendor} as="span" />
              );
              HeaderComponent = (
                <span className={styles.responseCardTitle}>
                  {brand}
                  {model && (
                    <span
                      className={styles.modelName}
                      data-testid="response-model-name"
                      title={model}
                    >
                      {model}
                    </span>
                  )}
                </span>
              );
            }

            return (
              <div key={messageId} className={styles.responseWrapper}>
                <TextContainer
                  title={HeaderComponent}
                  content={linkifyCitations(text, webSources)}
                  subheader={
                    <ThinkingSection
                      steps={thinkingSteps ?? []}
                      stepList={thinkingStepList}
                      isThinking={isThinkingPhase}
                      durationMs={thinkingDurationMs}
                      text={text}
                    />
                  }
                  isLoading={isThinkingPhase}
                  loadingContent={null}
                  data-testid="response-message"
                  aria-label={t('conversation.response.responseFrom', {
                    vendor: aiVendor,
                  })}
                >
                  {error && (
                    <div
                      className={styles.errorBanner}
                      role="alert"
                      data-testid="response-error"
                    >
                      {text.trim().length > 0
                        ? t('conversation.response.streamInterrupted', {
                            reason: error,
                          })
                        : t('conversation.response.generationFailed', {
                            reason: error,
                          })}
                    </div>
                  )}
                  {!isLoading && webSources && webSources.length > 0 && (
                    <SourcesSection sources={webSources} />
                  )}
                  {generatedAttachments && generatedAttachments.length > 0 && (
                    <GeneratedAttachmentsSection
                      attachments={generatedAttachments}
                    />
                  )}
                  {!isLoading && stopReason && (
                    <StopReasonNote reason={stopReason} />
                  )}
                  {!isLoading && usageTotals && (
                    <div className={styles.tokenBadge}>
                      <Tooltip
                        content={t('conversation.response.totalInputTokens')}
                      >
                        <span className={styles.tokenItem}>
                          <Icon src={ICONS.INPUT_TOKENS} size={12} />
                          {usageTotals.inputTokens.toLocaleString()}
                        </span>
                      </Tooltip>
                      <Tooltip
                        content={t('conversation.response.totalOutputTokens')}
                      >
                        <span className={styles.tokenItem}>
                          <Icon src={ICONS.OUTPUT_TOKENS} size={12} />
                          {usageTotals.outputTokens.toLocaleString()}
                        </span>
                      </Tooltip>
                      <Tooltip
                        content={t('conversation.response.tokensReadFromCache')}
                      >
                        <span className={styles.tokenItem}>
                          <Icon src={ICONS.CACHE_TOKENS} size={12} />
                          {usageTotals.tokensReadFromCache.toLocaleString()}
                        </span>
                      </Tooltip>
                      <Tooltip content={t('conversation.response.totalTokens')}>
                        <span className={styles.tokenItem}>
                          <Icon src={ICONS.TOTAL_TOKENS} size={12} />
                          {usageTotals.totalTokens.toLocaleString()}
                        </span>
                      </Tooltip>
                      {usageTotals.costUsd != null && (
                        <Tooltip
                          content={t(
                            'conversation.response.conversationCostUsd',
                            { vendor: aiVendor }
                          )}
                        >
                          <span className={styles.tokenItem}>
                            {formatUsd(usageTotals.costUsd)}
                          </span>
                        </Tooltip>
                      )}
                      {showLearnedFacts && (
                        <LearnedFactsStat
                          conversationId={conversationId}
                          messageId={messageId}
                          initialFacts={learnedFacts}
                          isFreshResponse={isFreshResponse}
                        />
                      )}
                    </div>
                  )}
                  {(isLoading || isLastResponseBlock) && (
                    <div className={styles.responseActionButtonsWrapper}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isLoading ? (
                          <RectangleButton
                            label={t('conversation.response.stop')}
                            onClick={() =>
                              stopGenerating(blockId, aiVendor as AIVendor)
                            }
                            data-testid="stop-button"
                          />
                        ) : (
                          <>
                            <Tooltip
                              content={
                                disabled
                                  ? t('conversation.response.noApiKeysSet')
                                  : ''
                              }
                            >
                              <div
                                style={
                                  disabled ? { cursor: 'not-allowed' } : {}
                                }
                              >
                                <RectangleButton
                                  label={t('conversation.response.regenerate')}
                                  onClick={() =>
                                    handleRegenerate(aiVendor as AIVendor)
                                  }
                                  disabled={disabled}
                                  icon={ICONS.REFRESH_ICON}
                                  data-testid="regenerate-button"
                                />
                              </div>
                            </Tooltip>

                            {onFollowUp && text.trim().length > 0 && (
                              <Tooltip
                                content={
                                  disabled
                                    ? t('conversation.response.noApiKeysSet')
                                    : ''
                                }
                              >
                                <div
                                  style={
                                    disabled ? { cursor: 'not-allowed' } : {}
                                  }
                                >
                                  <RectangleButton
                                    label={
                                      isSelected
                                        ? t('conversation.response.selected')
                                        : t('conversation.response.followUp')
                                    }
                                    onClick={() => handleFollowUp(messageId)}
                                    disabled={isSelected || disabled}
                                    icon={isSelected ? undefined : ICONS.SEND}
                                    data-testid="follow-up-button"
                                  />
                                </div>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </TextContainer>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

export default React.memo(Response);
