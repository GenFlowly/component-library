import React, { ButtonHTMLAttributes } from 'react';
import styles from './RectangleButton.module.scss';

import { Icon } from '../Icon/Icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text shown inside the button (strings only, no ReactNode). */
  label: string;
  /** Click handler for the button (required). */
  onClick: () => void;
  /**
   * Disables the underlying `<button>` so clicks are ignored.
   * @default false
   */
  disabled?: boolean;
  /** Optional icon source rendered after the label (trailing position, decorative). */
  icon?: string;
  /** Test id applied to the root `<button>`; the icon receives an `-icon` suffixed id. */
  'data-testid'?: string;
}

/**
 * A rectangular submit-style button with a text label and an optional
 * trailing icon. Its core API is minimal (label/onClick/disabled/icon), and
 * standard button attributes (`type`, `aria-*`, ...) pass through — reach for
 * PillButton when you need visual variants.
 */
export default function RectangleButton({
  label,
  onClick,
  disabled = false,
  icon,
  type = 'button',
  'data-testid': testId,
  ...props
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={styles.submitButton}
      disabled={disabled}
      type={type}
      data-testid={testId}
      {...props}
    >
      {label}
      {icon && (
        <Icon
          src={icon}
          aria-hidden={true}
          data-testid={testId ? `${testId}-icon` : undefined}
        />
      )}
    </button>
  );
}
