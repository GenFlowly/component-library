import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import SidebarStack from '../SidebarStack/SidebarStack';
import styles from './ResizableSidebar.module.scss';

// Resize bounds for the panel (px)
const DEFAULT_MIN_WIDTH = 160; // matches the panel's default 10rem
const DEFAULT_MAX_WIDTH = 480;
// Collapsed strip width (px) — matches the app sidebars' 3.5rem convention
const DEFAULT_COLLAPSED_WIDTH = 56;

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
  /**
   * Adds a full-width footer toggle (chat-sidebar style) that collapses the
   * panel to a slim strip hiding the content. The column and its toggle are
   * then one card. @default false
   */
  collapsible?: boolean;
  /**
   * Controlled collapsed state. Omit for internal (uncontrolled) state;
   * `onCollapsedChange` fires either way.
   */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Width (px) of the collapsed strip. @default 56 (3.5rem) */
  collapsedWidth?: number;
  /** Footer-toggle tooltip/aria-label while expanded. */
  collapseLabel?: string;
  /** Footer-toggle tooltip/aria-label while collapsed. */
  expandLabel?: string;
  children: ReactNode;
  /**
   * Fixed above the scrolling cards, e.g. a New Chat button and a search
   * field. Not used with collapsible.
   */
  header?: ReactNode;
  /** Fixed below the scrolling cards, e.g. a collapse strip. Not used with collapsible. */
  footer?: ReactNode;
  /** Names the sidebar, which then renders as an aside landmark. */
  'aria-label'?: string;
  'data-testid'?: string;
  handleTestId?: string;
  /** Test id of the footer toggle. */
  toggleTestId?: string;
}

/**
 * Drag-resizable sidebar column holding SidebarWidgets: a fixed-width column
 * with a drag handle on its right edge. Its cards sit in a SidebarStack, so
 * each takes its full height and the column scrolls as a whole, between an
 * optional fixed header and footer. Width survives toggling (state lives
 * here) and reloads (persisted to localStorage in rem). A collapsible one is
 * a single card instead, with a footer toggle.
 */
export default function ResizableSidebar({
  storageKey,
  minWidth = DEFAULT_MIN_WIDTH,
  maxWidth = DEFAULT_MAX_WIDTH,
  defaultWidth,
  side = 'left',
  collapsible = false,
  collapsed: collapsedProp,
  onCollapsedChange,
  collapsedWidth = DEFAULT_COLLAPSED_WIDTH,
  collapseLabel = 'Collapse sidebar',
  expandLabel = 'Expand sidebar',
  children,
  header,
  footer,
  'aria-label': ariaLabel,
  'data-testid': testId,
  handleTestId,
  toggleTestId,
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
  const panelRef = useRef<HTMLElement>(null);

  // A width dragged near maxWidth on a wide monitor must not stay that wide
  // once the window narrows — re-clamp on every resize, not just at
  // drag-time/mount.
  useEffect(() => {
    const handleResize = () => setWidth(w => clampWidth(w));
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampWidth]);

  // Collapsed state: controlled via the `collapsed` prop when provided,
  // internal otherwise.
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = collapsible && (collapsedProp ?? internalCollapsed);
  const toggleCollapsed = () => {
    const next = !isCollapsed;
    if (collapsedProp === undefined) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };

  // Chevron points where clicking will move the panel edge
  const chevron =
    side === 'left' ? (isCollapsed ? '❯' : '❮') : isCollapsed ? '❮' : '❯';

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

  const Root = ariaLabel ? 'aside' : 'div';

  return (
    <Root
      className={`${styles.sidebar} ${collapsible ? styles.withFooter : styles.stacked} ${isCollapsed ? styles.collapsedStrip : ''}`}
      ref={panelRef as React.RefObject<HTMLDivElement>}
      style={{ width: isCollapsed ? collapsedWidth : width }}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {collapsible ? (
        <div
          className={styles.contentArea}
          // Content stays mounted while collapsed (state survives), just hidden
          hidden={isCollapsed}
        >
          {children}
        </div>
      ) : (
        <>
          {header}
          <SidebarStack>{children}</SidebarStack>
          {footer}
        </>
      )}
      {collapsible && (
        <button
          type="button"
          className={styles.collapseToggle}
          onClick={toggleCollapsed}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? expandLabel : collapseLabel}
          title={isCollapsed ? expandLabel : collapseLabel}
          data-testid={toggleTestId}
        >
          {chevron}
        </button>
      )}
      {!isCollapsed && (
        <div
          className={`${styles.resizeHandle} ${side === 'right' ? styles.handleLeft : ''}`}
          onPointerDown={handleResizeStart}
          data-testid={handleTestId}
        />
      )}
    </Root>
  );
}
