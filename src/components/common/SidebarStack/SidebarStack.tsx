import React, { createContext, ReactNode } from 'react';
import ScrollArea from '../ScrollArea/ScrollArea';
import styles from './SidebarStack.module.scss';

// Set inside a SidebarStack: its SidebarWidgets grow to their full height
// instead of scrolling inside themselves
export const SidebarStackContext = createContext(false);

export interface SidebarStackProps {
  children: ReactNode;
  /** The full-screen phone menu: the wider gap between its cards. */
  touch?: boolean;
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

/**
 * SidebarWidgets stacked with the dock's gap between them, each at its full
 * height, in one column that scrolls as a whole: a list widget's rows grow
 * its card, and paging follows the column's scroll.
 */
export default function SidebarStack({
  children,
  touch = false,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId,
}: SidebarStackProps): React.ReactElement {
  return (
    <SidebarStackContext.Provider value={true}>
      <ScrollArea
        className={`${styles.stack} ${touch ? styles.touch : ''} ${className}`}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        {children}
      </ScrollArea>
    </SidebarStackContext.Provider>
  );
}
