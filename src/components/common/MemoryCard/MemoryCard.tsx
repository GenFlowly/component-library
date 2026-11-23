import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon/Icon';
import styles from './MemoryCard.module.scss';

export interface MemoryCardAction {
  id: string;
  label: string;
  /** Icon asset URL. */
  icon: string;
  danger?: boolean;
  onSelect: () => void;
}

export interface MemoryCardTag {
  label: string;
  /** `kind` draws the tag in the primary colour, like a Core/Episodic tag. */
  variant?: 'plain' | 'kind';
}

export interface MemoryCardProps {
  text: string;
  tags?: MemoryCardTag[];
  actions: MemoryCardAction[];
  /** Opens the memory; the card's text is the button. */
  onOpen: () => void;
  /** Phones: the kebab hands the actions to the host's sheet instead of the dropdown. */
  onShowActions?: () => void;
  /** Shows "Used N×" and the version badge in the foot. Off for a memory that was just learned. */
  showUsage?: boolean;
  usageCount?: number;
  version?: number;
  /** Already formatted for display, in the viewer's time zone. */
  date?: string;
  /** Clamps the text to this many lines; the full text is one click away. */
  clampLines?: number;
  /** Dims the card and shows this instead of the foot, e.g. "Deleting…". */
  busyLabel?: string;
  /** Prefix for test ids: `${testId}`, `${testId}-actions`, `${testId}-open`. */
  testId?: string;
  /** Overrides `${testId}-actions`. */
  actionsTestId?: string;
  /** Overrides `${testId}-open`. */
  openTestId?: string;
  /** Test id prefix of the menu items: `${actionTestIdPrefix}-${action.id}`. */
  actionTestIdPrefix?: string;
}

function KebabIcon(): React.ReactElement {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

/** One memory: tags, text, and (on the Memory page) how often it was used, its version and date. */
export function MemoryCard({
  text,
  tags = [],
  actions,
  onOpen,
  onShowActions,
  showUsage = false,
  usageCount = 0,
  version,
  date,
  clampLines,
  busyLabel,
  testId = 'memory-card',
  actionsTestId,
  openTestId,
  actionTestIdPrefix = 'memory-action',
}: MemoryCardProps): React.ReactElement {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') setMenuOpen(false);
        return;
      }
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const textStyle: React.CSSProperties | undefined = clampLines
    ? ({ '--memory-card-lines': clampLines } as React.CSSProperties)
    : undefined;

  return (
    // A div, not <article>: the chat's response card styles every article inside it
    <div
      role="article"
      className={`${styles.card} ${menuOpen ? styles.cardMenuOpen : ''} ${busyLabel ? styles.cardBusy : ''}`}
      data-testid={testId}
      aria-busy={busyLabel ? true : undefined}
    >
      <div className={styles.cardHead}>
        {tags.map(tag => (
          <span
            key={tag.label}
            className={`${styles.tag} ${tag.variant === 'kind' ? styles.tagKind : ''}`}
          >
            {tag.label}
          </span>
        ))}
        <span className={styles.spacer} />
        {actions.length > 0 && (
          <div className={styles.menuAnchor} ref={menuRef}>
            <button
              type="button"
              className={styles.kebab}
              aria-label={t('memoryPage.list.actions')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={!!busyLabel}
              onClick={() =>
                onShowActions ? onShowActions() : setMenuOpen(open => !open)
              }
              data-testid={actionsTestId ?? `${testId}-actions`}
            >
              <KebabIcon />
            </button>
            {menuOpen && (
              <div
                className={styles.menu}
                role="menu"
                aria-label={t('memoryPage.list.actions')}
              >
                {actions.map(action => (
                  <button
                    key={action.id}
                    type="button"
                    role="menuitem"
                    className={`${styles.menuItem} ${action.danger ? styles.menuItemDanger : ''}`}
                    onClick={() => {
                      setMenuOpen(false);
                      action.onSelect();
                    }}
                    data-testid={`${actionTestIdPrefix}-${action.id}`}
                  >
                    <Icon src={action.icon} size={15} aria-hidden={true} />
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        className={`${styles.cardText} ${clampLines ? styles.cardTextClamped : ''}`}
        style={textStyle}
        onClick={onOpen}
        title={clampLines ? text : undefined}
        data-testid={openTestId ?? `${testId}-open`}
      >
        {text}
      </button>
      <div className={styles.cardFoot}>
        {busyLabel ? (
          <span>{busyLabel}</span>
        ) : (
          <>
            {showUsage && (
              <span>
                {t('memoryPage.list.used')}{' '}
                <strong className={styles.count}>
                  {t('memoryPage.list.times', { count: usageCount })}
                </strong>
              </span>
            )}
            {showUsage && version !== undefined && (
              <span className={styles.versionBadge}>
                {t('memoryPage.list.version', { version })}
              </span>
            )}
            <span className={styles.spacer} />
            {date && <span>{date}</span>}
          </>
        )}
      </div>
    </div>
  );
}

export default MemoryCard;
