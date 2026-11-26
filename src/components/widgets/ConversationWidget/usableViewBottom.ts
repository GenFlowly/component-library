/**
 * Where the usable part of the conversation view ends, in viewport
 * coordinates: the scroller's bottom, or above the trailing editor when it
 * is stuck to the bottom of the view over the content.
 */
export function usableViewBottom(
  scroller: HTMLElement,
  block: Element | null
): number {
  const bottom = scroller.getBoundingClientRect().bottom;
  const last = block?.parentElement?.lastElementChild;
  return last && last !== block
    ? Math.min(bottom, last.getBoundingClientRect().top)
    : bottom;
}
