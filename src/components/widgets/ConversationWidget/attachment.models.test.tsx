import { ATTACHMENT_FILE_INPUT_ACCEPT, isImageFile } from './attachment.models';

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

  test('offers PDF documents alongside images', () => {
    expect(accept).toContain('application/pdf');
  });

  test('lists only image entries plus application/pdf', () => {
    // Chrome on Android maps each extension to a MIME type; one it can't
    // map (on any Android version it supports) becomes
    // application/octet-stream and replaces the photo picker with a generic
    // all-files chooser. MIME types pass through as they are. PDFs are the one
    // deliberate non-image entry (users attach documents too).
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
        entry.startsWith('image/') ||
          androidImageExtensions.includes(entry) ||
          entry === 'application/pdf'
      ).toBe(true);
    }
  });
});
