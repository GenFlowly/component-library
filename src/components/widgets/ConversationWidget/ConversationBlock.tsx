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
  const isAutoScrollPausedRef = useRef(false);
  // Gates the sticky-bottom-follow below. Unlike hasScrolledRef, this DOES
  // reset every generation, but only arms after a short delay — otherwise a
  // regenerate's immediate collapse to a short "thinking" placeholder would
  // itself snap the viewport up to the placeholder's much-higher end point.
  const isFollowArmedRef = useRef(false);

  useEffect(() => {
    if (!conversationBlock?.isLoading) return undefined;

    isAutoScrollPausedRef.current = false;
    isFollowArmedRef.current = false;
    const armTimer = setTimeout(() => {
      isFollowArmedRef.current = true;
    }, 100);
    return () => clearTimeout(armTimer);
  }, [conversationBlock?.isLoading]);

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

  // The view doesn't follow a streaming answer: it grows down from the prompt
  // at the top. Only a follow-up being written at the top of the view is
  // held there, so the answer growing above it doesn't push it down.
  useEffect(() => {
    if (
      conversationBlock?.isLoading &&
      responseRef.current &&
      isFollowArmedRef.current &&
      !isAutoScrollPausedRef.current
    ) {
      const writing = document.activeElement?.closest<HTMLElement>(
        '[data-composer-sticky="false"]'
      );
      writing?.scrollIntoView({ block: 'start' });
    }
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

  // Detect user scroll to pause/resume auto-scroll
  useEffect(() => {
    if (!conversationBlock?.isLoading || !responseRef.current) return;

    const scrollElement = responseRef.current.closest(
      '[data-testid*="center-section"]'
    );
    const scrollContainer = scrollElement || window;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        // User scrolled up
        isAutoScrollPausedRef.current = true;
      }
    };

    const handleTouchStart = () => {
      // Pause on touch interactions to allow manual drag
      isAutoScrollPausedRef.current = true;
    };

    const handleScroll = () => {
      // Resume if user scrolls to the bottom of the container naturally
      const container = scrollElement
        ? (scrollElement as HTMLElement)
        : document.documentElement;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        50;

      if (isNearBottom) {
        isAutoScrollPausedRef.current = false;
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel as EventListener, {
      passive: true,
    });
    scrollContainer.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener(
        'wheel',
        handleWheel as EventListener
      );
      scrollContainer.removeEventListener('touchstart', handleTouchStart);
      scrollContainer.removeEventListener('scroll', handleScroll);
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
