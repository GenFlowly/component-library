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
  vendors,
  currentVendor,
  onSwitch,
}: UseResponseSwipeOptions) {
  const [neighbor, setNeighbor] = useState<SwipeNeighbor | null>(null);
  const [phase, setPhase] = useState<'idle' | 'dragging' | 'settling'>('idle');
  const [labelState, setLabelState] = useState<SwipeLabelState>('hidden');

  const latest = useRef({ vendors, currentVendor, onSwitch });
  latest.current = { vendors, currentVendor, onSwitch };

  useEffect(() => {
    const row = rowRef.current;
    if (!enabled || !row) return;

    let gesture: Gesture | null = null;
    let isSettling = false;
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

    const claim = (current: Gesture, dx: number) => {
      const rowRect = row.getBoundingClientRect();
      const card = row.firstElementChild?.getBoundingClientRect();
      current.isClaimed = true;
      current.lockOffset = Math.sign(dx) * LOCK_DISTANCE;
      current.page = rowRect.width;
      row.style.setProperty('--swipe-page', `${rowRect.width}px`);
      if (card) {
        row.style.setProperty('--swipe-top', `${card.top - rowRect.top}px`);
        row.style.setProperty('--swipe-left', `${card.left - rowRect.left}px`);
        row.style.setProperty('--swipe-width', `${card.width}px`);
        row.style.setProperty('--swipe-height', `${card.height}px`);
      }
      clearTimeout(labelTimer);
      setPhase('dragging');
      setLabelState('shown');
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
      clearTimeout(settleTimer);
      clearTimeout(labelTimer);
      clearRow();
      setNeighbor(null);
      setPhase('idle');
      setLabelState('hidden');
    };
  }, [enabled, rowRef]);

  return { neighbor, phase, labelState };
}
