import React from 'react';
import styles from './StatTile.module.scss';

export interface StatTileProps {
  /** Short uppercase label, e.g. "Total cost". */
  label: string;
  /** The figure, already formatted ("$4.12", "1.7M"). */
  value: React.ReactNode;
  /** Optional muted line under the figure, e.g. "18 per day". */
  sub?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

/** One headline number. Lay tiles out with Grid/GridCol. */
export default function StatTile({
  label,
  value,
  sub,
  className = '',
  'data-testid': testId,
}: StatTileProps): React.ReactElement {
  return (
    <div className={`${styles.tile} ${className}`} data-testid={testId}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {sub != null && <span className={styles.sub}>{sub}</span>}
    </div>
  );
}
