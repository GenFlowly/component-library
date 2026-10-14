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
 * Image extensions Android maps to an image/* type: HEIC/HEIF, AVIF, TIFF,
 * BMP, and the camera RAW formats phones and most cameras write (DNG incl.
 * phone ProRAW, Canon, Nikon, Sony, Fujifilm, Olympus, Panasonic, Pentax,
 * Samsung, Epson). Browsers/OSes often report them with a blank or generic
 * MIME type.
 */
const PICKER_IMAGE_EXTENSIONS = [
  '.heic',
  '.heif',
  '.avif',
  '.tif',
  '.tiff',
  '.bmp',
  '.dng',
  '.cr2',
  '.crw',
  '.nef',
  '.nrw',
  '.arw',
  '.raf',
  '.orf',
  '.rw2',
  '.pef',
  '.srw',
  '.erf',
];

/**
 * Further camera RAW extensions (Canon CR3, older Sony, Leica, Sigma,
 * Hasselblad, Phase One, Minolta, Kodak) that are recognised on paste but
 * kept out of the picker filter: Chrome on Android turns an extension it
 * can't map to image/* into application/octet-stream and then shows a
 * generic all-files chooser instead of the photo picker. Ambiguous ones
 * (.raw, .dcr, .mos — also audio, Shockwave, ... files) are left out.
 */
const OTHER_RAW_EXTENSIONS = [
  '.cr3',
  '.srf',
  '.sr2',
  '.rwl',
  '.x3f',
  '.3fr',
  '.fff',
  '.iiq',
  '.mrw',
  '.kdc',
];

const IMAGE_FILE_EXTENSIONS = [
  ...PICKER_IMAGE_EXTENSIONS,
  ...OTHER_RAW_EXTENSIONS,
];

/**
 * File-picker filter: every image type the browser recognises plus the
 * extensions above that Android maps to image types (so the photo picker
 * stays), and CR3 by MIME type. Only a picker hint — no type or size check is
 * applied to attachments; the backend converts/compresses each image (the
 * camera RAW formats it reads with LibRaw) for the vendors.
 */
export const ATTACHMENT_FILE_INPUT_ACCEPT = [
  'image/*',
  ...PICKER_IMAGE_EXTENSIONS,
  'image/x-canon-cr3',
].join(',');

/**
 * Whether a clipboard file is an image: an image/* MIME type, or a blank or
 * generic (application/octet-stream) type with a known image extension.
 * Tells image pastes apart from other files.
 */
export function isImageFile(type: string, fileName: string): boolean {
  if (type.startsWith('image/')) return true;
  if (type !== '' && type !== 'application/octet-stream') return false;
  const name = fileName.toLowerCase();
  return IMAGE_FILE_EXTENSIONS.some(ext => name.endsWith(ext));
}
