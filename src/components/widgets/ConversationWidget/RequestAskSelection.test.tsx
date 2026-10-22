import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Request from './Request';
import { AskSelectionProvider, useAskSelection } from './AskSelectionContext';
import {
  useConversation,
  useConversationUI,
  useConversationAuth,
} from './ConversationWidgetContext';

jest.mock('./ConversationWidgetContext', () => ({
  useConversation: jest.fn(),
  useConversationUI: jest.fn(),
  useConversationAuth: jest.fn(),
  useConversationServices: () => ({}),
  useToast: () => ({ showToast: jest.fn() }),
}));

// The editor mock mirrors the real TextEditor's surface: value/onChange plus
// the focusEnd imperative handle Request calls after absorbing an ask
jest.mock('../TextEditorWidget/TextEditor', () => {
  const MockReact = require('react');
  return {
    __esModule: true,
    default: MockReact.forwardRef(function MockTextEditor(
      { value, onChange, 'data-testid': testId }: any,
      ref: any
    ) {
      MockReact.useImperativeHandle(ref, () => ({ focusEnd: () => undefined }));
      return MockReact.createElement('textarea', {
        'data-testid': testId,
        value,
        onChange: (e: any) => onChange(e.target.value),
      });
    }),
  };
});

jest.mock('./BrandName', () => ({
  UserBrandName: ({ name }: any) => <span>{name}</span>,
}));

// The resolved-request view pulls in the markdown renderer (ESM-only deps
// jest can't transform); shell it out like Request.test.tsx does
jest.mock('../../common/TextContainer/TextContainer', () => ({
  __esModule: true,
  default: ({ content, children }: any) => (
    <div data-testid="text-container">
      {content}
      {children}
    </div>
  ),
}));

/** Queues an ask the way a Response card would. */
function QueueProbe({ text, source }: { text: string; source: string }) {
  const { queueAsk } = useAskSelection();
  return (
    <button data-testid="queue-ask" onClick={() => queueAsk(text, source)} />
  );
}

const draftBlock = (id: string) => ({
  conversationBlockId: id,
  responseMessages: [],
  isLoading: false,
  status: 'draft',
  prompt: '',
});

describe('Request absorbs selection-asks', () => {
  const mockUseConversation = useConversation as jest.Mock;
  const mockUseConversationUI = useConversationUI as jest.Mock;
  const mockUseAuth = useConversationAuth as jest.Mock;

  const conversationValue = (blocks: any[]) => ({
    conversationId: 'conv-1',
    conversationBlockList: blocks,
    generateResponsesStream: jest.fn(),
    stopGenerating: jest.fn(),
    getSelectedResponseForBlock: jest.fn(),
    setActiveBlockId: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseConversationUI.mockReturnValue({ setEditorPrompt: jest.fn() });
    mockUseConversation.mockReturnValue(conversationValue([draftBlock('b1')]));
    mockUseAuth.mockReturnValue({
      aiVendorAPIKeyStatusList: [{ isAPIKeyValid: true }],
      customerName: 'Test User',
      user: { name: 'Auth0 User' },
      customerId: 'cust-123',
      getAccessTokenSilently: jest.fn().mockResolvedValue('tok'),
    });
  });

  test('queued ask lands at the end of the draft as a blockquote, preserving ask → type → ask order', () => {
    render(
      <AskSelectionProvider>
        <QueueProbe text={'pick\nme'} source="msg-1" />
        <Request blockId="b1" />
      </AskSelectionProvider>
    );
    const editor = screen.getByTestId('text-editor');

    fireEvent.change(editor, { target: { value: 'intro' } });
    fireEvent.click(screen.getByTestId('queue-ask'));
    expect(editor).toHaveValue('intro\n\n> pick\n> me\n\n');

    // Typing continues below the quote; the next ask appends after it
    fireEvent.change(editor, {
      target: { value: 'intro\n\n> pick\n> me\n\nask 1' },
    });
    fireEvent.click(screen.getByTestId('queue-ask'));
    expect(editor).toHaveValue(
      'intro\n\n> pick\n> me\n\nask 1\n\n> pick\n> me\n\n'
    );
  });

  test('an empty draft starts with the quote alone', () => {
    render(
      <AskSelectionProvider>
        <QueueProbe text="just this" source="msg-1" />
        <Request blockId="b1" />
      </AskSelectionProvider>
    );
    fireEvent.click(screen.getByTestId('queue-ask'));
    expect(screen.getByTestId('text-editor')).toHaveValue('> just this\n\n');
  });

  test('only the trailing draft block consumes the queue', () => {
    mockUseConversation.mockReturnValue(
      conversationValue([draftBlock('b1'), draftBlock('b2')])
    );
    render(
      <AskSelectionProvider>
        <QueueProbe text="for the last block" source="msg-1" />
        <Request blockId="b1" />
      </AskSelectionProvider>
    );
    fireEvent.click(screen.getByTestId('queue-ask'));
    // b1 is not the last block — the ask stays queued for b2's editor
    expect(screen.getByTestId('text-editor')).toHaveValue('');
  });
});
