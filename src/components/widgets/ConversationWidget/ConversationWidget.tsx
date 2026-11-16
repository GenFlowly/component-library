import React, { useEffect, useRef } from 'react';
import {
  useConversation,
  useConversationComposer,
  useConversationUI,
} from './ConversationWidgetContext';
import ConversationBlock from './ConversationBlock';
import { AskSelectionProvider } from './AskSelectionContext';

/**
 * The conversation surface: one ConversationBlock (request + responses) per
 * entry in the injected block list. Must be rendered inside a
 * ConversationWidgetProvider.
 *
 * When the host renders a scroll container with
 * data-testid="center-section", blocks entering its viewport are reported
 * back through setActiveViewportItem (used e.g. to sync a sidebar outline).
 */
export default function ConversationWidget() {
  const { conversationBlockList, addNewConversationBlockWithId } =
    useConversation();
  const { setActiveViewportItem } = useConversationUI();
  const { canCompose = true } = useConversationComposer();

  // A finished last turn gets an empty editor after it, so a follow-up is
  // always one click away. Each finished turn gets at most one: the ref also
  // absorbs effect re-runs before the new block reaches the list.
  const lastBlock = conversationBlockList[conversationBlockList.length - 1];
  const lastBlockId = lastBlock?.conversationBlockId;
  const lastBlockFinished =
    lastBlock?.status === 'resolved' && !lastBlock.isLoading;
  const appendedAfterRef = useRef<string | null>(null);
  useEffect(() => {
    if (!canCompose || !lastBlockId || !lastBlockFinished) return;
    if (appendedAfterRef.current === lastBlockId) return;
    appendedAfterRef.current = lastBlockId;
    addNewConversationBlockWithId(`conv-${Date.now()}`);
  }, [
    canCompose,
    lastBlockId,
    lastBlockFinished,
    addNewConversationBlockWithId,
  ]);

  useEffect(() => {
    const root = document.querySelector('[data-testid="center-section"]');
    if (!root) return;

    const options = {
      root: root,
      rootMargin: '-10% 0px -70% 0px', // Triggers when element is near the top
      threshold: 0,
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const blockId = entry.target.getAttribute('data-block-id');
          const type = entry.target.getAttribute('data-item-type') as
            'request' | 'response';
          if (blockId && type) {
            setActiveViewportItem({ blockId, type });
          }
        }
      });
    }, options);

    // Allow some time for elements to render
    const timeout = setTimeout(() => {
      const elements = document.querySelectorAll('[data-scroll-item="true"]');
      elements.forEach(el => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [conversationBlockList, setActiveViewportItem]);

  return (
    <AskSelectionProvider>
      {conversationBlockList.map(block => (
        <ConversationBlock
          key={block.conversationBlockId}
          id={block.conversationBlockId}
        />
      ))}
    </AskSelectionProvider>
  );
}
