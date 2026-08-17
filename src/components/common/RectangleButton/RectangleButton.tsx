import React from 'react';
import styles from './RectangleButton.module.scss';

import { Icon } from '../Icon/Icon';

interface ButtonProps {
  /** Text shown inside the button (strings only, no ReactNode). */
  label: string;
  /** Click handler for the button (required). */
  onClick: () => void;
  /**
   * Disables the underlying `<button>` so clicks are ignored.
   * @default false
   */
  disabled?: boolean;
  /** Optional icon source rendered after the label (trailing position). */
  icon?: string;
  /** Test id applied to the root `<button>`; the icon receives an `-icon` suffixed id. */
  'data-testid'?: string;
}

/**
 * A rectangular submit-style button with a text label and an optional
 * trailing icon. Its API is intentionally minimal (label/onClick/disabled/icon)
 * — reach for PillButton when you need variants or arbitrary button attributes.
 */
export default function RectangleButton({
  label,
  onClick,
  disabled = false,
  icon,
  'data-testid': testId,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={styles.submitButton}
      disabled={disabled}
      data-testid={testId}
    >
      {label}
      {icon && (
        <Icon src={icon} data-testid={testId ? `${testId}-icon` : undefined} />
      )}
    </button>
  );
}
