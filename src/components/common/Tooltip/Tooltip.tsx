import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  placeTooltip,
  type TooltipPlacement,
  type TooltipPreference,
} from './tooltipPlacement';
import styles from './Tooltip.module.scss';

/** Grace period before an interactive tooltip hides, so the cursor can travel
 *  from the trigger into the tooltip content without it closing. */
const INTERACTIVE_CLOSE_DELAY_MS = 150;

/** How long after a touch the browser's emulated hover and focus are ignored:
 *  a tap would otherwise open a tooltip that stays up until the next tap. */
const TOUCH_SUPPRESS_MS = 800;

/** Click-opened tooltips show one at a time: opening one closes the last. */
let closeOpenClickTooltip: (() => void) | null = null;

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
  /**
   * The wrapper element. 'span' keeps the trigger inline, e.g. inside a
   * paragraph, where a div is not allowed. @default 'div'
   */
  as?: 'div' | 'span';
  /** 'dark': the navbar-colored label. 'card': a light surface for rich content. @default 'dark' */
  variant?: 'dark' | 'card';
  /**
   * A click, tap or Enter on the trigger opens the tooltip and keeps it open;
   * Escape, a press outside it, scrolling or opening another such tooltip
   * closes it. While it is open, the next click on the trigger closes it and
   * goes through to the trigger (a link opens). Following a link inside the
   * content closes it too.
   */
  openOnClick?: boolean;
  /** See placeTooltip. @default 'side' */
  prefer?: TooltipPreference;
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
  as = 'div',
  variant = 'dark',
  openOnClick = false,
  prefer = 'side',
  'data-testid': testId,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<TooltipPlacement>(position);
  const [arrowLeft, setArrowLeft] = useState<number | undefined>();
  const containerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchedAtRef = useRef(-Infinity);
  const pinnedRef = useRef(false);

  const clearHideTimer = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = null;
  };

  const closeRef = useRef(() => {
    pinnedRef.current = false;
    clearHideTimer();
    setIsVisible(false);
  });

  // Never leave a pending hide timer behind after unmount
  useEffect(
    () => () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (closeOpenClickTooltip === closeRef.current) {
        closeOpenClickTooltip = null;
      }
    },
    []
  );

  const markTouch = () => {
    touchedAtRef.current = Date.now();
    // A tap reaches a click-opened tooltip as a click, which opens or closes it
    if (openOnClick) return;
    clearHideTimer();
    setIsVisible(false);
  };

  const show = () => {
    if (Date.now() - touchedAtRef.current < TOUCH_SUPPRESS_MS) return;
    clearHideTimer();
    setIsVisible(true);
  };

  const hide = () => {
    if (pinnedRef.current) return;
    if (!interactive) {
      setIsVisible(false);
      return;
    }
    // Interactive: give the cursor time to reach the tooltip content —
    // entering it (show above) cancels this timer.
    clearHideTimer();
    hideTimeoutRef.current = setTimeout(() => {
      hideTimeoutRef.current = null;
      setIsVisible(false);
    }, INTERACTIVE_CLOSE_DELAY_MS);
  };

  const handleClick = (event: React.MouseEvent) => {
    if (!openOnClick) return;
    // A new-tab or new-window click goes straight through
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    if (pinnedRef.current) {
      closeRef.current();
      return;
    }
    event.preventDefault();
    clearHideTimer();
    pinnedRef.current = true;
    setIsVisible(true);
  };

  const handleContentClick = (event: React.MouseEvent) => {
    if (!openOnClick) return;
    if ((event.target as Element).closest?.('a[href]')) closeRef.current();
  };

  // A click-opened tooltip is the only one open, and closes when the page
  // around it moves or the user presses elsewhere
  useEffect(() => {
    if (!openOnClick || !isVisible) return;
    const close = closeRef.current;
    if (closeOpenClickTooltip && closeOpenClickTooltip !== close) {
      closeOpenClickTooltip();
    }
    closeOpenClickTooltip = close;

    const isInside = (target: EventTarget | null) =>
      target instanceof Node &&
      (!!containerRef.current?.contains(target) ||
        !!tooltipRef.current?.contains(target));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: Event) => {
      if (!isInside(event.target)) close();
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node && tooltipRef.current?.contains(target))) {
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
      if (closeOpenClickTooltip === close) closeOpenClickTooltip = null;
    };
  }, [openOnClick, isVisible]);

  // Using useLayoutEffect to prevent flickering
  React.useLayoutEffect(() => {
    if (isVisible && containerRef.current && tooltipRef.current) {
      const layout = placeTooltip(
        containerRef.current.getBoundingClientRect(),
        tooltipRef.current.getBoundingClientRect(),
        { width: window.innerWidth, height: window.innerHeight },
        prefer
      );
      setTooltipPosition({ top: layout.top, left: layout.left });
      setArrowLeft(layout.arrowLeft);
      setPlacement(layout.placement);
    }
  }, [isVisible, prefer]);

  const Wrapper = as;

  return (
    <>
      <Wrapper
        ref={containerRef as React.Ref<HTMLDivElement & HTMLSpanElement>}
        className={`${styles.tooltipContainer} ${as === 'span' ? styles.inline : ''} ${fullWidth ? styles.fullWidth : ''} ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={showOnFocus ? show : undefined}
        onBlur={showOnFocus ? hide : undefined}
        onTouchStart={markTouch}
        onTouchEnd={markTouch}
        onClick={openOnClick ? handleClick : undefined}
        data-open={isVisible && content ? 'true' : undefined}
        data-testid={testId}
      >
        {children}
      </Wrapper>
      {isVisible &&
        content &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`${styles.tooltip} ${styles[`placement-${placement}`]} ${interactive ? styles.interactive : ''} ${variant === 'card' ? styles.card : ''}`}
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
            onClick={openOnClick ? handleContentClick : undefined}
            data-testid={testId ? `${testId}-content` : undefined}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
