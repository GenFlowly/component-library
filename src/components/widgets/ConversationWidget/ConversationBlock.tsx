import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Response from './Response';
import Request from './Request';
import ChatReadingWidthContainer from '../../common/DesktopOptimalReadingWidthContainer/ChatReadingWidthContainer';
import { landOnElement } from './landOnElement';
import { usableViewBottom } from './usableViewBottom';
import {
  useConversation,
  useConversationAuth,
} from './ConversationWidgetContext';
import styles from './ConversationBlock.module.scss';

/** 🖥️ A follow-up being written at the top of the view (Request.tsx) keeps
 * its place: a streaming answer must not scroll it away. */
function isWritingAtTop(): boolean {
  return !!document.activeElement?.closest('[data-composer-sticky="false"]');
}

// Room kept between a followed activity panel's end and the view's bottom
const FOLLOW_GAP_PX = 16;

interface ActivityFollow {
  /** The user scrolled the panel's end out of view. */
  paused: boolean;
  /** The panels that were thinking at the last look. */
  thinking: HTMLElement[];
}

/** The response's activity panels whose agent is thinking, leaving out a
 * swipe's incoming neighbour. */
function thinkingPanels(response: HTMLElement): HTMLElement[] {
  return Array.from(
    response.querySelectorAll<HTMLElement>(
      '[data-testid="activity-panel"][data-thinking]'
    )
  ).filter(panel => !panel.closest('[aria-hidden="true"]'));
}

/** How far the thinking panels' end sits below the usable view: above the
 * trailing editor stuck to its bottom. Zero or less when it is in view. */
function liveEndOverflow(response: HTMLElement, scroller: HTMLElement): number {
  const panels = thinkingPanels(response);
  if (panels.length === 0) return 0;
  const end = Math.max(...panels.map(p => p.getBoundingClientRect().bottom));
  const block = response.closest('.conversation-block-item');
  return end + FOLLOW_GAP_PX - usableViewBottom(scroller, block);
}

/**
 * While the agent thinks, the view keeps the end of its activity panel in
 * sight, so the steps it adds stay visible. Once it stops (the answer
 * streams, or the turn ends) and the panel folds, a view that had moved past
 * the response's top goes back to it. A user who scrolled the panel's end out
 * of view is left where they are, and so is one who switched to another
 * vendor's response: its panel leaving the page is not the agent stopping.
 */
