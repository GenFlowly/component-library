import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConversationWidget from './ConversationWidget';
import {
  useConversation,
  useConversationComposer,
  useConversationUI,
} from './ConversationWidgetContext';

// Mock dependencies
jest.mock('./ConversationWidgetContext', () => ({
  useConversation: jest.fn(),
  useConversationUI: jest.fn(),
  useConversationComposer: jest.fn(),
}));
jest.mock('./ConversationBlock', () => ({
  __esModule: true,
  default: ({ id }: any) => (
    <div data-testid={`conversation-block-${id}`}>Block {id}</div>
  ),
}));

describe('ConversationWidget', () => {
  const mockUseConversation = useConversation as jest.Mock;
  const mockUseConversationUI = useConversationUI as jest.Mock;
  const mockSetActiveViewportItem = jest.fn();

  // Setup for IntersectionObserver mocking
  let observerCallback: (entries: any[]) => void;
  const mockObserve = jest.fn();
  const mockDisconnect = jest.fn();

  beforeAll(() => {
    window.IntersectionObserver = class {
      constructor(callback: any) {
        observerCallback = callback;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = jest.fn();
    } as any;
  });

  afterAll(() => {
    // Restore to whatever was in jest.setup.js (which is just a mock class)
    window.IntersectionObserver = class {
      observe = jest.fn();
      disconnect = jest.fn();
      unobserve = jest.fn();
    } as any;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useConversationComposer as jest.Mock).mockReturnValue({});
    // setActiveViewportItem lives on the ConversationUI surface
    mockUseConversationUI.mockReturnValue({
      setActiveViewportItem: mockSetActiveViewportItem,
    });
    mockUseConversation.mockReturnValue({
      conversationBlockList: [],
      setActiveViewportItem: mockSetActiveViewportItem,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('editor after the last finished turn', () => {
    const resolved = (id: string) => ({
      conversationBlockId: id,
      prompt: 'Q',
      responseMessages: [{ messageId: `m-${id}` }],
      isLoading: false,
      status: 'resolved',
    });

    test('adds one empty block after a finished last turn', () => {
      const add = jest.fn();
      mockUseConversation.mockReturnValue({
        conversationBlockList: [resolved('b1')],
        addNewConversationBlockWithId: add,
      });
      const { rerender } = render(<ConversationWidget />);
      expect(add).toHaveBeenCalledTimes(1);
      expect(add.mock.calls[0][0]).toMatch(/^conv-/);

      // The same finished turn never gets a second one
      rerender(<ConversationWidget />);
      expect(add).toHaveBeenCalledTimes(1);
    });

    test('adds one as soon as the last turn starts generating', () => {
      const add = jest.fn();
      mockUseConversation.mockReturnValue({
        conversationBlockList: [
          resolved('b1'),
          { ...resolved('b2'), status: 'draft', isLoading: true },
        ],
        addNewConversationBlockWithId: add,
      });
      render(<ConversationWidget />);
      expect(add).toHaveBeenCalledTimes(1);
    });

    test('adds nothing after an unsent draft', () => {
      const add = jest.fn();
      mockUseConversation.mockReturnValue({
        conversationBlockList: [
          resolved('b1'),
          {
            conversationBlockId: 'b2',
            prompt: '',
            responseMessages: [],
            isLoading: false,
            status: 'draft',
          },
        ],
        addNewConversationBlockWithId: add,
      });
      render(<ConversationWidget />);
      expect(add).not.toHaveBeenCalled();
    });

    test('adds the next one once a new turn finishes', () => {
      const add = jest.fn();
      mockUseConversation.mockReturnValue({
        conversationBlockList: [resolved('b1')],
        addNewConversationBlockWithId: add,
      });
      const { rerender } = render(<ConversationWidget />);
      mockUseConversation.mockReturnValue({
        conversationBlockList: [resolved('b1'), resolved('b2')],
        addNewConversationBlockWithId: add,
      });
      rerender(<ConversationWidget />);
      expect(add).toHaveBeenCalledTimes(2);
    });

    test('adds nothing for a viewer who cannot post', () => {
      const add = jest.fn();
      (useConversationComposer as jest.Mock).mockReturnValue({
        canCompose: false,
      });
      mockUseConversation.mockReturnValue({
        conversationBlockList: [resolved('b1')],
        addNewConversationBlockWithId: add,
      });
      render(<ConversationWidget />);
      expect(add).not.toHaveBeenCalled();
    });
  });

  test('renders nothing when list is empty', () => {
    mockUseConversation.mockReturnValue({ conversationBlockList: [] });
    const { container } = render(<ConversationWidget />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders conversation blocks', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        { conversationBlockId: '1' },
        { conversationBlockId: '2' },
      ],
    });

    render(<ConversationWidget />);

    expect(screen.getByTestId('conversation-block-1')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-block-2')).toBeInTheDocument();
  });

  test('sets up IntersectionObserver and sets active viewport item', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [{ conversationBlockId: '1' }],
      setActiveViewportItem: mockSetActiveViewportItem,
    });

    // Mock document querySelector and querySelectorAll
    const mockCenterSection = document.createElement('div');
    const mockScrollElement = document.createElement('div');
    mockScrollElement.setAttribute('data-block-id', '1');
    mockScrollElement.setAttribute('data-item-type', 'request');

    jest.spyOn(document, 'querySelector').mockImplementation(selector => {
      if (selector === '[data-testid="center-section"]')
        return mockCenterSection;
      return null;
    });

    jest.spyOn(document, 'querySelectorAll').mockImplementation(selector => {
      if (selector === '[data-scroll-item="true"]')
        return [mockScrollElement] as any;
      return [] as any;
    });

    render(<ConversationWidget />);

    // Fast forward setTimeout
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // window.IntersectionObserver constructor was called, we can verify observe

    expect(mockObserve).toHaveBeenCalledWith(mockScrollElement);

    // Simulate intersecting
    act(() => {
      observerCallback([
        {
          isIntersecting: true,
          target: mockScrollElement,
        },
      ]);
    });

    expect(mockSetActiveViewportItem).toHaveBeenCalledWith({
      blockId: '1',
      type: 'request',
    });
  });

  test('cleans up IntersectionObserver and timeout on unmount', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [{ conversationBlockId: '1' }],
      setActiveViewportItem: mockSetActiveViewportItem,
    });

    jest
      .spyOn(document, 'querySelector')
      .mockReturnValue(document.createElement('div'));

    const { unmount } = render(<ConversationWidget />);

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();

    // Fast forward should not trigger observe since timeout was cleared
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockObserve).not.toHaveBeenCalled();
  });
});
