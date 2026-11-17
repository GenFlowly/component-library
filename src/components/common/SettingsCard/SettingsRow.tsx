import React from 'react';
import styles from './SettingsRow.module.scss';

export interface SettingsRowProps {
  /** What the row is about, e.g. "Delete all learned facts". */
  label: React.ReactNode;
  /** One short muted line under the label. */
  description?: React.ReactNode;
  /** Control at the end of the row: a switch, a button, a link. */
  action?: React.ReactNode;
  /**
   * On narrow cards the action moves under the text and fills the width
   * (right for buttons, wrong for a switch).
   * @default true
   */
  stackOnNarrow?: boolean;
  /** Extra content under the label and description (a list, a field). */
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

/**
 * One line in a SettingsCard: label and description on the left, its control
 * on the right. Consecutive rows are split by a hairline.
 */
export default function SettingsRow({
  label,
  description,
  action,
  stackOnNarrow = true,
  children,
  className = '',
  'data-testid': testId,
}: SettingsRowProps): React.ReactElement {
  return (
    <div
      className={`${styles.row} ${stackOnNarrow ? styles.stack : ''} ${className}`}
      data-testid={testId}
    >
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description != null && (
          <span className={styles.description}>{description}</span>
        )}
        {children}
      </div>
      {action != null && <div className={styles.action}>{action}</div>}
    </div>
  );
}
