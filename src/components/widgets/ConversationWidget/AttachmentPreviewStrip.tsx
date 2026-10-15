import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '../../../constants/icons';
import { Icon } from '../../common/Icon/Icon';
import { AttachmentRef } from './attachment.models';
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

/** An image being attached in the editor: uploads to S3 in the background after paste. */
export interface PendingAttachment {
  localId: string;
  fileName: string;
  /** Object URL of the pasted file, for instant preview */
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

  return (
    <div className={styles.strip} data-testid="attachment-preview-strip">
      {attachments.map(attachment => (
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
      ))}
    </div>
  );
}

interface ResolvedAttachmentThumbnailsProps {
  attachments: AttachmentRef[];
}

/**
 * Read-only thumbnails on resolved request cards (and conversations loaded
 * from history). Renders via short-lived presigned S3 GET URLs resolved
 * through the host's injected getAttachmentViewUrl service, scoped to the
 * loaded conversation (so a shared conversation shows every participant's
 * images); without that service nothing renders.
 */
export function ResolvedAttachmentThumbnails({
  attachments,
}: ResolvedAttachmentThumbnailsProps): React.ReactElement | null {
  const { getAccessTokenSilently, isAuthenticated } = useConversationAuth();
  const { getAttachmentViewUrl } = useConversationServices();
  const { conversationId } = useConversation();
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated || attachments.length === 0 || !getAttachmentViewUrl)
      return;
    let cancelled = false;

    const load = async () => {
      try {
        const token = await getAccessTokenSilently();
        const entries = await Promise.all(
          attachments.map(async attachment => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    attachments.map(a => a.attachmentId).join(','),
    isAuthenticated,
    getAttachmentViewUrl,
    conversationId,
  ]);

  if (attachments.length === 0) return null;

  const loaded = attachments.filter(a => urls[a.attachmentId]);
  if (loaded.length === 0) return null;

  return (
    <div
      className={styles.resolvedStrip}
      data-testid="resolved-attachment-strip"
    >
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
