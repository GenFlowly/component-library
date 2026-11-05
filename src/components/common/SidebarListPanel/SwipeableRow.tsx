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

const ACTION_WIDTH = 48;
// Movement before a gesture counts as a swipe or a scroll
const LOCK_DISTANCE = 10;

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
  locked: boolean;
  x: number;
}

interface SwipeableRowProps {
  rowId: string;
  actions: SidebarListItemAction[];
  children: ReactNode;
}

/**
 * Slides a row left to reveal its actions. Only one row in a panel stays open.
 * The actions stay in the accessibility tree and tab order while closed, since
 * a swipe isn't available to a keyboard or a screen reader.
 */
export default function SwipeableRow({
  rowId,
  actions,
  children,
}: SwipeableRowProps): React.ReactElement {
  const { openRowId, setOpenRowId } = useContext(SwipeRowsContext);
  const isOpen = openRowId === rowId;
  const trayWidth = actions.length * ACTION_WIDTH;
  const [dragX, setDragX] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const ignoreNextClick = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rowRef.current?.contains(event.target as Node)) setOpenRowId(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress, true);
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsidePress, true);
  }, [isOpen, setOpenRowId]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    ignoreNextClick.current = false;
    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
      locked: false,
      x: 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current) return;
    const dx = e.clientX - current.startX;
    const dy = e.clientY - current.startY;

    if (!current.locked) {
      if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return;
      // A vertical drag belongs to the list; a closed row has nothing to its left
      if (Math.abs(dy) >= Math.abs(dx) || (!isOpen && dx > 0)) {
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

    const base = isOpen ? -trayWidth : 0;
    current.x = Math.max(-trayWidth, Math.min(0, base + dx));
    setDragX(current.x);
  };

  const handlePointerEnd = () => {
    const current = gesture.current;
    gesture.current = null;
    if (!current?.locked) return;
    ignoreNextClick.current = true;
    setOpenRowId(current.x < -trayWidth / 2 ? rowId : null);
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

  const offset = dragX ?? (isOpen ? -trayWidth : 0);

  return (
    <div className={styles.swipeRow} ref={rowRef}>
      <div
        className={`${styles.swipeTray} ${offset === 0 ? styles.swipeTrayClosed : ''}`}
        style={{ width: trayWidth }}
      >
        {actions.map((action, index) => (
          <button
            key={index}
            type="button"
            className={`${styles.swipeAction} ${styles[`swipeAction-${action.tone ?? 'neutral'}`]}`}
            title={action.label}
            aria-label={action.label}
            data-testid={action.testId}
            onFocus={() => setOpenRowId(rowId)}
            onClick={e => {
              action.onClick(e);
              setOpenRowId(null);
            }}
          >
            {action.icon}
          </button>
        ))}
      </div>
      <div
        className={`${styles.swipeContent} ${dragX !== null ? styles.swipeContentDragging : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
