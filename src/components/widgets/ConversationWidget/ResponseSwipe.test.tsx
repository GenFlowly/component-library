import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from '@testing-library/react';
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

function mountResponses(list = messages) {
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
    const row = mountResponses();
    drag(row, [350, 300], [150, 300]);
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(screen.getAllByTestId('response-swipe-label')).toHaveLength(2);
    expect(row.style.getPropertyValue('--swipe-dx')).toBe('-188px');
  });

  it('switches through the same selection as the toggle past the midpoint', () => {
    const row = mountResponses();
    drag(row, [380, 300], [100, 300]);
    release(row);
    expect(setVendorSelectionForBlock).toHaveBeenCalledWith('block', ['B']);
    expect(row.style.getPropertyValue('--swipe-dx')).toBe('');
  });

  it('switches on a short flick', () => {
    const row = mountResponses();
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
    const row = mountResponses();
    drag(row, [60, 300], [340, 300]);
    release(row);
    expect(setVendorSelectionForBlock).toHaveBeenCalledWith('block', ['A']);
  });

  it('springs back when released before the midpoint, then fades the label', () => {
    const row = mountResponses();
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
    const row = mountResponses();
    drag(row, [350, 300], [150, 300]);
    expect(screen.getAllByTestId('regenerate-button')).toHaveLength(1);
  });

  it('rubber-bands past the last vendor and never switches', () => {
    selection = ['C'];
    const row = mountResponses();
    drag(row, [380, 300], [30, 300]);
    expect(
      Math.abs(parseFloat(row.style.getPropertyValue('--swipe-dx')))
    ).toBeLessThanOrEqual(64);
    release(row);
    expect(setVendorSelectionForBlock).not.toHaveBeenCalled();
  });

  it('peeks at a lone response without switching', () => {
    selection = ['A'];
    const row = mountResponses([messages[0]]);
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
    const row = mountResponses();
    fireEvent.touchStart(row, touch(200, 300));
    const notPrevented = fireEvent.touchMove(row, touch(205, 200));
    expect(notPrevented).toBe(true);
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
  });

  it('cancels the page scroll once it owns the drag', () => {
    const row = mountResponses();
    fireEvent.touchStart(row, touch(300, 300));
    expect(fireEvent.touchMove(row, touch(200, 300))).toBe(false);
  });

  it('leaves the left edge to the menu swipe', () => {
    const row = mountResponses();
    drag(row, [10, 300], [200, 300]);
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
  });

  it('leaves a held touch to text selection', () => {
    const row = mountResponses();
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
    const row = mountResponses();
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
    const row = mountResponses();
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
    const row = mountResponses();
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
    const row = mountResponses();
    drag(screen.getByTestId('regenerate-button'), [350, 300], [150, 300]);
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
    expect(row).toBeInTheDocument();
  });

  it('does not page when two columns are showing', () => {
    mockMaxVendors = 2;
    selection = ['A', 'B'];
    const row = mountResponses();
    drag(row, [350, 300], [150, 300]);
    expect(
      screen.queryByTestId('response-swipe-label')
    ).not.toBeInTheDocument();
  });

  it('springs back when the browser takes the touch over', () => {
    const row = mountResponses();
    drag(row, [380, 300], [100, 300]);
    fireEvent.touchCancel(row, { touches: [] });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(setVendorSelectionForBlock).not.toHaveBeenCalled();
  });
});

describe('the one-time swipe hint', () => {
  const HINT = 'conversation.response.swipeHint';
  let observers: {
    callback: IntersectionObserverCallback;
    disconnect: jest.Mock;
  }[];
  let media: Record<string, boolean>;

  const scrollIntoView = () =>
    act(() => {
      observers.forEach(o =>
        o.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver
        )
      );
    });
  const advance = (ms: number) =>
    act(() => {
      jest.advanceTimersByTime(ms);
    });

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    mockMaxVendors = 1;
    selection = ['A'];
    setVendorSelectionForBlock = jest.fn();
    observers = [];
    media = { '(pointer: coarse)': true };
    (window as any).IntersectionObserver = jest.fn(
      (callback: IntersectionObserverCallback) => {
        const observer = { callback, disconnect: jest.fn() };
        observers.push(observer);
        return { observe: jest.fn(), disconnect: observer.disconnect };
      }
    );
    window.matchMedia = jest.fn((query: string) => ({
      matches: !!media[query],
    })) as any;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (window as any).IntersectionObserver;
    delete (window as any).matchMedia;
  });

  it('peeks at the next response once it is in view, then settles', () => {
    const row = mountResponses();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    scrollIntoView();
    advance(800);
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
    advance(40);
    expect(row.style.getPropertyValue('--swipe-dx')).toBe('-56px');
    advance(1260);
    expect(row.style.getPropertyValue('--swipe-dx')).toBe('0px');
    advance(340);
    expect(row.style.getPropertyValue('--swipe-dx')).toBe('');
    expect(screen.queryByText('second')).not.toBeInTheDocument();
    advance(1200);
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    expect(setVendorSelectionForBlock).not.toHaveBeenCalled();
  });

  it('never plays again', () => {
    mountResponses();
    scrollIntoView();
    advance(800);
    expect(localStorage.getItem('responseSwipeHintSeen')).toBe('1');
    advance(3000);
    cleanup();
    observers.length = 0;
    mountResponses();
    expect(observers).toHaveLength(0);
  });

  it('peeks toward the previous response from the last vendor', () => {
    selection = ['C'];
    const row = mountResponses();
    scrollIntoView();
    advance(840);
    expect(row.style.getPropertyValue('--swipe-dx')).toBe('56px');
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('does not play if the response scrolls away during the delay', () => {
    mountResponses();
    scrollIntoView();
    advance(400);
    act(() => {
      observers[0].callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    advance(2000);
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    expect(localStorage.getItem('responseSwipeHintSeen')).toBeNull();
  });

  it('stays out of the way of a mouse', () => {
    media = {};
    mountResponses();
    expect(observers).toHaveLength(0);
  });

  it('needs a second vendor', () => {
    mountResponses([messages[0]]);
    expect(observers).toHaveLength(0);
  });

  it('waits for generation to finish', () => {
    mountResponses([messages[0], { ...messages[1], isLoading: true }]);
    expect(observers).toHaveLength(0);
  });

  it('does not play in two columns', () => {
    mockMaxVendors = 2;
    selection = ['A', 'B'];
    mountResponses();
    expect(observers).toHaveLength(0);
  });

  it('is skipped by someone who already swiped', () => {
    const row = mountResponses();
    drag(row, [350, 300], [300, 300]);
    expect(localStorage.getItem('responseSwipeHintSeen')).toBe('1');
    release(row);
    scrollIntoView();
    advance(800);
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it('gets out of the way when the reader touches the response', () => {
    const row = mountResponses();
    scrollIntoView();
    advance(840);
    fireEvent.touchStart(row, touch(200, 300));
    expect(row.style.getPropertyValue('--swipe-dx')).toBe('0px');
    advance(340);
    expect(screen.queryByText('second')).not.toBeInTheDocument();
  });

  it('keeps still under reduced motion but still says it', () => {
    media['(prefers-reduced-motion: reduce)'] = true;
    const row = mountResponses();
    scrollIntoView();
    advance(840);
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(row.style.getPropertyValue('--swipe-dx')).toBe('');
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
