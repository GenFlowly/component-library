import pica from 'pica';

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
/**
 * The retrieval server refuses a decode that doesn't fit in the memory free at that moment,
 * which on its 1 GB VM can be under 40 MB: a 12 MP phone photo costs ~90 MB there, a 5 MP PNG
 * ~30 MB. 5 MP is about what Anthropic's high-resolution tier (2576 px long edge) uses anyway.
 */
export const MAX_IMAGE_UPLOAD_PIXELS = 5_000_000;
/** Anthropic rejects an image with an edge above 8000 px. */
const MAX_EDGE_PX = 8000;
/** PNG size of a downscaled photo per pixel, for the first guess at the output size. */
const PNG_BYTES_PER_PIXEL = 2.5;
/** Each retry undershoots the measured ratio a little so it lands under the limit. */
const RETRY_MARGIN = 0.95;
/** A PNG under this share of the limit is retried larger, for the detail the limit allows. */
const FILL_TARGET = 0.8;
const MAX_ATTEMPTS = 5;

let resizer: ReturnType<typeof pica> | undefined;

interface Decoded {
  source: HTMLImageElement | ImageBitmap;
  width: number;
  height: number;
}

/** EXIF orientation is applied: an <img> draws upright, which createImageBitmap doesn't promise everywhere. */
async function decodeNatively(file: File): Promise<Decoded | null> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    const { naturalWidth: width, naturalHeight: height } = image;
    return width > 0 && height > 0 ? { source: image, width, height } : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * HEIC/HEIF (iPhone photos) in browsers without a native decoder (Chrome, Firefox, Edge).
 * heic-to (libheif in WebAssembly, ~3 MB) is loaded only when such a file is attached, and
 * applies the HEIF rotation the way libheif does.
 */
async function decodeHeic(file: File): Promise<Decoded | null> {
  try {
    const { isHeic, heicTo } = await import('heic-to');
    if (!(await isHeic(file))) return null;
    const bitmap = await heicTo({ blob: file, type: 'bitmap' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    return null;
  }
}

function pngName(name: string): string {
  const base = name.replace(/\.[^./]*$/, '') || 'image';
  return `${base}.png`;
}

/**
 * The file to upload in place of `file`: every image this browser can decode
 * becomes an upright (EXIF/HEIF rotation applied), lossless PNG within
 * MAX_IMAGE_UPLOAD_BYTES and MAX_IMAGE_UPLOAD_PIXELS, so the retrieval server
 * never decodes a camera original on its small VM. A PNG already within both
 * (a screenshot) is returned as it is. PDFs, and anything this browser can't
 * decode even with heic-to (camera RAW, ...), are returned as-is for the
 * backend to convert. ConversationWidget calls it before uploadAttachment.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.type === 'application/pdf') return file;

  const decoded = (await decodeNatively(file)) ?? (await decodeHeic(file));
  if (!decoded) return file;
  try {
    return await toPng(file, decoded);
  } finally {
    if ('close' in decoded.source) decoded.source.close();
  }
}

async function toPng(
  file: File,
  { source, width, height }: Decoded
): Promise<File> {
  if (
    file.type === 'image/png' &&
    file.size <= MAX_IMAGE_UPLOAD_BYTES &&
    width * height <= MAX_IMAGE_UPLOAD_PIXELS
  ) {
    return file;
  }
  resizer ??= pica();
  const maxScale = Math.min(
    1,
    MAX_EDGE_PX / Math.max(width, height),
    Math.sqrt(MAX_IMAGE_UPLOAD_PIXELS / (width * height))
  );
  let scale = Math.min(
    maxScale,
    Math.sqrt(MAX_IMAGE_UPLOAD_BYTES / (width * height * PNG_BYTES_PER_PIXEL))
  );
  let best: Blob | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width * scale));
    canvas.height = Math.max(1, Math.floor(height * scale));
    await resizer.resize(source, canvas);
    const blob = await resizer.toBlob(canvas, 'image/png');
    if (blob.size <= MAX_IMAGE_UPLOAD_BYTES) {
      best = blob;
      if (
        scale >= maxScale ||
        blob.size >= MAX_IMAGE_UPLOAD_BYTES * FILL_TARGET
      )
        break;
    } else if (best) {
      break;
    }
    scale = Math.min(
      maxScale,
      scale * Math.sqrt(MAX_IMAGE_UPLOAD_BYTES / blob.size) * RETRY_MARGIN
    );
  }
  if (!best) return file;
  return new File([best], pngName(file.name || 'pasted-image'), {
    type: 'image/png',
    lastModified: file.lastModified,
  });
}
