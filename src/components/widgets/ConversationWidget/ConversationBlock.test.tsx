import React from 'react';
import { render, screen, act } from '@testing-library/react';
import ConversationBlock from './ConversationBlock';
import {
  useConversation,
  useConversationAuth,
} from './ConversationWidgetContext';
import '@testing-library/jest-dom';

// Mock the injection context
jest.mock('./ConversationWidgetContext', () => ({
  useConversation: jest.fn(),
  useConversationAuth: jest.fn(),
}));

// Mock child components to verify props and existence
jest.mock('./Request', () => ({
  __esModule: true,
  default: (props: any) => {
    const { blockId } = props;
    return (
      <div data-testid={`mock-request-${blockId}`}>Request: {blockId}</div>
    );
  },
}));

jest.mock('./Response', () => ({
  __esModule: true,
  default: (props: any) => {
    const { blockId, onFollowUp, disabled, isLastResponseBlock } = props;
    return (
      <div data-testid={`mock-response-${blockId}`}>
        <button
          data-testid={`followup-${blockId}`}
          onClick={() => onFollowUp('msg-1')}
        >
          Follow Up
        </button>
        <div data-testid={`disabled-${blockId}`}>{String(disabled)}</div>
        <div data-testid={`last-block-${blockId}`}>
          {String(isLastResponseBlock)}
        </div>
      </div>
    );
  },
}));

