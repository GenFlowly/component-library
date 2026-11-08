import { RefObject, useEffect, useRef, useState } from 'react';

export type SwipeSide = 'previous' | 'next';
export type SwipeLabelState = 'hidden' | 'shown' | 'fading';

export interface SwipeNeighbor {
  vendor: string;
  side: SwipeSide;
}

/** The strip along the left edge belongs to the app's menu swipe. */
const EDGE_ZONE = 24;
/** Movement before a touch counts as a swipe rather than a tap or a scroll. */
const LOCK_DISTANCE = 12;
const LOCK_RATIO = 1.5;
/** A touch held this long before moving is a text selection (ms). */
const HOLD_LIMIT = 400;
const COMMIT_FRACTION = 0.5;
const COMMIT_VELOCITY = 0.5; // px per ms
const RUBBER_BAND_FACTOR = 0.3;
const RUBBER_BAND_LIMIT = 64;
/** Outlasts the 240ms CSS transition, which only starts on the next frame. */
const SETTLE_DURATION = 260;
const LABEL_LINGER = 1000;
const LABEL_FADE = 200;

const HINT_STORAGE_KEY = 'responseSwipeHintSeen';
/** Lets the reader land on the response before anything moves on its own. */
const HINT_DELAY = 800;
/** Far enough to show the next response's edge past the gap between cards. */
const HINT_DISTANCE = 56;
const HINT_HOLD = 1260;
/** Outlasts the 320ms CSS transition, which only starts on the next frame. */
const HINT_RETURN = 340;

export function neighborVendor(
  vendors: string[],
  current: string | undefined,
  side: SwipeSide
): string | null {
  if (current === undefined) return null;
  const index = vendors.indexOf(current);
  if (index === -1) return null;
  return vendors[index + (side === 'next' ? 1 : -1)] ?? null;
}

export function rubberBand(dx: number): number {
  return (
    Math.sign(dx) *
    Math.min(Math.abs(dx) * RUBBER_BAND_FACTOR, RUBBER_BAND_LIMIT)
  );
}

export function shouldCommitSwipe(
  dx: number,
  velocity: number,
  page: number
): boolean {
  if (Math.abs(dx) > page * COMMIT_FRACTION) return true;
  return Math.abs(velocity) > COMMIT_VELOCITY && velocity * dx > 0;
}

/** Tables and code blocks keep the drag while they can still scroll that way. */
function innerScrollerTakesDrag(
  target: Element,
  boundary: Element,
  dx: number
): boolean {
  for (
    let element: Element | null = target;
    element && element !== boundary;
    element = element.parentElement
  ) {
    const maxScroll = element.scrollWidth - element.clientWidth;
    if (maxScroll <= 1) continue;
    if (!/auto|scroll/.test(getComputedStyle(element).overflowX)) continue;
    if (dx < 0 ? element.scrollLeft < maxScroll - 1 : element.scrollLeft > 1) {
      return true;
    }
  }
  return false;
}

function hasSelectionInside(element: Element): boolean {
  const selection = window.getSelection();
  return (
    !!selection &&
    !selection.isCollapsed &&
    !!selection.anchorNode &&
    element.contains(selection.anchorNode)
  );
}

