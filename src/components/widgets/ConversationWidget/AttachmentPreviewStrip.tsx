import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '../../../constants/icons';
import { Icon } from '../../common/Icon/Icon';
import AttachmentCard, {
  formatBytes,
} from '../../common/AttachmentCard/AttachmentCard';
import {
  AttachmentRef,
  PDF_MEDIA_TYPE,
  isPdfAttachment,
} from './attachment.models';
import {
  useConversation,
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

/** A file being attached in the editor: uploads to S3 in the background after it is added. */
export interface PendingAttachment {
  localId: string;
  fileName: string;
  /** Object URL of the local file, for instant preview */
  previewUrl: string;
  status: 'uploading' | 'ready';
  ref?: AttachmentRef;
  /**
   * What the file is to the backend. PDFs render as a document chip (name,
   * PDF badge, size), never as an <img>. Absent = image.
   */
  kind?: 'image' | 'pdf';
  /** Size of the local file in bytes (shown on document chips). */
  sizeBytes?: number;
}

interface AttachmentPreviewStripProps {
  attachments: PendingAttachment[];
  onRemove: (localId: string) => void;
}

/** Composer chip for a PDF being attached: icon, name, PDF badge and size. */
function PdfChip({
  attachment,
  onRemove,
}: {
  attachment: PendingAttachment;
  onRemove: (localId: string) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const uploading = attachment.status === 'uploading';
  const size = formatBytes(attachment.sizeBytes);
  return (
    <div
      className={`${styles.docChip} ${uploading ? styles.uploading : ''}`}
      title={attachment.fileName}
      data-testid="attachment-pdf-chip"
    >
      <Icon src={ICONS.DOCUMENT} size={22} className={styles.docIcon} />
      <span className={styles.docDetails}>
        <span className={styles.docName}>{attachment.fileName}</span>
        <span className={styles.docMeta}>
          <span className={styles.docBadge}>PDF</span>
          {size && <span data-testid="attachment-pdf-size">{size}</span>}
        </span>
      </span>
      {uploading && (
        <div
          className={styles.docSpinner}
          data-testid="attachment-uploading-spinner"
        >
          <div className={styles.spinner} />
        </div>
      )}
      <button
        type="button"
        className={`${styles.removeButton} ${styles.docRemove}`}
        onClick={() => onRemove(attachment.localId)}
        aria-label={t('conversation.request.removeAttachment')}
        title={t('conversation.request.removeAttachment')}
        data-testid="attachment-remove-button"
      >
        ×
      </button>
    </div>
  );
}

/** Thumbnail/chip strip shown at the bottom of the request editor while composing. */
export default function AttachmentPreviewStrip({
  attachments,
  onRemove,
}: AttachmentPreviewStripProps): React.ReactElement | null {
  const { t } = useTranslation();

  if (attachments.length === 0) return null;

  return (
    <div className={styles.strip} data-testid="attachment-preview-strip">
      {attachments.map(attachment =>
        attachment.kind === 'pdf' ? (
          <PdfChip
            key={attachment.localId}
            attachment={attachment}
            onRemove={onRemove}
          />
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
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => onRemove(attachment.localId)}
              aria-label={t('conversation.request.removeAttachment')}
              title={t('conversation.request.removeAttachment')}
              data-testid="attachment-remove-button"
            >
              ×
            </button>
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
 * Read-only attachments on resolved request cards (and conversations loaded
 * from history): image thumbnails and PDF document cards. Images render via
 * short-lived presigned S3 GET URLs resolved up front through the host's
 * injected getAttachmentViewUrl service; a PDF card resolves its URL only
 * when clicked. URLs are scoped to the loaded conversation, so a shared
 * conversation shows every participant's files. Without the service, images
 * don't render and PDF cards are shown but can't be opened.
 */
export function ResolvedAttachmentThumbnails({
  attachments,
}: ResolvedAttachmentThumbnailsProps): React.ReactElement | null {
  const { getAccessTokenSilently, isAuthenticated } = useConversationAuth();
  const { getAttachmentViewUrl } = useConversationServices();
  const { conversationId } = useConversation();
  const [urls, setUrls] = useState<Record<string, string>>({});

  const documents = attachments.filter(isPdfAttachment);
  const images = attachments.filter(a => !isPdfAttachment(a));
  const imageIds = images.map(a => a.attachmentId).join(',');

  useEffect(() => {
    if (!isAuthenticated || images.length === 0 || !getAttachmentViewUrl)
      return;
    let cancelled = false;

    const load = async () => {
      try {
        const token = await getAccessTokenSilently();
        const entries = await Promise.all(
          images.map(async attachment => {
            try {
              const url = await getAttachmentViewUrl(
                token,
                attachment.attachmentId,
                conversationId || undefined
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
    // `images` is derived from `attachments` each render; imageIds is its key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIds, isAuthenticated, getAttachmentViewUrl, conversationId]);

  const loaded = images.filter(a => urls[a.attachmentId]);
  if (loaded.length === 0 && documents.length === 0) return null;

  const canOpenDocuments = isAuthenticated && !!getAttachmentViewUrl;

  return (
    <div
      className={styles.resolvedStrip}
      data-testid="resolved-attachment-strip"
    >
      {documents.map(document => (
        <AttachmentCard
          key={document.attachmentId}
          filename={document.filename || 'document.pdf'}
          mediaType={PDF_MEDIA_TYPE}
          sizeBytes={document.sizeBytes}
          pageCount={document.pageCount}
          getDownloadUrl={
            canOpenDocuments
              ? async () =>
                  getAttachmentViewUrl!(
                    await getAccessTokenSilently(),
                    document.attachmentId,
                    conversationId || undefined
                  )
              : undefined
          }
          data-testid="resolved-attachment-pdf"
        />
      ))}
      {loaded.map(attachment => (
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
    </div>
  );
}
