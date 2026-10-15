import {
  ATTACHMENT_FILE_INPUT_ACCEPT,
  ATTACHMENT_FILE_INPUT_ACCEPT_WITH_PDF,
  ATTACHMENT_SIZE_LIMITS,
  MAX_PDFS_PER_MESSAGE,
  MAX_PDF_SIZE_BYTES,
  isImageFile,
  isPdfAttachment,
  isPdfFile,
} from './attachment.models';

describe('isImageFile', () => {
  test('any image/* type is an image', () => {
    expect(isImageFile('image/heic', 'IMG_0001.HEIC')).toBe(true);
    expect(isImageFile('image/x-adobe-dng', 'photo.dng')).toBe(true);
  });

  test('blank or generic types count when the extension is an image one', () => {
    for (const name of [
      'IMG_0001.HEIC',
      'photo.avif',
      'photo.DNG',
      'IMG_1234.CR3',
      'DSC_0042.nef',
      'A7R.arw',
      'X100.RAF',
      'SDIM0001.X3F',
      'P0001.IIQ',
    ]) {
      expect(isImageFile('', name)).toBe(true);
      expect(isImageFile('application/octet-stream', name)).toBe(true);
    }
  });

  test('other files are not images', () => {
    expect(isImageFile('', 'notes.pdf')).toBe(false);
    expect(isImageFile('application/octet-stream', 'archive.zip')).toBe(false);
    expect(isImageFile('application/pdf', 'scan.dng')).toBe(false);
  });

  test('extensions other files also use are not taken for camera RAW', () => {
    // .raw: audio / disk images, .dcr: Shockwave, .mos: various
    for (const name of ['capture.raw', 'movie.dcr', 'track.mos']) {
      expect(isImageFile('', name)).toBe(false);
      expect(isImageFile('application/octet-stream', name)).toBe(false);
    }
  });
});

describe('ATTACHMENT_FILE_INPUT_ACCEPT', () => {
  const accept = ATTACHMENT_FILE_INPUT_ACCEPT.split(',');

  test('offers camera RAW alongside every image type', () => {
    expect(accept).toEqual(
      expect.arrayContaining([
        'image/*',
        'image/avif',
        '.dng',
        '.cr2',
        '.nef',
        '.arw',
        '.raf',
        '.orf',
        '.rw2',
      ])
    );
  });

  test('only lists entries Android maps to image types', () => {
    // Chrome on Android maps each extension to a MIME type; one it can't
    // map (on any Android version it supports) becomes
    // application/octet-stream and replaces the photo picker with a generic
    // all-files chooser. MIME types pass through as they are.
    const androidImageExtensions = [
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
    for (const entry of accept) {
      expect(
        entry.startsWith('image/') || androidImageExtensions.includes(entry)
      ).toBe(true);
    }
  });
});

describe('PDF attachments', () => {
  test('limits: 10 MB per PDF, 5 PDFs per message, no cap for images', () => {
    expect(MAX_PDF_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_PDFS_PER_MESSAGE).toBe(5);
    expect(ATTACHMENT_SIZE_LIMITS['application/pdf']).toBe(MAX_PDF_SIZE_BYTES);
    expect(ATTACHMENT_SIZE_LIMITS['image/png']).toBeUndefined();
  });

  test('the PDF picker filter adds PDFs to the image filter', () => {
    const accept = ATTACHMENT_FILE_INPUT_ACCEPT_WITH_PDF.split(',');
    expect(accept).toEqual(
      expect.arrayContaining([
        ...ATTACHMENT_FILE_INPUT_ACCEPT.split(','),
        'application/pdf',
        '.pdf',
      ])
    );
    expect(ATTACHMENT_FILE_INPUT_ACCEPT).not.toContain('pdf');
  });

  test('isPdfFile goes by the PDF type, or a .pdf name when untyped', () => {
    expect(isPdfFile('application/pdf', 'scan')).toBe(true);
    expect(isPdfFile('application/pdf; charset=binary', 'x')).toBe(true);
    expect(isPdfFile('', 'Report.PDF')).toBe(true);
    expect(isPdfFile('application/octet-stream', 'report.pdf')).toBe(true);
    expect(isPdfFile('image/png', 'report.pdf')).toBe(false);
    expect(isPdfFile('', 'notes.txt')).toBe(false);
  });

  test('isPdfAttachment tells stored documents from images', () => {
    expect(
      isPdfAttachment({ mediaType: 'application/pdf', filename: undefined })
    ).toBe(true);
    // Uploaded before the backend kept application/pdf
    expect(
      isPdfAttachment({
        mediaType: 'application/octet-stream',
        filename: 'scan.pdf',
      })
    ).toBe(true);
    expect(
      isPdfAttachment({
        mediaType: 'application/octet-stream',
        filename: 'IMG_0001.HEIC',
      })
    ).toBe(false);
    expect(isPdfAttachment({ mediaType: 'image/png' })).toBe(false);
  });
});
