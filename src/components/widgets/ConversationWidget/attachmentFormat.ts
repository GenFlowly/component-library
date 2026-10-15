/**
 * Which image formats can be attached, decided on the client before
 * uploading, to match what the backend can convert for the LLM vendors
 * (genai-proxy-service retrieval-server: graph/image_normalize.py and
 * graph/raw_decode.py). The backend still has the final say; this only
 * spares users an upload that is bound to fail.
 */

/** Formats the backend accepts, for messages (e.g. the unsupported-format toast). */
export const SUPPORTED_IMAGE_FORMATS: readonly string[] = [
  'JPEG',
  'PNG',
  'GIF',
  'WebP',
  'HEIC/HEIF',
  'AVIF',
  'TIFF',
  'BMP',
  'PSD',
  'JPEG 2000',
  'TGA',
  'PPM',
  'QOI',
  'camera RAW (DNG, CR2, CR3, NEF, ARW, RAF, ORF, RW2, PEF, SRW, X3F, …)',
];

/** Extensions of the formats above, for files whose bytes can't be read. */
const SUPPORTED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.jpe',
  '.jfif',
  '.png',
  '.apng',
  '.gif',
  '.webp',
  '.heic',
  '.heif',
  '.avif',
  '.tif',
  '.tiff',
  '.bmp',
  '.dib',
  '.psd',
  '.jp2',
  '.j2k',
  '.jpf',
  '.jpx',
  '.tga',
  '.ppm',
  '.pgm',
  '.pbm',
  '.pnm',
  '.qoi',
  '.dng',
  '.cr2',
  '.cr3',
  '.crw',
  '.nef',
  '.nrw',
  '.arw',
  '.srf',
  '.sr2',
  '.raf',
  '.orf',
  '.rw2',
  '.rwl',
  '.pef',
  '.srw',
  '.erf',
  '.x3f',
  '.3fr',
  '.fff',
  '.iiq',
  '.mrw',
  '.kdc',
];

/** image/* types the backend can't use (vector, icons, JPEG XL, editor files). */
const UNSUPPORTED_IMAGE_TYPES = [
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/icns',
  'image/x-icns',
  'image/jxl',
  'image/x-xcf',
  'image/x-exr',
  'image/vnd.radiance',
  'image/x-eps',
  'image/vnd.adobe.photoshop.large',
  'image/vnd.ms-photo', // JPEG XR (Windows HDR screenshots)
  'image/jxr',
  'image/x-emf',
  'image/emf',
  'image/x-wmf',
  'image/wmf',
  'image/x-pcx',
  'image/vnd.zbrush.pcx',
  'image/sgi',
  'image/x-sgi',
  'image/x-xbitmap',
  'image/x-xpixmap',
  'image/x-pict',
  'image/x-portable-arbitrarymap',
  'image/x-cmu-raster',
  'image/x-sun-raster',
  'image/vnd.wap.wbmp',
  'image/x-jng',
];

/** ISO-BMFF brands (bytes 8-11): HEIF/HEIC, AVIF, Canon CR3. */
const IMAGE_BRANDS = [
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
  'avif',
  'avis',
  'crx ',
];
/** ISO-BMFF brands of videos and audio (incl. Live Photo movies). */
const MEDIA_BRANDS = [
  'qt  ',
  'isom',
  'iso2',
  'iso4',
  'iso5',
  'iso6',
  'mp41',
  'mp42',
  'mp4v',
  'M4V ',
  'M4A ',
  'M4B ',
  'f4v ',
  '3gp4',
  '3gp5',
  '3gp6',
  '3g2a',
  'avc1',
  'dash',
];

export type AttachmentFormatVerdict = 'supported' | 'unsupported';

const HEAD_BYTES = 512;

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...Array.from(bytes.subarray(start, end)));
}

function startsWith(bytes: Uint8Array, prefix: number[] | string, at = 0) {
  const expected =
    typeof prefix === 'string'
      ? Array.from(prefix, c => c.charCodeAt(0))
      : prefix;
  return (
    bytes.length >= at + expected.length &&
    expected.every((b, i) => bytes[at + i] === b)
  );
}

/**
 * The verdict from a file's first bytes, or null when they match no known
 * format (the caller then goes by the declared type and the name).
 */