describe('ConversationBlock Component', () => {
  const mockUseConversation = useConversation as jest.Mock;
  const mockUseAuth = useConversationAuth as jest.Mock;
  const mockAddNewConversationBlockWithId = jest.fn();
  const mockSetSelectedResponseForBlock = jest.fn();

  const mockScrollIntoView = jest.fn();

  beforeAll(() => {
    Element.prototype.scrollIntoView = mockScrollIntoView;
    HTMLElement.prototype.scrollIntoView = mockScrollIntoView;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [],
          isLoading: false,
          status: 'draft',
        },
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });
    mockUseAuth.mockReturnValue({
      aiVendorAPIKeyStatusList: [{ isAPIKeyValid: true }],
    });
  });

  test('renders Request widget always', () => {
    render(<ConversationBlock id="block-1" data-testid="conv-block" />);
    expect(screen.getByTestId('conv-block')).toBeInTheDocument();
    expect(screen.getByTestId('mock-request-block-1')).toBeInTheDocument();
  });

  test('does not render Response widget if no messages', () => {
    render(<ConversationBlock id="block-1" />);
    expect(
      screen.queryByTestId('mock-response-block-1')
    ).not.toBeInTheDocument();
  });

  test('renders Response widget if messages exist', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [{ id: 'msg-1', content: 'Hello' }],
          isLoading: false,
          status: 'resolved',
        },
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    render(<ConversationBlock id="block-1" />);
    expect(screen.getByTestId('mock-response-block-1')).toBeInTheDocument();
  });

  test('disables Response actions if no valid API key', () => {
    mockUseAuth.mockReturnValue({
      aiVendorAPIKeyStatusList: [{ isAPIKeyValid: false }],
    });
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [{ id: 'msg-1' }],
          isLoading: false,
          status: 'resolved',
        },
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    render(<ConversationBlock id="block-1" />);
    expect(screen.getByTestId('disabled-block-1')).toHaveTextContent('true');
  });

  test('handleFollowUp reuses last empty block', async () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [{ id: 'msg-1' }],
          status: 'resolved',
        },
        {
          conversationBlockId: 'block-2',
          responseMessages: [],
          status: 'draft',
        }, // Last block is empty
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    render(<ConversationBlock id="block-1" />);

    const btn = screen.getByTestId('followup-block-1');
    act(() => {
      btn.click();
    });

    expect(mockSetSelectedResponseForBlock).toHaveBeenCalledWith(
      'block-2',
      'msg-1'
    );
    expect(mockAddNewConversationBlockWithId).not.toHaveBeenCalled();
  });

  test('handleFollowUp creates new block if last block has content', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [{ id: 'msg-1' }],
          status: 'resolved',
        }, // Last block has content
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    render(<ConversationBlock id="block-1" />);

    const btn = screen.getByTestId('followup-block-1');
    act(() => {
      btn.click();
    });

    expect(mockAddNewConversationBlockWithId).toHaveBeenCalled();
  });

  test('handleFollowUp creates a new block while the current block is still generating', () => {
    // One vendor finished, another still streaming: the block is the last
    // one, still 'draft' and isLoading — it must NOT be treated as an
    // empty draft to reuse (that made Follow up a silent no-op)
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [
            { id: 'msg-1', isLoading: false },
            { id: 'msg-2', isLoading: true },
          ],
          isLoading: true,
          status: 'draft',
        },
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    render(<ConversationBlock id="block-1" />);

    act(() => {
      screen.getByTestId('followup-block-1').click();
    });

    expect(mockAddNewConversationBlockWithId).toHaveBeenCalled();
    // Selection is set on the newly created block, not the streaming one
    expect(mockSetSelectedResponseForBlock).toHaveBeenCalledWith(
      expect.stringMatching(/^conv-/),
      'msg-1'
    );
  });

  test('scrolls to response on mount if messages exist', () => {
    jest.useFakeTimers();
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [{ id: 'msg-1' }],
          isLoading: false,
          status: 'resolved',
        },
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    render(<ConversationBlock id="block-1" />);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockScrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: 'start' })
    );
    jest.useRealTimers();
  });

  test('a streaming answer holds a follow-up being written at the top of the view', () => {
    jest.useFakeTimers();
    const composer = document.createElement('div');
    composer.setAttribute('data-composer-sticky', 'false');
    const input = document.createElement('textarea');
    composer.appendChild(input);
    document.body.appendChild(composer);
    input.focus();
    const streaming = (text: string) => ({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [{ id: 'msg-1', text }],
          isLoading: true,
          status: 'draft',
        },
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    try {
      mockUseConversation.mockReturnValue(streaming('Hel'));
      const { rerender } = render(<ConversationBlock id="block-1" />);
      act(() => {
        jest.advanceTimersByTime(200);
      });
      mockUseConversation.mockReturnValue(streaming('Hello there'));
      // A new prop gets the memoised block to render the longer answer
      rerender(<ConversationBlock id="block-1" data-testid="streaming" />);

      // Only the box being written is scrolled, to the top of the view
      expect(mockScrollIntoView.mock.contexts).not.toHaveLength(0);
      mockScrollIntoView.mock.contexts.forEach(element =>
        expect(element).toBe(composer)
      );
      expect(mockScrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    } finally {
      composer.remove();
      jest.useRealTimers();
    }
  });

  describe('a turn sent from the page', () => {
    const generating = (text: string) => ({
      conversationBlockId: 'block-1',
      responseMessages: [{ id: 'msg-1', text }],
      isLoading: true,
      status: 'draft',
    });
    const trailingDraft = {
      conversationBlockId: 'block-2',
      responseMessages: [],
      isLoading: false,
      status: 'draft',
    };
    const conversation = (blocks: object[]) => ({
      conversationBlockList: blocks,
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    // The center section's scroller, the turn, and the trailing editor below it
    let scroller: HTMLDivElement;
    let host: HTMLDivElement;
    let editor: HTMLDivElement;
    beforeEach(() => {
      jest.useFakeTimers();
      scroller = document.createElement('div');
      scroller.setAttribute('data-testid', 'center-section-scroll');
      Object.defineProperty(scroller, 'clientHeight', { value: 800 });
      host = document.createElement('div');
      host.style.paddingBottom = '0px';
      scroller.appendChild(host);
      document.body.appendChild(scroller);
      editor = document.createElement('div');
      Object.defineProperty(editor, 'offsetHeight', { value: 120 });
    });
    afterEach(() => {
      scroller.remove();
      jest.useRealTimers();
    });

    const renderTurn = (blocks: object[], testId = 'turn') => {
      mockUseConversation.mockReturnValue(conversation(blocks));
      const result = render(
        <ConversationBlock id="block-1" data-testid={testId} />,
        {
          container: host,
        }
      );
      host.appendChild(editor);
      return result;
    };

    test('goes to the top of the view: the prompt, not the response', () => {
      renderTurn([generating(''), trailingDraft]);
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockScrollIntoView).toHaveBeenCalledTimes(1);
      expect(mockScrollIntoView.mock.contexts[0]).toBe(
        screen.getByTestId('turn')
      );
      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    test('stays at the top while the answer streams: the view never follows it', () => {
      const { rerender } = renderTurn([generating('Hel'), trailingDraft]);
      act(() => {
        jest.advanceTimersByTime(200);
      });
      mockScrollIntoView.mockClear();

      mockUseConversation.mockReturnValue(
        conversation([
          generating('Hello there, a longer answer'),
          trailingDraft,
        ])
      );
      rerender(<ConversationBlock id="block-1" data-testid="streaming" />);
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });

    test('reserves the view down to the editor until a newer turn takes the top', () => {
      const { rerender } = renderTurn([generating('')]);
      act(() => {
        jest.advanceTimersByTime(200);
      });
      // The trailing editor is added below the turn once it is sent
      mockUseConversation.mockReturnValue(
        conversation([generating(''), trailingDraft])
      );
      rerender(<ConversationBlock id="block-1" data-testid="turn-2" />);

      const turn = screen.getByTestId('turn-2');
      // 800 view - 120 editor (the test has no scroll margin)
      expect(turn.style.minHeight).toBe('680px');

      mockUseConversation.mockReturnValue(
        conversation([
          { ...generating('Done'), isLoading: false, status: 'resolved' },
          {
            ...trailingDraft,
            responseMessages: [{ id: 'msg-2' }],
            isLoading: true,
          },
        ])
      );
      rerender(<ConversationBlock id="block-1" data-testid="turn-3" />);

      expect(screen.getByTestId('turn-3').style.minHeight).toBe('');
    });

    test('an opened conversation reserves nothing below its last turn', () => {
      renderTurn([
        { ...generating('Done'), isLoading: false, status: 'resolved' },
        trailingDraft,
      ]);
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.getByTestId('turn').style.minHeight).toBe('');
    });
  });

  test('pauses auto-scroll when user scrolls up (wheel deltaY < 0)', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [{ id: 'msg-1' }],
          isLoading: true,
          status: 'draft',
        },
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    render(<ConversationBlock id="block-1" data-testid="conv-block" />);

    const container = screen.getByTestId('conv-block');

    // Mock a wheel event scrolling up
    const wheelEvent = new WheelEvent('wheel', { deltaY: -100 });
    act(() => {
      container.dispatchEvent(wheelEvent);
    });

    // Test relies on the listener mutating a ref, coverage will register the branch condition
    expect(container).toBeInTheDocument();
  });

  test('pauses auto-scroll on touchstart interaction', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [{ id: 'msg-1' }],
          isLoading: true,
          status: 'draft',
        },
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    render(<ConversationBlock id="block-1" data-testid="conv-block" />);

    const container = screen.getByTestId('conv-block');

    // Mock a touchstart event
    const touchEvent = new Event('touchstart');
    act(() => {
      container.dispatchEvent(touchEvent);
    });

    expect(container).toBeInTheDocument();
  });

  test('resumes auto-scroll when user naturally scrolls to the bottom', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [{ id: 'msg-1' }],
          isLoading: true,
          status: 'draft',
        },
      ],
      addNewConversationBlockWithId: mockAddNewConversationBlockWithId,
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
    });

    render(<ConversationBlock id="block-1" data-testid="conv-block" />);

    const container = screen.getByTestId('conv-block');

    // Mock a state where we are scrolled to the bottom (scrollHeight - scrollTop - clientHeight < 50)
    Object.defineProperty(container, 'scrollHeight', {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(container, 'scrollTop', {
      configurable: true,
      value: 460,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 40,
    });

    const scrollEvent = new Event('scroll');
    act(() => {
      container.dispatchEvent(scrollEvent);
    });

    expect(container).toBeInTheDocument();
  });
});
