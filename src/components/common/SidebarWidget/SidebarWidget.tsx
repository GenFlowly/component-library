import React, { ReactNode, useContext, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import Tooltip from '../Tooltip/Tooltip';
import ScrollArea from '../ScrollArea/ScrollArea';
import Chevron from '../SidebarListPanel/Chevron';
import SidebarListPanel, {
  SidebarListPanelProps,
} from '../SidebarListPanel/SidebarListPanel';
import TreeMenu, { TreeMenuProps } from '../TreeMenu/TreeMenu';
import { SidebarStackContext } from '../SidebarStack/SidebarStackContext';
import styles from './SidebarWidget.module.scss';

let nextBodyId = 0;

interface SidebarWidgetBaseProps {
  /**
   * Header title. Without it the card has no header row. A directory widget
   * shows it as the list's uppercase heading, a menu widget as the card's.
   */
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
   * The full-screen phone menu: finger-sized rows, and header buttons whose
   * hit area spans the header's height and grows sideways for a finger.
   */
  touch?: boolean;
  /** Fills the height of the column it sits in instead of hugging its content. */
  fill?: boolean;
  className?: string;
  /** Class for the body under the header (only used with a title). */
  bodyClassName?: string;
  'data-testid'?: string;
  /** Test id of the collapse toggle. */
  toggleTestId?: string;
}

/** A card with content of its own design, e.g. the dock's Models card. */
export interface SidebarWidgetCustomProps extends SidebarWidgetBaseProps {
  variant?: 'custom';
  children?: ReactNode;
}

export type SidebarWidgetList = Omit<
  SidebarListPanelProps,
  'variant' | 'touch' | 'title' | 'hug'
>;

/**
 * A card listing conversations in groups, with row actions, swipe trays and
 * paging, on the card's material.
 */
export interface SidebarWidgetHistoryProps extends SidebarWidgetBaseProps {
  variant: 'history';
  list: SidebarWidgetList;
}

/** A card listing scopes or categories to pick from, on the sidebar background. */
export interface SidebarWidgetDirectoryProps extends SidebarWidgetBaseProps {
  variant: 'directory';
  list: SidebarWidgetList;
}

export type SidebarWidgetListProps =
  SidebarWidgetHistoryProps | SidebarWidgetDirectoryProps;

export type SidebarWidgetMenu = Omit<TreeMenuProps, 'touch'>;

/** A card of grouped navigation: sections with icons that expand to pages. */
export interface SidebarWidgetMenuProps extends SidebarWidgetBaseProps {
  variant: 'menu';
  menu: SidebarWidgetMenu;
  /** A search field between the heading and the menu. */
  search?: ReactNode;
  /** Pinned under the menu, over a hairline. */
  footer?: ReactNode;
}

export type SidebarWidgetProps =
  SidebarWidgetCustomProps | SidebarWidgetListProps | SidebarWidgetMenuProps;

/**
 * The one card every sidebar widget sits in: the floating sidebar material, a
 * 34 px header with the widget's icon, title and actions, and its body. It
 * hugs its content and scrolls inside once the surrounding column runs out of
 * room; in a SidebarStack (every ResizableSidebar has one) it takes its full
 * height and the stack scrolls, and a fill card grows to at least the stack's
 * height. The variant decides the body: a history or directory list, a menu,
 * or custom content.
 */
export default function SidebarWidget(
  props: SidebarWidgetProps
): React.ReactElement {
  const {
    title,
    icon,
    actions,
    collapsible = false,
    collapsed: collapsedProp,
    defaultCollapsed = false,
    onCollapsedChange,
    collapseLabel,
    expandLabel,
    touch = false,
    fill = false,
    className = '',
    bodyClassName = '',
    'data-testid': testId,
    toggleTestId,
  } = props;
  const inStack = useContext(SidebarStackContext);
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const bodyId = useRef(`sidebar-widget-body-${++nextBodyId}`).current;
  const isCollapsed = collapsible && (collapsedProp ?? internalCollapsed);
  const cardClass = `${styles.widget} ${touch ? styles.touch : ''} ${fill ? styles.fill : ''} ${inStack ? styles.stacked : ''}`;

  if (props.variant === 'menu') {
    return (
      <section
        className={`${cardClass} ${styles.menu} ${className}`}
        data-testid={testId}
      >
        {title != null && <h2 className={styles.menuHeader}>{title}</h2>}
        {props.search != null && (
          <div className={styles.menuSearch}>{props.search}</div>
        )}
        {inStack ? (
          <div className={styles.menuScroll}>
            <TreeMenu {...props.menu} touch={touch} />
          </div>
        ) : (
          <ScrollArea className={styles.menuScroll}>
            <TreeMenu {...props.menu} touch={touch} />
          </ScrollArea>
        )}
        {props.footer != null && (
          <div className={styles.menuFooter}>{props.footer}</div>
        )}
      </section>
    );
  }

  if (props.variant === 'directory') {
    return (
      <div className={`${cardClass} ${className}`} data-testid={testId}>
        <SidebarListPanel
          {...props.list}
          variant="directory"
          touch={touch}
          title={typeof title === 'string' ? title : undefined}
        />
      </div>
    );
  }

  const children =
    props.variant === 'history' ? (
      <SidebarListPanel {...props.list} variant="history" touch={touch} />
    ) : (
      props.children
    );

  if (title == null) {
    return (
      <div className={`${cardClass} ${className}`} data-testid={testId}>
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
      className={`${cardClass} ${isCollapsed ? styles.collapsed : ''} ${className}`}
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
