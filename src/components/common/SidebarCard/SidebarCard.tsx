import React, { ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './SidebarCard.module.scss';

export interface SidebarCardProps {
  children: ReactNode;
  /** Header title. Without it the card has no header row. */
  title?: ReactNode;
  /** Icon asset URL shown before the title. */
  icon?: string;
  /** Controls at the right end of the header (icon buttons). */
  actions?: ReactNode;
  className?: string;
  /** Class for the body under the header (only used with a title). */
  bodyClassName?: string;
  'data-testid'?: string;
}

/**
 * A single floating sidebar card, with the same chrome as ResizableSidebar and
 * VerticalSplit's panes. It hugs its content and scrolls inside once the
 * surrounding column runs out of room. With a title it gets a header row.
 */
export default function SidebarCard({
  children,
  title,
  icon,
  actions,
  className = '',
  bodyClassName = '',
  'data-testid': testId,
}: SidebarCardProps): React.ReactElement {
  if (title == null) {
    return (
      <div className={`${styles.card} ${className}`} data-testid={testId}>
        {children}
      </div>
    );
  }
  return (
    <section className={`${styles.card} ${className}`} data-testid={testId}>
      <header className={styles.header}>
        {icon && <Icon src={icon} size={16} className={styles.headerIcon} />}
        <h2 className={styles.title}>{title}</h2>
        {actions != null && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={`${styles.body} ${bodyClassName}`}>{children}</div>
    </section>
  );
}
