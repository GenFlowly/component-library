import {
  SUPPORTED_IMAGE_FORMATS,
  checkAttachmentFormat,
  imageFormatFromTypeAndName,
  sniffImageFormat,
} from './attachmentFormat';

const bytes = (...parts: (string | number[])[]): Uint8Array =>
  new Uint8Array(
    parts.flatMap(part =>
      typeof part === 'string' ? Array.from(part, c => c.charCodeAt(0)) : part
    )
  );
const pad = (head: Uint8Array, length = 64): Uint8Array => {
  const out = new Uint8Array(Math.max(length, head.length));
  out.set(head);
  return out;
};
const ftyp = (brand: string) => pad(bytes([0, 0, 0, 0x18], 'ftyp', brand));
const bmp = (dibHeaderSize: number) =>
  pad(
    bytes('BM', [0, 0, 0, 0, 0, 0, 0, 0, 0x36, 0, 0, 0, dibHeaderSize, 0, 0, 0])
  );

describe('sniffImageFormat', () => {
  test('recognises every format the backend converts', () => {
    const supported: [string, Uint8Array][] = [
      ['JPEG', pad(bytes([0xff, 0xd8, 0xff, 0xe0]))],
      ['PNG', pad(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a]))],
      ['GIF', pad(bytes('GIF89a'))],
      ['WebP', pad(bytes('RIFF', [0, 0, 0, 0], 'WEBP'))],
      ['HEIC', ftyp('heic')],
      ['HEIF (mif1)', ftyp('mif1')],
      ['AVIF', ftyp('avif')],
      ['TIFF / DNG / NEF / ARW', pad(bytes('II*', [0]))],
      ['big-endian TIFF', pad(bytes('MM', [0], '*'))],
      ['BMP', bmp(40)],
      ['PSD', pad(bytes('8BPS', [0, 1]))],
      [
        'JPEG 2000',
        pad(bytes([0, 0, 0, 0x0c], 'jP  ', [0x0d, 0x0a, 0x87, 0x0a])),
      ],
      ['PPM', pad(bytes('P6\n640 480\n255\n'))],
      ['QOI', pad(bytes('qoif'))],
      ['CR3', ftyp('crx ')],
      ['CRW', pad(bytes('II', [0x1a, 0, 0, 0], 'HEAPCCDR'))],
      ['RAF', pad(bytes('FUJIFILMCCD-RAW 0201'))],
      ['ORF', pad(bytes('IIRO', [8, 0, 0, 0]))],
      ['RW2', pad(bytes('IIU', [0]))],
      ['X3F', pad(bytes('FOVb'))],
      ['MRW', pad(bytes([0], 'MRM'))],
      ['IIQ', pad(bytes('IIII', 'CwaR'))],
    ];
    for (const [name, head] of supported) {
      expect([name, sniffImageFormat(head)]).toEqual([name, 'supported']);
    }
  });

  test('turns down formats the backend refuses', () => {
    const unsupported: [string, Uint8Array][] = [
      ['SVG', pad(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))],
      [
        'SVG after a BOM and an XML prolog',
        pad(bytes([0xef, 0xbb, 0xbf], '  <?xml version="1.0"?><svg>')),
      ],
      ['HTML', pad(bytes('<!doctype html><html>'))],
      ['PDF', pad(bytes('%PDF-1.7'))],
      ['EPS', pad(bytes('%!PS-Adobe-3.0 EPSF-3.0'))],
      ['ICO', pad(bytes([0, 0, 1, 0, 1, 0]))],
      ['ICNS', pad(bytes('icns'))],
      ['JPEG XL', pad(bytes([0xff, 0x0a]))],
      [
        'JPEG XL container',
        pad(bytes([0, 0, 0, 0x0c], 'JXL ', [0x0d, 0x0a, 0x87, 0x0a])),
      ],
      ['OpenEXR', pad(bytes([0x76, 0x2f, 0x31, 0x01]))],
      ['Radiance HDR', pad(bytes('#?RADIANCE\n'))],
      ['PSB', pad(bytes('8BPS', [0, 2]))],
      ['GIMP XCF', pad(bytes('gimp xcf v011'))],
      ['ZIP (docx, kra, ...)', pad(bytes('PK', [3, 4]))],
      ['MOV / Live Photo video', ftyp('qt  ')],
      ['MP4', ftyp('isom')],
      ['WebM', pad(bytes([0x1a, 0x45, 0xdf, 0xa3]))],
      ['AVI', pad(bytes('RIFF', [0, 0, 0, 0], 'AVI '))],
    ];
    for (const [name, head] of unsupported) {
      expect([name, sniffImageFormat(head)]).toEqual([name, 'unsupported']);
    }
  });

  test('says nothing about bytes it does not know', () => {
    expect(sniffImageFormat(pad(bytes('hello world')))).toBeNull();
    expect(sniffImageFormat(pad(bytes('BM not a bitmap header')))).toBeNull();
    expect(sniffImageFormat(ftyp('zzzz'))).toBeNull();
    expect(sniffImageFormat(new Uint8Array())).toBeNull();
  });
});

