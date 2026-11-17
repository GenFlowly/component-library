import React from 'react';
import styles from './CredentialCard.module.scss';
import StatusPill from '../StatusPill/StatusPill';
import SettingsCard from '../SettingsCard/SettingsCard';

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
    <StatusPill kind={kind} data-testid={testId}>
      {children}
    </StatusPill>
  );
}

export interface CredentialCardProps {
  /** Header label — plain text or a brand component. */
  label: React.ReactNode;
  /** Status pills after the label: CredentialStatusPill(s) or any status node. */
  pills?: React.ReactNode;
  /** Short muted note at the end of the header, e.g. "Optional". */
  hint?: React.ReactNode;
  /** Feedback line under the body; hidden when null/empty. */
  message?: string | null;
  messageKind?: 'success' | 'error' | null;
  /** Card body: inputs, buttons, whatever the credential needs. */
  children?: React.ReactNode;
  'data-testid'?: string;
}

/**
 * Generic card for managing one credential (an API key, a DB connection, …):
 * a SettingsCard with the credential's name and status pills in the header,
 * a free-form body, and an optional success/error line under it. Purely
 * presentational — used by VendorApiKeysManager and any credential-shaped
 * settings UI.
 */
export function CredentialCard({
  label,
  pills,
  hint,
  message,
  messageKind,
  children,
  'data-testid': testId,
}: CredentialCardProps) {
  return (
    <SettingsCard title={label} pills={pills} hint={hint} data-testid={testId}>
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
    </SettingsCard>
  );
}

export default CredentialCard;