function followLiveActivity(
  response: HTMLElement,
  scroller: HTMLElement,
  follow: ActivityFollow
) {
  const thinking = thinkingPanels(response);
  if (thinking.length > 0) {
    follow.thinking = thinking;
    const overflow = liveEndOverflow(response, scroller);
    if (!follow.paused && overflow > 0) scroller.scrollTop += overflow;
    return;
  }
  const stopped = follow.thinking.some(
    panel => response.contains(panel) && !panel.closest('[aria-hidden="true"]')
  );
  follow.thinking = [];
  if (!stopped || follow.paused) return;
  const row =
    response.querySelector<HTMLElement>('[data-testid="response-row"]') ??
    response;
  const margin = parseFloat(getComputedStyle(row).scrollMarginTop) || 0;
  const rowTop = row.getBoundingClientRect().top - margin;
  if (rowTop < scroller.getBoundingClientRect().top - 0.5) {
    row.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Memoized: the block list parent re-renders on unrelated layout/context
// changes; a block only needs to re-render when its own context reads change
function ConversationBlock({
  id,
  'data-testid': testId,
}: {
  id: string;
  'data-testid'?: string;
}) {
  const {
    conversationBlockList,
    addNewConversationBlockWithId,
    setSelectedResponseForBlock,
  } = useConversation();

  // ✅ Check API key status
  const { aiVendorAPIKeyStatusList } = useConversationAuth();
  const hasAnyValidApiKey = aiVendorAPIKeyStatusList.some(s => s.isAPIKeyValid);

  const conversationBlock = conversationBlockList.find(
    b => b.conversationBlockId === id
  );
  const isLastResponseBlock =
    [...conversationBlockList]
      .reverse()
      .find(b => b.responseMessages.length > 0)?.conversationBlockId === id;
  const blockRef = useRef<HTMLDivElement | null>(null);
  const responseRef = useRef<HTMLDivElement | null>(null);
  // Sent from this page (not opened finished): the turn goes to the top of
  // the view and stays there while its answer generates below it
  const [isSentHere, setSentHere] = useState(false);
  const holdsTop = isSentHere && isLastResponseBlock;
  // Gates the one-time jump-to-start below. Never reset back to false, so a
  // regenerate/vendor-switch on an already-visible last response can't
  // re-trigger that jump (it would yank the viewport back up to the prompt
  // above it — most visible on short/mobile viewports).
  const hasScrolledRef = useRef(false);
  const followRef = useRef<ActivityFollow>({ paused: false, thinking: [] });

  // A finished block appearing means a conversation is being opened. Only its
  // latest response takes the jump: the text renders lazily, so the page keeps
  // growing, and one smooth scroll per block would stop far short of it.
  const endLandingRef = useRef<(() => void) | null>(null);
  useEffect(() => () => endLandingRef.current?.(), []);

  // A response appearing for the first time takes the view to it once: a
  // finished one (conversation opened) lands on the response, a generating
  // one (just sent) puts its prompt at the top of the view
  useEffect(() => {
    if (
      conversationBlock?.responseMessages?.length &&
      responseRef.current &&
      !hasScrolledRef.current
    ) {
      if (!conversationBlock.isLoading) {
        hasScrolledRef.current = true;
        if (isLastResponseBlock) {
          setTimeout(() => {
            if (responseRef.current) {
              endLandingRef.current = landOnElement(responseRef.current);
            }
          }, 100);
        }
        return;
      }
      setSentHere(true);
      // Wait a tick for layout
      setTimeout(() => {
        if (!isWritingAtTop()) {
          blockRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
        hasScrolledRef.current = true;
      }, 100);
    }
  }, [
    conversationBlock?.responseMessages,
    conversationBlock?.isLoading,
    isLastResponseBlock,
  ]);

  // The view follows the agent's thinking, not the answer: the answer grows
  // down from the response's top. A follow-up being written at the top of
  // the view is held there instead, so the turn growing above it doesn't
  // push it down.
  useEffect(() => {
    const response = responseRef.current;
    if (!response) return;
    if (conversationBlock?.isLoading && isWritingAtTop()) {
      const writing = document.activeElement?.closest<HTMLElement>(
        '[data-composer-sticky="false"]'
      );
      writing?.scrollIntoView({ block: 'start' });
      return;
    }
    const scroller = response.closest<HTMLElement>(
      '[data-testid="center-section-scroll"]'
    );
    if (scroller) followLiveActivity(response, scroller, followRef.current);
  }, [conversationBlock?.responseMessages, conversationBlock?.isLoading]);

  // A turn held at the top keeps a view of height from its top edge to the
  // conversation's end, so it reaches the top however short its answer is.
  // Below it: the trailing editor (stuck to the bottom of the view) and the
  // host's bottom padding.
  const blockCount = conversationBlockList.length;
  useLayoutEffect(() => {
    const block = blockRef.current;
    const host = block?.parentElement;
    const scroller = block?.closest<HTMLElement>(
      '[data-testid="center-section-scroll"]'
    );
    if (!block || !host || !scroller || !holdsTop) return undefined;
    const below: HTMLElement[] = [];
    for (let el = block.nextElementSibling; el; el = el.nextElementSibling) {
      below.push(el as HTMLElement);
    }
    const reserve = () => {
      const marginTop = parseFloat(getComputedStyle(block).scrollMarginTop);
      const belowHeight = below.reduce(
        (sum, el) => sum + el.offsetHeight,
        parseFloat(getComputedStyle(host).paddingBottom) || 0
      );
      const height = scroller.clientHeight - (marginTop || 0) - belowHeight;
      block.style.minHeight = `${Math.max(0, height)}px`;
    };
    reserve();
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(reserve)
        : null;
    observer?.observe(scroller);
    below.forEach(el => observer?.observe(el));
    return () => {
      observer?.disconnect();
      block.style.minHeight = '';
    };
  }, [holdsTop, blockCount]);

  // While generating, the panel growing (a new step, a ticking query) moves
  // the follow, and the user's own scrolling stops or resumes it: wheeling
  // up or dragging the panel's end out of view stops it, bringing the end
  // back into view resumes it. A tap or a sideways swipe scrolls nothing,
  // so it changes nothing.
  useEffect(() => {
    const response = responseRef.current;
    const scroller = response?.closest<HTMLElement>(
      '[data-testid="center-section-scroll"]'
    );
    if (!conversationBlock?.isLoading || !response || !scroller) {
      return undefined;
    }
    const follow = followRef.current;
    follow.paused = false;
    let touching = false;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) follow.paused = true;
    };
    const handleTouch = (e: TouchEvent) => {
      touching = e.type === 'touchstart';
    };
    const handleScroll = () => {
      const endInView = liveEndOverflow(response, scroller) <= 0;
      if (endInView) follow.paused = false;
      else if (touching) follow.paused = true;
    };
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (!isWritingAtTop())
              followLiveActivity(response, scroller, follow);
          })
        : null;
    observer?.observe(response);
    scroller.addEventListener('wheel', handleWheel, { passive: true });
    scroller.addEventListener('touchstart', handleTouch, { passive: true });
    scroller.addEventListener('touchend', handleTouch, { passive: true });
    scroller.addEventListener('touchcancel', handleTouch, { passive: true });
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      observer?.disconnect();
      scroller.removeEventListener('wheel', handleWheel);
      scroller.removeEventListener('touchstart', handleTouch);
      scroller.removeEventListener('touchend', handleTouch);
      scroller.removeEventListener('touchcancel', handleTouch);
      scroller.removeEventListener('scroll', handleScroll);
    };
  }, [conversationBlock?.isLoading]);

  // ✅ Follow-up logic: reuse last empty block or create new one.
  // useCallback so Response's memo isn't broken by a fresh handler each render
  const handleFollowUp = useCallback(
    (selectedMessageId: string) => {
      if (!hasAnyValidApiKey) return;

      // 📱 The follow-up editor should come up ready to type, keyboard open.
      // iOS only shows the keyboard for focus() calls made inside the tap
      // gesture — the editor may not even exist yet, so focus a throwaway
      // input NOW and hand focus over once the editor is in the DOM.
      const tempInput = document.createElement('input');
      tempInput.type = 'text';
      tempInput.style.position = 'fixed';
      tempInput.style.opacity = '0';
      tempInput.style.height = '0';
      tempInput.style.fontSize = '16px'; // prevent iOS zoom-on-focus
      document.body.appendChild(tempInput);
      tempInput.focus({ preventScroll: true });

      const focusEditor = () => {
        const editorInput = document.querySelector<HTMLElement>(
          '.conversation-block-item:last-child .cm-content, ' +
            '.conversation-block-item:last-child textarea'
        );
        editorInput?.focus({ preventScroll: true });
        tempInput.remove();
      };

      // The editor block ends the conversation. It is stuck to the bottom of
      // the view while idle, where scrollIntoView would measure it, so scroll
      // to the conversation's end instead.
      const scrollToLastBlock = () => {
        const scroller = document
          .querySelector('.conversation-block-item:last-child')
          ?.closest<HTMLElement>('[data-testid="center-section-scroll"]');
        scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
      };

      // Get the last conversation block
      const lastBlock = conversationBlockList[conversationBlockList.length - 1];

      // Check if last block is a truly empty draft (waiting for input). A block
      // that is mid-generation is also still 'draft' — it must NOT be reused,
      // otherwise following up from an already-finished response while another
      // vendor streams becomes a silent no-op
      const isLastBlockEmpty =
        lastBlock.status === 'draft' &&
        lastBlock.responseMessages.length === 0 &&
        !lastBlock.isLoading;

      if (isLastBlockEmpty) {
        // Reuse the existing empty block
        setSelectedResponseForBlock(
          lastBlock.conversationBlockId,
          selectedMessageId
        );

        setTimeout(() => {
          scrollToLastBlock();
          focusEditor();
        }, 100);
      } else {
        // Create a new block only if the last one has responses
        const newBlockId = `conv-${Date.now()}`;
        addNewConversationBlockWithId(newBlockId);
        setSelectedResponseForBlock(newBlockId, selectedMessageId);

        setTimeout(() => {
          scrollToLastBlock();
          focusEditor();
        }, 300);
      }
    },
    [
      hasAnyValidApiKey,
      conversationBlockList,
      setSelectedResponseForBlock,
      addNewConversationBlockWithId,
    ]
  );

  if (!conversationBlock) return null;

  return (
    <div
      ref={blockRef}
      className={`${styles.conversationBlock} conversation-block-item`}
      data-block-id={id}
      data-testid={testId}
    >
      <ChatReadingWidthContainer>
        <div
          data-scroll-item="true"
          data-block-id={id}
          data-item-type="request"
          style={{ width: '100%' }}
        >
          <Request blockId={id} />
        </div>

        {(conversationBlock.status === 'resolved' ||
          conversationBlock.responseMessages.length > 0) && (
          <div
            ref={responseRef}
            style={{ width: '100%' }}
            data-scroll-item="true"
            data-block-id={id}
            data-item-type="response"
          >
            <Response
              blockId={id}
              responseMessages={conversationBlock.responseMessages}
              onFollowUp={handleFollowUp}
              disabled={!hasAnyValidApiKey}
              isLastResponseBlock={isLastResponseBlock}
              sentAt={conversationBlock.sentAt}
            />
          </div>
        )}
      </ChatReadingWidthContainer>
    </div>
  );
}

export default React.memo(ConversationBlock);
