import React, { ReactNode } from 'react';
import styles from './SidebarCard.module.scss';

export interface SidebarCardProps {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}

/**
 * A single floating sidebar card, with the same chrome as ResizableSidebar and
 * VerticalSplit's panes. It hugs its content and scrolls inside once the
 * surrounding column runs out of room.
 */
export default function SidebarCard({
  children,
  className = '',
  'data-testid': testId,
}: SidebarCardProps): React.ReactElement {
  return (
    <div className={`${styles.card} ${className}`} data-testid={testId}>
      {children}
    </div>
  );
}
