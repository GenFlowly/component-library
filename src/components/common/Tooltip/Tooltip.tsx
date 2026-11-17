import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { placeTooltip, type TooltipPlacement } from './tooltipPlacement';
import styles from './Tooltip.module.scss';

/** Grace period before an interactive tooltip hides, so the cursor can travel
 *  from the trigger into the tooltip content without it closing. */
const INTERACTIVE_CLOSE_DELAY_MS = 150;

/** How long after a touch the browser's emulated hover and focus are ignored:
 *  a tap would otherwise open a tooltip that stays up until the next tap. */
const TOUCH_SUPPRESS_MS = 800;

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
  /** Class for the wrapper around the trigger, e.g. to let it grow in a flex row. */
  className?: string;
  /**
   * Also show while the trigger has keyboard focus. Off for a text field,
   * whose focus lasts the whole time it is typed in. @default true
   */
  showOnFocus?: boolean;
  'data-testid'?: string;
}

export default function Tooltip({
  content,
  children,
  position = 'right',
  fullWidth = false,
  interactive = false,
  className = '',
  showOnFocus = true,
  'data-testid': testId,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<TooltipPlacement>(position);
  const [arrowLeft, setArrowLeft] = useState<number | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchedAtRef = useRef(-Infinity);

  // Never leave a pending hide timer behind after unmount
  useEffect(
    () => () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    },
    []
  );

  const markTouch = () => {
    touchedAtRef.current = Date.now();
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = null;
    setIsVisible(false);
  };

  const show = () => {
    if (Date.now() - touchedAtRef.current < TOUCH_SUPPRESS_MS) return;
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
      const layout = placeTooltip(
        containerRef.current.getBoundingClientRect(),
        tooltipRef.current.getBoundingClientRect(),
        { width: window.innerWidth, height: window.innerHeight }
      );
      setTooltipPosition({ top: layout.top, left: layout.left });
      setArrowLeft(layout.arrowLeft);
      setPlacement(layout.placement);
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={containerRef}
        className={`${styles.tooltipContainer} ${fullWidth ? styles.fullWidth : ''} ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={showOnFocus ? show : undefined}
        onBlur={showOnFocus ? hide : undefined}
        onTouchStart={markTouch}
        onTouchEnd={markTouch}
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
            style={
              {
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
                // transform is now handled by CSS classes based on placement
                ...(arrowLeft != null && {
                  '--tooltip-arrow-left': `${arrowLeft}px`,
                }),
              } as React.CSSProperties
            }
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
