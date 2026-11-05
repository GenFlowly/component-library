/** Long enough for lazily loaded text above the element to finish laying out. */
const HOLD_MS = 3000;

const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'mousedown', 'keydown'];

/**
 * Scrolls straight to an element and holds it at the top while the content
 * around it keeps growing, until the user takes over or the hold runs out.
 * Returns a function that ends the hold early.
 */
export function landOnElement(element: HTMLElement): () => void {
  const land = () =>
    element.scrollIntoView({ behavior: 'auto', block: 'start' });
  land();

  const scroller =
    element.closest<HTMLElement>('[data-testid*="center-section"]') ?? window;
  const content = element.closest('.conversation-block-item')?.parentElement;
  const observer =
    content && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(land)
      : null;
  if (content) observer?.observe(content);

  const stop = () => {
    observer?.disconnect();
    clearTimeout(timer);
    USER_SCROLL_EVENTS.forEach(type =>
      scroller.removeEventListener(type, stop)
    );
  };
  const timer = setTimeout(stop, HOLD_MS);
  USER_SCROLL_EVENTS.forEach(type =>
    scroller.addEventListener(type, stop, { passive: true })
  );
  return stop;
}
