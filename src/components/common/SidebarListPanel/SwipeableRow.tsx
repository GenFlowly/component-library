import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { SidebarListItemAction } from './SidebarListPanel';
import styles from './SidebarListPanel.module.scss';

const ACTION_WIDTH = 56;
// Movement before a gesture counts as a swipe or a scroll
const LOCK_DISTANCE = 10;
// A rightward swipe that starts this close to the screen's left edge belongs
// to the edge swipe and the browser's back gesture, never to a row
const EDGE_GUARD = 24;

type Side = 'leading' | 'trailing';

interface SwipeRowsContextValue {
  swipeRows: boolean;
  openRowId: string | null;
  setOpenRowId: (id: string | null) => void;
}

export const SwipeRowsContext = createContext<SwipeRowsContextValue>({
  swipeRows: false,
  openRowId: null,
  setOpenRowId: () => {},
});

interface Gesture {
  startX: number;
  startY: number;
  base: number;
  startedAtEdge: boolean;
  locked: boolean;
  x: number;
}

interface SwipeableRowProps {
  rowId: string;
  /** Revealed by a swipe to the right, on the row's left. */
  leadingActions?: SidebarListItemAction[];
  /** Revealed by a swipe to the left, on the row's right. */
  trailingActions?: SidebarListItemAction[];
  children: ReactNode;
}

/**
 * Swipes a row sideways to reveal its actions: left for the trailing ones,
 * right for the leading ones. An open row narrows beside its tray, so its
 * title stays readable instead of sliding off the card. Only one row in a
 * panel stays open. The actions stay in the accessibility tree and tab order
 * while closed, since a swipe isn't available to a keyboard or a screen
 * reader; focusing one opens its tray.
 */
export default function SwipeableRow({
  rowId,
  leadingActions = [],
  trailingActions = [],
  children,
}: SwipeableRowProps): React.ReactElement {
  const { openRowId, setOpenRowId } = useContext(SwipeRowsContext);
  const [openSide, setOpenSide] = useState<Side>('trailing');
  const isOpen = openRowId === rowId;
  const leadingWidth = leadingActions.length * ACTION_WIDTH;
  const trailingWidth = trailingActions.length * ACTION_WIDTH;
  const [dragX, setDragX] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const ignoreNextClick = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // Positive: the leading tray shows; negative: the trailing tray shows
  const restingOffset = !isOpen
    ? 0
    : openSide === 'leading'
      ? leadingWidth
      : -trailingWidth;
  const offset = dragX ?? restingOffset;

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rowRef.current?.contains(event.target as Node)) setOpenRowId(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress, true);
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsidePress, true);
  }, [isOpen, setOpenRowId]);

  const open = (side: Side) => {
    setOpenSide(side);
    setOpenRowId(rowId);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    ignoreNextClick.current = false;
    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
      base: restingOffset,
      startedAtEdge: e.clientX < EDGE_GUARD,
      locked: false,
      x: restingOffset,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current) return;
    const dx = e.clientX - current.startX;
    const dy = e.clientY - current.startY;

    if (!current.locked) {
      if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return;
      // A vertical drag belongs to the list; a closed row only moves toward
      // a side that has actions
      const opensNothing =
        current.base === 0 &&
        ((dx > 0 && (leadingWidth === 0 || current.startedAtEdge)) ||
          (dx < 0 && trailingWidth === 0));
      if (Math.abs(dy) >= Math.abs(dx) || opensNothing) {
        gesture.current = null;
        return;
      }
      current.locked = true;
      if (!isOpen) setOpenRowId(null);
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // Synthetic pointer events have no active pointer to capture
      }
    }

    current.x = Math.max(
      -trailingWidth,
      Math.min(leadingWidth, current.base + dx)
    );
    setDragX(current.x);
  };

  const handlePointerEnd = () => {
    const current = gesture.current;
    gesture.current = null;
    if (!current?.locked) return;
    ignoreNextClick.current = true;
    if (leadingWidth > 0 && current.x > leadingWidth / 2) open('leading');
    else if (trailingWidth > 0 && current.x < -trailingWidth / 2)
      open('trailing');
    else setOpenRowId(null);
    setDragX(null);
  };

  const handlePointerCancel = () => {
    gesture.current = null;
    setDragX(null);
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ignoreNextClick.current && !isOpen) return;
    e.preventDefault();
    e.stopPropagation();
    if (!ignoreNextClick.current) setOpenRowId(null);
    ignoreNextClick.current = false;
  };

  const tray = (side: Side, actions: SidebarListItemAction[], width: number) =>
    actions.length > 0 && (
      <div
        className={`${styles.swipeTray} ${dragX !== null ? styles.swipeTrayDragging : ''}`}
        style={{ width }}
        data-swipe-tray={side}
      >
        {actions.map((action, index) => (
          <button
            key={index}
            type="button"
            className={`${styles.swipeAction} ${styles[`swipeAction-${action.tone ?? 'neutral'}`]}`}
            aria-label={action.label}
            data-testid={action.testId}
            onFocus={() => open(side)}
            onClick={e => {
              action.onClick(e);
              setOpenRowId(null);
            }}
          >
            {action.icon}
          </button>
        ))}
      </div>
    );

  return (
    <div className={styles.swipeRow} ref={rowRef}>
      {tray('leading', leadingActions, Math.max(0, offset))}
      <div
        className={`${styles.swipeContent} ${dragX !== null ? styles.swipeContentDragging : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
      {tray('trailing', trailingActions, Math.max(0, -offset))}
    </div>
  );
}
