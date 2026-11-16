import React from 'react';
import { OutlineItem } from './outline.models';
import styles from './Outline.module.scss';

interface OutlineListProps {
  items: OutlineItem[];
  currentId?: string | null;
  onSelect: (id: string) => void;
  /** Row semantics: menu items in the dropdown, plain buttons in the sheet. */
  itemRole?: 'menuitem';
  onRowKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

/** The turn rows shared by the Outline dropdown and the phone sheet. */
export default function OutlineList({
  items,
  currentId,
  onSelect,
  itemRole,
  onRowKeyDown,
}: OutlineListProps): React.ReactElement {
  return (
    <div className={styles.list}>
      {items.map(item => {
        const isCurrent = item.id === currentId;
        return (
          <button
            key={item.id}
            type="button"
            role={itemRole}
            className={`${styles.row} ${isCurrent ? styles.current : ''}`}
            aria-current={isCurrent ? 'true' : undefined}
            onClick={() => onSelect(item.id)}
            onKeyDown={onRowKeyDown}
            data-outline-id={item.id}
            data-testid={`outline-row-${item.id}`}
          >
            <span className={styles.number}>{item.number}</span>
            <span className={styles.text}>
              <span className={styles.prompt}>{item.prompt}</span>
              {(item.meta || item.isGenerating) && (
                <span className={styles.meta}>
                  {item.isGenerating && (
                    <span className={styles.pulse} aria-hidden="true" />
                  )}
                  {item.meta}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
