import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AttachmentCard.module.scss';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';

export interface AttachmentCardProps {
  /** Display name of the file, e.g. "quarterly-report.pdf". */
  filename: string;
  /** MIME type, e.g. "application/pdf" — used for the type badge. */
  mediaType?: string;
  /** File size in bytes; rendered human-readable when provided. */
  sizeBytes?: number;
  /**
   * Resolves the download URL at click time (e.g. fetches a short-lived
   * presigned URL). The resolved URL is opened in a new tab. Ignored when
   * `href` is provided.
   */
  getDownloadUrl?: () => Promise<string>;
  /** Direct download URL. Takes precedence over `getDownloadUrl`. */
  href?: string;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

/** "application/pdf" -> "PDF"; falls back to the filename extension. */
function typeLabel(mediaType?: string, filename?: string): string {
  const subtype = mediaType?.split('/')[1];
  if (subtype) return subtype.split('+')[0].toUpperCase();
  const ext = filename?.includes('.') ? filename.split('.').pop() : undefined;
  return ext ? ext.toUpperCase() : 'FILE';
}

function formatBytes(bytes?: number): string | null {
  if (bytes === undefined || bytes === null || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit += 1;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/**
 * Download card for a file attached to a message (e.g. a generated PDF).
 * Renders as a button; clicking resolves the URL (spinner while pending) and
 * opens it in a new tab. Resolution failures show an inline error and the
 * card stays clickable for retry.
 */
export default function AttachmentCard({
  filename,
  mediaType,
  sizeBytes,
  getDownloadUrl,
  href,
  disabled = false,
  className = '',
  'data-testid': dataTestId = 'attachment-card',
}: AttachmentCardProps): React.ReactElement {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleClick = async () => {
    if (loading) return;
    setFailed(false);
    if (href) {
      openUrl(href);
      return;
    }
    if (!getDownloadUrl) return;
    setLoading(true);
    try {
      openUrl(await getDownloadUrl());
    } catch (err) {
      console.error('Failed to resolve attachment download URL:', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const size = formatBytes(sizeBytes);
  const meta = [typeLabel(mediaType, filename), size]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      className={`${styles.attachmentCard} ${className}`}
      onClick={handleClick}
      disabled={disabled || (!href && !getDownloadUrl)}
      aria-busy={loading}
      title={t('common.attachmentCard.download', 'Download {{filename}}', {
        filename,
      })}
      data-testid={dataTestId}
    >
      <Icon src={ICONS.DOCUMENT} size={22} className={styles.fileIcon} />
      <span className={styles.details}>
        <span className={styles.filename}>{filename}</span>
        <span
          className={`${styles.meta} ${failed ? styles.error : ''}`}
          data-testid={`${dataTestId}-meta`}
        >
          {failed
            ? t(
                'common.attachmentCard.error',
                'Download failed — click to retry'
              )
            : meta}
        </span>
      </span>
      {loading ? (
        <span
          className={styles.spinner}
          data-testid={`${dataTestId}-spinner`}
          aria-hidden="true"
        />
      ) : (
        <Icon src={ICONS.DOWNLOAD} size={18} className={styles.downloadIcon} />
      )}
    </button>
  );
}
