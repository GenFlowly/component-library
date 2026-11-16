import React from 'react';
import { Icon } from '../Icon/Icon';
import Tooltip from '../Tooltip/Tooltip';
import { ICONS } from '../../../constants/icons';
import styles from './CollapseStrip.module.scss';

export interface CollapseStripProps {
  /** The way the chevron points: where the panel edge goes when clicked. */
  direction: 'left' | 'right';
  /** What clicking does ("Collapse Sidebar"); accessible name and tooltip. */
  label: string;
  onClick: () => void;
  'aria-expanded'?: boolean;
  className?: string;
  'data-testid'?: string;
}

/**
 * The slim card at the foot of a side panel that collapses or expands it,
 * the same control on both edges of the page.
 */
export default function CollapseStrip({
  direction,
  label,
  onClick,
  'aria-expanded': ariaExpanded,
  className = '',
  'data-testid': testId,
}: CollapseStripProps): React.ReactElement {
  return (
    <Tooltip content={label} position="top" fullWidth>
      <button
        type="button"
        className={`${styles.strip} ${className}`}
        onClick={onClick}
        aria-label={label}
        aria-expanded={ariaExpanded}
        data-testid={testId}
      >
        <Icon
          src={
            direction === 'left' ? ICONS.ALT_ARROW_LEFT : ICONS.ALT_ARROW_RIGHT
          }
          size={14}
        />
      </button>
    </Tooltip>
  );
}
