import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './SlideOverPanel.module.scss';

/** Released past this share of the panel's width, or flicked, a swipe closes it. */
const CLOSE_FRACTION = 0.3;
const CLOSE_VELOCITY = 0.5; // px per ms
/** A touch has to move this far before it counts as a swipe or a scroll. */
const LOCK_DISTANCE = 10;
const SLIDE_OUT_MS = 200;

export interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  /** The edge it slides in from. @default 'left' */
  side?: 'left' | 'right';
  /** Cover the whole screen instead of a 330px panel. */
  fullWidth?: boolean;
  /** Accessible name of the dialog. */
  'aria-label': string;
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

interface Swipe {
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  isClaimed: boolean;
}

/**
 * A panel that slides in over the page from one edge, with the page dimmed
 * behind it. Tapping the dimmed page, pressing Escape or swiping the panel
 * back toward its edge closes it.
 */
export default function SlideOverPanel({
  open,
  onClose,
  side = 'left',
  fullWidth = false,
  'aria-label': ariaLabel,
  children,
  className = '',
  'data-testid': testId,
}: SlideOverPanelProps): React.ReactElement | null {
  const panel = useRef<HTMLDivElement>(null);
  const swipe = useRef<Swipe | null>(null);
  const closing = useRef<ReturnType<typeof setTimeout>>();
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const toward = side === 'right' ? 1 : -1;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => () => clearTimeout(closing.current), []);

  if (!open) return null;

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    swipe.current =
      event.touches.length === 1
        ? {
            startX: touch.clientX,
            startY: touch.clientY,
            lastX: touch.clientX,
            lastTime: performance.now(),
            velocity: 0,
            isClaimed: false,
          }
        : null;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    const current = swipe.current;
    if (!current) return;
    const touch = event.touches[0];
    const travel = toward * (touch.clientX - current.startX);
    if (!current.isClaimed) {
      const dy = touch.clientY - current.startY;
      if (Math.abs(travel) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE)
        return;
      if (travel <= Math.abs(dy)) {
        swipe.current = null;
        return;
      }
      current.isClaimed = true;
      setIsDragging(true);
    }
    const now = performance.now();
    if (now > current.lastTime)
      current.velocity =
        (toward * (touch.clientX - current.lastX)) / (now - current.lastTime);
    current.lastX = touch.clientX;
    current.lastTime = now;
    setOffset(Math.max(0, travel));
  };

  const onTouchEnd = () => {
    const current = swipe.current;
    swipe.current = null;
    if (!current?.isClaimed) return;
    setIsDragging(false);
    const width = panel.current?.offsetWidth || window.innerWidth;
    if (offset > width * CLOSE_FRACTION || current.velocity > CLOSE_VELOCITY) {
      setOffset(width);
      closing.current = setTimeout(() => {
        setOffset(0);
        onClose();
      }, SLIDE_OUT_MS);
    } else {
      setOffset(0);
    }
  };

  const panelStyle: React.CSSProperties | undefined = offset
    ? {
        transform: `translateX(${toward * offset}px)`,
        transition: isDragging ? 'none' : undefined,
      }
    : undefined;

  return createPortal(
    <div
      className={`${styles.overlay} ${styles[side]} ${fullWidth ? styles.full : ''}`}
      data-testid={testId}
    >
      <div
        className={styles.scrim}
        onClick={onClose}
        aria-hidden="true"
        data-testid={testId ? `${testId}-scrim` : undefined}
      />
      <div
        ref={panel}
        className={`${styles.panel} ${className}`}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
