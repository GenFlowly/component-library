import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useConversation } from './ConversationWidgetContext';

/** A selection-ask waiting for the draft editor to absorb it. */
export interface QueuedAsk {
  id: number;
  /** The selected text, already formatted as a markdown blockquote. */
  quotedText: string;
}

interface AskSelectionApi {
  /** True inside an AskSelectionProvider — the gate for showing Ask UI. */
  enabled: boolean;
  pendingAsks: QueuedAsk[];
  /**
   * Queue selected response text as a quote for the draft editor. Returns
   * whether the source response changed while this draft already has asks —
   * quotes already absorbed into the draft then come from another response,
   * which is worth telling the user about.
   */
  queueAsk: (
    selectedText: string,
    sourceMessageId: string
  ) => { switched: boolean };
  /** The draft editor absorbed these asks; drop them from the queue. */
  acknowledgeAsks: (ids: number[]) => void;
  /** The draft was sent (or the conversation changed): forget the ask source. */
  resetAskSession: () => void;
}

const NOOP_API: AskSelectionApi = {
  enabled: false,
  pendingAsks: [],
  queueAsk: () => ({ switched: false }),
  acknowledgeAsks: () => undefined,
  resetAskSession: () => undefined,
};

const AskSelectionContext = createContext<AskSelectionApi | null>(null);

/** "foo\nbar" → "> foo\n> bar" (blank selected lines become bare ">"). */
export function toMarkdownQuote(text: string): string {
  return text
    .trim()
    .split('\n')
    .map(line => `> ${line}`.trimEnd())
    .join('\n');
}

// Module-level counter: ids only need uniqueness within a page session
let nextAskId = 1;

/**
 * Channel between the response cards (where "Ask" grabs selected text, block
 * N) and the draft request editor that absorbs it as a markdown quote (block
 * N+1). They live in different conversation blocks, so the state sits above
 * both, inside ConversationWidget. Also tracks which response the current
 * draft's asks quote: all asks of one draft must come from a single response
 * — the one the follow-up chains from.
 */
export function AskSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { conversationId } = useConversation();
  const [pendingAsks, setPendingAsks] = useState<QueuedAsk[]>([]);
  // Refs, not state: only queueAsk's return value reads them, never a render
  const sourceMessageIdRef = useRef<string | null>(null);
  const hasAsksRef = useRef(false);

  const resetAskSession = useCallback(() => {
    sourceMessageIdRef.current = null;
    hasAsksRef.current = false;
    setPendingAsks([]);
  }, []);

  // Asks never outlive the conversation whose response they quote
  useEffect(() => {
    resetAskSession();
  }, [conversationId, resetAskSession]);

  const queueAsk = useCallback(
    (selectedText: string, sourceMessageId: string) => {
      const switched =
        hasAsksRef.current && sourceMessageIdRef.current !== sourceMessageId;
      sourceMessageIdRef.current = sourceMessageId;
      hasAsksRef.current = true;
      setPendingAsks(prev => [
        ...prev,
        { id: nextAskId++, quotedText: toMarkdownQuote(selectedText) },
      ]);
      return { switched };
    },
    []
  );

  const acknowledgeAsks = useCallback((ids: number[]) => {
    setPendingAsks(prev => prev.filter(ask => !ids.includes(ask.id)));
  }, []);

  const value = useMemo<AskSelectionApi>(
    () => ({
      enabled: true,
      pendingAsks,
      queueAsk,
      acknowledgeAsks,
      resetAskSession,
    }),
    [pendingAsks, queueAsk, acknowledgeAsks, resetAskSession]
  );

  return (
    <AskSelectionContext.Provider value={value}>
      {children}
    </AskSelectionContext.Provider>
  );
}

/**
 * No-op outside a provider: hosts composing Response/Request directly
 * (tests, isolated stories) simply don't get the Ask affordance.
 */
export function useAskSelection(): AskSelectionApi {
  return useContext(AskSelectionContext) ?? NOOP_API;
}
