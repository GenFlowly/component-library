import React, { ButtonHTMLAttributes } from 'react';
import { Icon } from '../Icon/Icon';
import Tooltip from '../Tooltip/Tooltip';
import styles from './IconButton.module.scss';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /** Icon asset URL, one of the ICONS entries. */
  icon: string;
  /** What the button does. Used as its accessible name and its tooltip. */
  label: string;
  /** 22px for rails and card headers, 28px for bars. @default 'md' */
  size?: 'sm' | 'md';
  /** Glyph size in px. Defaults to 14 for `sm` and 16 for `md`. */
  iconSize?: number;
  /** Turns the glyph so one chevron asset serves every direction. */
  iconRotation?: 0 | 90 | 180 | 270;
  /** Class for the glyph, e.g. a spin while the action runs. */
  iconClassName?: string;
  /** Pressed look, e.g. while the menu this button opens is showing. */
  active?: boolean;
  /** Preferred tooltip side; the tooltip moves if that side has no room. */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Suppresses the tooltip, e.g. while the button's own popup is open. */
  hideTooltip?: boolean;
  'data-testid'?: string;
}

const ROTATION_CLASS: Record<number, string | undefined> = {
  90: styles.rotate90,
  180: styles.rotate180,
  270: styles.rotate270,
};

/**
 * Icon-only button with its label built in: the label is the accessible name
 * and shows as a tooltip on hover and keyboard focus.
 */
export default function IconButton({
  icon,
  label,
  size = 'md',
  iconSize,
  iconRotation = 0,
  iconClassName,
  active = false,
  tooltipPosition = 'bottom',
  hideTooltip = false,
  className = '',
  type = 'button',
  'data-testid': testId,
  ...props
}: IconButtonProps): React.ReactElement {
  const glyphSize = iconSize ?? (size === 'sm' ? 14 : 16);
  return (
    <Tooltip content={hideTooltip ? '' : label} position={tooltipPosition}>
      <button
        type={type}
        aria-label={label}
        className={`${styles.button} ${styles[size]} ${active ? styles.active : ''} ${className}`}
        data-testid={testId}
        {...props}
      >
        <Icon
          src={icon}
          size={glyphSize}
          className={
            [ROTATION_CLASS[iconRotation], iconClassName]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
      </button>
    </Tooltip>
  );
}