describe('imageFormatFromTypeAndName', () => {
  test('image types and image extensions are supported', () => {
    expect(imageFormatFromTypeAndName('image/x-tga', 'scan.tga')).toBe(
      'supported'
    );
    expect(imageFormatFromTypeAndName('', 'scan.TGA')).toBe('supported');
    expect(
      imageFormatFromTypeAndName('application/octet-stream', 'IMG_1.CR3')
    ).toBe('supported');
  });

  test('known unusable image types and everything else are not', () => {
    expect(imageFormatFromTypeAndName('image/svg+xml', 'logo.svg')).toBe(
      'unsupported'
    );
    expect(imageFormatFromTypeAndName('image/x-icon', 'favicon.ico')).toBe(
      'unsupported'
    );
    expect(imageFormatFromTypeAndName('image/jxl', 'photo.jxl')).toBe(
      'unsupported'
    );
    expect(imageFormatFromTypeAndName('application/pdf', 'scan.pdf')).toBe(
      'unsupported'
    );
    expect(imageFormatFromTypeAndName('', 'notes.txt')).toBe('unsupported');
  });
});

describe('checkAttachmentFormat', () => {
  test('goes by the bytes whatever the name or declared type', async () => {
    const png = bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a], 'rest');
    // A PNG renamed .pdf, and an SVG labelled image/png
    expect(
      await checkAttachmentFormat(
        new File([png], 'scan.pdf', { type: 'application/pdf' })
      )
    ).toBe('supported');
    expect(
      await checkAttachmentFormat(
        new File(['<svg/>'], 'logo.png', { type: 'image/png' })
      )
    ).toBe('unsupported');
    // An iPhone photo the browser reports with no type
    expect(
      await checkAttachmentFormat(
        new File([ftyp('heic')], 'IMG_0001.HEIC', { type: '' })
      )
    ).toBe('supported');
  });

  test('falls back to the type and name for unknown or unreadable bytes', async () => {
    expect(
      await checkAttachmentFormat(new File(['xyz'], 'scan.tga', { type: '' }))
    ).toBe('supported');
    expect(
      await checkAttachmentFormat(new File(['xyz'], 'data.bin', { type: '' }))
    ).toBe('unsupported');
    const unreadable = new File(['xyz'], 'photo.jpg', { type: 'image/jpeg' });
    unreadable.slice = () => {
      throw new Error('not available offline');
    };
    expect(await checkAttachmentFormat(unreadable)).toBe('supported');
  });

  test('an empty file is not an image', async () => {
    expect(
      await checkAttachmentFormat(
        new File([], 'photo.jpg', { type: 'image/jpeg' })
      )
    ).toBe('unsupported');
  });
});

test('the supported formats are listed for users', () => {
  expect(SUPPORTED_IMAGE_FORMATS).toEqual(
    expect.arrayContaining(['JPEG', 'PNG', 'HEIC/HEIF', 'WebP'])
  );
  expect(SUPPORTED_IMAGE_FORMATS.join(', ')).toMatch(/camera RAW \(DNG/);
});
