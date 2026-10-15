import React from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from './ConversationWidgetContext';
import {
  SUPPORTED_IMAGE_FORMATS,
  checkAttachmentFormat,
} from './attachmentFormat';

/** Long enough to read the list of supported formats. */
export const UNSUPPORTED_FORMAT_TOAST_MS = 8000;

/**
 * Validation for files about to be attached: resolves to the ones in an
 * image format the backend can use, in their original order, and shows one
 * toast naming the others and listing the supported formats.
 */
export function useAttachmentValidation(): (files: File[]) => Promise<File[]> {
  const { t } = useTranslation();
  const { showToast } = useToast();

  return React.useCallback(
    async (files: File[]) => {
      const verdicts = await Promise.all(files.map(checkAttachmentFormat));
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
      return files.filter((_, i) => verdicts[i] === 'supported');
    },
    [showToast, t]
  );
}
