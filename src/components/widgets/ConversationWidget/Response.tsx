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
  useToast,
} from './ConversationWidgetContext';
import { useAskSelection } from './AskSelectionContext';
import ReaderFriendlyTextContainer from '../../common/ReaderFriendlyTextContainer/ReaderFriendlyTextContainer';
import { ErrorBoundary } from '../../common/ErrorBoundary/ErrorBoundary';
import { LearnedFact, Message, WebSource } from './conversation.models';
import { AttachmentRef } from './attachment.models';
import AttachmentCard from '../../common/AttachmentCard/AttachmentCard';
import ActivityPanel from '../ActivityPanel/ActivityPanel';
import { useLearnedFacts } from './useLearnedFacts';
import { useWindowSize } from './useWindowSize';
import { formatServerDateOnly } from './timeUtils';
import LearnedMemorySection from '../LearnedMemory/LearnedMemorySection';
import RectangleButton from '../../common/RectangleButton/RectangleButton';
import PillButton from '../../common/PillButton/PillButton';
import Tooltip from '../../common/Tooltip/Tooltip';
import { VendorBrandName } from './BrandName';
import { useVendorDisplayNames } from './useVendorDisplayNames';
import { AIVendor } from './vendors';
import { useMaxVendors } from './useMaxVendors';
import { ToggleOption } from '../../common/PillButtonGroup/PillButtonGroup';
import CheckboxButtonGroup from '../../common/PillButtonGroup/CheckboxButtonGroup';
import { useResponseSwipe } from './useResponseSwipe';
import ResponseSwipeLabel from './ResponseSwipeLabel';
import { usableViewBottom } from './usableViewBottom';

// Raw vendor finish reasons grouped by how they should read to the user. A
// refusal/block means "no (or partial) answer, here's why"; a length cap means
// "cut off". Normal completions render nothing — the answer speaks for
// itself. Unknown reasons keep a quiet footnote: better to show a raw reason
// we don't recognize than to hide it.
const NORMAL_STOP_REASONS = new Set([
  'end_turn', // Anthropic
  'stop', // OpenAI
  'stop_sequence', // Anthropic custom stop sequence
  'tool_use', // shouldn't reach here (non-terminal), but never noteworthy
  'tool_calls', // OpenAI equivalent
]);
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
// Not a vendor reason: the host marks a reply the user stopped mid-generation.
const CANCELLED_STOP_REASON = 'cancelled';

/**
 * A note under the answer explaining why generation ended, from the vendor's
 * raw finish reason. Shown only when something noteworthy happened: a
 * refusal/block reads as a prominent warning (the card may otherwise be
 * blank), a length cap as a muted "cut off" line, a user Stop as a muted
 * "stopped" line, and an unrecognized reason as a quiet footnote. A normal
 * completion renders nothing.
 */
