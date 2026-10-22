import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AskSelectionProvider,
  useAskSelection,
  toMarkdownQuote,
} from './AskSelectionContext';
import { useConversation } from './ConversationWidgetContext';

jest.mock('./ConversationWidgetContext', () => ({
  useConversation: jest.fn(),
}));

const mockUseConversation = useConversation as jest.Mock;

/** Exposes the ask API as clickable probes + readable state. */
function Probe() {
  const { enabled, pendingAsks, queueAsk, acknowledgeAsks, resetAskSession } =
    useAskSelection();
  const [lastSwitched, setLastSwitched] = React.useState(false);
  return (
    <div>
      <span data-testid="enabled">{String(enabled)}</span>
      <span data-testid="count">{pendingAsks.length}</span>
      <span data-testid="switched">{String(lastSwitched)}</span>
      <span data-testid="quotes">
        {pendingAsks.map(a => a.quotedText).join('|')}
      </span>
      <button
        data-testid="ask-a"
        onClick={() => setLastSwitched(queueAsk('from A', 'msg-a').switched)}
      />
      <button
        data-testid="ask-b"
        onClick={() => setLastSwitched(queueAsk('from B', 'msg-b').switched)}
      />
      <button
        data-testid="ack-all"
        onClick={() => acknowledgeAsks(pendingAsks.map(a => a.id))}
      />
      <button data-testid="reset" onClick={() => resetAskSession()} />
    </div>
  );
}

describe('toMarkdownQuote', () => {
  test('prefixes every line, trims the edges, keeps blank inner lines as bare ">"', () => {
    expect(toMarkdownQuote('one\ntwo')).toBe('> one\n> two');
    expect(toMarkdownQuote('  padded  ')).toBe('> padded');
    expect(toMarkdownQuote('a\n\nb')).toBe('> a\n>\n> b');
  });
});

describe('AskSelectionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConversation.mockReturnValue({ conversationId: 'conv-1' });
  });

  test('useAskSelection outside a provider is a disabled no-op', () => {
    render(<Probe />);
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');
    fireEvent.click(screen.getByTestId('ask-a'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  test('queues quotes; repeat asks from the same response never flag a switch', () => {
    render(
      <AskSelectionProvider>
        <Probe />
      </AskSelectionProvider>
    );
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
    fireEvent.click(screen.getByTestId('ask-a'));
    fireEvent.click(screen.getByTestId('ask-a'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('switched')).toHaveTextContent('false');
    expect(screen.getByTestId('quotes')).toHaveTextContent('> from A|> from A');
  });

  test('asking from another response reports the switch', () => {
    render(
      <AskSelectionProvider>
        <Probe />
      </AskSelectionProvider>
    );
    fireEvent.click(screen.getByTestId('ask-a'));
    fireEvent.click(screen.getByTestId('ask-b'));
    expect(screen.getByTestId('switched')).toHaveTextContent('true');
  });

  test('acknowledged asks leave the queue but still count toward the switch rule; reset forgets the source', () => {
    render(
      <AskSelectionProvider>
        <Probe />
      </AskSelectionProvider>
    );
    fireEvent.click(screen.getByTestId('ask-a'));
    fireEvent.click(screen.getByTestId('ack-all'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    // The draft still holds A's quote — asking from B is a switch
    fireEvent.click(screen.getByTestId('ask-b'));
    expect(screen.getByTestId('switched')).toHaveTextContent('true');

    // After a reset (draft sent) the next ask starts a fresh session
    fireEvent.click(screen.getByTestId('reset'));
    fireEvent.click(screen.getByTestId('ask-a'));
    expect(screen.getByTestId('switched')).toHaveTextContent('false');
  });

  test('switching conversations clears queued asks and the source', () => {
    const { rerender } = render(
      <AskSelectionProvider>
        <Probe />
      </AskSelectionProvider>
    );
    fireEvent.click(screen.getByTestId('ask-a'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    mockUseConversation.mockReturnValue({ conversationId: 'conv-2' });
    rerender(
      <AskSelectionProvider>
        <Probe />
      </AskSelectionProvider>
    );
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    fireEvent.click(screen.getByTestId('ask-b'));
    expect(screen.getByTestId('switched')).toHaveTextContent('false');
  });
});
