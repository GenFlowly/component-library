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
      <div className={styles.split} data-testid={testId}>
        <div
          className={`${styles.pane} ${styles.paneFill}`}
          data-testid={bottomTestId}
        >
          {bottom}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.split} ref={containerRef} data-testid={testId}>
      <div
        className={styles.pane}
        style={{ flexBasis: `${fraction * 100}%` }}
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
        tabIndex={0}
        className={styles.divider}
        onPointerDown={handleDragStart}
        onKeyDown={handleKeyDown}
        data-testid={handleTestId}
      >
        <span className={styles.dividerGrip} aria-hidden="true" />
      </div>
      <div
        className={`${styles.pane} ${styles.paneFill}`}
        data-testid={bottomTestId}
      >
        {bottom}
      </div>
    </div>
  );
}
