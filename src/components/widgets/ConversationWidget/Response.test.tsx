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

    test('starts a shorter response from its top when the viewport was inside the row', () => {
      const rowHeight = { current: 14000 };
      const scrollTo = setup(12000, rowHeight);

      switchTo(rowHeight, 2000);

      expect(scrollTo).toHaveBeenCalledWith({ top: 400, behavior: 'smooth' });
    });

    test('starts a longer response from its top when the viewport was inside the row', () => {
      const rowHeight = { current: 8000 };
      const scrollTo = setup(7500, rowHeight);

      switchTo(rowHeight, 14000);

      expect(scrollTo).toHaveBeenCalledWith({ top: 400, behavior: 'smooth' });
    });

    test('lands the row its scroll margin below the top of the view', () => {
      const rowHeight = { current: 14000 };
      const scrollTo = setup(12000, rowHeight);
      screen.getByTestId('response-row').style.scrollMarginTop = '56px';

      switchTo(rowHeight, 2000);

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

  describe('learned facts stat', () => {
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

    const FACTS = [
      { memoryId: 'mem-1', text: 'Prefers dark mode' },
      { memoryId: 'mem-2', text: 'Works in fintech' },
    ];

    /** Hover helper — the Tooltip's mouse handlers live on its wrapper div */
    const hoverFactsCount = () => {
      const trigger = screen.getByTestId('learned-facts-count');
      fireEvent.mouseEnter(trigger.parentElement!);
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    test('fresh response shows the pending brain then the fact count once extraction finishes', async () => {
      jest.useFakeTimers();
      withConversation();
      mockGetLearnedFacts
        .mockResolvedValueOnce({ status: 'pending', facts: [] })
        .mockResolvedValueOnce({ status: 'done', facts: FACTS });

      render(<Response blockId="block-1" responseMessages={[baseMessage]} />);

      expect(screen.getByTestId('learned-facts-pending')).toHaveAccessibleName(
        'Learning facts…'
      );

      // First (immediate) poll: still pending
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByTestId('learned-facts-pending')).toBeInTheDocument();

      // Next poll 4s later: done with 2 facts
      await act(async () => {
        jest.advanceTimersByTime(4000);
      });
      expect(screen.getByTestId('learned-facts-count')).toHaveTextContent('2');
      expect(screen.getByTestId('learned-facts-count')).toHaveAccessibleName(
        '2 facts added to memory'
      );
      expect(mockGetLearnedFacts).toHaveBeenCalledWith(
        'tok',
        'conv-1',
        baseMessage.messageId
      );
    });

    test('fresh response with no learned facts settles on a zero count', async () => {
      withConversation();
      mockGetLearnedFacts.mockResolvedValue({ status: 'done', facts: [] });

      render(<Response blockId="block-1" responseMessages={[baseMessage]} />);

      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByTestId('learned-facts-none')).toHaveTextContent('0');
      expect(screen.getByTestId('learned-facts-none')).toHaveAccessibleName(
        'No new facts added to memory'
      );
    });

    test('historical message renders its facts directly without polling', async () => {
      withConversation();

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: FACTS }]}
        />
      );

      expect(screen.getByTestId('learned-facts-count')).toHaveTextContent('2');
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockGetLearnedFacts).not.toHaveBeenCalled();
    });

    test('historical message with a single fact uses the singular label', () => {
      withConversation();

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: [FACTS[0]] }]}
        />
      );

      expect(screen.getByTestId('learned-facts-count')).toHaveTextContent('1');
      expect(screen.getByTestId('learned-facts-count')).toHaveAccessibleName(
        '1 fact added to memory'
      );
    });

    test('historical message with unknown outcome (null) shows "No new facts" without polling', async () => {
      withConversation();

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: null }]}
        />
      );

      expect(screen.getByTestId('learned-facts-none')).toBeInTheDocument();
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockGetLearnedFacts).not.toHaveBeenCalled();
    });

    test('hovering the count reveals a tooltip listing each fact', async () => {
      withConversation();

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: FACTS }]}
        />
      );

      hoverFactsCount();

      const list = await screen.findByTestId('learned-facts-list');
      expect(list).toBeInTheDocument();
      expect(screen.getByText('Prefers dark mode')).toBeInTheDocument();
      expect(screen.getByText('Works in fintech')).toBeInTheDocument();
      expect(screen.getAllByTestId('learned-fact-delete')).toHaveLength(2);
    });

    test('clicking ✗ deletes the fact, removes its line and adjusts the count', async () => {
      withConversation();
      mockDeleteMemoryFact.mockResolvedValue(undefined);

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: FACTS }]}
        />
      );

      hoverFactsCount();
      await screen.findByTestId('learned-facts-list');

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Delete fact from memory: Prefers dark mode',
        })
      );

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockDeleteMemoryFact).toHaveBeenCalledWith('tok', 'mem-1');
      expect(screen.queryByText('Prefers dark mode')).not.toBeInTheDocument();
      expect(screen.getByText('Works in fintech')).toBeInTheDocument();
      expect(screen.getByTestId('learned-facts-count')).toHaveAccessibleName(
        '1 fact added to memory'
      );
    });

    test('deleting the last fact switches to the none-state', async () => {
      withConversation();
      mockDeleteMemoryFact.mockResolvedValue(undefined);

      render(
        <Response
          blockId="block-1"
          responseMessages={[{ ...baseMessage, learnedFacts: [FACTS[0]] }]}
        />
      );

      hoverFactsCount();
      await screen.findByTestId('learned-facts-list');

      fireEvent.click(screen.getByTestId('learned-fact-delete'));
      await act(async () => {
        await Promise.resolve();
      });

      expect(
        screen.queryByTestId('learned-facts-count')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('learned-facts-none')).toBeInTheDocument();
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
