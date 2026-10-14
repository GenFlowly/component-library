import { ATTACHMENT_FILE_INPUT_ACCEPT, isImageFile } from './attachment.models';

describe('isImageFile', () => {
  test('any image/* type is an image', () => {
    expect(isImageFile('image/heic', 'IMG_0001.HEIC')).toBe(true);
    expect(isImageFile('image/x-adobe-dng', 'photo.dng')).toBe(true);
  });

  test('blank or generic types count when the extension is an image one', () => {
    for (const name of [
      'IMG_0001.HEIC',
      'photo.DNG',
      'IMG_1234.CR3',
      'DSC_0042.nef',
      'A7R.arw',
      'X100.RAF',
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
});

test('the picker accepts camera RAW extensions', () => {
  const accept = ATTACHMENT_FILE_INPUT_ACCEPT.split(',');
  expect(accept).toEqual(
    expect.arrayContaining([
      'image/*',
      '.dng',
      '.cr2',
      '.cr3',
      '.nef',
      '.arw',
      '.raf',
      '.orf',
      '.rw2',
    ])
  );
});
