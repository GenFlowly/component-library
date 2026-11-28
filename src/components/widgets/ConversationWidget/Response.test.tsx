import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Response from './Response';
import { useConversation } from './ConversationWidgetContext';
import { AIVendor } from './vendors';
import '@testing-library/jest-dom';
import completedActivity from '../ActivityPanel/fixtures/completed_six_searches.json';
import liveActivity from '../ActivityPanel/fixtures/live_mid_turn.json';

// Mock the injection context: one module replaces the app's separate
// Conversation/Layout/Auth contexts and the injected services
let mockVendorKeyStatuses: any[] = [];
const mockGetLearnedFacts = jest.fn();
const mockDeleteMemoryFact = jest.fn();
jest.mock('./ConversationWidgetContext', () => ({
  useConversation: jest.fn(),
  useConversationLayout: jest.fn(),
  useConversationAuth: () => ({
    getAccessTokenSilently: jest.fn().mockResolvedValue('tok'),
    aiVendorAPIKeyStatusList: mockVendorKeyStatuses,
    isAuthenticated: true,
  }),
  useConversationServices: () => ({
    getLearnedFacts: mockGetLearnedFacts,
    deleteMemoryFact: mockDeleteMemoryFact,
    getAttachmentViewUrl: jest.fn(),
  }),
  useToast: () => ({ showToast: jest.fn() }),
}));
const { useConversationLayout } = require('./ConversationWidgetContext');

// The real hook measures the conversation container with a ResizeObserver
// (unavailable/zero-width in JSDOM). Mock it so vendor count is deterministic.
let mockMaxVendors = 2;
jest.mock('./useMaxVendors', () => ({
  useMaxVendors: () => mockMaxVendors,
}));

// Mock heavy child components (markdown rendering) with pass-through shells
jest.mock('../../common/TextContainer/TextContainer', () => ({
  __esModule: true,
  default: (props: any) => {
    const {
      children,
      title,
      content,
      subheader,
      'data-testid': testId,
    } = props;
    return (
      <div data-testid={testId || 'text-container'}>
        <div data-testid="tc-title">{title}</div>
        {subheader}
        <div data-testid="tc-content">{content}</div>
        {children}
      </div>
    );
  },
}));
jest.mock('../../common/RectangleButton/RectangleButton', () => ({
  __esModule: true,
  default: (props: any) => {
    const { label, onClick, disabled, 'data-testid': testId } = props;
    return (
      <button data-testid={testId} onClick={onClick} disabled={disabled}>
        {label}
      </button>
    );
  },
}));

// Real display names come from the host's provider catalog; both the brand
// component and the name-lookup hook are mocked with fixed labels here.
jest.mock('./BrandName', () => ({
  VendorBrandName: ({ vendorId }: any) => (
    <span>
      {({ OPENAI: 'OpenAI', CLAUDE: 'Claude', GEMINI: 'Gemini' } as any)[
        vendorId
      ] ?? vendorId}
    </span>
  ),
}));
jest.mock('./useVendorDisplayNames', () => ({
  useVendorDisplayNames: () => (vendorId: string) =>
    (({ OPENAI: 'OpenAI', CLAUDE: 'Claude', GEMINI: 'Gemini' }) as any)[
      vendorId
    ] ?? vendorId,
}));

