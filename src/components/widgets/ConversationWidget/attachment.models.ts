/** Reference to a file in the attachments S3 bucket. Mirrors the backend AttachmentRef. */
export interface AttachmentRef {
  attachmentId: string;
  /** Storage key. Not relayed for generated artifacts (the "ga" chunk drops it); never needed by the UI. */
  s3Key: string;
  mediaType: string;
  /**
   * Display name for downloads. Set for generated artifacts (e.g. PDFs) and,
   * on newer records, for uploads (the name the file was uploaded with).
   */
  filename?: string;
  /** File size in bytes, when known (generated artifacts; newer uploads). */
  sizeBytes?: number;
  /** Page count of a PDF, when known (generated PDFs). Shown on the attachment card. */
  pageCount?: number;
}

export interface CreateAttachmentUploadResponse {
  attachmentId: string;
  s3Key: string;
  mediaType: string;
  uploadUrl: string;
  /**
   * Headers the presigned PUT was signed with (e.g. x-amz-tagging for the
   * retention tag on uploads that are not linked to a message yet). The
   * client must send every entry on the PUT, or S3 rejects the signature.
   */
  requiredHeaders?: Record<string, string>;
}

export interface GetAttachmentUrlResponse {
  attachmentId: string;
  url: string;
}

/**
 * @deprecated Not used: the composer accepts every format the backend can
 * convert for the LLM vendors (see SUPPORTED_IMAGE_FORMATS and
 * checkAttachmentFormat in attachmentFormat.ts).
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

/** Media type of PDF documents, which the model reads as documents (not images). */
export const PDF_MEDIA_TYPE = 'application/pdf';

/** Largest PDF the backend accepts as model input (10 MB per PDF). */
export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

/** Most PDFs one message may carry (they count toward MAX_ATTACHMENTS_PER_MESSAGE too). */
export const MAX_PDFS_PER_MESSAGE = 5;

/**
 * Per-media-type size limits checked before uploading. Types not listed
 * (images) have none: the backend compresses images for the vendors.
 */
export const ATTACHMENT_SIZE_LIMITS: Readonly<Record<string, number>> = {
  [PDF_MEDIA_TYPE]: MAX_PDF_SIZE_BYTES,
};

/**
 * Image extensions every Android version Chrome supports maps to an image/*
 * type: HEIC/HEIF, TIFF, BMP, and the camera RAW formats phones and most
 * cameras write (DNG incl. phone ProRAW, Canon, Nikon, Sony, Fujifilm,
 * Olympus, Panasonic, Pentax, Samsung, Epson). Browsers/OSes often report
 * them with a blank or generic MIME type.
 */
const PICKER_IMAGE_EXTENSIONS = [
  '.heic',
  '.heif',
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
  '.avif',
  ...OTHER_RAW_EXTENSIONS,
];

/**
 * File-picker filter: every image type the browser recognises, the
 * extensions Android maps to image types (so its photo picker stays), and
 * AVIF and CR3 by MIME type (Android 11 and older have no .avif mapping;
 * none has .cr3). Chrome passes MIME types through as they are. On stock
 * Android a local CR3 isn't a media file, so only a provider that types it
 * image/x-canon-cr3 (e.g. a cloud photo app) offers it; iOS offers every
 * camera RAW under image/*. Only a picker hint: picked files are checked
 * with useAttachmentValidation (formats, by their bytes); there is no size
 * check, and the backend converts/compresses each image (the camera RAW
 * formats it reads with LibRaw) for the vendors.
 */
export const ATTACHMENT_FILE_INPUT_ACCEPT = [
  'image/*',
  ...PICKER_IMAGE_EXTENSIONS,
  'image/avif',
  'image/x-canon-cr3',
].join(',');

/**
 * File-picker filter when PDF attachments are enabled: the image filter plus
 * PDFs. (On Android this trades the photo picker for the system file
 * chooser, which still offers photos.)
 */
export const ATTACHMENT_FILE_INPUT_ACCEPT_WITH_PDF = [
  ATTACHMENT_FILE_INPUT_ACCEPT,
  PDF_MEDIA_TYPE,
  '.pdf',
].join(',');

/**
 * Whether a clipboard/dropped file is declared as a PDF: the PDF media type,
 * or a blank or generic type with a .pdf name. (The bytes decide in the
 * end; see classifyAttachment.)
 */
export function isPdfFile(type: string, fileName: string): boolean {
  const mediaType = type.split(';')[0].trim().toLowerCase();
  if (mediaType === PDF_MEDIA_TYPE) return true;
  if (mediaType !== '' && mediaType !== 'application/octet-stream') {
    return false;
  }
  return fileName.toLowerCase().endsWith('.pdf');
}

/**
 * Whether a stored attachment is a PDF document — rendered as a document
 * card, never as an <img>. Goes by the media type; uploads stored before the
 * backend kept application/pdf (untyped octet-stream) go by the name.
 */
export function isPdfAttachment(
  ref: Pick<AttachmentRef, 'mediaType' | 'filename'>
): boolean {
  return isPdfFile(ref.mediaType ?? '', ref.filename ?? '');
}

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
