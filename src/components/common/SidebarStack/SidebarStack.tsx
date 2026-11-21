import React, { ReactNode, useContext } from 'react';
import ScrollArea from '../ScrollArea/ScrollArea';
import { SidebarStackContext } from './SidebarStackContext';
import styles from './SidebarStack.module.scss';

export { SidebarStackContext };

export interface SidebarStackProps {
  children: ReactNode;
  /** The full-screen phone menu: the wider gap between its cards. */
  touch?: boolean;
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

/**
 * The scrolling body of a sidebar: SidebarWidgets stacked with the dock's gap
 * between them, each at its full height, in one column that scrolls as a
 * whole. Lists and menus inside grow their cards instead of scrolling, and
 * paging follows the column's scroll. A stack inside another stack only
 * stacks its cards; the outer one scrolls.
 */
export default function SidebarStack({
  children,
  touch = false,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId,
}: SidebarStackProps): React.ReactElement {
  const nested = useContext(SidebarStackContext);
  const cardsClass = `${styles.cards} ${touch ? styles.touch : ''}`;

  if (nested) {
    return (
      <div
        className={`${cardsClass} ${className}`}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        {children}
      </div>
    );
  }

  return (
    <SidebarStackContext.Provider value={true}>
      <ScrollArea
        className={`${styles.stack} ${className}`}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        <div className={cardsClass}>{children}</div>
      </ScrollArea>
    </SidebarStackContext.Provider>
  );
}
