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
}) => {
  return (
    <div
      className={`${styles.container} ${className}`}
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
      />
    </div>
  );
};
