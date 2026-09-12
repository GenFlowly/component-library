import React, { ReactNode, useCallback, useRef, useState } from 'react';
import styles from './ResizableSidebar.module.scss';

// Resize bounds for the panel (px)
const DEFAULT_MIN_WIDTH = 160; // matches the panel's default 10rem
const DEFAULT_MAX_WIDTH = 480;

const rootFontSizePx = (): number =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

export interface ResizableSidebarProps {
  // localStorage key the panel width is persisted under (in rem, so it
  // stays relative to the root font size)
  storageKey: string;
  minWidth?: number;
  maxWidth?: number;
  /** Initial width (px) before the user first resizes; defaults to minWidth. */
  defaultWidth?: number;
  /**
   * Which side of the layout the panel sits on. Puts the drag handle on the
   * opposite (inner) edge and inverts the drag direction.
   * @default 'left'
   */
  side?: 'left' | 'right';
  children: ReactNode;
  'data-testid'?: string;
  handleTestId?: string;
}

/**
 * Drag-resizable side panel: a fixed-width column with a drag handle on its
 * right edge. Width survives toggling (state lives here) and reloads
 * (persisted to localStorage in rem).
 */
export default function ResizableSidebar({
  storageKey,
  minWidth = DEFAULT_MIN_WIDTH,
  maxWidth = DEFAULT_MAX_WIDTH,
  defaultWidth,
  side = 'left',
  children,
  'data-testid': testId,
  handleTestId,
}: ResizableSidebarProps) {
  const clampWidth = useCallback(
    (px: number): number => Math.min(maxWidth, Math.max(minWidth, px)),
    [minWidth, maxWidth]
  );

  const [width, setWidth] = useState<number>(() => {
    try {
      const savedRem = parseFloat(localStorage.getItem(storageKey) ?? '');
      if (Number.isFinite(savedRem) && savedRem > 0) {
        return clampWidth(savedRem * rootFontSizePx());
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — fall through to default
    }
    return clampWidth(defaultWidth ?? minWidth);
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const saveWidth = useCallback(
    (px: number): void => {
      try {
        localStorage.setItem(storageKey, (px / rootFontSizePx()).toFixed(3));
      } catch {
        // Best-effort persistence only
      }
    },
    [storageKey]
  );

  const handleResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = panelRef.current?.offsetWidth ?? width;
      const handle = e.currentTarget;
      handle.setPointerCapture?.(e.pointerId);

      // On a right-side panel the handle sits on the left edge, so dragging
      // left (negative delta) grows the panel.
      const direction = side === 'right' ? -1 : 1;
      let latestWidth = startWidth;
      const onPointerMove = (ev: PointerEvent) => {
        latestWidth = clampWidth(
          startWidth + direction * (ev.clientX - startX)
        );
        setWidth(latestWidth);
      };
      const onPointerEnd = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerEnd);
        window.removeEventListener('pointercancel', onPointerEnd);
        saveWidth(latestWidth);
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerEnd);
      window.addEventListener('pointercancel', onPointerEnd);
    },
    [width, clampWidth, saveWidth, side]
  );

  return (
    <div
      className={styles.sidebar}
      ref={panelRef}
      style={{ width }}
      data-testid={testId}
    >
      {children}
      <div
        className={`${styles.resizeHandle} ${side === 'right' ? styles.handleLeft : ''}`}
        onPointerDown={handleResizeStart}
        data-testid={handleTestId}
      />
    </div>
  );
}
