import React, { useRef } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './SettingsCard.module.scss';

let nextTitleId = 0;

export interface SettingsCardProps {
  /**
   * Header title; also names the card for assistive tech. Omit it for a card
   * with no header (a date range panel) and name it with `aria-label`.
   */
  title?: React.ReactNode;
  /** Names a card that has no title. */
  'aria-label'?: string;
  /** Icon asset URL before the title. */
  icon?: string;
  /** Status pills after the title (StatusPill elements). */
  pills?: React.ReactNode;
  /** Short muted note at the end of the header, e.g. "Optional". */
  hint?: React.ReactNode;
  /** Red title and border, for cards whose action can't be undone. */
  danger?: boolean;
  /** Drop the body padding, for content that runs edge to edge (tables). */
  flush?: boolean;
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

/**
 * The card every settings page is built from: the floating sidebar
 * material, a header with title, status pills and an optional hint, and a
 * padded body. The header wraps on narrow cards so pills and hint never
 * push past the edge.
 */
export default function SettingsCard({
  title,
  icon,
  pills,
  hint,
  danger = false,
  flush = false,
  children,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId,
}: SettingsCardProps): React.ReactElement {
  const titleId = useRef(`settings-card-title-${++nextTitleId}`).current;
  const hasHeader = title != null;
  return (
    <section
      className={`${styles.card} ${danger ? styles.danger : ''} ${className}`}
      aria-labelledby={hasHeader ? titleId : undefined}
      aria-label={hasHeader ? undefined : ariaLabel}
      data-testid={testId}
    >
      {hasHeader && (
        <header className={styles.header}>
          {icon && <Icon src={icon} size={14} className={styles.icon} />}
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {pills != null && <div className={styles.pills}>{pills}</div>}
          {hint != null && <span className={styles.hint}>{hint}</span>}
        </header>
      )}
      {children != null && (
        <div className={`${styles.body} ${flush ? styles.flush : ''}`}>
          {children}
        </div>
      )}
    </section>
  );
}