function StopReasonNote({ reason }: { reason: string }) {
  const r = reason.trim().toLowerCase();
  if (!r || NORMAL_STOP_REASONS.has(r)) return null;
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
  if (r === CANCELLED_STOP_REASON) {
    return (
      <div
        className={styles.stopReasonStopped}
        data-testid="stop-reason"
        data-reason={r}
      >
        You stopped this response.
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

/** Up to this window width the memory section is a chip that opens the phone sheet. */
const COMPACT_MEMORY_MAX_WIDTH = 1024;

interface ResponseProps {
  blockId: string;
  responseMessages: Message[];
  onFollowUp?: (selectedMessageId: string) => void;
  disabled?: boolean;
  isLastResponseBlock?: boolean;
  /** When the turn's prompt was sent (epoch ms): the learned cards' date on old turns. */
  sentAt?: number;
}

// Memoized (see export): responseMessages keeps its identity for blocks a
// stream isn't touching, so parent re-renders skip unchanged responses
function Response({
  blockId,
  responseMessages,
  onFollowUp,
  disabled = false,
  isLastResponseBlock = true,
  sentAt,
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
    forkConversation,
    conversationId = '',
  } = useConversation();
  const {
    getLearnedFacts,
    deleteMemoryFact,
    openMemory,
    openMemoryInference,
    openMemoryPage,
  } = useConversationServices();
  const { width: windowWidth } = useWindowSize();
  const { queueAsk, enabled: asksEnabled } = useAskSelection();
  const { showToast } = useToast();

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
  // Measures the response cards' true natural height independent of
  // containerEl's minHeight pin (see handleVendorSelectionChange) — a plain
  // child's offsetHeight always reflects its own content, never clamped
  // upward by a min-height set on an ancestor.
  const innerRef = useRef<HTMLDivElement | null>(null);
  // Bumped on every vendor-switch tap; lets an in-flight correction (below)
  // recognize it's been superseded by a newer tap and stand down instead of
  // acting on a stale snapshot — rapid successive taps otherwise compound
  // into a runaway scroll (confirmed: 4 taps ~150ms apart drove scrollTop
  // to 0 without this guard).
  const vendorSwitchOperationIdRef = useRef(0);
  const maxVendors = useMaxVendors(containerEl);

  // What this turn added to memory. Memory learns once per turn from every
  // vendor's response and writes the same list onto each, so the turn polls
  // through one response and shows one section.
  const turnLoading = responseMessages.some(m => m.isLoading);
  const memoryMessage = responseMessages.find(
    m => !!m.messageId && !m.error && !PLACEHOLDER_MESSAGE_ID.test(m.messageId)
  );
  const turnFacts = useMemo(() => {
    const lists = responseMessages
      .map(m => m.learnedFacts)
      .filter((f): f is LearnedFact[] => Array.isArray(f));
    if (lists.length === 0) {
      return responseMessages.some(m => m.learnedFacts === null)
        ? null
        : undefined;
    }
    return lists.find(list => list.length > 0) ?? lists[0];
  }, [responseMessages]);
  const turnIsFresh =
    turnFacts === undefined && !!conversationId && !!memoryMessage;
  const learned = useLearnedFacts(
    conversationId,
    memoryMessage?.messageId ?? '',
    turnFacts,
    turnIsFresh,
    !turnLoading
  );
  const turnWentThrough = responseMessages.some(
    m =>
      m.inputTokens != null ||
      m.outputTokens != null ||
      m.totalTokens != null ||
      m.tokensReadFromCache != null ||
      m.costUsd != null ||
      m.learnedFacts !== undefined
  );
  const showMemory =
    !turnLoading &&
    !!memoryMessage &&
    turnWentThrough &&
    (turnFacts !== undefined || !!getLearnedFacts);

  const deleteLearnedFact = useCallback(
    async (fact: LearnedFact) => {
      try {
        await learned.removeFact(fact.memoryId);
        showToast(t('memoryPage.delete.deleted'));
      } catch (e) {
        console.error('Failed to delete memory fact', e);
        showToast(t('memoryPage.delete.failed'));
        throw e;
      }
    },
    [learned, showToast, t]
  );

  const memorySection = showMemory ? (
    <LearnedMemorySection
      status={learned.status}
      facts={learned.facts}
      multiVendor={availableVendors.length > 1}
      compact={windowWidth <= COMPACT_MEMORY_MAX_WIDTH}
      onDelete={deleteMemoryFact ? deleteLearnedFact : undefined}
      onOpenMemory={openMemory ? fact => openMemory(fact.memoryId) : undefined}
      onOpenInference={
        openMemoryInference
          ? fact => fact.runId && openMemoryInference(fact.memoryId, fact.runId)
          : undefined
      }
      onManage={openMemoryPage}
      dateLabel={
        turnIsFresh || !sentAt ? undefined : formatServerDateOnly(sentAt)
      }
    />
  ) : null;
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

  const switchVendorRef = useRef<(vendor: string) => void>(() => {});
  const swipe = useResponseSwipe({
    rowRef: innerRef,
    enabled: maxVendors === 1 && visibleMessages.length > 0,
    hintReady:
      availableVendors.length > 1 &&
      !visibleMessages.some(message => message.isLoading),
    vendors: availableVendors,
    currentVendor: effectiveSelectedVendors[0],
    onSwitch: vendor => switchVendorRef.current(vendor),
  });
  const swipeNeighborMessage = swipe.neighbor
    ? [...visibleMessages]
        .reverse()
        .find(message => message.aiVendor === swipe.neighbor?.vendor)
    : undefined;
  // The neighbor shares the card's key space, so a finished swipe promotes
  // the very same DOM instead of remounting its markdown.
  const renderedResponses = swipeNeighborMessage
    ? [...filteredResponseList, swipeNeighborMessage]
    : filteredResponseList;

  // Regenerating a response clears its text immediately — before new
  // content streams back in — which shrinks this container. If the user
  // was scrolled past where the now-short "thinking" placeholder ends, the
  // browser has no choice but to clamp scrollTop to the new (smaller) max,
  // a visible jump up toward whatever now sits above (often the prompt).
  // Pinning the container's pre-collapse height across that moment keeps
  // the scroll range stable until real content grows back into it.
  const pinnedMinHeightRef = useRef<number | null>(null);
  const anyMessageLoading = filteredResponseList.some(m => m.isLoading);
  useEffect(() => {
    if (
      !anyMessageLoading &&
      pinnedMinHeightRef.current !== null &&
      containerEl
    ) {
      containerEl.style.minHeight = '';
      pinnedMinHeightRef.current = null;
    }
  }, [anyMessageLoading, containerEl]);

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

  // Selected text in a response card → queue it as a quote for the follow-up
  // draft, through the follow-up flow itself, so the quoted response is also
  // the one the next turn chains from. Quoting a DIFFERENT response than the
  // draft's earlier asks switches that chain — tell the user.
  const handleAskSelection = (
    messageId: string,
    vendor: string,
    selectedText: string
  ) => {
    if (disabled) return;
    const { switched } = queueAsk(selectedText, messageId);
    handleFollowUp(messageId);
    if (switched) {
      showToast(
        t('conversation.response.askSourceSwitched', {
          vendor: vendorDisplayName(vendor),
        })
      );
    }
  };

  const pinHeight = () => {
    if (!containerEl) return;
    pinnedMinHeightRef.current = containerEl.offsetHeight;
    containerEl.style.minHeight = `${pinnedMinHeightRef.current}px`;
  };

  const handleRegenerate = async (vendor: AIVendor) => {
    if (disabled) return;
    pinHeight();
    await generateResponsesStream(blockId, undefined, undefined, vendor);
  };

  const handleFork = (messageId: string) => {
    void forkConversation?.(messageId);
  };

  // Switching which already-generated vendor is shown swaps the message
  // card entirely — it's keyed by messageId (see the ErrorBoundary below),
  // so React unmounts the old card and mounts a fresh one rather than
  // updating in place, in BOTH directions. A freshly-mounted markdown card
  // (react-markdown + rehype-highlight/katex, web fonts, etc.) isn't
  // guaranteed to report its true settled height on the very next frame —
  // reading too early can catch a still-shorter in-between height and
  // overcorrect the scroll upward even when the new response is actually
  // taller. So don't trust a single measurement: pin containerEl's height
  // (nothing the user sees can collapse while this runs) and poll innerRef
  // — a plain, never-pinned child — until ITS natural height stops
  // changing across a few consecutive frames. Measuring innerRef instead
  // of containerEl matters: toggling containerEl's own minHeight off to
  // "measure true height" would itself force the scroller's scrollHeight
  // through the shorter value for that instant, and a browser's native
  // scroll clamp triggered during that instant does NOT un-happen once
  // minHeight is restored — so the pinned element must never be touched
  // again until the very end. THEN compute the correction and smoothly
  // scroll to it before releasing the pin. Positions already within the
  // new content's range don't move; positions past where it ends land at
  // the minimum necessary scroll, animated rather than snapped.
  //
  // Tapping through several vendors quickly starts a new one of these
  // before the previous one's poll has reached stability — every step
  // below checks vendorSwitchOperationIdRef before acting, so a superseded
  // run quietly stands down instead of computing a correction from a
  // stale snapshot and fighting the newer run (that's what compounded into
  // scrollTop racing to 0 across a few quick taps before this guard).
  const handleVendorSelectionChange = (vendors: string[]) => {
    const myOperationId = ++vendorSwitchOperationIdRef.current;
    const scroller = containerEl?.closest<HTMLElement>(
      '[data-testid="center-section-scroll"]'
    );
    const previousScrollTop = scroller?.scrollTop;
    const previousContainerHeight = containerEl?.offsetHeight;
    const previousInnerHeight = innerRef.current?.offsetHeight;
    const previousRowTop =
      scroller && innerRef.current && previousScrollTop != null
        ? innerRef.current.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          previousScrollTop
        : 0;
    if (containerEl && previousContainerHeight != null) {
      containerEl.style.minHeight = `${previousContainerHeight}px`;
    }

    setVendorSelectionForBlock(blockId, vendors);

    const innerEl = innerRef.current;
    if (
      !containerEl ||
      !scroller ||
      !innerEl ||
      previousScrollTop == null ||
      previousInnerHeight == null
    ) {
      return;
    }

    const STABLE_FRAMES_NEEDED = 4;
    const MAX_FRAMES = 40; // ~650ms safety cap so this can never hang open
    let lastHeight = -1;
    let stableFrames = 0;
    let frame = 0;

    const poll = () => {
      if (vendorSwitchOperationIdRef.current !== myOperationId) return; // superseded — stand down
      frame += 1;
      const naturalHeight = innerEl.offsetHeight; // never touches minHeight
      if (naturalHeight === lastHeight) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
        lastHeight = naturalHeight;
      }

      if (stableFrames < STABLE_FRAMES_NEEDED && frame < MAX_FRAMES) {
        requestAnimationFrame(poll);
        return;
      }

      // The view stays where it is: the new response shows from the same
      // point. Only one that would end in the top quarter of the view or
      // above it moves the view up, as little as shows the most of it, so
      // the view is never left near blank below its end. A viewport past the row shifts up
      // by the shrink, keeping whatever follows the row in place.
      const shrink = Math.max(0, previousInnerHeight - naturalHeight);
      const rowStart =
        previousRowTop -
        (parseFloat(getComputedStyle(innerEl).scrollMarginTop) || 0);
      const rowEnd = previousRowTop + naturalHeight;
      const viewHeight =
        usableViewBottom(
          scroller,
          containerEl.closest('.conversation-block-item')
        ) - scroller.getBoundingClientRect().top;
      const maxScrollTop = Math.max(
        0,
        scroller.scrollHeight - shrink - scroller.clientHeight
      );
      const desired =
        previousScrollTop >= previousRowTop + previousInnerHeight
          ? previousScrollTop - shrink
          : previousScrollTop > rowStart &&
              rowEnd < previousScrollTop + viewHeight / 4
            ? Math.max(rowStart, rowEnd - viewHeight)
            : previousScrollTop;
      const target = Math.max(0, Math.min(desired, maxScrollTop));
      if (target !== previousScrollTop) {
        scroller.scrollTo({ top: target, behavior: 'smooth' });
      }
      setTimeout(() => {
        if (vendorSwitchOperationIdRef.current === myOperationId) {
          containerEl.style.minHeight = '';
        }
      }, 400);
    };
    requestAnimationFrame(poll);
  };
  switchVendorRef.current = vendor => handleVendorSelectionChange([vendor]);

  // Two cards side by side share one memory section under the row
  const twoColumns = renderedResponses.length > 1;

  const rowClassName = [
    styles.inner,
    filteredResponseList.length === 1 ? styles.single : '',
    sidebarsHidden ? styles.sideBySide : '',
    maxVendors === 1 ? styles.swipeable : '',
    swipe.phase !== 'idle' ? styles.swipeActive : '',
    swipe.phase === 'dragging' ? styles.swipeDragging : '',
    swipe.phase === 'settling' ? styles.swipeSettling : '',
    swipe.phase === 'hinting' ? styles.swipeHinting : '',
  ]
    .filter(Boolean)
    .join(' ');

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
            onChange={handleVendorSelectionChange}
            allowEmpty={false}
            maxSelection={maxVendors}
            showCheckbox
            data-testid="vendor-checkbox-group"
          />
        </div>
      )}

      <div ref={innerRef} className={rowClassName} data-testid="response-row">
        {renderedResponses.map(
          ({
            aiVendor,
            model,
            text,
            messageId,
            isLoading,
            error,
            activity,
            webSources,
            generatedAttachments,
            stopReason,
          }) => {
            const isSelected = selectedResponseId === messageId;
            // The answer area's own placeholder: loading with no text yet.
            // The activity panel never looks at the text (see ActivityPanel).
            const isAwaitingText = !!isLoading && text.trim().length === 0;
            const isSwipeNeighbor =
              messageId === swipeNeighborMessage?.messageId;
            const swipeClassName = isSwipeNeighbor
              ? `${styles.swipeNeighbor} ${
                  swipe.neighbor?.side === 'next'
                    ? styles.swipeNeighborNext
                    : styles.swipeNeighborPrevious
                }`
              : swipe.phase !== 'idle'
                ? styles.swipeCurrent
                : '';

            // Ask-from-selection mirrors the Follow up button's gating: only
            // where a follow-up could start from this response right now
            const canAsk =
              asksEnabled &&
              !!onFollowUp &&
              isLastResponseBlock &&
              !disabled &&
              !isLoading &&
              text.trim().length > 0;

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
              <ErrorBoundary key={messageId}>
                <div
                  className={`${styles.responseWrapper} ${swipeClassName}`}
                  aria-hidden={isSwipeNeighbor || undefined}
                >
                  <ReaderFriendlyTextContainer
                    variant="turn"
                    title={HeaderComponent}
                    content={text}
                    sources={webSources}
                    subheader={
                      <ActivityPanel
                        className={styles.activityPanel}
                        events={activity}
                        isLive={!!isLoading}
                        citedSources={webSources}
                        stopReason={stopReason}
                      />
                    }
                    isLoading={isAwaitingText}
                    loadingContent={null}
                    onAskSelection={
                      canAsk
                        ? selectedText =>
                            handleAskSelection(
                              messageId,
                              aiVendor ?? '',
                              selectedText
                            )
                        : undefined
                    }
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
                    {generatedAttachments &&
                      generatedAttachments.length > 0 && (
                        <GeneratedAttachmentsSection
                          attachments={generatedAttachments}
                        />
                      )}
                    {!isLoading && stopReason && (
                      <StopReasonNote reason={stopReason} />
                    )}
                    {!twoColumns && memorySection}
                    {(() => {
                      // Fork needs a real persisted response (never a client
                      // placeholder or an errored stream) — the backend copies
                      // the conversation up to this exact message. Unlike
                      // regenerate, it shows on EVERY response block, so any
                      // point of the conversation can branch off.
                      const canFork =
                        !!forkConversation &&
                        !!conversationId &&
                        !!messageId &&
                        !error &&
                        !PLACEHOLDER_MESSAGE_ID.test(messageId);
                      if (
                        isSwipeNeighbor ||
                        (!isLoading && !isLastResponseBlock && !canFork)
                      ) {
                        return null;
                      }
                      return (
                        <div
                          className={styles.responseActionButtonsWrapper}
                          data-response-swipe-ignore
                        >
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
                                {isLastResponseBlock && (
                                  <Tooltip
                                    content={
                                      disabled
                                        ? t(
                                            'conversation.response.noApiKeysSet'
                                          )
                                        : t(
                                            'conversation.response.regenerateHint'
                                          )
                                    }
                                  >
                                    <div
                                      style={
                                        disabled
                                          ? { cursor: 'not-allowed' }
                                          : {}
                                      }
                                    >
                                      <RectangleButton
                                        label={t(
                                          'conversation.response.regenerate'
                                        )}
                                        onClick={() =>
                                          handleRegenerate(aiVendor as AIVendor)
                                        }
                                        disabled={disabled}
                                        icon={ICONS.REFRESH_ICON}
                                        data-testid="regenerate-button"
                                      />
                                    </div>
                                  </Tooltip>
                                )}

                                {isLastResponseBlock &&
                                  onFollowUp &&
                                  text.trim().length > 0 && (
                                    <Tooltip
                                      content={
                                        disabled
                                          ? t(
                                              'conversation.response.noApiKeysSet'
                                            )
                                          : isSelected
                                            ? ''
                                            : t(
                                                'conversation.response.followUpHint'
                                              )
                                      }
                                    >
                                      <div
                                        style={
                                          disabled
                                            ? { cursor: 'not-allowed' }
                                            : {}
                                        }
                                      >
                                        <RectangleButton
                                          label={
                                            isSelected
                                              ? t(
                                                  'conversation.response.selected'
                                                )
                                              : t(
                                                  'conversation.response.followUp'
                                                )
                                          }
                                          onClick={() =>
                                            handleFollowUp(messageId)
                                          }
                                          disabled={isSelected || disabled}
                                          icon={
                                            isSelected ? undefined : ICONS.SEND
                                          }
                                          data-testid="follow-up-button"
                                        />
                                      </div>
                                    </Tooltip>
                                  )}

                                {canFork && (
                                  <Tooltip
                                    content={t(
                                      'conversation.response.forkHint'
                                    )}
                                  >
                                    <PillButton
                                      label={t('conversation.response.fork')}
                                      icon={ICONS.GIT_FORK}
                                      iconSize={14}
                                      variant="secondary"
                                      onClick={() => handleFork(messageId)}
                                      data-testid="fork-button"
                                    />
                                  </Tooltip>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </ReaderFriendlyTextContainer>
                  {aiVendor && swipe.labelState !== 'hidden' && (
                    <ResponseSwipeLabel
                      vendor={aiVendor}
                      model={model}
                      position={availableVendors.indexOf(aiVendor)}
                      total={availableVendors.length}
                      isFading={swipe.labelState === 'fading'}
                      showsHint={swipe.showsHint && !isSwipeNeighbor}
                    />
                  )}
                </div>
              </ErrorBoundary>
            );
          }
        )}
      </div>
      {twoColumns && memorySection && (
        <div className={styles.turnMemory}>{memorySection}</div>
      )}
    </div>
  );
}

export default React.memo(Response);
