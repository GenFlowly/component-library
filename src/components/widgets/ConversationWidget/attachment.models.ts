/** Reference to a file in the attachments S3 bucket. Mirrors the backend AttachmentRef. */
export interface AttachmentRef {
  attachmentId: string;
  s3Key: string;
  mediaType: string;
  /** Display name for downloads. Set for generated artifacts (e.g. PDFs); absent on uploaded images. */
  filename?: string;
  /** File size in bytes. Only present on artifacts streamed via the "ga" chunk. */
  sizeBytes?: number;
}

export interface CreateAttachmentUploadResponse {
  attachmentId: string;
  s3Key: string;
  mediaType: string;
  uploadUrl: string;
}

export interface GetAttachmentUrlResponse {
  attachmentId: string;
  url: string;
}

/**
 * @deprecated No longer enforced: the composer accepts any image type, and the
 * backend converts each image to a format every LLM vendor supports.
 */
export const ALLOWED_ATTACHMENT_MEDIA_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

/**
 * @deprecated No longer enforced: there is no upload size limit, and the
 * backend compresses each image to fit the vendors' per-image limits.
 */
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

/**
 * Image extensions some browsers/OSes report with a blank MIME type (HEIC/HEIF
 * from iPhones on Chrome/Firefox, AVIF, TIFF, BMP on some platforms).
 */
const IMAGE_FILE_EXTENSIONS = [
  '.heic',
  '.heif',
  '.avif',
  '.tif',
  '.tiff',
  '.bmp',
];

/**
 * File-picker filter: every image type the browser recognises plus the
 * extensions above. Only a picker hint — no type or size check is applied to
 * attachments; the backend converts/compresses each image for the vendors.
 */
export const ATTACHMENT_FILE_INPUT_ACCEPT = [
  'image/*',
  ...IMAGE_FILE_EXTENSIONS,
].join(',');

/**
 * Whether a clipboard file is an image: an image/* MIME type, or a blank type
 * with a known image extension. Tells image pastes apart from other files.
 */
export function isImageFile(type: string, fileName: string): boolean {
  if (type.startsWith('image/')) return true;
  const name = fileName.toLowerCase();
  return type === '' && IMAGE_FILE_EXTENSIONS.some(ext => name.endsWith(ext));
}
