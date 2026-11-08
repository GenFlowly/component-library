import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Response from './Response';
import {
  useConversation,
  useConversationLayout,
} from './ConversationWidgetContext';
import {
  neighborVendor,
  rubberBand,
  shouldCommitSwipe,
} from './useResponseSwipe';

jest.mock('./ConversationWidgetContext', () => ({
  useConversation: jest.fn(),
  useConversationLayout: jest.fn(),
  useConversationAuth: () => ({
    getAccessTokenSilently: jest.fn(),
    aiVendorAPIKeyStatusList: [],
    isAuthenticated: true,
  }),
  useConversationServices: () => ({}),
  useToast: () => ({ showToast: jest.fn() }),
}));

let mockMaxVendors = 1;
jest.mock('./useMaxVendors', () => ({
  useMaxVendors: () => mockMaxVendors,
}));

jest.mock('../../common/TextContainer/TextContainer', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="response-message">
      <div>{props.content}</div>
      {props.children}
    </div>
  ),
}));

jest.mock('../../common/RectangleButton/RectangleButton', () => ({
  __esModule: true,
  default: ({ label, onClick, 'data-testid': testId }: any) => (
    <button data-testid={testId} onClick={onClick}>
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

const PAGE = 400;
const message = (aiVendor: string, text: string) => ({
  messageId: `id-${aiVendor}`,
  aiVendor,
  model: `${aiVendor}-model`,
  text,
  isLoading: false,
});
const messages = [
  message('A', 'first'),
  message('B', 'second'),
  message('C', 'third'),
];

let setVendorSelectionForBlock: jest.Mock;
let selection: string[];

function renderResponses(list = messages) {
  (useConversation as jest.Mock).mockReturnValue({
    setSelectedResponseForBlock: jest.fn(),
    getSelectedResponseForBlock: () => undefined,
    generateResponsesStream: jest.fn(),
    getVendorSelectionForBlock: () => selection,
    setVendorSelectionForBlock,
    stopGenerating: jest.fn(),
    conversationBlockList: [],
    conversationId: '',
  });
  (useConversationLayout as jest.Mock).mockReturnValue({
    isLeftSidebarExpanded: false,
    isRightSidebarExpanded: false,
  });
  render(
    <Response
      blockId="block"
      responseMessages={list as any}
      isLastResponseBlock
    />
  );
  setVendorSelectionForBlock.mockClear();
  const row = screen.getByTestId('response-row');
  jest
    .spyOn(row, 'getBoundingClientRect')
    .mockReturnValue({ width: PAGE, top: 0, left: 0, height: 900 } as DOMRect);
  return row;
}

const touch = (x: number, y: number) => ({
  touches: [{ clientX: x, clientY: y }],
});

function drag(row: Element, from: [number, number], to: [number, number]) {
  fireEvent.touchStart(row, touch(...from));
  act(() => {
    jest.advanceTimersByTime(100);
  });
  fireEvent.touchMove(row, touch(...to));
}

function release(row: Element) {
  fireEvent.touchEnd(row, { touches: [] });
  act(() => {
    jest.advanceTimersByTime(300);
  });
}

describe('swiping between vendor responses', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockMaxVendors = 1;
    selection = ['A'];
    setVendorSelectionForBlock = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('slides the next response in and shows both labels mid-drag', () => {
    const row = renderResponses();
    drag(row, [350, 300], [150, 300]);
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(screen.getAllByTestId('response-swipe-label')).toHaveLength(2);
    expect(row.style.getPropertyValue('--swipe-dx')).toBe('-188px');
  });

  it('switches through the same selection as the toggle past the midpoint', () => {
    const row = renderResponses();
    drag(row, [380, 300], [100, 300]);
    release(row);
    expect(setVendorSelectionForBlock).toHaveBeenCalledWith('block', ['B']);
    expect(row.style.getPropertyValue('--swipe-dx')).toBe('');
  });

  it('switches on a short flick', () => {
    const row = renderResponses();
    fireEvent.touchStart(row, touch(350, 300));
    act(() => {
      jest.advanceTimersByTime(50);
    });
    fireEvent.touchMove(row, touch(330, 300));
    act(() => {
      jest.advanceTimersByTime(16);
    });
    fireEvent.touchMove(row, touch(300, 300));
    release(row);
    expect(setVendorSelectionForBlock).toHaveBeenCalledWith('block', ['B']);
  });

  it('goes to the previous vendor on a rightward drag', () => {
    selection = ['B'];
    const row = renderResponses();
    drag(row, [60, 300], [340, 300]);
    release(row);
    expect(setVendorSelectionForBlock).toHaveBeenCalledWith('block', ['A']);
  });

  it('springs back when released before the midpoint, then fades the label', () => {
    const row = renderResponses();
    drag(row, [350, 300], [300, 300]);
    expect(
      screen.getAllByTestId('response-swipe-label').length
    ).toBeGreaterThan(0);
    release(row);
    expect(setVendorSelectionForBlock).not.toHaveBeenCalled();
    expect(screen.queryByText('second')).not.toBeInTheDocument();
    expect(screen.getByTestId('response-swipe-label')).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
  });

  it('keeps the action bar off the incoming response', () => {
    const row = renderResponses();
    drag(row, [350, 300], [150, 300]);
    expect(screen.getAllByTestId('regenerate-button')).toHaveLength(1);
  });

  it('rubber-bands past the last vendor and never switches', () => {
    selection = ['C'];
    const row = renderResponses();
    drag(row, [380, 300], [30, 300]);
    expect(
      Math.abs(parseFloat(row.style.getPropertyValue('--swipe-dx')))
    ).toBeLessThanOrEqual(64);
    release(row);
    expect(setVendorSelectionForBlock).not.toHaveBeenCalled();
  });

  it('peeks at a lone response without switching', () => {
    selection = ['A'];
    const row = renderResponses([messages[0]]);
    drag(row, [350, 300], [250, 300]);
    expect(screen.getByTestId('response-swipe-label')).toHaveTextContent(
      'A-model'
    );
    expect(screen.getByTestId('response-swipe-label')).toHaveTextContent(
      'conversation.response.onlyResponse'
    );
    release(row);
    expect(setVendorSelectionForBlock).not.toHaveBeenCalled();
  });

  it('leaves vertical scrolling alone', () => {
    const row = renderResponses();
    fireEvent.touchStart(row, touch(200, 300));
    const notPrevented = fireEvent.touchMove(row, touch(205, 200));
    expect(notPrevented).toBe(true);
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
  });

  it('cancels the page scroll once it owns the drag', () => {
    const row = renderResponses();
    fireEvent.touchStart(row, touch(300, 300));
    expect(fireEvent.touchMove(row, touch(200, 300))).toBe(false);
  });

  it('leaves the left edge to the menu swipe', () => {
    const row = renderResponses();
    drag(row, [10, 300], [200, 300]);
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
  });

  it('leaves a held touch to text selection', () => {
    const row = renderResponses();
    fireEvent.touchStart(row, touch(350, 300));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.touchMove(row, touch(200, 300));
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
  });

  it('leaves an active selection alone', () => {
    const row = renderResponses();
    const spy = jest.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      anchorNode: row,
    } as unknown as Selection);
    drag(row, [350, 300], [150, 300]);
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('lets an inner scroller use the drag while it can still scroll', () => {
    const row = renderResponses();
    const scroller = document.createElement('div');
    scroller.style.overflowX = 'auto';
    Object.defineProperty(scroller, 'scrollWidth', { value: 900 });
    Object.defineProperty(scroller, 'clientWidth', { value: 300 });
    row.appendChild(scroller);
    drag(scroller, [350, 300], [150, 300]);
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
  });

  it('takes the drag once the inner scroller is at its end', () => {
    const row = renderResponses();
    const scroller = document.createElement('div');
    scroller.style.overflowX = 'auto';
    Object.defineProperty(scroller, 'scrollWidth', { value: 900 });
    Object.defineProperty(scroller, 'clientWidth', { value: 300 });
    scroller.scrollLeft = 600;
    row.appendChild(scroller);
    drag(scroller, [350, 300], [150, 300]);
    expect(
      screen.getAllByTestId('response-swipe-label').length
    ).toBeGreaterThan(0);
  });

  it('ignores drags that start on the action bar', () => {
    const row = renderResponses();
    drag(screen.getByTestId('regenerate-button'), [350, 300], [150, 300]);
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
    expect(row).toBeInTheDocument();
  });

  it('does not page when two columns are showing', () => {
    mockMaxVendors = 2;
    selection = ['A', 'B'];
    const row = renderResponses();
    drag(row, [350, 300], [150, 300]);
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
  });

  it('springs back when the browser takes the touch over', () => {
    const row = renderResponses();
    drag(row, [380, 300], [100, 300]);
    fireEvent.touchCancel(row, { touches: [] });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(setVendorSelectionForBlock).not.toHaveBeenCalled();
  });
});

describe('swipe rules', () => {
  it('finds neighbors in display order and stops at the ends', () => {
    const vendors = ['A', 'B', 'C'];
    expect(neighborVendor(vendors, 'B', 'next')).toBe('C');
    expect(neighborVendor(vendors, 'B', 'previous')).toBe('A');
    expect(neighborVendor(vendors, 'C', 'next')).toBeNull();
    expect(neighborVendor(vendors, 'A', 'previous')).toBeNull();
    expect(neighborVendor(vendors, undefined, 'next')).toBeNull();
    expect(neighborVendor(vendors, 'Z', 'next')).toBeNull();
  });

  it('resists and caps the rubber band', () => {
    expect(rubberBand(100)).toBe(30);
    expect(rubberBand(-100)).toBe(-30);
    expect(rubberBand(1000)).toBe(64);
  });

  it('commits past the midpoint or on a flick the same way', () => {
    expect(shouldCommitSwipe(-201, 0, PAGE)).toBe(true);
    expect(shouldCommitSwipe(-199, 0, PAGE)).toBe(false);
    expect(shouldCommitSwipe(-50, -0.8, PAGE)).toBe(true);
    expect(shouldCommitSwipe(-50, 0.8, PAGE)).toBe(false);
  });
});
