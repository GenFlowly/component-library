import React, { ReactNode, useCallback, useRef, useState } from 'react';
import styles from './VerticalSplit.module.scss';

const DEFAULT_FRACTION = 0.4;
const DEFAULT_MIN_FRACTION = 0.15;
const DEFAULT_MAX_FRACTION = 0.85;
// Keyboard resize step (fraction of the container per arrow key press)
const KEYBOARD_STEP = 0.02;

export interface VerticalSplitProps {
  /**
   * Content of the top pane. When null/undefined the split collapses to a
   * single full-height bottom card with no divider.
   */
  top?: ReactNode;
  bottom: ReactNode;
  // localStorage key the top pane's height fraction is persisted under.
  // Stored as a fraction (not px) so both panes scale together when the
  // container resizes.
  storageKey: string;
  /** Top pane's share of the container height before the user first drags. */
  defaultFraction?: number;
  minFraction?: number;
  maxFraction?: number;
  /** Accessible name of the drag separator. */
  separatorLabel?: string;
  /**
   * Set once the caller knows the TOP pane has nothing but its (collapsed)
   * header to show. It drops its drag-fraction height and hugs its header
   * instead, instead of still reserving a slice of the split and leaving a
   * dead empty block below the header. If the bottom pane isn't ALSO
   * collapsed, it takes over the freed space (becomes fill, like it always
   * is) — there's nothing left to divide, so the separator goes inert.
   */
  topCollapsed?: boolean;
  /**
   * Same idea for the BOTTOM pane. If the top pane isn't ALSO collapsed, it
   * takes over the freed space (switches from its drag fraction to fill).
   */
  bottomCollapsed?: boolean;
  /**
   * Keeps the grip visible at rest and gives the divider a finger-sized target,
   * for layouts used by touch where nothing else shows the panes can be resized.
   */
  showGrip?: boolean;
  'data-testid'?: string;
  handleTestId?: string;
  topTestId?: string;
  bottomTestId?: string;
}

/**
 * Two vertically stacked sidebar cards split by a draggable divider: growing
 * one pane shrinks the other within the fixed container height. The split
 * fraction persists across reloads; the divider is keyboard-operable
 * (arrows / Home / End) per the ARIA window-splitter pattern.
 */
export default function VerticalSplit({
  top,
  bottom,
  storageKey,
  defaultFraction = DEFAULT_FRACTION,
  minFraction = DEFAULT_MIN_FRACTION,
  maxFraction = DEFAULT_MAX_FRACTION,
  separatorLabel = 'Resize panels',
  topCollapsed = false,
  bottomCollapsed = false,
  showGrip = false,
  'data-testid': testId,
  handleTestId,
  topTestId,
  bottomTestId,
}: VerticalSplitProps) {
  const clampFraction = useCallback(
    // Rounded to 0.01% so keyboard steps don't accumulate float noise
    (f: number): number =>
      Math.round(Math.min(maxFraction, Math.max(minFraction, f)) * 1e4) / 1e4,
    [minFraction, maxFraction]
  );

  const [fraction, setFraction] = useState<number>(() => {
    try {
      const saved = parseFloat(localStorage.getItem(storageKey) ?? '');
      if (Number.isFinite(saved) && saved > 0 && saved < 1) {
        return clampFraction(saved);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — fall through to default
    }
    return clampFraction(defaultFraction);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const saveFraction = useCallback(
    (f: number): void => {
      try {
        localStorage.setItem(storageKey, f.toFixed(4));
      } catch {
        // Best-effort persistence only
      }
    },
    [storageKey]
  );

  const handleDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.height <= 0) return;
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // Synthetic pointer events (tests, automation) have no active
        // pointer to capture; the window listeners below still track them
      }

      let latest = fraction;
      const onPointerMove = (ev: PointerEvent) => {
        latest = clampFraction((ev.clientY - rect.top) / rect.height);
        setFraction(latest);
      };
      const onPointerEnd = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerEnd);
        window.removeEventListener('pointercancel', onPointerEnd);
        saveFraction(latest);
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerEnd);
      window.addEventListener('pointercancel', onPointerEnd);
    },
    [fraction, clampFraction, saveFraction]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let next: number;
      switch (e.key) {
        case 'ArrowUp':
          next = clampFraction(fraction - KEYBOARD_STEP);
          break;
        case 'ArrowDown':
          next = clampFraction(fraction + KEYBOARD_STEP);
          break;
        case 'Home':
          next = minFraction;
          break;
        case 'End':
          next = maxFraction;
          break;
        default:
          return;
      }
      e.preventDefault();
      setFraction(next);
      saveFraction(next);
    },
    [fraction, clampFraction, minFraction, maxFraction, saveFraction]
  );

  if (top == null) {
    return (
      <div
        className={`${styles.split} ${bottomCollapsed ? styles.splitCollapsed : ''}`}
        data-testid={testId}
      >
        <div
          className={`${styles.pane} ${styles.paneFill} ${bottomCollapsed ? styles.paneFillCollapsed : ''}`}
          data-testid={bottomTestId}
        >
          {bottom}
        </div>
      </div>
    );
  }

  // The divide only makes sense once both panes have real content to trade
  // off against each other; the instant either collapses there's nothing
  // left to drag for, and the split only shrinks as a whole once NEITHER
  // pane wants the freed space (both collapsed) — if only one has collapsed
  // the other pane's existing fill/fraction sizing already absorbs the rest
  const eitherCollapsed = topCollapsed || bottomCollapsed;
  const bothCollapsed = topCollapsed && bottomCollapsed;

  return (
    <div
      className={`${styles.split} ${bothCollapsed ? styles.splitCollapsed : ''}`}
      ref={containerRef}
      data-testid={testId}
    >
      <div
        className={`${styles.pane} ${!topCollapsed && bottomCollapsed ? styles.paneFill : ''}`}
        style={
          eitherCollapsed ? undefined : { flexBasis: `${fraction * 100}%` }
        }
        data-testid={topTestId}
      >
        {top}
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={separatorLabel}
        aria-valuenow={Math.round(fraction * 100)}
        aria-valuemin={Math.round(minFraction * 100)}
        aria-valuemax={Math.round(maxFraction * 100)}
        tabIndex={eitherCollapsed ? -1 : 0}
        aria-hidden={eitherCollapsed || undefined}
        className={`${styles.divider} ${showGrip ? styles.dividerTouch : ''}`}
        onPointerDown={eitherCollapsed ? undefined : handleDragStart}
        onKeyDown={eitherCollapsed ? undefined : handleKeyDown}
        data-testid={handleTestId}
      >
        {!(showGrip && eitherCollapsed) && (
          <span className={styles.dividerGrip} aria-hidden="true" />
        )}
      </div>
      <div
        className={`${styles.pane} ${styles.paneFill} ${bottomCollapsed ? styles.paneFillCollapsed : ''}`}
        data-testid={bottomTestId}
      >
        {bottom}
      </div>
    </div>
  );
}
