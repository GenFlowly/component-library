import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import OutlineList from './OutlineList';
import { OutlineItem } from './outline.models';
import styles from './Outline.module.scss';

export interface OutlineMenuProps {
  items: OutlineItem[];
  currentId?: string | null;
  /** Called with the chosen turn; the menu then closes itself. */
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Clicks inside this element (the menu's trigger) don't close the menu. */
  anchorRef?: React.RefObject<HTMLElement>;
  className?: string;
  'data-testid'?: string;
}

/**
 * The conversation's turns as a dropdown: arrow keys move between rows,
 * Enter jumps, Escape or a click outside closes it.
 */
export default function OutlineMenu({
  items,
  currentId,
  onSelect,
  onClose,
  anchorRef,
  className = '',
  'data-testid': testId,
}: OutlineMenuProps): React.ReactElement {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rows = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-outline-id]'
      ) ?? []
    );
    const start =
      rows.find(row => row.dataset.outlineId === currentId) ?? rows[0];
    start?.focus({ preventScroll: true });
    start?.scrollIntoView?.({ block: 'nearest' });
  }, [currentId]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        anchorRef?.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorRef, onClose]);

  const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const rows = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-outline-id]'
      ) ?? []
    );
    const index = rows.indexOf(event.currentTarget);
    let next: HTMLButtonElement | undefined;
    if (event.key === 'ArrowDown')
      next = rows[Math.min(rows.length - 1, index + 1)];
    else if (event.key === 'ArrowUp') next = rows[Math.max(0, index - 1)];
    else if (event.key === 'Home') next = rows[0];
    else if (event.key === 'End') next = rows[rows.length - 1];
    else if (event.key === 'Tab') onClose();
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('conversation.outline.title')}
      className={`${styles.menu} ${className}`}
      data-testid={testId}
    >
      <div className={styles.menuHeader}>
        <span>{t('conversation.outline.title')}</span>
        <span className={styles.count}>
          {t('conversation.outline.turns', { count: items.length })}
        </span>
      </div>
      <OutlineList
        items={items}
        currentId={currentId}
        itemRole="menuitem"
        onSelect={id => {
          onSelect(id);
          onClose();
        }}
        onRowKeyDown={moveFocus}
      />
    </div>
  );
}
