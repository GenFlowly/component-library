import React, {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import Tooltip from '../Tooltip/Tooltip';
import { ICONS } from '../../../constants/icons';
import styles from './ActionMenu.module.scss';

/** Space kept between the menu and the window's edges, and below its button. */
const EDGE_MARGIN = 8;
const BUTTON_GAP = 4;

let nextMenuId = 0;

export interface ActionMenuItem {
  icon?: ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  testId?: string;
}

export interface ActionMenuProps {
  /** What the button opens ("More actions"): its accessible name and tooltip. */
  label: string;
  items: ActionMenuItem[];
  /** Class for the button, e.g. a row's action-button look. */
  className?: string;
  /** Glyph size in px. @default 16 */
  iconSize?: number;
  /** Preferred tooltip side. @default 'bottom' */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  'data-testid'?: string;
  menuTestId?: string;
}

/**
 * A kebab button that opens a short menu of actions. The menu is portaled to
 * the page, so a scrolling or rounded container never clips it; it opens
 * under the button, aligned to its right edge, or above it when there is no
 * room below. Arrow keys, Home and End move through it; Escape, Tab, a press
 * outside it or any scroll closes it.
 */
export default function ActionMenu({
  label,
  items,
  className = '',
  iconSize = 16,
  tooltipPosition = 'bottom',
  'data-testid': testId,
  menuTestId,
}: ActionMenuProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useRef(`action-menu-${++nextMenuId}`).current;

  const close = useCallback((returnFocus: boolean) => {
    setIsOpen(false);
    setPosition(null);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current?.getBoundingClientRect();
    const menu = menuRef.current?.getBoundingClientRect();
    if (!trigger || !menu) return;
    const left = Math.max(
      EDGE_MARGIN,
      Math.min(
        trigger.right - menu.width,
        window.innerWidth - menu.width - EDGE_MARGIN
      )
    );
    const below = trigger.bottom + BUTTON_GAP;
    const above = trigger.top - BUTTON_GAP - menu.height;
    const fitsBelow = below + menu.height <= window.innerHeight - EDGE_MARGIN;
    setPosition({
      top: fitsBelow || above < EDGE_MARGIN ? below : above,
      left,
    });
    itemRefs.current[0]?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const inMenuOrButton = (target: EventTarget | null) =>
      target instanceof Node &&
      (menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target));
    const handlePointerDown = (event: PointerEvent) => {
      if (!inMenuOrButton(event.target)) close(false);
    };
    const handleScroll = (event: Event) => {
      if (!inMenuOrButton(event.target)) close(false);
    };
    const handleResize = () => close(false);
    document.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, close]);

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    const buttons = itemRefs.current.filter(
      (item): item is HTMLButtonElement => item != null
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (next: number) =>
      buttons[(next + buttons.length) % buttons.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        focusAt(index - 1);
        break;
      case 'Home':
        focusAt(0);
        break;
      case 'End':
        focusAt(buttons.length - 1);
        break;
      case 'Escape':
      case 'Tab':
        close(true);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <>
      <Tooltip content={isOpen ? '' : label} position={tooltipPosition}>
        <button
          ref={triggerRef}
          type="button"
          className={`${styles.trigger} ${className}`}
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={event => {
            event.stopPropagation();
            if (isOpen) close(false);
            else setIsOpen(true);
          }}
          data-testid={testId}
        >
          <Icon src={ICONS.MORE_VERTICAL} size={iconSize} />
        </button>
      </Tooltip>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            className={styles.menu}
            style={
              position ?? { top: 0, left: 0, visibility: 'hidden' as const }
            }
            onKeyDown={handleMenuKeyDown}
            data-testid={menuTestId}
          >
            {items.map((item, index) => (
              <button
                key={item.label}
                ref={element => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={styles.item}
                onClick={event => {
                  event.stopPropagation();
                  close(true);
                  item.onClick(event);
                }}
                data-testid={item.testId}
              >
                {item.icon != null && (
                  <span className={styles.itemIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className={styles.itemLabel}>{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
