import React from 'react';
import styles from './StatusPill.module.scss';

export type StatusPillKind = 'ok' | 'neutral' | 'unset' | 'warn' | 'locked';

export interface StatusPillProps {
  /**
   * 'ok' green (a key is set); 'neutral' (a fact, e.g. "Priority 1") and
   * 'unset' (not set yet) share the muted outline; 'warn' red (needs
   * attention); 'locked' filled grey (can't be changed).
   * @default 'neutral'
   */
  kind?: StatusPillKind;
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

/** Small rounded status label for page titles and card headers. */
export default function StatusPill({
  kind = 'neutral',
  children,
  className = '',
  'data-testid': testId,
}: StatusPillProps): React.ReactElement {
  return (
    <span
      className={[styles.pill, styles[kind], className]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
    >
      {children}
    </span>
  );
}
