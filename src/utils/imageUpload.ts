import pica from 'pica';

/**
 * The retrieval server sends a PNG this size to the model without decoding it
 * (4 MiB of base64, within every vendor's per-image limit, for up to 6 images
 * in an Anthropic request). Anything larger it has to decode and shrink, which
 * its small VM often hasn't the memory for.
 */
export const MAX_IMAGE_UPLOAD_BYTES = 3 * 1024 * 1024;
/** About what Anthropic's high-resolution tier (2576 px long edge) uses; more pixels only add bytes. */
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
 * The file to upload in place of `file`: every image this browser can decode,
 * whatever its format and size, is re-encoded as an upright (EXIF/HEIF
 * rotation applied), lossless PNG within MAX_IMAGE_UPLOAD_BYTES and
 * MAX_IMAGE_UPLOAD_PIXELS, so the retrieval server never has to decode it.
 * PDFs, and anything this browser can't decode even with heic-to (camera
 * RAW, ...), are returned as-is for the backend to convert. ConversationWidget
 * calls it before uploadAttachment.
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
  resizer ??= pica();
  const maxScale = Math.min(
    1,
    MAX_EDGE_PX / Math.max(width, height),
    Math.sqrt(MAX_IMAGE_UPLOAD_PIXELS / (width * height))
  );
  // A PNG already within the limit (a screenshot) re-encodes to about its own
  // size; the per-pixel estimate is for photos and would shrink it needlessly.
  let scale =
    file.type === 'image/png' && file.size <= MAX_IMAGE_UPLOAD_BYTES
      ? maxScale
      : Math.min(
          maxScale,
          Math.sqrt(
            MAX_IMAGE_UPLOAD_BYTES / (width * height * PNG_BYTES_PER_PIXEL)
          )
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
