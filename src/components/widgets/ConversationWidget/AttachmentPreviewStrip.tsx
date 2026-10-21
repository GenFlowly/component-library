import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '../../../constants/icons';
import { Icon } from '../../common/Icon/Icon';
import AttachmentCard from '../../common/AttachmentCard/AttachmentCard';
import { AttachmentRef, PDF_MEDIA_TYPE } from './attachment.models';
import {
  useConversationAuth,
  useConversationServices,
} from './ConversationWidgetContext';
import styles from './AttachmentPreview.module.scss';

interface ThumbImageProps {
  src: string;
  alt: string;
  className: string;
  onClick?: () => void;
  'data-testid'?: string;
}

/**
 * <img> that swaps to a generic image tile when the browser can't decode the
 * format (e.g. HEIC outside Safari). Any image type can be attached — the
 * backend converts it for the model — so a failed preview is not an error.
 */
function ThumbImage({
  src,
  alt,
  className,
  onClick,
  'data-testid': testId,
}: ThumbImageProps): React.ReactElement {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (failed) {
    return (
      <div
        className={`${className} ${styles.thumbPlaceholder}`}
        title={alt || undefined}
        onClick={onClick}
        data-testid="attachment-thumbnail-placeholder"
      >
        <Icon src={ICONS.IMAGE_ATTACHMENT} alt={alt} size={22} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => setFailed(true)}
      data-testid={testId}
    />
  );
}

/** A file being attached in the editor: uploads to S3 in the background. */
export interface PendingAttachment {
  localId: string;
  fileName: string;
  /** MIME type of the picked/pasted file — PDF_MEDIA_TYPE selects the doc chip
   *  over an image thumbnail; absent/other is treated as an image. */
  mediaType?: string;
  /** Object URL of the pasted file, for instant image preview (unused for PDFs). */
  previewUrl: string;
  status: 'uploading' | 'ready';
  ref?: AttachmentRef;
}

interface AttachmentPreviewStripProps {
  attachments: PendingAttachment[];
  onRemove: (localId: string) => void;
}

/** Thumbnail strip shown at the bottom of the request editor while composing. */
export default function AttachmentPreviewStrip({
  attachments,
  onRemove,
}: AttachmentPreviewStripProps): React.ReactElement | null {
  const { t } = useTranslation();

  if (attachments.length === 0) return null;

  const removeButton = (localId: string) => (
    <button
      type="button"
      className={styles.removeButton}
      onClick={() => onRemove(localId)}
      aria-label={t('conversation.request.removeAttachment')}
      title={t('conversation.request.removeAttachment')}
      data-testid="attachment-remove-button"
    >
      ×
    </button>
  );

  return (
    <div className={styles.strip} data-testid="attachment-preview-strip">
      {attachments.map(attachment =>
        attachment.mediaType === PDF_MEDIA_TYPE ? (
          // PDFs have no image preview — show a document chip instead.
          <div
            key={attachment.localId}
            className={`${styles.docChip} ${attachment.status === 'uploading' ? styles.uploading : ''}`}
            data-testid="attachment-doc-chip"
          >
            <Icon src={ICONS.DOCUMENT} size={20} className={styles.docIcon} />
            <span className={styles.docName} title={attachment.fileName}>
              {attachment.fileName}
            </span>
            {attachment.status === 'uploading' && (
              <div
                className={styles.spinner}
                data-testid="attachment-uploading-spinner"
              />
            )}
            {removeButton(attachment.localId)}
          </div>
        ) : (
          <div
            key={attachment.localId}
            className={`${styles.thumbWrapper} ${attachment.status === 'uploading' ? styles.uploading : ''}`}
            data-testid="attachment-thumbnail"
          >
            <ThumbImage
              src={attachment.previewUrl}
              alt={attachment.fileName}
              className={styles.thumb}
            />
            {attachment.status === 'uploading' && (
              <div
                className={styles.spinnerOverlay}
                data-testid="attachment-uploading-spinner"
              >
                <div className={styles.spinner} />
              </div>
            )}
            {removeButton(attachment.localId)}
          </div>
        )
      )}
    </div>
  );
}

interface ResolvedAttachmentThumbnailsProps {
  attachments: AttachmentRef[];
}

/**
 * Read-only thumbnails on resolved request cards (and conversations loaded
 * from history). Renders via short-lived presigned S3 GET URLs resolved
 * through the host's injected getAttachmentViewUrl service; without that
 * service nothing renders.
 */
export function ResolvedAttachmentThumbnails({
  attachments,
}: ResolvedAttachmentThumbnailsProps): React.ReactElement | null {
  const { getAccessTokenSilently, isAuthenticated } = useConversationAuth();
  const { getAttachmentViewUrl } = useConversationServices();
  const [urls, setUrls] = useState<Record<string, string>>({});

  const imageAttachments = attachments.filter(
    a => a.mediaType !== PDF_MEDIA_TYPE
  );
  const pdfAttachments = attachments.filter(
    a => a.mediaType === PDF_MEDIA_TYPE
  );

  useEffect(() => {
    if (
      !isAuthenticated ||
      imageAttachments.length === 0 ||
      !getAttachmentViewUrl
    )
      return;
    let cancelled = false;

    const load = async () => {
      try {
        const token = await getAccessTokenSilently();
        const entries = await Promise.all(
          imageAttachments.map(async attachment => {
            try {
              const url = await getAttachmentViewUrl(
                token,
                attachment.attachmentId
              );
              return [attachment.attachmentId, url] as const;
            } catch {
              return null;
            }
          })
        );
        if (!cancelled) {
          setUrls(
            Object.fromEntries(
              entries.filter((e): e is readonly [string, string] => e !== null)
            )
          );
        }
      } catch (err) {
        console.warn('Failed to load attachment URLs', err);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageAttachments.map(a => a.attachmentId).join(','),
    isAuthenticated,
    getAttachmentViewUrl,
  ]);

  if (attachments.length === 0) return null;

  const loadedImages = imageAttachments.filter(a => urls[a.attachmentId]);
  if (loadedImages.length === 0 && pdfAttachments.length === 0) return null;

  return (
    <div
      className={styles.resolvedStrip}
      data-testid="resolved-attachment-strip"
    >
      {loadedImages.map(attachment => (
        <ThumbImage
          key={attachment.attachmentId}
          src={urls[attachment.attachmentId]}
          alt=""
          className={styles.resolvedThumb}
          onClick={() =>
            window.open(urls[attachment.attachmentId], '_blank', 'noopener')
          }
          data-testid="resolved-attachment-thumbnail"
        />
      ))}
      {pdfAttachments.map(attachment => (
        // PDFs resolve their presigned URL lazily on click (no eager fetch).
        <AttachmentCard
          key={attachment.attachmentId}
          className={styles.resolvedDoc}
          filename={attachment.filename || 'document.pdf'}
          mediaType={attachment.mediaType}
          sizeBytes={attachment.sizeBytes}
          getDownloadUrl={
            getAttachmentViewUrl
              ? async () =>
                  getAttachmentViewUrl(
                    await getAccessTokenSilently(),
                    attachment.attachmentId
                  )
              : undefined
          }
          data-testid="resolved-attachment-doc"
        />
      ))}
    </div>
  );
}
