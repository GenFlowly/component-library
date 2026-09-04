import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.scss';

/** Grace period before an interactive tooltip hides, so the cursor can travel
 *  from the trigger into the tooltip content without it closing. */
const INTERACTIVE_CLOSE_DELAY_MS = 150;

interface TooltipProps {
  /** Tooltip body. Plain strings render as before; interactive tooltips
   *  typically pass rich content (lists, buttons, …). */
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  fullWidth?: boolean;
  /**
   * Keeps the tooltip open while the cursor is over the trigger OR the tooltip
   * content itself (with a small close delay in between), and makes the content
   * clickable. Default false: the tooltip closes as soon as the trigger is
   * left and its content ignores pointer events (previous behavior).
   */
  interactive?: boolean;
  'data-testid'?: string;
}

export default function Tooltip({
  content,
  children,
  position = 'right',
  fullWidth = false,
  interactive = false,
  'data-testid': testId,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<
    'right' | 'left' | 'top' | 'bottom'
  >(position);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Never leave a pending hide timer behind after unmount
  useEffect(
    () => () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    },
    []
  );

  const show = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsVisible(true);
  };

  const hide = () => {
    if (!interactive) {
      setIsVisible(false);
      return;
    }
    // Interactive: give the cursor time to reach the tooltip content —
    // entering it (show above) cancels this timer.
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      hideTimeoutRef.current = null;
      setIsVisible(false);
    }, INTERACTIVE_CLOSE_DELAY_MS);
  };

  // Using useLayoutEffect to prevent flickering
  React.useLayoutEffect(() => {
    if (isVisible && containerRef.current && tooltipRef.current) {
      const anchor = containerRef.current.getBoundingClientRect();
      const tooltip = tooltipRef.current.getBoundingClientRect();
      const gap = 8;

      // Defaults to 'right'
      let newTop = anchor.top + anchor.height / 2;
      let newLeft = anchor.right + gap;
      let newPlacement: 'right' | 'left' | 'top' | 'bottom' = 'right';

      // Check collision with right edge
      if (newLeft + tooltip.width > window.innerWidth) {
        // Try 'left'
        const leftPos = anchor.left - gap - tooltip.width;
        if (leftPos > 0) {
          newLeft = leftPos;
          newPlacement = 'left';
        } else {
          // Try 'top' ? For now let's stick to simple flipping or clamp
          // If neither fits, we might just have to clamp or prioritize one
          // Let's try to flip to bottom if side doesn't work?
          // For sidebars, usually flipping X is enough.
          // But if it's strictly requested to fit:

          // Simple fallback: keep left but clamp?
          // Let's assume flipping to Left is sufficient for Right Sidebar case.
          newLeft = leftPos;
          newPlacement = 'left';
        }
      }

      // Adjust vertical for right/left placement
      if (newPlacement === 'right' || newPlacement === 'left') {
        // Check top collision (centered)
        const halfHeight = tooltip.height / 2;
        if (newTop - halfHeight < 0) {
          newTop = halfHeight + gap; // Push down
        } else if (newTop + halfHeight > window.innerHeight) {
          newTop = window.innerHeight - halfHeight - gap; // Push up
        }
      }

      setTooltipPosition({ top: newTop, left: newLeft });
      setPlacement(newPlacement);
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={containerRef}
        className={`${styles.tooltipContainer} ${fullWidth ? styles.fullWidth : ''}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        data-testid={testId}
      >
        {children}
      </div>
      {isVisible &&
        content &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`${styles.tooltip} ${styles[`placement-${placement}`]} ${interactive ? styles.interactive : ''}`}
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              // transform is now handled by CSS classes based on placement
            }}
            role="tooltip"
            onMouseEnter={interactive ? show : undefined}
            onMouseLeave={interactive ? hide : undefined}
            data-testid={testId ? `${testId}-content` : undefined}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
