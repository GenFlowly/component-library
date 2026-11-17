import React from 'react';
import styles from './InputTextWithHint.module.scss';
import { Icon } from '../Icon/Icon';

interface InputTextWithHintProps {
  /** Prefix label; omit (with no icon) to render a plain input. */
  hint?: string;
  icon?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  autoFocus?: boolean;
  type?: string;
  'data-testid'?: string;
  disabled?: boolean;
  /** Shown but not editable, e.g. a locked choice. */
  readOnly?: boolean;
  /**
   * 'stacked' puts the label above the value, for phone-width forms where a
   * side label would squeeze the value.
   * @default 'inline'
   */
  layout?: 'inline' | 'stacked';
}

export const InputTextWithHint: React.FC<InputTextWithHintProps> = ({
  hint,
  icon,
  placeholder,
  value,
  onChange,
  className = '',
  autoFocus = false,
  type = 'text',
  'data-testid': testId,
  disabled = false,
  readOnly = false,
  layout = 'inline',
}) => {
  return (
    <div
      className={`${styles.container} ${layout === 'stacked' ? styles.stacked : ''} ${readOnly ? styles.readOnly : ''} ${className}`}
      data-testid={testId ? `${testId}-container` : undefined}
    >
      {(icon || hint) && (
        <div className={styles.prefixArea}>
          {icon && (
            <Icon
              src={icon}
              size={16}
              className={styles.icon}
              data-testid={testId ? `${testId}-icon` : undefined}
            />
          )}
          {hint && (
            <span
              className={styles.hintText}
              data-testid={testId ? `${testId}-hint` : undefined}
            >
              {hint}
            </span>
          )}
        </div>
      )}
      <input
        type={type}
        className={styles.inputElement}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        data-testid={testId}
        disabled={disabled}
        readOnly={readOnly}
      />
    </div>
  );
};
