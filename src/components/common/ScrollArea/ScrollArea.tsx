import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import styles from './ScrollArea.module.scss';

// How long after the last scroll event the scrollbar stays visible
const SCROLL_HIDE_DELAY_MS = 800;
const THUMB_WIDTH = 4;
const THUMB_MIN_HEIGHT = 24;
const THUMB_INSET = 2;

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLElement> {
  /** Element to render, e.g. 'ul' or 'pre' when semantics matter. Default 'div'. */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

/**
 * Vertical scroll container with the app-wide scrollbar treatment: the native
 * scrollbar is hidden and replaced by an overlay thumb that floats above the
 * content (no reserved gutter), appears while scrolling and fades out shortly
 * after. Layout (flex, height, padding, ...) stays with the caller via
 * className; all other props pass through.
 */
const ScrollArea = forwardRef<HTMLElement, ScrollAreaProps>(function ScrollArea(
  { as: Tag = 'div', className, children, onScroll, ...rest },
  ref
) {
  const [isScrolling, setIsScrolling] = useState(false);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const setContainerRef = useCallback(
    (node: HTMLElement | null) => {
      containerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  // The thumb is absolutely positioned inside the scroller, so its
  // coordinates live in content space: adding scrollTop pins it to the
  // visible viewport. Geometry is derived on every scroll, so there is
  // nothing to keep in sync on resize while the thumb is hidden.
  const updateThumb = useCallback(() => {
    const el = containerRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return false;
    const { clientHeight, clientWidth, scrollHeight, scrollTop } = el;
    const scrollable = scrollHeight - clientHeight;
    if (scrollable <= 1) return false;
    const thumbHeight = Math.max(
      (clientHeight / scrollHeight) * clientHeight,
      THUMB_MIN_HEIGHT
    );
    const trackRange = clientHeight - thumbHeight - 2 * THUMB_INSET;
    const y = scrollTop + THUMB_INSET + (scrollTop / scrollable) * trackRange;
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translate(${clientWidth - THUMB_WIDTH - THUMB_INSET}px, ${y}px)`;
    return true;
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (!isDraggingRef.current) setIsScrolling(false);
    }, SCROLL_HIDE_DELAY_MS);
  }, []);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      onScroll?.(e);
      updateThumb();
      setIsScrolling(true);
      scheduleHide();
    },
    [onScroll, updateThumb, scheduleHide]
  );

  // Drag-to-scroll on the overlay thumb, matching native scrollbar behavior
  const handleThumbPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      const startY = e.clientY;
      const startScrollTop = el.scrollTop;

      const onMove = (ev: PointerEvent) => {
        const { clientHeight, scrollHeight } = el;
        const scrollable = scrollHeight - clientHeight;
        if (scrollable <= 0) return;
        const thumbHeight = Math.max(
          (clientHeight / scrollHeight) * clientHeight,
          THUMB_MIN_HEIGHT
        );
        const trackRange = clientHeight - thumbHeight - 2 * THUMB_INSET;
        if (trackRange <= 0) return;
        el.scrollTop =
          startScrollTop + ((ev.clientY - startY) * scrollable) / trackRange;
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        isDraggingRef.current = false;
        scheduleHide();
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    },
    [scheduleHide]
  );

  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  const classes = [
    styles.scrollArea,
    isScrolling ? styles.scrolling : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const Component = Tag as React.ElementType;
  return (
    <Component
      ref={setContainerRef}
      className={classes}
      onScroll={handleScroll}
      {...rest}
    >
      <div
        ref={thumbRef}
        className={styles.thumb}
        aria-hidden="true"
        data-testid="scroll-area-thumb"
        onPointerDown={handleThumbPointerDown}
      />
      {children}
    </Component>
  );
});

export default ScrollArea;