function prefersReducedMotion(): boolean {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** A mouse can't swipe, however narrow the window is. */
function hasCoarsePointer(): boolean {
  return !!window.matchMedia?.('(pointer: coarse)').matches;
}

let hintSeenWithoutStorage = false;

function hasSeenSwipeHint(): boolean {
  try {
    return localStorage.getItem(HINT_STORAGE_KEY) === '1';
  } catch {
    return hintSeenWithoutStorage;
  }
}

function markSwipeHintSeen(): void {
  try {
    localStorage.setItem(HINT_STORAGE_KEY, '1');
  } catch {
    hintSeenWithoutStorage = true;
  }
}

interface Gesture {
  startX: number;
  startY: number;
  startTime: number;
  target: Element;
  isClaimed: boolean;
  lockOffset: number;
  page: number;
  dx: number;
  neighbor: SwipeNeighbor | null;
  lastX: number;
  lastTime: number;
  velocity: number;
}

interface UseResponseSwipeOptions {
  rowRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  /** Finished responses from more than one vendor, so a swipe has somewhere to go. */
  hintReady: boolean;
  vendors: string[];
  currentVendor: string | undefined;
  onSwitch: (vendor: string) => void;
}

/**
 * A sideways drag on the single response column pages between the vendors'
 * responses, like the toggle above it. The finger's offset goes straight to
 * the row's `--swipe-dx`, so dragging never re-renders the markdown.
 */
export function useResponseSwipe({
  rowRef,
  enabled,
  hintReady,
  vendors,
  currentVendor,
  onSwitch,
}: UseResponseSwipeOptions) {
  const [neighbor, setNeighbor] = useState<SwipeNeighbor | null>(null);
  const [phase, setPhase] = useState<
    'idle' | 'dragging' | 'settling' | 'hinting'
  >('idle');
  const [labelState, setLabelState] = useState<SwipeLabelState>('hidden');
  const [showsHint, setShowsHint] = useState(false);
  const playHint = useRef<() => boolean>(() => false);

  const latest = useRef({ vendors, currentVendor, onSwitch });
  latest.current = { vendors, currentVendor, onSwitch };

  useEffect(() => {
    const row = rowRef.current;
    if (!enabled || !row) return;

    let gesture: Gesture | null = null;
    let isSettling = false;
    let isHinting = false;
    let hintFrame = 0;
    let hintTimer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let labelTimer: ReturnType<typeof setTimeout> | undefined;

    const clearRow = () => {
      for (const property of [
        '--swipe-dx',
        '--swipe-top',
        '--swipe-left',
        '--swipe-width',
        '--swipe-height',
        '--swipe-page',
      ]) {
        row.style.removeProperty(property);
      }
    };

    const hideLabelLater = () => {
      clearTimeout(labelTimer);
      labelTimer = setTimeout(() => {
        setLabelState('fading');
        labelTimer = setTimeout(() => setLabelState('hidden'), LABEL_FADE);
      }, LABEL_LINGER);
    };

    const measureRow = (): number => {
      const rowRect = row.getBoundingClientRect();
      const card = row.firstElementChild?.getBoundingClientRect();
      row.style.setProperty('--swipe-page', `${rowRect.width}px`);
      if (card) {
        row.style.setProperty('--swipe-top', `${card.top - rowRect.top}px`);
        row.style.setProperty('--swipe-left', `${card.left - rowRect.left}px`);
        row.style.setProperty('--swipe-width', `${card.width}px`);
        row.style.setProperty('--swipe-height', `${card.height}px`);
      }
      return rowRect.width;
    };

    const claim = (current: Gesture, dx: number) => {
      current.isClaimed = true;
      current.lockOffset = Math.sign(dx) * LOCK_DISTANCE;
      current.page = measureRow();
      clearTimeout(labelTimer);
      markSwipeHintSeen();
      setShowsHint(false);
      setPhase('dragging');
      setLabelState('shown');
    };

    const endHint = () => {
      cancelAnimationFrame(hintFrame);
      clearTimeout(hintTimer);
      isHinting = false;
      isSettling = true;
      row.style.setProperty('--swipe-dx', '0px');
      settleTimer = setTimeout(
        () => {
          clearRow();
          isSettling = false;
          setNeighbor(null);
          setPhase('idle');
          hideLabelLater();
        },
        prefersReducedMotion() ? 0 : HINT_RETURN
      );
    };

    playHint.current = () => {
      if (hasSeenSwipeHint()) return true;
      if (gesture || isSettling || isHinting) return false;
      const { vendors: order, currentVendor: current } = latest.current;
      const side: SwipeSide = neighborVendor(order, current, 'next')
        ? 'next'
        : 'previous';
      const vendor = neighborVendor(order, current, side);
      if (!vendor) return false;

      markSwipeHintSeen();
      measureRow();
      isHinting = true;
      clearTimeout(labelTimer);
      setNeighbor({ vendor, side });
      setPhase('hinting');
      setShowsHint(true);
      setLabelState('shown');
      if (!prefersReducedMotion()) {
        // Two frames: the incoming card has to be painted before the slide
        // or there is nothing for its transition to start from.
        hintFrame = requestAnimationFrame(() => {
          hintFrame = requestAnimationFrame(() => {
            row.style.setProperty(
              '--swipe-dx',
              `${side === 'next' ? -HINT_DISTANCE : HINT_DISTANCE}px`
            );
          });
        });
      }
      hintTimer = setTimeout(endHint, HINT_HOLD);
      return true;
    };

    const place = (current: Gesture, dx: number) => {
      const raw = dx - current.lockOffset;
      const side: SwipeSide = raw < 0 ? 'next' : 'previous';
      const vendor = neighborVendor(
        latest.current.vendors,
        latest.current.currentVendor,
        side
      );
      const next = vendor ? { vendor, side } : null;
      if (next?.vendor !== current.neighbor?.vendor) {
        current.neighbor = next;
        setNeighbor(next);
      }
      current.dx = vendor
        ? Math.max(-current.page, Math.min(current.page, raw))
        : rubberBand(raw);
      row.style.setProperty('--swipe-dx', `${current.dx}px`);
    };

    const handleStart = (event: TouchEvent) => {
      if (gesture?.isClaimed) return;
      gesture = null;
      if (isHinting) {
        endHint();
        return;
      }
      const touch = event.touches[0];
      if (
        isSettling ||
        event.touches.length !== 1 ||
        touch.clientX <= EDGE_ZONE ||
        !(event.target instanceof Element) ||
        event.target.closest('[data-response-swipe-ignore]') ||
        hasSelectionInside(row)
      ) {
        return;
      }
      const now = performance.now();
      gesture = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: now,
        target: event.target,
        isClaimed: false,
        lockOffset: 0,
        page: 0,
        dx: 0,
        neighbor: null,
        lastX: touch.clientX,
        lastTime: now,
        velocity: 0,
      };
    };

    const handleMove = (event: TouchEvent) => {
      const current = gesture;
      if (!current) return;
      const touch = event.touches[0];
      const dx = touch.clientX - current.startX;
      const dy = touch.clientY - current.startY;
      const now = performance.now();

      if (!current.isClaimed) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX < LOCK_DISTANCE && absY < LOCK_DISTANCE) return;
        if (
          absX < LOCK_DISTANCE ||
          absX < absY * LOCK_RATIO ||
          now - current.startTime > HOLD_LIMIT ||
          innerScrollerTakesDrag(current.target, row, dx)
        ) {
          gesture = null;
          return;
        }
        claim(current, dx);
      }

      if (event.cancelable) event.preventDefault();
      const elapsed = now - current.lastTime;
      if (elapsed > 0)
        current.velocity = (touch.clientX - current.lastX) / elapsed;
      current.lastX = touch.clientX;
      current.lastTime = now;
      place(current, dx);
    };

    const finish = (mayCommit: boolean) => {
      const current = gesture;
      gesture = null;
      if (!current?.isClaimed) return;

      const target =
        mayCommit &&
        current.neighbor &&
        shouldCommitSwipe(current.dx, current.velocity, current.page)
          ? current.neighbor
          : null;

      isSettling = true;
      setPhase('settling');
      const landing =
        target === null
          ? 0
          : target.side === 'next'
            ? -current.page
            : current.page;
      row.style.setProperty('--swipe-dx', `${landing}px`);

      settleTimer = setTimeout(
        () => {
          if (target) latest.current.onSwitch(target.vendor);
          clearRow();
          isSettling = false;
          setNeighbor(null);
          setPhase('idle');
          hideLabelLater();
        },
        prefersReducedMotion() ? 0 : SETTLE_DURATION
      );
    };

    const handleEnd = () => finish(true);
    const handleCancel = () => finish(false);

    row.addEventListener('touchstart', handleStart, { passive: true });
    row.addEventListener('touchmove', handleMove, { passive: false });
    row.addEventListener('touchend', handleEnd);
    row.addEventListener('touchcancel', handleCancel);
    return () => {
      row.removeEventListener('touchstart', handleStart);
      row.removeEventListener('touchmove', handleMove);
      row.removeEventListener('touchend', handleEnd);
      row.removeEventListener('touchcancel', handleCancel);
      cancelAnimationFrame(hintFrame);
      clearTimeout(hintTimer);
      clearTimeout(settleTimer);
      clearTimeout(labelTimer);
      playHint.current = () => false;
      clearRow();
      setNeighbor(null);
      setPhase('idle');
      setLabelState('hidden');
      setShowsHint(false);
    };
  }, [enabled, rowRef]);

  useEffect(() => {
    const row = rowRef.current;
    if (
      !enabled ||
      !hintReady ||
      !row ||
      hasSeenSwipeHint() ||
      !hasCoarsePointer() ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    // The middle half of the viewport: a tall response still intersects it,
    // and a block at the far edge of the screen doesn't use up the one hint.
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (!entry.isIntersecting) return;
        timer = setTimeout(() => {
          if (playHint.current()) observer.disconnect();
        }, HINT_DELAY);
      },
      { rootMargin: '-25% 0px -25% 0px' }
    );
    observer.observe(row);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [enabled, hintReady, rowRef]);

  return { neighbor, phase, labelState, showsHint };
}
