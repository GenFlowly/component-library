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
  /** Page count of a document (e.g. a generated PDF); shown when provided. */
  pageCount?: number;
  /**
   * Resolves the download URL at click time (e.g. fetches a short-lived
   * presigned URL). A new tab opens synchronously on click and navigates to
   * the resolved URL. Ignored when `href` is provided.
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

/** 15417 -> "15 KB"; null when the size is unknown. */
export function formatBytes(bytes?: number | null): string | null {
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
 * Renders as a button; clicking opens a new tab right away (inside the click,
 * so Safari/iOS don't block it as a popup), resolves the URL (spinner while
 * pending) and points the tab at it. Resolution failures close the tab, show
 * an inline error, and the card stays clickable for retry.
 */
export default function AttachmentCard({
  filename,
  mediaType,
  sizeBytes,
  pageCount,
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

  const handleClick = () => {
    if (loading) return;
    setFailed(false);
    if (href) {
      openUrl(href);
      return;
    }
    if (!getDownloadUrl) return;
    // Safari and iOS block window.open() as a popup unless it runs inside
    // the click itself, and resolving the URL awaits a token and a presign.
    // So open an empty tab now and point it at the file once the URL
    // resolves. ('noopener' would make window.open return null, leaving no
    // tab to navigate; the opener link is cut by hand instead.)
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    setLoading(true);
    getDownloadUrl()
      .then(url => {
        if (tab && !tab.closed) {
          tab.location.href = url;
        } else {
          // Popup blocked (or the tab was closed meanwhile): best effort
          openUrl(url);
        }
      })
      .catch(err => {
        console.error('Failed to resolve attachment download URL:', err);
        tab?.close();
        setFailed(true);
      })
      .finally(() => setLoading(false));
  };

  const size = formatBytes(sizeBytes);
  const pages =
    typeof pageCount === 'number' && pageCount > 0
      ? t('common.attachmentCard.pages', {
          count: pageCount,
          defaultValue: pageCount === 1 ? '{{count}} page' : '{{count}} pages',
        })
      : null;
  // e.g. "PDF · 7 pages · 13 KB"
  const meta = [typeLabel(mediaType, filename), pages, size]
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