describe('Response Widget Component', () => {
  const mockUseConversation = useConversation as jest.Mock;
  const mockUseLayout = useConversationLayout as jest.Mock;
  const mockSetSelectedResponseForBlock = jest.fn();
  const mockGetSelectedResponseForBlock = jest.fn();
  const mockSetVendorSelectionForBlock = jest.fn();
  let mockSelection: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelection = [];
    mockMaxVendors = 2;
    mockVendorKeyStatuses = [];
    mockUseConversation.mockReturnValue({
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
      getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
      getVendorSelectionForBlock: () => mockSelection,
      setVendorSelectionForBlock: mockSetVendorSelectionForBlock,
      generateResponsesStream: jest.fn(),
      stopGenerating: jest.fn(),
    });
    mockUseLayout.mockReturnValue({
      isLeftSidebarExpanded: true,
      isRightSidebarExpanded: true,
    });
    mockGetSelectedResponseForBlock.mockReturnValue(null);
  });

  const mockMessages = [
    {
      messageId: 'msg-1',
      text: 'Response 1',
      aiVendor: AIVendor.OPENAI,
      isLoading: false,
      timestamp: 0,
    },
    {
      messageId: 'msg-2',
      text: 'Response 2',
      aiVendor: AIVendor.CLAUDE,
      isLoading: false,
      timestamp: 0,
    },
  ];

  test('renders nothing if no messages', () => {
    render(<Response blockId="block-1" responseMessages={[]} />);
    expect(screen.queryByTestId('text-container')).not.toBeInTheDocument();
  });

  test('renders messages', () => {
    render(
      <Response
        blockId="block-1"
        responseMessages={mockMessages}
        data-testid="res-comp"
      />
    );
    expect(screen.getByTestId('res-comp')).toBeInTheDocument();
    expect(screen.getAllByTestId('response-message')).toHaveLength(2);
    // Toggle group label + BrandName title = 2
    expect(screen.getAllByText('OpenAI').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Claude').length).toBeGreaterThanOrEqual(1);
  });

  test('orders responses left to right by vendor priority', () => {
    mockVendorKeyStatuses = [
      { aiVendor: AIVendor.OPENAI, priority: 2 },
      { aiVendor: AIVendor.CLAUDE, priority: 1 },
    ];
    // Arrival order is OpenAI then Claude — priority must flip them
    render(<Response blockId="block-1" responseMessages={mockMessages} />);
    const cards = screen.getAllByTestId('response-message');
    expect(cards[0]).toHaveTextContent('Claude');
    expect(cards[1]).toHaveTextContent('OpenAI');
  });

  test('unprioritized vendors keep arrival order after prioritized ones', () => {
    mockVendorKeyStatuses = [{ aiVendor: AIVendor.CLAUDE, priority: 1 }];
    const msgs = [
      {
        messageId: 'msg-1',
        text: 'R1',
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
        timestamp: 0,
      },
      {
        messageId: 'msg-2',
        text: 'R2',
        aiVendor: AIVendor.CLAUDE,
        isLoading: false,
        timestamp: 0,
      },
      {
        messageId: 'msg-3',
        text: 'R3',
        aiVendor: AIVendor.GEMINI,
        isLoading: false,
        timestamp: 0,
      },
    ];
    render(<Response blockId="block-1" responseMessages={msgs} />);
    // Cap is 2: prioritized Claude leads, then OpenAI (first-arrived of
    // the unprioritized pair) — Gemini falls outside the display cap
    const cards = screen.getAllByTestId('response-message');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Claude');
    expect(cards[1]).toHaveTextContent('OpenAI');
  });

  test('priority decides which vendors survive the display cap', () => {
    mockMaxVendors = 1;
    mockVendorKeyStatuses = [
      { aiVendor: AIVendor.OPENAI, priority: 2 },
      { aiVendor: AIVendor.CLAUDE, priority: 1 },
    ];
    render(<Response blockId="block-1" responseMessages={mockMessages} />);
    const cards = screen.getAllByTestId('response-message');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Claude');
  });

  test('handles Follow Up click', () => {
    const onFollowUp = jest.fn();
    render(
      <Response
        blockId="block-1"
        responseMessages={mockMessages}
        onFollowUp={onFollowUp}
      />
    );

    const followUpBtns = screen.getAllByTestId('follow-up-button');
    expect(followUpBtns).toHaveLength(2); // Should show for all responses
    fireEvent.click(followUpBtns[1]); // Click the second one (msg-2)

    expect(mockSetSelectedResponseForBlock).toHaveBeenCalledWith(
      'block-1',
      'msg-2'
    );
    expect(onFollowUp).toHaveBeenCalledWith('msg-2');
  });

  test('Follow Up button disabled if props.disabled is true', () => {
    const onFollowUp = jest.fn();
    render(
      <Response
        blockId="block-1"
        responseMessages={mockMessages}
        onFollowUp={onFollowUp}
        disabled={true}
      />
    );

    const followUpBtns = screen.getAllByTestId('follow-up-button');
    expect(followUpBtns[0]).toBeDisabled();
    expect(followUpBtns[1]).toBeDisabled();

    fireEvent.click(followUpBtns[1]);
    expect(onFollowUp).not.toHaveBeenCalled();
  });

  test('Follow Up button indicates "Selected" state', () => {
    mockGetSelectedResponseForBlock.mockReturnValue('msg-2'); // Msg 2 selected
    render(
      <Response
        blockId="block-1"
        responseMessages={mockMessages}
        onFollowUp={jest.fn()}
      />
    );

    const btns = screen.getAllByTestId('follow-up-button');
    expect(btns).toHaveLength(2);

    // The second button (for msg-2) should say 'Selected' and be disabled
    expect(btns[1]).toHaveTextContent('Selected');
    expect(btns[1]).toBeDisabled();

    // The first button should not say 'Selected'
    expect(btns[0]).not.toHaveTextContent('Selected');
    expect(btns[0]).not.toBeDisabled();
  });
  test('shows Stop button and NO follow up button if content is loading', () => {
    const loadingMsgs = [
      {
        messageId: 'msg-loading',
        text: 'Generating...',
        aiVendor: AIVendor.OPENAI,
        isLoading: true,
        timestamp: 0,
      },
    ];
    render(
      <Response
        blockId="block-1"
        responseMessages={loadingMsgs}
        onFollowUp={jest.fn()}
        data-testid="res-comp"
      />
    );

    // Should render content and stop button, but NO follow up button
    expect(screen.getByTestId('res-comp')).toBeInTheDocument();
    expect(screen.getByTestId('stop-button')).toBeInTheDocument();
    expect(screen.queryByTestId('follow-up-button')).not.toBeInTheDocument();
  });

  test('shows no token or cost badges, even with usage data (the Tokens card carries them)', () => {
    const msgsWithTokens = [
      {
        messageId: 'msg-tokens',
        text: 'Here is a response',
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
        inputTokens: 1234,
        outputTokens: 567,
        totalTokens: 1801,
        tokensReadFromCache: 256,
        costUsd: 0.0421,
      },
    ];
    render(
      <Response
        blockId="block-1"
        responseMessages={msgsWithTokens}
        onFollowUp={jest.fn()}
      />
    );

    expect(screen.getByText('Here is a response')).toBeInTheDocument();
    expect(screen.queryByText('1,234')).not.toBeInTheDocument();
    expect(screen.queryByText('567')).not.toBeInTheDocument();
    expect(screen.queryByText('256')).not.toBeInTheDocument();
    expect(screen.queryByText('1,801')).not.toBeInTheDocument();
    expect(screen.queryByText('$0.0421')).not.toBeInTheDocument();
  });

  test('Regenerate and Follow up explain themselves on hover', () => {
    render(
      <Response
        blockId="block-1"
        responseMessages={[
          {
            messageId: 'msg-hints',
            text: 'An answer',
            aiVendor: AIVendor.OPENAI,
            isLoading: false,
          },
        ]}
        onFollowUp={jest.fn()}
      />
    );
    fireEvent.mouseEnter(
      screen.getByTestId('regenerate-button').closest('div')!.parentElement!
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Regenerate this response'
    );
    fireEvent.mouseLeave(
      screen.getByTestId('regenerate-button').closest('div')!.parentElement!
    );
    fireEvent.mouseEnter(
      screen.getByTestId('follow-up-button').closest('div')!.parentElement!
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Ask a follow-up from this response'
    );
  });

  test('does not render token badge when tokens are null or undefined', () => {
    const msgsWithoutTokens = [
      {
        messageId: 'msg-no-tokens',
        text: 'Here is a response without tokens',
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
      },
    ];
    render(
      <Response
        blockId="block-1"
        responseMessages={msgsWithoutTokens}
        onFollowUp={jest.fn()}
      />
    );

    // Check if token titles are ABSENT
    expect(screen.queryByTitle('Input tokens')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Output tokens')).not.toBeInTheDocument();
  });

  test('handles Regenerate click', () => {
    const mockGenerateResponsesStream = jest.fn();
    mockUseConversation.mockReturnValue({
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
      getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
      getVendorSelectionForBlock: () => mockSelection,
      setVendorSelectionForBlock: mockSetVendorSelectionForBlock,
      generateResponsesStream: mockGenerateResponsesStream,
      stopGenerating: jest.fn(),
    });

    render(
      <Response
        blockId="block-1"
        responseMessages={mockMessages}
        onFollowUp={jest.fn()}
      />
    );

    const regenerateBtns = screen.getAllByTestId('regenerate-button');
    expect(regenerateBtns).toHaveLength(2); // Should show for all responses
    fireEvent.click(regenerateBtns[0]); // Click the first one (msg-1 / OpenAI)

    expect(mockGenerateResponsesStream).toHaveBeenCalledWith(
      'block-1',
      undefined,
      undefined,
      AIVendor.OPENAI
    );
  });

  test('Regenerate button disabled if props.disabled is true', () => {
    render(
      <Response
        blockId="block-1"
        responseMessages={mockMessages}
        onFollowUp={jest.fn()}
        disabled={true}
      />
    );

    const regenerateBtns = screen.getAllByTestId('regenerate-button');
    expect(regenerateBtns[0]).toBeDisabled();
    expect(regenerateBtns[1]).toBeDisabled();
  });

  // --- Vendor toggle + activity panel ---

  test('shows no toggle group for a single vendor', () => {
    render(<Response blockId="block-1" responseMessages={[mockMessages[0]]} />);
    expect(screen.queryByTestId('vendor-radio-group')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('vendor-checkbox-group')
    ).not.toBeInTheDocument();
  });

  test('shows the checkbox group when vendors fit the column limit', () => {
    mockSelection = [AIVendor.OPENAI, AIVendor.CLAUDE];
    render(<Response blockId="block-1" responseMessages={mockMessages} />);

    expect(screen.getByTestId('vendor-checkbox-group')).toBeInTheDocument();
    expect(screen.queryByTestId('vendor-radio-group')).not.toBeInTheDocument();
  });

  test('shows only the chosen vendor even when the others would fit', () => {
    mockSelection = [AIVendor.OPENAI];
    render(<Response blockId="block-1" responseMessages={mockMessages} />);

    expect(screen.getAllByTestId('response-message')).toHaveLength(1);
    expect(screen.getByTestId('response-row')).toHaveClass('single');
  });

  test('marks a row that holds one card, which takes wider padding', () => {
    const { rerender } = render(
      <Response blockId="block-1" responseMessages={[mockMessages[0]]} />
    );
    expect(screen.getByTestId('response-row')).toHaveClass('single');

    rerender(<Response blockId="block-1" responseMessages={mockMessages} />);
    expect(screen.getByTestId('response-row')).not.toHaveClass('single');
  });

  test('still shows the checkbox group when vendors exceed the column limit', () => {
    mockMaxVendors = 2;
    mockSelection = [AIVendor.OPENAI, AIVendor.CLAUDE, AIVendor.GEMINI];
    const threeVendors = [
      ...mockMessages,
      {
        messageId: 'msg-3',
        text: 'Response 3',
        aiVendor: AIVendor.GEMINI,
        isLoading: false,
        timestamp: 0,
      },
    ];
    render(<Response blockId="block-1" responseMessages={threeVendors} />);

    expect(screen.getByTestId('vendor-checkbox-group')).toBeInTheDocument();
    expect(screen.queryByTestId('vendor-radio-group')).not.toBeInTheDocument();
  });

  test('selecting a vendor at the column limit evicts the oldest selection', () => {
    mockMaxVendors = 2;
    mockSelection = [AIVendor.OPENAI, AIVendor.CLAUDE, AIVendor.GEMINI];
    const threeVendors = [
      ...mockMessages,
      {
        messageId: 'msg-3',
        text: 'Response 3',
        aiVendor: AIVendor.GEMINI,
        isLoading: false,
        timestamp: 0,
      },
    ];
    render(<Response blockId="block-1" responseMessages={threeVendors} />);

    // Displayed selection is capped to [OPENAI, CLAUDE]; picking GEMINI at
    // the cap drops the oldest (OPENAI) instead of blocking the click
    fireEvent.click(
      screen.getByTestId(`vendor-checkbox-group-option-${AIVendor.GEMINI}`)
    );

    expect(mockSetVendorSelectionForBlock).toHaveBeenCalledWith('block-1', [
      AIVendor.CLAUDE,
      AIVendor.GEMINI,
    ]);
  });

  test('checkbox group keeps other selections when below the limit', () => {
    mockSelection = [AIVendor.OPENAI];
    render(<Response blockId="block-1" responseMessages={mockMessages} />);

    fireEvent.click(
      screen.getByTestId(`vendor-checkbox-group-option-${AIVendor.CLAUDE}`)
    );

    expect(mockSetVendorSelectionForBlock).toHaveBeenCalledWith('block-1', [
      AIVendor.OPENAI,
      AIVendor.CLAUDE,
    ]);
  });

  describe('vendor switch scroll correction', () => {
    // JSDOM has no layout: the scroller, the row's offset and the row's
    // height are faked so the correction sees a 20000px conversation whose
    // response row starts 400px down.
    const setup = (scrollTop: number, rowHeight: { current: number }) => {
      jest.useFakeTimers();
      mockSelection = [AIVendor.OPENAI, AIVendor.CLAUDE];
      render(
        <div data-testid="center-section-scroll">
          <Response blockId="block-1" responseMessages={mockMessages} />
        </div>
      );
      const scroller = screen.getByTestId('center-section-scroll');
      const scrollTo = jest.fn();
      Object.defineProperties(scroller, {
        scrollTop: { value: scrollTop, configurable: true },
        scrollHeight: { value: 20000, configurable: true },
        clientHeight: { value: 600, configurable: true },
        scrollTo: { value: scrollTo, configurable: true },
      });
      scroller.getBoundingClientRect = () =>
        ({ top: 0, bottom: 600 }) as DOMRect;
      const row = screen.getByTestId('response-row');
      Object.defineProperty(row, 'offsetHeight', {
        get: () => rowHeight.current,
        configurable: true,
      });
      row.getBoundingClientRect = () => ({ top: 400 - scrollTop }) as DOMRect;
      return scrollTo;
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    const switchTo = (rowHeight: { current: number }, newHeight: number) => {
      fireEvent.click(
        screen.getByTestId(`vendor-checkbox-group-option-${AIVendor.CLAUDE}`)
      );
      rowHeight.current = newHeight;
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    };

    test('leaves the page alone when the response starts in view', () => {
      const rowHeight = { current: 14000 };
      const scrollTo = setup(300, rowHeight);

      switchTo(rowHeight, 2000);

      expect(scrollTo).not.toHaveBeenCalled();
    });

    test('keeps the reading position inside the row in a longer response', () => {
      const rowHeight = { current: 8000 };
      const scrollTo = setup(7500, rowHeight);

      switchTo(rowHeight, 14000);

      expect(scrollTo).not.toHaveBeenCalled();
    });

    test('keeps the reading position in a shorter response that still fills the view', () => {
      const rowHeight = { current: 14000 };
      const scrollTo = setup(1000, rowHeight);

      switchTo(rowHeight, 2000);

      expect(scrollTo).not.toHaveBeenCalled();
    });

    test('keeps the reading position when a shorter response still fills most of the view', () => {
      const rowHeight = { current: 14000 };
      const scrollTo = setup(1900, rowHeight);

      switchTo(rowHeight, 2000);

      // Row 400-2400 now: it ends 500px into the 600px view
      expect(scrollTo).not.toHaveBeenCalled();
    });

    test('brings up the end of a shorter response the view would be past', () => {
      const rowHeight = { current: 14000 };
      const scrollTo = setup(12000, rowHeight);

      switchTo(rowHeight, 2000);

      // Row 400-2400 now: its end at the bottom of the 600px view
      expect(scrollTo).toHaveBeenCalledWith({ top: 1800, behavior: 'smooth' });
    });

    test('shows all of a response shorter than the view, its scroll margin below the top', () => {
      const rowHeight = { current: 14000 };
      const scrollTo = setup(12000, rowHeight);
      screen.getByTestId('response-row').style.scrollMarginTop = '56px';

      switchTo(rowHeight, 300);

      expect(scrollTo).toHaveBeenCalledWith({ top: 344, behavior: 'smooth' });
    });

    test('shifts up by the shrink when the viewport was past the row', () => {
      const rowHeight = { current: 14000 };
      const scrollTo = setup(15000, rowHeight);

      switchTo(rowHeight, 10000);

      expect(scrollTo).toHaveBeenCalledWith({
        top: 11000,
        behavior: 'smooth',
      });
    });
  });

  test('vendor toggle row fades only the edges with hidden pills', () => {
    mockSelection = [AIVendor.OPENAI, AIVendor.CLAUDE];
    render(<Response blockId="block-1" responseMessages={mockMessages} />);
    const scroller = screen.getByTestId('vendor-toggle-scroller');

    // Simulate an overflowing chip row: 300px viewport, 500px of pills
    Object.defineProperty(scroller, 'clientWidth', {
      configurable: true,
      value: 300,
    });
    Object.defineProperty(scroller, 'scrollWidth', {
      configurable: true,
      value: 500,
    });

    // At the left edge → only the right side hints at more content
    Object.defineProperty(scroller, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 0,
    });
    fireEvent.scroll(scroller);
    expect(scroller.style.getPropertyValue('--fade-l')).toBe('0px');
    expect(scroller.style.getPropertyValue('--fade-r')).toBe('16px');

    // Mid-scroll → both edges fade
    scroller.scrollLeft = 100;
    fireEvent.scroll(scroller);
    expect(scroller.style.getPropertyValue('--fade-l')).toBe('16px');
    expect(scroller.style.getPropertyValue('--fade-r')).toBe('16px');

    // At the right edge → only the left side fades
    scroller.scrollLeft = 200;
    fireEvent.scroll(scroller);
    expect(scroller.style.getPropertyValue('--fade-l')).toBe('16px');
    expect(scroller.style.getPropertyValue('--fade-r')).toBe('0px');
  });

  test('streaming re-renders do not undo a vendor the user toggled off', () => {
    // Both vendors present and selected
    mockSelection = [AIVendor.OPENAI, AIVendor.CLAUDE];
    const { rerender } = render(
      <Response blockId="block-1" responseMessages={mockMessages} />
    );
    mockSetVendorSelectionForBlock.mockClear();

    // User toggles CLAUDE off…
    mockSelection = [AIVendor.OPENAI];

    // …then a stream chunk arrives: fresh message array identities re-run
    // the auto-select effect. It must not re-add the removed vendor.
    rerender(
      <Response
        blockId="block-1"
        responseMessages={[
          { ...mockMessages[0], text: 'Response 1 plus a streamed chunk' },
          { ...mockMessages[1] },
        ]}
      />
    );

    expect(mockSetVendorSelectionForBlock).not.toHaveBeenCalled();
  });

  test('auto-selects vendors that appear for the first time', () => {
    mockSelection = [];
    render(<Response blockId="block-1" responseMessages={[mockMessages[0]]} />);

    expect(mockSetVendorSelectionForBlock).toHaveBeenCalledWith('block-1', [
      AIVendor.OPENAI,
    ]);
  });

  test('renders the activity panel inside the card for a message with a log', () => {
    mockSelection = [AIVendor.OPENAI];
    const withActivity = [
      {
        messageId: 'msg-1',
        text: 'Answer [1]',
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
        activity: completedActivity.events as any,
        webSources: completedActivity.web_sources,
        timestamp: 0,
      },
    ];
    render(<Response blockId="block-1" responseMessages={withActivity} />);

    const header = screen.getByTestId('activity-header');
    expect(header).toHaveTextContent('Thought for 22s');
    expect(header).toHaveAttribute('aria-expanded', 'false');
  });

  test('omits the activity panel for messages without a log', () => {
    render(<Response blockId="block-1" responseMessages={mockMessages} />);
    expect(screen.queryByTestId('activity-panel')).not.toBeInTheDocument();
  });

  test('shows a single live "Thinking" header before the first activity arrives', () => {
    mockSelection = [AIVendor.OPENAI];
    const thinkingMsg = [
      {
        messageId: 'msg-1',
        text: '',
        aiVendor: AIVendor.OPENAI,
        isLoading: true,
        timestamp: 0,
      },
    ];
    render(<Response blockId="block-1" responseMessages={thinkingMsg} />);

    expect(screen.getByTestId('activity-header')).toHaveTextContent('Thinking');
    expect(screen.getByTestId('activity-header')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
  });

  test('a tool-call preamble streaming in and being reset never folds the live panel', () => {
    // The old panel took "loading with no text" as its live flag, so the
    // preamble collapsed it and nothing reopened it once the text was reset.
    mockSelection = [AIVendor.OPENAI];
    const base = {
      messageId: 'msg-1',
      aiVendor: AIVendor.OPENAI,
      isLoading: true,
      activity: liveActivity.events as any,
      timestamp: 0,
    };
    const { rerender } = render(
      <Response blockId="block-1" responseMessages={[{ ...base, text: '' }]} />
    );
    const header = () => screen.getByTestId('activity-header');
    expect(header()).toHaveAttribute('aria-expanded', 'true');

    rerender(
      <Response
        blockId="block-1"
        responseMessages={[{ ...base, text: 'Let me look that up…' }]}
      />
    );
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    rerender(
      <Response blockId="block-1" responseMessages={[{ ...base, text: '' }]} />
    );
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('activity-story')).toBeInTheDocument();

    rerender(
      <Response
        blockId="block-1"
        responseMessages={[
          {
            ...base,
            isLoading: false,
            text: 'Answer [1]',
            activity: completedActivity.events as any,
            webSources: completedActivity.web_sources,
          },
        ]}
      />
    );
    expect(header()).toHaveAttribute('aria-expanded', 'false');
  });

  test('shows the model chip in the card header when the model is known', () => {
    const withModel = [
      {
        messageId: 'msg-1',
        text: 'Answer',
        aiVendor: AIVendor.OPENAI,
        model: 'gpt-4o',
        isLoading: false,
        timestamp: 0,
      },
    ];
    render(<Response blockId="block-1" responseMessages={withModel} />);

    expect(screen.getByTestId('response-model-name')).toHaveTextContent(
      'gpt-4o'
    );
  });

  test('omits the model name when unknown', () => {
    render(<Response blockId="block-1" responseMessages={[mockMessages[0]]} />);
    expect(screen.queryByTestId('response-model-name')).not.toBeInTheDocument();
  });

  test('only renders the latest message per vendor', () => {
    const messagesWithDuplicates = [
      {
        messageId: 'msg-1',
        text: 'Response 1',
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
        timestamp: 0,
      },
      {
        messageId: 'msg-2',
        text: 'Response 2',
        aiVendor: AIVendor.CLAUDE,
        isLoading: false,
        timestamp: 0,
      },
      {
        messageId: 'msg-3',
        text: 'Response 3 (Latest)',
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
        timestamp: 0,
      },
    ];

    render(
      <Response
        blockId="block-1"
        responseMessages={messagesWithDuplicates}
        data-testid="res-comp"
      />
    );

    // Should only render 2 messages (one for OpenAI, one for Claude)
    expect(screen.getAllByTestId('response-message')).toHaveLength(2);

    // Ensure the latest OpenAI message text is what's rendered, not the first
    expect(screen.getByText('Response 3 (Latest)')).toBeInTheDocument();
    expect(screen.queryByText('Response 1')).not.toBeInTheDocument();
  });

  describe('added to memory (one section per turn)', () => {
    const withConversation = (overrides = {}) => {
      mockUseConversation.mockReturnValue({
        setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
        getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
        getVendorSelectionForBlock: () => mockSelection,
        setVendorSelectionForBlock: mockSetVendorSelectionForBlock,
        generateResponsesStream: jest.fn(),
        stopGenerating: jest.fn(),
        conversationId: 'conv-1',
        ...overrides,
      });
    };

    const baseMessage = {
      messageId: '11111111-aaaa-4bbb-8ccc-000000000001',
      text: 'A response',
      aiVendor: AIVendor.OPENAI,
      isLoading: false,
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      tokensReadFromCache: 0,
    };
    const claudeMessage = {
      ...baseMessage,
      messageId: '11111111-aaaa-4bbb-8ccc-000000000002',
      text: 'Another response',
      aiVendor: AIVendor.CLAUDE,
    };

    const FACTS = [
      {
        memoryId: 'mem-1',
        text: 'Prefers dark mode',
        kind: 'CORE',
        runId: 'run-1',
      },
      {
        memoryId: 'mem-2',
        text: 'Works in fintech',
        kind: 'EPISODIC',
        runId: 'run-1',
      },
    ];

    const setWidth = (width: number) => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
      });
    };

    beforeEach(() => setWidth(1280));

    afterEach(() => {
      jest.useRealTimers();
      setWidth(1024);
    });

    test('a fresh turn shows the learning line, then the facts as Memory cards', async () => {
      jest.useFakeTimers();
      withConversation();
      mockGetLearnedFacts
        .mockResolvedValueOnce({ status: 'pending', facts: [] })
        .mockResolvedValueOnce({ status: 'done', facts: FACTS });

      render(<Response blockId="block-1" responseMessages={[baseMessage]} />);

      expect(screen.getByTestId('learned-memory-pending')).toHaveTextContent(
        'Learning from this turn…'
      );
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(4000);
      });

      const section = screen.getByTestId('learned-memory-section');
      expect(section).toHaveTextContent('Added to memory · 2 facts added');
      expect(screen.getAllByTestId('learned-memory-card')).toHaveLength(2);
      expect(screen.getByText('Core')).toBeInTheDocument();
      expect(screen.queryByText(/Used/)).not.toBeInTheDocument();
      expect(mockGetLearnedFacts).toHaveBeenCalledWith(
        'tok',
        'conv-1',
        baseMessage.messageId
      );
    });

    test('nothing learned is one muted line', async () => {
      withConversation();
      mockGetLearnedFacts.mockResolvedValue({ status: 'done', facts: [] });

      render(<Response blockId="block-1" responseMessages={[baseMessage]} />);

      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByTestId('learned-memory-none')).toHaveTextContent(
        'No new facts added to memory from this turn'
      );
    });

    test('a historical turn renders its facts without polling, singular header for one', async () => {
      withConversation();

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: [FACTS[0]] }]}
        />
      );

      expect(screen.getByTestId('learned-memory-section')).toHaveTextContent(
        'Added to memory · 1 fact added'
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockGetLearnedFacts).not.toHaveBeenCalled();
    });

    test('cards on an old turn carry the date of the turn, not "Just now"', () => {
      withConversation();

      render(
        <Response
          blockId="block-1"
          sentAt={Date.UTC(2026, 8, 7, 12)}
          responseMessages={[{ ...baseMessage, learnedFacts: [FACTS[0]] }]}
        />
      );

      expect(screen.queryByText('Just now')).not.toBeInTheDocument();
      expect(screen.getByTestId('learned-memory-card')).toHaveTextContent(
        '2026'
      );
    });

    test('an unknown outcome (null) shows the none line without polling', async () => {
      withConversation();

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: null }]}
        />
      );

      expect(screen.getByTestId('learned-memory-none')).toBeInTheDocument();
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockGetLearnedFacts).not.toHaveBeenCalled();
    });

    test('two vendors share one section, and nothing polls until both have finished', async () => {
      mockSelection = [AIVendor.OPENAI, AIVendor.CLAUDE];
      withConversation();
      mockGetLearnedFacts.mockResolvedValue({ status: 'done', facts: FACTS });

      const { rerender } = render(
        <Response
          blockId="block-1"
          responseMessages={[
            baseMessage,
            { ...claudeMessage, isLoading: true },
          ]}
        />
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockGetLearnedFacts).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId('learned-memory-pending')
      ).not.toBeInTheDocument();

      rerender(
        <Response
          blockId="block-1"
          responseMessages={[baseMessage, claudeMessage]}
        />
      );
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getAllByTestId('learned-memory-section')).toHaveLength(1);
      expect(screen.getByTestId('learned-memory-section')).toHaveTextContent(
        'from your messages and every response'
      );
      expect(mockGetLearnedFacts).toHaveBeenCalledTimes(1);
    });

    test('a turn whose responses disagree (old data) shows the facts some response has', () => {
      withConversation();

      render(
        <Response
          blockId="block-1"
          responseMessages={[
            { ...baseMessage, learnedFacts: [] },
            { ...claudeMessage, learnedFacts: FACTS },
          ]}
        />
      );

      expect(
        screen.getAllByTestId('learned-memory-card').length
      ).toBeGreaterThan(0);
    });

    test('Hide collapses the section to its header; Show all brings every card back', () => {
      withConversation();

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: FACTS }]}
        />
      );

      fireEvent.click(screen.getByTestId('learned-memory-toggle'));
      expect(
        screen.queryByTestId('learned-memory-card')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('learned-memory-toggle')).toHaveTextContent(
        'Show all'
      );

      fireEvent.click(screen.getByTestId('learned-memory-toggle'));
      expect(screen.getAllByTestId('learned-memory-card')).toHaveLength(2);
    });

    test('deleting asks first, then removes the card and updates the count', async () => {
      withConversation();
      mockDeleteMemoryFact.mockResolvedValue(undefined);

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: FACTS }]}
        />
      );

      fireEvent.click(screen.getAllByTestId('learned-memory-card-actions')[0]);
      fireEvent.click(screen.getByTestId('learned-memory-action-delete'));
      expect(
        screen.getByTestId('learned-memory-confirm-delete')
      ).toHaveTextContent('Prefers dark mode');
      expect(mockDeleteMemoryFact).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.click(
          screen.getByTestId('learned-memory-confirm-delete-button')
        );
      });

      expect(mockDeleteMemoryFact).toHaveBeenCalledWith('tok', 'mem-1');
      expect(screen.queryByText('Prefers dark mode')).not.toBeInTheDocument();
      expect(screen.getByTestId('learned-memory-section')).toHaveTextContent(
        'Added to memory · 1 fact added'
      );
    });

    test('cancelling the confirmation keeps the fact', () => {
      withConversation();

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: FACTS }]}
        />
      );

      fireEvent.click(screen.getAllByTestId('learned-memory-card-actions')[0]);
      fireEvent.click(screen.getByTestId('learned-memory-action-delete'));
      fireEvent.click(screen.getByTestId('learned-memory-confirm-cancel'));

      expect(mockDeleteMemoryFact).not.toHaveBeenCalled();
      expect(screen.getAllByTestId('learned-memory-card')).toHaveLength(2);
    });

    test('a failed delete keeps the card listed', async () => {
      withConversation();
      mockDeleteMemoryFact.mockRejectedValue(new Error('boom'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: FACTS }]}
        />
      );

      fireEvent.click(screen.getAllByTestId('learned-memory-card-actions')[0]);
      fireEvent.click(screen.getByTestId('learned-memory-action-delete'));
      await act(async () => {
        fireEvent.click(
          screen.getByTestId('learned-memory-confirm-delete-button')
        );
      });

      expect(screen.getByText('Prefers dark mode')).toBeInTheDocument();
    });

    test('phones get a chip that opens the swipe-row sheet', () => {
      setWidth(390);
      withConversation();

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: FACTS }]}
        />
      );

      expect(
        screen.queryByTestId('learned-memory-section')
      ).not.toBeInTheDocument();
      const chip = screen.getByTestId('learned-memory-chip');
      expect(chip).toHaveTextContent('2facts added to memory from this turn');

      fireEvent.click(chip);
      expect(screen.getByTestId('learned-memory-sheet')).toHaveTextContent(
        '2 facts added to memory'
      );
      expect(screen.getAllByTestId('learned-memory-sheet-row')).toHaveLength(2);
      expect(screen.getAllByTestId('learned-memory-sheet-delete')).toHaveLength(
        2
      );
    });

    test('does not poll for errored or still-placeholder messages', async () => {
      withConversation();

      const erroredMsg = { ...baseMessage, error: 'boom' };
      const abortedMsg = {
        ...baseMessage,
        messageId: 'resp-123-0',
        aiVendor: AIVendor.CLAUDE,
      };
      render(
        <Response
          blockId="block-1"
          responseMessages={[erroredMsg, abortedMsg]}
        />
      );

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockGetLearnedFacts).not.toHaveBeenCalled();
    });
  });

  describe('fork button', () => {
    const mockForkConversation = jest.fn();
    const withForkContext = () => {
      mockUseConversation.mockReturnValue({
        setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
        getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
        getVendorSelectionForBlock: () => mockSelection,
        setVendorSelectionForBlock: mockSetVendorSelectionForBlock,
        generateResponsesStream: jest.fn(),
        stopGenerating: jest.fn(),
        conversationId: 'conv-1',
        forkConversation: mockForkConversation,
      });
    };

    test('shows a fork button per response and forks at that message', () => {
      withForkContext();
      render(<Response blockId="block-1" responseMessages={mockMessages} />);

      const forkBtns = screen.getAllByTestId('fork-button');
      expect(forkBtns).toHaveLength(2);
      fireEvent.click(forkBtns[1]);

      expect(mockForkConversation).toHaveBeenCalledWith('msg-2');
    });

    test('shows fork — but not regenerate/follow-up — on non-last blocks', () => {
      withForkContext();
      render(
        <Response
          blockId="block-1"
          responseMessages={mockMessages}
          onFollowUp={jest.fn()}
          isLastResponseBlock={false}
        />
      );

      expect(screen.getAllByTestId('fork-button')).toHaveLength(2);
      expect(screen.queryByTestId('regenerate-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('follow-up-button')).not.toBeInTheDocument();
    });

    test('no fork button when the host does not inject forkConversation', () => {
      render(<Response blockId="block-1" responseMessages={mockMessages} />);
      expect(screen.queryByTestId('fork-button')).not.toBeInTheDocument();
    });

    test('no fork button for placeholder or errored messages', () => {
      withForkContext();
      const msgs = [
        {
          messageId: 'resp-123-0',
          text: 'aborted mid-stream',
          aiVendor: AIVendor.OPENAI,
          isLoading: false,
          timestamp: 0,
        },
        {
          messageId: 'msg-err',
          text: 'failed',
          aiVendor: AIVendor.CLAUDE,
          isLoading: false,
          error: 'boom',
          timestamp: 0,
        },
      ];
      render(<Response blockId="block-1" responseMessages={msgs} />);

      expect(screen.queryByTestId('fork-button')).not.toBeInTheDocument();
    });

    test('fork stays enabled when generation is disabled (no API keys)', () => {
      withForkContext();
      render(
        <Response
          blockId="block-1"
          responseMessages={mockMessages}
          disabled={true}
        />
      );

      const forkBtns = screen.getAllByTestId('fork-button');
      expect(forkBtns[0]).not.toBeDisabled();
      fireEvent.click(forkBtns[0]);
      expect(mockForkConversation).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('web-search citations', () => {
    const webSources = [
      { index: 1, title: 'Fed holds rates', url: 'https://example.com/fed' },
      { index: 2, title: 'Market reaction', url: 'https://example.com/mkt' },
    ];

    test('linkifies known [n] markers in the content and leaves unknown ones', () => {
      const messages = [
        {
          messageId: 'msg-1',
          text: 'Rates held [1] and markets rallied [2]. Unknown [9].',
          aiVendor: AIVendor.OPENAI,
          isLoading: false,
          webSources,
        },
      ];
      render(<Response blockId="block-1" responseMessages={messages} />);
      // The mocked TextContainer renders the raw content string
      expect(screen.getByTestId('tc-content')).toHaveTextContent(
        'Rates held [[1]](https://example.com/fed) and markets rallied [[2]](https://example.com/mkt). Unknown [9].'
      );
    });

    test('renders a sources list with links once loading finishes', () => {
      const messages = [
        {
          messageId: 'msg-1',
          text: 'Cited answer [1]',
          aiVendor: AIVendor.OPENAI,
          isLoading: false,
          webSources,
        },
      ];
      render(<Response blockId="block-1" responseMessages={messages} />);
      const section = screen.getByTestId('sources-section');
      expect(section).toBeInTheDocument();
      const links = section.querySelectorAll('a');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', 'https://example.com/fed');
      expect(links[0]).toHaveTextContent('Fed holds rates');
      expect(links[1]).toHaveAttribute('href', 'https://example.com/mkt');
    });

    test("lists a citation from the model's own knowledge without a link", () => {
      const messages = [
        {
          messageId: 'msg-1',
          text: 'Cited answer [1] and [4]',
          aiVendor: AIVendor.OPENAI,
          isLoading: false,
          webSources: [
            ...webSources,
            {
              index: 4,
              title: 'Madrian & Shea, QJE, 2001',
              url: '',
              origin: 'training' as const,
            },
          ],
        },
      ];
      render(<Response blockId="block-1" responseMessages={messages} />);
      const section = screen.getByTestId('sources-section');
      expect(section.querySelectorAll('a')).toHaveLength(2);
      expect(screen.getByTestId('sources-section-training')).toHaveTextContent(
        'Madrian & Shea, QJE, 2001'
      );
      expect(section).toHaveTextContent('(from training knowledge)');
    });

    test('keeps a long training reference whole instead of cutting it off', () => {
      const reference =
        'Kendall et al., Muscles: Testing and Function with Posture and Pain, 5th ed., 2005';
      const messages = [
        {
          messageId: 'msg-1',
          text: 'Cited answer [1]',
          aiVendor: AIVendor.OPENAI,
          isLoading: false,
          webSources: [
            {
              index: 1,
              title: reference,
              url: '',
              origin: 'training' as const,
            },
          ],
        },
      ];
      render(<Response blockId="block-1" responseMessages={messages} />);
      const row = screen.getByTestId('sources-section-training');
      // The wrapping style, not the link's one-line ellipsis.
      expect(row).toHaveClass('sourceReference');
      expect(row).not.toHaveClass('sourceLink');
      expect(row).toHaveTextContent(`${reference} (from training knowledge)`);
    });

    test('hides the sources list while the message is still streaming', () => {
      const messages = [
        {
          messageId: 'msg-1',
          text: 'partial [1]',
          aiVendor: AIVendor.OPENAI,
          isLoading: true,
          webSources,
        },
      ];
      render(<Response blockId="block-1" responseMessages={messages} />);
      expect(screen.queryByTestId('sources-section')).not.toBeInTheDocument();
    });

    test('renders no sources section when the message has no web sources', () => {
      render(<Response blockId="block-1" responseMessages={mockMessages} />);
      expect(screen.queryByTestId('sources-section')).not.toBeInTheDocument();
    });
  });

  describe('stop reason', () => {
    const msg = (stopReason: string, text = 'Answer') => [
      {
        messageId: 'm1',
        text,
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
        timestamp: 0,
        stopReason,
      },
    ];

    test('a refusal renders a prominent note carrying the raw reason', () => {
      mockSelection = [AIVendor.OPENAI];
      render(
        <Response blockId="block-1" responseMessages={msg('refusal', '')} />
      );
      const note = screen.getByTestId('stop-reason');
      expect(note).toHaveAttribute('data-reason', 'refusal');
      expect(note.textContent).toMatch(/declined to answer/i);
      expect(note.textContent).toContain('refusal');
    });

    test('a length cap renders a truncation note', () => {
      mockSelection = [AIVendor.OPENAI];
      render(
        <Response blockId="block-1" responseMessages={msg('max_tokens')} />
      );
      const note = screen.getByTestId('stop-reason');
      expect(note).toHaveAttribute('data-reason', 'max_tokens');
      expect(note.textContent).toMatch(/cut off/i);
    });

    test('a normal finish renders no note', () => {
      // The answer speaks for itself — only noteworthy terminations show.
      mockSelection = [AIVendor.OPENAI];
      render(<Response blockId="block-1" responseMessages={msg('end_turn')} />);
      expect(screen.queryByTestId('stop-reason')).not.toBeInTheDocument();
    });

    test("OpenAI's 'stop' also renders no note", () => {
      mockSelection = [AIVendor.OPENAI];
      render(<Response blockId="block-1" responseMessages={msg('stop')} />);
      expect(screen.queryByTestId('stop-reason')).not.toBeInTheDocument();
    });

    test('an unrecognized reason keeps the quiet footnote', () => {
      // Better to surface a raw reason we don't know than to hide it.
      mockSelection = [AIVendor.OPENAI];
      render(
        <Response blockId="block-1" responseMessages={msg('pause_turn')} />
      );
      const note = screen.getByTestId('stop-reason');
      expect(note).toHaveAttribute('data-reason', 'pause_turn');
      expect(note.textContent).toMatch(/pause_turn/);
    });

    test('no stop reason renders no note', () => {
      mockSelection = [AIVendor.OPENAI];
      render(<Response blockId="block-1" responseMessages={msg('')} />);
      expect(screen.queryByTestId('stop-reason')).not.toBeInTheDocument();
    });

    test('a user Stop renders a stopped note under the partial answer', () => {
      mockSelection = [AIVendor.OPENAI];
      render(
        <Response blockId="block-1" responseMessages={msg('cancelled')} />
      );
      const note = screen.getByTestId('stop-reason');
      expect(note).toHaveAttribute('data-reason', 'cancelled');
      expect(note.textContent).toMatch(/you stopped this response/i);
      expect(screen.getAllByTestId('response-message')).toHaveLength(1);
    });

    test('a reply interrupted before any text keeps its card, a note, and Regenerate', () => {
      // The server lost the generation: the stop reason alone must explain
      // the empty card instead of "No responses were generated".
      mockSelection = [AIVendor.OPENAI];
      render(
        <Response
          blockId="block-1"
          responseMessages={msg('interrupted', '')}
          onFollowUp={jest.fn()}
        />
      );
      expect(screen.getAllByTestId('response-message')).toHaveLength(1);
      const note = screen.getByTestId('stop-reason');
      expect(note).toHaveAttribute('data-reason', 'interrupted');
      expect(note.textContent).toMatch(/interrupted before it finished/i);
      expect(screen.getByTestId('regenerate-button')).toBeInTheDocument();
      expect(
        screen.queryByText('conversation.response.noResponsesGenerated')
      ).not.toBeInTheDocument();
    });

    test('a reply stopped before any text keeps its card and vendor', () => {
      // Stopped while thinking: no text, no error — the stop reason alone
      // keeps the card (and the vendor's pill) on screen.
      mockSelection = [AIVendor.OPENAI];
      render(
        <Response blockId="block-1" responseMessages={msg('cancelled', '')} />
      );
      expect(screen.getAllByTestId('response-message')).toHaveLength(1);
      expect(screen.getByTestId('stop-reason')).toHaveAttribute(
        'data-reason',
        'cancelled'
      );
      expect(
        screen.queryByText('conversation.response.noResponsesGenerated')
      ).not.toBeInTheDocument();
    });
  });
});
