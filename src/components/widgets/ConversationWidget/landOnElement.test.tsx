import { landOnElement } from './landOnElement';

describe('landOnElement', () => {
  let observers: { callback: () => void; disconnect: jest.Mock }[];
  let scroller: HTMLElement;
  let element: HTMLElement;
  let scrollIntoView: jest.Mock;

  const grow = () => observers.forEach(o => o.callback());

  beforeEach(() => {
    jest.useFakeTimers();
    observers = [];
    (global as any).ResizeObserver = class {
      disconnect = jest.fn();
      observe = jest.fn();
      constructor(callback: () => void) {
        observers.push({ callback, disconnect: this.disconnect });
      }
    };
    document.body.innerHTML = `
      <div data-testid="center-section-scroll">
        <div id="list">
          <div class="conversation-block-item"><div id="response"></div></div>
        </div>
      </div>`;
    scroller = document.querySelector('[data-testid="center-section-scroll"]')!;
    element = document.getElementById('response')!;
    scrollIntoView = jest.fn();
    element.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (global as any).ResizeObserver;
  });

  it('jumps straight to the element, with no animation', () => {
    landOnElement(element);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    });
  });

  it('lands again when the content grows', () => {
    landOnElement(element);
    grow();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it.each(['wheel', 'touchstart', 'mousedown', 'keydown'])(
    'lets go on %s',
    type => {
      landOnElement(element);
      scroller.dispatchEvent(new Event(type));
      expect(observers[0].disconnect).toHaveBeenCalled();
    }
  );

  it('lets go when the hold runs out', () => {
    landOnElement(element);
    jest.advanceTimersByTime(3000);
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it('can be ended early', () => {
    const stop = landOnElement(element);
    stop();
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it('still lands where ResizeObserver is missing', () => {
    delete (global as any).ResizeObserver;
    const stop = landOnElement(element);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    stop();
  });
});
