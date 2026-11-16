import React from 'react';
import IconButton from '../IconButton/IconButton';
import { ICONS } from '../../../constants/icons';
import styles from './SidebarRail.module.scss';

export interface SidebarRailItem {
  id: string;
  /** Icon asset URL, one of the ICONS entries. */
  icon: string;
  /** Accessible name and tooltip. */
  label: string;
  onClick: () => void;
  testId?: string;
}

export interface SidebarRailTab {
  id: string;
  /** Shown as vertical text, so it doubles as the accessible name. */
  label: string;
  onClick: () => void;
  active?: boolean;
  testId?: string;
}

export interface SidebarRailProps {
  /** The page edge the rail sits on; decides the expand chevron's direction. */
  side: 'left' | 'right';
  /** Icon buttons at the top of the rail. */
  items?: SidebarRailItem[];
  /** Vertical text tabs under the icon buttons. */
  tabs?: SidebarRailTab[];
  /** Accessible name and tooltip of the expand chevron at the foot. */
  expandLabel: string;
  onExpand: () => void;
  'aria-label'?: string;
  'data-testid'?: string;
  expandTestId?: string;
}

/**
 * A side panel collapsed to a 28px card: its actions as icon buttons, its
 * sections as vertical tabs, and the chevron that expands it again.
 */
export default function SidebarRail({
  side,
  items = [],
  tabs = [],
  expandLabel,
  onExpand,
  'aria-label': ariaLabel,
  'data-testid': testId,
  expandTestId,
}: SidebarRailProps): React.ReactElement {
  const tooltipSide = side === 'left' ? 'right' : 'left';
  return (
    <aside className={styles.rail} aria-label={ariaLabel} data-testid={testId}>
      {items.map(item => (
        <IconButton
          key={item.id}
          icon={item.icon}
          label={item.label}
          size="sm"
          tooltipPosition={tooltipSide}
          onClick={item.onClick}
          data-testid={item.testId}
        />
      ))}
      {tabs.length > 0 && (
        <div className={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${tab.active ? styles.activeTab : ''}`}
              onClick={tab.onClick}
              aria-current={tab.active ? 'true' : undefined}
              data-testid={tab.testId}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <span className={styles.spacer} />
      <IconButton
        icon={side === 'left' ? ICONS.ALT_ARROW_RIGHT : ICONS.ALT_ARROW_LEFT}
        label={expandLabel}
        size="sm"
        tooltipPosition={tooltipSide}
        onClick={onExpand}
        aria-expanded={false}
        data-testid={expandTestId}
      />
    </aside>
  );
}
