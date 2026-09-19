import React from 'react';
import styles from './CredentialCard.module.scss';

export type CredentialStatusPillKind = 'ok' | 'unset' | 'neutral';

export interface CredentialStatusPillProps {
  /** Visual state: 'ok' (green), 'unset' (muted), 'neutral' (plain border). */
  kind: CredentialStatusPillKind;
  children: React.ReactNode;
  'data-testid'?: string;
}

/** Rounded status pill for a CredentialCard header (e.g. "Key set"). */
export function CredentialStatusPill({
  kind,
  children,
  'data-testid': testId,
}: CredentialStatusPillProps) {
  return (
    <span
      className={`${styles.statusPill} ${styles[kind]}`}
      data-testid={testId}
    >
      {children}
    </span>
  );
}

export interface CredentialCardProps {
  /** Header label — plain text or a brand component. */
  label: React.ReactNode;
  /** Right side of the header: CredentialStatusPill(s) or any status node. */
  pills?: React.ReactNode;
  /** Feedback line under the body; hidden when null/empty. */
  message?: string | null;
  messageKind?: 'success' | 'error' | null;
  /** Card body: inputs, buttons, whatever the credential needs. */
  children?: React.ReactNode;
  'data-testid'?: string;
}

/**
 * Generic card shell for managing one credential (an API key, a DB
 * connection, …): a header with a label and status pills, a free-form body,
 * and an optional success/error message line. Purely presentational — used
 * by VendorApiKeysManager and reusable for any credential-shaped settings UI.
 */
export function CredentialCard({
  label,
  pills,
  message,
  messageKind,
  children,
  'data-testid': testId,
}: CredentialCardProps) {
  return (
    <div className={styles.card} data-testid={testId}>
      <div className={styles.cardHeader}>
        <span className={styles.label}>{label}</span>
        {pills && <div className={styles.headerPills}>{pills}</div>}
      </div>

      {children}

      {message && (
        <div
          className={`${styles.message} ${
            messageKind === 'error' ? styles.error : styles.success
          }`}
          data-testid={testId ? `${testId}-message` : undefined}
        >
          {message}
        </div>
      )}
    </div>
  );
}

export default CredentialCard;