export function sniffImageFormat(
  bytes: Uint8Array
): AttachmentFormatVerdict | null {
  const supported: (number[] | string)[] = [
    [0xff, 0xd8, 0xff], // JPEG
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
    'GIF87a',
    'GIF89a',
    'II*\0', // TIFF, and TIFF-based RAW: DNG, CR2, NEF, ARW, PEF, SRW, ...
    'MM\0*',
    'II+\0', // BigTIFF
    'MM\0+',
    'IIRO', // Olympus ORF
    'IIRS',
    'MMOR',
    'IIU\0', // Panasonic RW2, Leica RWL
    'FUJIFILMCCD-RAW', // RAF
    'FOVb', // Sigma X3F
    '\0MRM', // Minolta MRW
    'IIII', // Phase One / Leaf IIQ
    'MMMM',
    'qoif',
    [0x00, 0x00, 0x00, 0x0c, 0x6a, 0x50, 0x20, 0x20, 0x0d, 0x0a, 0x87, 0x0a], // JPEG 2000 (JP2)
    [0xff, 0x4f, 0xff, 0x51], // JPEG 2000 codestream
  ];
  const unsupported: (number[] | string)[] = [
    '%PDF',
    '%!PS', // PostScript / EPS
    [0xc5, 0xd0, 0xd3, 0xc6], // EPS with a preview
    'icns',
    'DDS ',
    'SIMPLE  =', // FITS
    'BLP1',
    'BLP2',
    'gimp xcf',
    [0xff, 0x0a], // JPEG XL codestream
    [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20], // JPEG XL container
    [0x76, 0x2f, 0x31, 0x01], // OpenEXR
    '#?RADIANCE',
    '#?RGBE',
    'PK\x03\x04', // ZIP: documents, editor projects (.kra, .sketch, ...)
    [0x1a, 0x45, 0xdf, 0xa3], // Matroska / WebM video
    'OggS',
    'ID3', // MP3
    [0x1f, 0x8b], // gzip
    'Rar!',
    [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], // 7z
    'II\xbc', // JPEG XR
    [0xd7, 0xcd, 0xc6, 0x9a], // WMF (placeable)
    [0x01, 0xda], // SGI
    [0x59, 0xa6, 0x6a, 0x95], // Sun raster
    '\x8aMNG',
    '\x8bJNG',
    'P7\n', // PAM
    '/* XPM */',
    '#define', // XBM
  ];

  // Text formats (SVG, HTML, XML, ...) may start with a BOM or whitespace.
  let text = 0;
  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) text = 3;
  while (
    text < bytes.length &&
    ' \t\r\n'.includes(String.fromCharCode(bytes[text]))
  )
    text++;
  // ("<" then a letter, "?" or "!": a binary "<", such as a TGA with a
  // 60-byte ID field, is not markup)
  if (
    (bytes[text] === 0x3c /* < */ &&
      /[A-Za-z?!]/.test(String.fromCharCode(bytes[text + 1] ?? 0))) ||
    startsWith(bytes, '%PDF', text)
  )
    return 'unsupported';

  if (supported.some(signature => startsWith(bytes, signature)))
    return 'supported';
  if (unsupported.some(signature => startsWith(bytes, signature)))
    return 'unsupported';
  // ICO / CUR: 00 00 01|02 00, then an image count of at least 1 (an
  // uncompressed TGA without ID field or colour map starts 00 00 02 00 too,
  // with 00 00 next)
  if (
    (startsWith(bytes, [0, 0, 1, 0]) || startsWith(bytes, [0, 0, 2, 0])) &&
    (bytes[4] | (bytes[5] << 8)) > 0
  )
    return 'unsupported';
  // EMF: a record of type 1, then " EMF" at offset 40
  if (startsWith(bytes, [1, 0, 0, 0]) && startsWith(bytes, ' EMF', 40))
    return 'unsupported';
  // Canon CRW: byte order, then "HEAPCCDR" at offset 6
  if (
    (startsWith(bytes, 'II') || startsWith(bytes, 'MM')) &&
    startsWith(bytes, 'HEAPCCDR', 6)
  )
    return 'supported';
  if (startsWith(bytes, 'RIFF')) {
    const form = ascii(bytes, 8, 12);
    if (form === 'WEBP') return 'supported';
    if (form === 'AVI ' || form === 'WAVE') return 'unsupported';
  }
  if (startsWith(bytes, '8BPS')) {
    // Photoshop: version 1 is PSD; version 2 (PSB, "large document") isn't read
    return bytes[5] === 1 ? 'supported' : 'unsupported';
  }
  // BMP: "BM", then a DIB header whose size is one of the known versions
  const dibHeaderSize = bytes[14] | (bytes[15] << 8);
  if (
    startsWith(bytes, 'BM') &&
    [12, 40, 52, 56, 64, 108, 124].includes(dibHeaderSize) &&
    bytes[16] === 0 &&
    bytes[17] === 0
  )
    return 'supported';
  // Netpbm (P1-P6) or grayscale PFM ("Pf"; colour "PF" isn't read),
  // followed by whitespace
  if (
    bytes[0] === 0x50 &&
    ((bytes[1] >= 0x31 && bytes[1] <= 0x36) || bytes[1] === 0x66) &&
    ' \t\r\n'.includes(String.fromCharCode(bytes[2] ?? 0))
  )
    return 'supported';
  if (ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12);
    if (IMAGE_BRANDS.includes(brand)) return 'supported';
    if (MEDIA_BRANDS.includes(brand)) return 'unsupported';
  }
  return null;
}

/**
 * The verdict from a file's declared type and name alone: an image/* type
 * (other than the known unusable ones) or a supported image extension.
 */
export function imageFormatFromTypeAndName(
  type: string,
  fileName: string
): AttachmentFormatVerdict {
  const mediaType = type.split(';')[0].trim().toLowerCase();
  if (UNSUPPORTED_IMAGE_TYPES.includes(mediaType)) return 'unsupported';
  if (mediaType.startsWith('image/')) return 'supported';
  const name = fileName.toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.some(ext => name.endsWith(ext))
    ? 'supported'
    : 'unsupported';
}

/**
 * Whether a file is an image format the backend can use: from its first
 * bytes when they are recognisable (whatever its name or declared type —
 * browsers often report none for HEIC or camera RAW), else from its
 * declared type and name.
 */
export async function checkAttachmentFormat(
  file: File
): Promise<AttachmentFormatVerdict> {
  if (file.size === 0) return 'unsupported';
  try {
    const verdict = sniffImageFormat(await readHead(file));
    if (verdict) return verdict;
  } catch {
    // unreadable (e.g. a cloud file not available offline): go by type/name
  }
  return imageFormatFromTypeAndName(file.type, file.name);
}

/** The first HEAD_BYTES of a file (FileReader where Blob.arrayBuffer is missing). */
function readHead(file: File): Promise<Uint8Array> {
  const head = file.slice(0, HEAD_BYTES);
  if (typeof head.arrayBuffer === 'function') {
    return head.arrayBuffer().then(buffer => new Uint8Array(buffer));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(head);
  });
}
