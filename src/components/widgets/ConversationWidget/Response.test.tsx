import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Response from './Response';
import { useConversation } from './ConversationWidgetContext';
import { AIVendor } from './vendors';
import '@testing-library/jest-dom';

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

  // --- Vendor toggle + thinking (merged from the former ResponseThinking widget) ---

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

  test('renders the thinking section inside the response card for messages with steps', () => {
    mockSelection = [AIVendor.OPENAI];
    const withThinking = [
      {
        messageId: 'msg-1',
        text: 'Answer',
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
        thinkingSteps: ['pondering deeply'],
        timestamp: 0,
      },
    ];
    render(<Response blockId="block-1" responseMessages={withThinking} />);

    expect(screen.getByTestId('thinking-section')).toBeInTheDocument();
    expect(screen.getByText('Thinking')).toBeInTheDocument();
  });

  test('omits the thinking section for messages without steps', () => {
    render(<Response blockId="block-1" responseMessages={mockMessages} />);
    expect(screen.queryByTestId('thinking-section')).not.toBeInTheDocument();
  });

  test('shows a single "Thinking" label (no placeholder) while steps have not arrived', () => {
    mockSelection = [AIVendor.OPENAI];
    const thinkingMsg = [
      {
        messageId: 'msg-1',
        text: '',
        aiVendor: AIVendor.OPENAI,
        isLoading: true,
        thinkingSteps: [],
        timestamp: 0,
      },
    ];
    render(<Response blockId="block-1" responseMessages={thinkingMsg} />);

    expect(screen.getAllByText('Thinking')).toHaveLength(1);
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
  });

  test('shows "Thought for x seconds" once thinking is complete', () => {
    mockSelection = [AIVendor.OPENAI];
    const withDuration = [
      {
        messageId: 'msg-1',
        text: 'Answer',
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
        thinkingSteps: ['step one'],
        thinkingDurationMs: 4321,
        timestamp: 0,
      },
    ];
    render(<Response blockId="block-1" responseMessages={withDuration} />);

    expect(screen.getByText('Thought for 4 seconds')).toBeInTheDocument();
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
  });

  test('keeps the "Thinking" label while still thinking, even if duration is unset', () => {
    mockSelection = [AIVendor.OPENAI];
    const stillThinking = [
      {
        messageId: 'msg-1',
        text: '',
        aiVendor: AIVendor.OPENAI,
        isLoading: true,
        thinkingSteps: ['step one'],
        timestamp: 0,
      },
    ];
    render(<Response blockId="block-1" responseMessages={stillThinking} />);

    expect(screen.getByText('Thinking')).toBeInTheDocument();
  });

  test('a structured step collapses and expands via its own row toggle', () => {
    // Legacy flat "k" strings carry no data beyond a name, so they have
    // nothing to expand/collapse — this exercises a structured step, which
    // is what per-row collapse actually applies to.
    mockSelection = [AIVendor.OPENAI];
    const withThinking = [
      {
        messageId: 'msg-1',
        text: 'Answer',
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
        timestamp: 0,
        thinkingStepList: [
          {
            node: 'retriever',
            name: 'Document Retriever',
            kind: 'RETRIEVAL' as const,
            status: 'done' as const,
            detail: 'Found 1 relevant document(s)',
            items: ['step one'],
          },
        ],
      },
    ];
    render(<Response blockId="block-1" responseMessages={withThinking} />);

    // Not thinking anymore → the whole section starts collapsed; the row
    // inside is collapsed too once the section is opened
    expect(screen.queryByText('step one')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('thinking-section-toggle'));
    expect(screen.queryByText('step one')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('thinking-step-toggle'));
    expect(screen.getByText('step one')).toBeInTheDocument();
  });

  test('renders structured thinking steps (name, detail, items) from thinkingStepList', () => {
    mockSelection = [AIVendor.OPENAI];
    const withStructured = [
      {
        messageId: 'msg-1',
        text: 'Answer',
        aiVendor: AIVendor.OPENAI,
        isLoading: false,
        timestamp: 0,
        thinkingStepList: [
          {
            node: 'retriever',
            name: 'Document Retriever',
            kind: 'RETRIEVAL' as const,
            status: 'done' as const,
            detail: 'Found 1 relevant document(s)',
            items: ['Q3 sales report'],
          },
        ],
      },
    ];
    render(<Response blockId="block-1" responseMessages={withStructured} />);

    // Completed turn → the whole section starts collapsed behind its header
    expect(screen.queryByTestId('thinking-step-list')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('thinking-section-toggle'));

    expect(screen.getByTestId('thinking-step-list')).toBeInTheDocument();
    expect(screen.getByText('Document Retriever')).toBeInTheDocument();
    expect(
      screen.getByText('Found 1 relevant document(s)')
    ).toBeInTheDocument();

    // The row's own content (items) stays collapsed until its own toggle is clicked
    expect(screen.queryByText('Q3 sales report')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('thinking-step-toggle'));
    expect(screen.getByText('Q3 sales report')).toBeInTheDocument();
  });

  test('renders legacy flat strings and structured steps together', () => {
    mockSelection = [AIVendor.OPENAI];
    const mixed = [
      {
        messageId: 'msg-1',
        text: '',
        aiVendor: AIVendor.OPENAI,
        isLoading: true,
        timestamp: 0,
        thinkingSteps: ['legacy flat line'],
        thinkingStepList: [
          {
            node: 'qa',
            name: 'Query Analyzer',
            kind: 'LLM' as const,
            status: 'running' as const,
            label: 'Query Analyzer: thinking…',
          },
        ],
      },
    ];
    render(<Response blockId="block-1" responseMessages={mixed} />);

    // Still thinking → section starts expanded
    expect(screen.getByText('legacy flat line')).toBeInTheDocument();
    expect(screen.getByText('Query Analyzer: thinking…')).toBeInTheDocument();
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
  });
});
