import React from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from './ConversationWidgetContext';
import {
  SUPPORTED_IMAGE_FORMATS,
  checkAttachmentFormat,
} from './attachmentFormat';
import { MAX_PDF_SIZE_BYTES, isPdfFile } from './attachment.models';

/** Long enough to read the list of supported formats. */
export const UNSUPPORTED_FORMAT_TOAST_MS = 8000;

type FileVerdict = 'supported' | 'unsupported' | 'pdf_too_large';

/**
 * Validation for files about to be attached: resolves to the ones the backend
 * can use (images in a supported format, PDFs within the size cap), in their
 * original order. Shows one toast naming unsupported image formats, and a
 * separate toast if any PDF is over the size limit. PDFs skip the image
 * byte-check (they're fed to the model natively, as page images, or as text).
 */
export function useAttachmentValidation(): (files: File[]) => Promise<File[]> {
  const { t } = useTranslation();
  const { showToast } = useToast();

  return React.useCallback(
    async (files: File[]) => {
      const verdicts: FileVerdict[] = await Promise.all(
        files.map(async (file): Promise<FileVerdict> => {
          if (isPdfFile(file.type, file.name)) {
            return file.size > MAX_PDF_SIZE_BYTES
              ? 'pdf_too_large'
              : 'supported';
          }
          return checkAttachmentFormat(file);
        })
      );

      const rejected = files.filter((_, i) => verdicts[i] === 'unsupported');
      if (rejected.length > 0) {
        const formats = SUPPORTED_IMAGE_FORMATS.join(', ');
        const name = (file: File) =>
          file.name || t('conversation.request.pastedFile');
        showToast(
          rejected.length === 1
            ? t('conversation.request.attachmentFormatUnsupported', {
                name: name(rejected[0]),
                formats,
              })
            : t('conversation.request.attachmentFormatsUnsupported', {
                count: rejected.length,
                names: rejected.map(name).join(', '),
                formats,
              }),
          UNSUPPORTED_FORMAT_TOAST_MS
        );
      }

      if (verdicts.some(v => v === 'pdf_too_large')) {
        showToast(t('conversation.request.attachmentPdfTooLarge'));
      }

      return files.filter((_, i) => verdicts[i] === 'supported');
    },
    [showToast, t]
  );
}
