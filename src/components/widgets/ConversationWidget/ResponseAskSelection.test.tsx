import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Response from './Response';
import { AskSelectionProvider, useAskSelection } from './AskSelectionContext';
import {
  useConversation,
  useConversationLayout,
} from './ConversationWidgetContext';

const mockShowToast = jest.fn();
jest.mock('./ConversationWidgetContext', () => ({
  useConversation: jest.fn(),
  useConversationLayout: jest.fn(),
  useConversationAuth: () => ({
    getAccessTokenSilently: jest.fn().mockResolvedValue('tok'),
    aiVendorAPIKeyStatusList: [],
    isAuthenticated: true,
  }),
  useConversationServices: () => ({}),
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('./useMaxVendors', () => ({ useMaxVendors: () => 2 }));

// Shell TextContainer that surfaces the onAskSelection seam as a button, the
// way the real one surfaces it on text selection
jest.mock('../../common/TextContainer/TextContainer', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid={props['data-testid'] || 'text-container'}>
      <div>{props.content}</div>
      {props.onAskSelection && (
        <button
          data-testid="mock-ask"
          onClick={() => props.onAskSelection(`picked from ${props.content}`)}
        />
      )}
      {props.children}
    </div>
  ),
}));

jest.mock('../../common/RectangleButton/RectangleButton', () => ({
  __esModule: true,
  default: ({ label, onClick, disabled, 'data-testid': testId }: any) => (
    <button data-testid={testId} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  ),
}));

jest.mock('./BrandName', () => ({
  VendorBrandName: ({ vendorId }: any) => <span>{vendorId}</span>,
}));
jest.mock('./useVendorDisplayNames', () => ({
  useVendorDisplayNames: () => (vendorId: string) => vendorId,
}));

function QuotesProbe() {
  const { pendingAsks } = useAskSelection();
  return (
    <div data-testid="pending-quotes">
      {pendingAsks.map(a => a.quotedText).join('|')}
    </div>
  );
}

const message = (messageId: string, aiVendor: string, text: string) => ({
  messageId,
  aiVendor,
  text,
  isLoading: false,
});

describe('Response selection-ask wiring', () => {
  const mockUseConversation = useConversation as jest.Mock;
  const mockUseLayout = useConversationLayout as jest.Mock;
  const mockSetSelectedResponseForBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLayout.mockReturnValue({
      isLeftSidebarExpanded: false,
      isRightSidebarExpanded: false,
    });
    mockUseConversation.mockReturnValue({
      conversationId: 'conv-1',
      conversationBlockList: [],
      setSelectedResponseForBlock: mockSetSelectedResponseForBlock,
      getSelectedResponseForBlock: jest.fn().mockReturnValue(null),
      getVendorSelectionForBlock: jest.fn().mockReturnValue([]),
      setVendorSelectionForBlock: jest.fn(),
      generateResponsesStream: jest.fn(),
      stopGenerating: jest.fn(),
    });
  });

  test('asking from a selection queues the quote and auto-selects that response', () => {
    const onFollowUp = jest.fn();
    render(
      <AskSelectionProvider>
        <QuotesProbe />
        <Response
          blockId="blk-1"
          responseMessages={[message('m1', 'OPENAI', 'Hello')]}
          onFollowUp={onFollowUp}
        />
      </AskSelectionProvider>
    );

    fireEvent.click(screen.getByTestId('mock-ask'));

    expect(screen.getByTestId('pending-quotes')).toHaveTextContent(
      '> picked from Hello'
    );
    expect(mockSetSelectedResponseForBlock).toHaveBeenCalledWith('blk-1', 'm1');
    expect(onFollowUp).toHaveBeenCalledWith('m1');
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  test("asking from a second vendor's response switches the source and toasts", () => {
    render(
      <AskSelectionProvider>
        <QuotesProbe />
        <Response
          blockId="blk-1"
          responseMessages={[
            message('m1', 'OPENAI', 'From OpenAI'),
            message('m2', 'CLAUDE', 'From Claude'),
          ]}
          onFollowUp={jest.fn()}
        />
      </AskSelectionProvider>
    );

    const askButtons = screen.getAllByTestId('mock-ask');
    expect(askButtons).toHaveLength(2);

    fireEvent.click(askButtons[0]);
    expect(mockShowToast).not.toHaveBeenCalled();

    fireEvent.click(askButtons[1]);
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockSetSelectedResponseForBlock).toHaveBeenLastCalledWith(
      'blk-1',
      'm2'
    );
  });

  test('no ask affordance when disabled, on non-last blocks, or without a provider', () => {
    const { rerender } = render(
      <AskSelectionProvider>
        <Response
          blockId="blk-1"
          responseMessages={[message('m1', 'OPENAI', 'Hello')]}
          onFollowUp={jest.fn()}
          disabled
        />
      </AskSelectionProvider>
    );
    expect(screen.queryByTestId('mock-ask')).not.toBeInTheDocument();

    rerender(
      <AskSelectionProvider>
        <Response
          blockId="blk-1"
          responseMessages={[message('m1', 'OPENAI', 'Hello')]}
          onFollowUp={jest.fn()}
          isLastResponseBlock={false}
        />
      </AskSelectionProvider>
    );
    expect(screen.queryByTestId('mock-ask')).not.toBeInTheDocument();

    rerender(
      <Response
        blockId="blk-1"
        responseMessages={[message('m1', 'OPENAI', 'Hello')]}
        onFollowUp={jest.fn()}
      />
    );
    expect(screen.queryByTestId('mock-ask')).not.toBeInTheDocument();
  });
});
