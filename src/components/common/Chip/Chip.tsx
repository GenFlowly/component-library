import React, { ReactNode } from 'react';
import styles from './Chip.module.scss';

export interface ChipProps {
  label: ReactNode;
  /**
   * Makes this a CTA chip: rendered as a button with hover/selected states
   * (filters, toggles). Without it the chip is a static tag (e.g. the model
   * name on a response).
   */
  onClick?: (e: React.MouseEvent) => void;
  /** CTA chips only: highlighted as the active choice (aria-pressed). */
  selected?: boolean;
  disabled?: boolean;
  /** Native tooltip; defaults to the label when it is a plain string. */
  title?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Small rounded tag chip (the model-name chip look). Static by default;
 * passing [onClick] turns it into the CTA variant — a pressable chip with
 * hover and [selected] states, for filter rows and toggles.
 */
export default function Chip({
  label,
  onClick,
  selected = false,
  disabled = false,
  title,
  className = '',
  'data-testid': testId,
}: ChipProps): React.ReactElement {
  const hoverTitle = title ?? (typeof label === 'string' ? label : undefined);

  if (onClick) {
    return (
      <button
        type="button"
        className={`${styles.chip} ${styles.cta} ${selected ? styles.selected : ''} ${className}`}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        title={hoverTitle}
        data-testid={testId}
      >
        {label}
      </button>
    );
  }
  return (
    <span
      className={`${styles.chip} ${className}`}
      title={hoverTitle}
      data-testid={testId}
    >
      {label}
    </span>
  );
}
