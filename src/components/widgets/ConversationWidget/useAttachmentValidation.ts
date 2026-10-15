import React from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from './ConversationWidgetContext';
import {
  SUPPORTED_DOCUMENT_FORMATS,
  SUPPORTED_IMAGE_FORMATS,
  classifyAttachment,
} from './attachmentFormat';

/** Long enough to read the list of supported formats. */
export const UNSUPPORTED_FORMAT_TOAST_MS = 8000;

/** A file accepted for attaching, with what it is to the backend. */
export interface ClassifiedAttachment {
  file: File;
  kind: 'image' | 'pdf';
}

export interface AttachmentClassifierOptions {
  /**
   * Accept PDF documents. Off: PDFs are turned down like any other
   * unsupported format (the backend reads PDFs only once the host enables
   * them).
   */
  allowPdf?: boolean;
}

/**
 * Format check for files about to be attached: resolves to the ones the
 * backend can use (images, and PDFs when `allowPdf`), in their original
 * order and tagged with their kind, and shows one toast naming the others
 * and listing the supported formats. Sizes and counts are the caller's
 * concern.
 */
export function useAttachmentClassifier({
  allowPdf = false,
}: AttachmentClassifierOptions = {}): (
  files: File[]
) => Promise<ClassifiedAttachment[]> {
  const { t } = useTranslation();
  const { showToast } = useToast();

  return React.useCallback(
    async (files: File[]) => {
      const kinds = await Promise.all(files.map(classifyAttachment));
      const accepted: ClassifiedAttachment[] = [];
      const rejected: File[] = [];
      files.forEach((file, i) => {
        const kind = kinds[i];
        if (kind === 'image' || (kind === 'pdf' && allowPdf)) {
          accepted.push({ file, kind });
        } else {
          rejected.push(file);
        }
      });
      if (rejected.length > 0) {
        const name = (file: File) =>
          file.name || t('conversation.request.pastedFile');
        // With PDFs enabled the message names both kinds
        const suffix = allowPdf ? 'WithPdf' : '';
        const formats = SUPPORTED_IMAGE_FORMATS.join(', ');
        const documents = SUPPORTED_DOCUMENT_FORMATS.join(', ');
        showToast(
          rejected.length === 1
            ? t(`conversation.request.attachmentFormatUnsupported${suffix}`, {
                name: name(rejected[0]),
                formats,
                documents,
              })
            : t(`conversation.request.attachmentFormatsUnsupported${suffix}`, {
                count: rejected.length,
                names: rejected.map(name).join(', '),
                formats,
                documents,
              }),
          UNSUPPORTED_FORMAT_TOAST_MS
        );
      }
      return accepted;
    },
    [allowPdf, showToast, t]
  );
}

/**
 * Validation for image files about to be attached: resolves to the ones in
 * an image format the backend can use, in their original order, and shows
 * one toast naming the others and listing the supported formats. (The
 * composer uses useAttachmentClassifier, which can also accept PDFs.)
 */
export function useAttachmentValidation(): (files: File[]) => Promise<File[]> {
  const classify = useAttachmentClassifier({ allowPdf: false });
  return React.useCallback(
    async (files: File[]) => (await classify(files)).map(({ file }) => file),
    [classify]
  );
}
