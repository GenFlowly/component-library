import React, { ReactNode, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import Tooltip from '../Tooltip/Tooltip';
import Chevron from '../SidebarListPanel/Chevron';
import styles from './SidebarWidget.module.scss';

let nextBodyId = 0;

export interface SidebarWidgetProps {
  children?: ReactNode;
  /** Header title. Without it the card has no header row. */
  title?: ReactNode;
  /** Icon asset URL shown before the title. */
  icon?: string;
  /** Controls at the right end of the header (icon buttons). */
  actions?: ReactNode;
  /**
   * The chevron, icon and title become one button that collapses the card to
   * its header.
   */
  collapsible?: boolean;
  /** Controlled collapsed state; omit to let the card keep its own. */
  collapsed?: boolean;
  /** Starting state when uncontrolled. @default false */
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Tooltip of the toggle while expanded, e.g. "Collapse Projects". */
  collapseLabel?: string;
  /** Tooltip of the toggle while collapsed, e.g. "Expand Projects". */
  expandLabel?: string;
  /**
   * 'menu': the full-screen mobile menu. Same look, with header buttons whose
   * hit area spans the header's height and grows sideways for a finger.
   * @default 'default'
   */
  variant?: 'default' | 'menu';
  className?: string;
  /** Class for the body under the header (only used with a title). */
  bodyClassName?: string;
  'data-testid'?: string;
  /** Test id of the collapse toggle. */
  toggleTestId?: string;
}

/**
 * The one card every sidebar widget sits in: the floating sidebar material, a
 * 34 px header with the widget's icon, title and actions, and its body. It
 * hugs its content and scrolls inside once the surrounding column runs out of
 * room; in a VerticalSplit pane it fills the pane.
 */
export default function SidebarWidget({
  children,
  title,
  icon,
  actions,
  collapsible = false,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  collapseLabel,
  expandLabel,
  variant = 'default',
  className = '',
  bodyClassName = '',
  'data-testid': testId,
  toggleTestId,
}: SidebarWidgetProps): React.ReactElement {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const bodyId = useRef(`sidebar-widget-body-${++nextBodyId}`).current;
  const isCollapsed = collapsible && (collapsedProp ?? internalCollapsed);
  const variantClass = variant === 'menu' ? styles.menu : '';

  if (title == null) {
    return (
      <div
        className={`${styles.widget} ${variantClass} ${className}`}
        data-testid={testId}
      >
        {children}
      </div>
    );
  }

  const toggle = () => {
    const next = !isCollapsed;
    if (collapsedProp === undefined) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };

  return (
    <section
      className={`${styles.widget} ${variantClass} ${isCollapsed ? styles.collapsed : ''} ${className}`}
      data-testid={testId}
    >
      <header
        className={`${styles.header} ${collapsible ? styles.toggleHeader : ''}`}
      >
        {collapsible ? (
          <h2 className={styles.heading}>
            <Tooltip
              content={(isCollapsed ? expandLabel : collapseLabel) ?? ''}
              position="bottom"
              className={styles.toggleTip}
            >
              <button
                type="button"
                className={styles.toggle}
                aria-expanded={!isCollapsed}
                aria-controls={bodyId}
                onClick={toggle}
                data-testid={toggleTestId}
              >
                <Chevron expanded={!isCollapsed} />
                {icon && (
                  <Icon src={icon} size={16} className={styles.headerIcon} />
                )}
                <span className={styles.title}>{title}</span>
              </button>
            </Tooltip>
          </h2>
        ) : (
          <>
            {icon && (
              <Icon src={icon} size={16} className={styles.headerIcon} />
            )}
            <h2 className={styles.title}>{title}</h2>
          </>
        )}
        {actions != null && <div className={styles.actions}>{actions}</div>}
      </header>
      <div
        id={bodyId}
        className={`${styles.body} ${bodyClassName}`}
        hidden={isCollapsed}
      >
        {children}
      </div>
    </section>
  );
}
