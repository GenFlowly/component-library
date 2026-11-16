import React, { ButtonHTMLAttributes } from 'react';
import styles from './PillButton.module.scss';
import { Icon } from '../Icon/Icon';

export interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Content rendered inside the button. A plain string is wrapped in a
   * `<span>` (with a `-text` test id suffix when `data-testid` is set);
   * any other ReactNode is rendered as-is.
   */
  label: React.ReactNode;
  /**
   * Optional icon source rendered before the label. Omit to render a
   * text-only pill.
   */
  icon?: string;
  /**
   * The icon's size in px.
   * @default 16
   */
  iconSize?: number;
  /**
   * Visual style of the pill.
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'danger';
  /**
   * Test id applied to the root `<button>`. Also derives `-icon` and
   * `-text` suffixed ids for the icon and string-label span.
   */
  'data-testid'?: string;
}

/**
 * A rounded, pill-shaped action button with optional leading icon and
 * primary/secondary/danger variants. Use it for standalone actions such as
 * saving, cancelling, or deleting; it accepts all standard button attributes
 * (`onClick`, `disabled`, `type`, ...) since it extends
 * `ButtonHTMLAttributes<HTMLButtonElement>`.
 */
export default function PillButton({
  label,
  icon,
  iconSize = 16,
  className = '',
  variant = 'primary',
  type = 'button',
  'data-testid': testId,
  ...props
}: PillButtonProps): React.ReactElement {
  const variantClass =
    variant === 'secondary'
      ? styles.secondary
      : variant === 'danger'
        ? styles.danger
        : '';

  return (
    <button
      className={`${styles.pillButton} ${variantClass} ${className}`}
      type={type}
      data-testid={testId}
      {...props}
    >
      {icon && (
        <Icon
          src={icon}
          size={iconSize}
          aria-hidden={true}
          data-testid={testId ? `${testId}-icon` : undefined}
        />
      )}
      {typeof label === 'string' ? (
        <span data-testid={testId ? `${testId}-text` : undefined}>{label}</span>
      ) : (
        label
      )}
    </button>
  );
}
