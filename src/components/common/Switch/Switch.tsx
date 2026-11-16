import React from 'react';
import styles from './Switch.module.scss';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name; the visible text next to the switch is the caller's. */
  label: string;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

/** On/off toggle with switch semantics. */
export default function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  'data-testid': testId,
}: SwitchProps): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`${styles.switch} ${checked ? styles.on : ''} ${className}`}
      onClick={() => onChange(!checked)}
      data-testid={testId}
    >
      <span className={styles.thumb} aria-hidden="true" />
    </button>
  );
}
