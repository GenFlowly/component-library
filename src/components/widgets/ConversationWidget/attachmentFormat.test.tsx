import {
  SUPPORTED_DOCUMENT_FORMATS,
  SUPPORTED_IMAGE_FORMATS,
  checkAttachmentFormat,
  classifyAttachment,
  imageFormatFromTypeAndName,
  sniffImageFormat,
  sniffPdf,
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

  test('tells TGA (no signature) apart from ICO/CUR, and PFM from PAM', () => {
    // Uncompressed true-colour TGA, no ID field or colour map: 00 00 02 00 like CUR
    const tga = pad(
      bytes([0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x40, 0, 0x30, 0, 0x18, 0])
    );
    expect(sniffImageFormat(tga)).toBeNull(); // goes by its .tga name
    // A TGA with a 60-byte ID field starts with "<" — not markup
    expect(sniffImageFormat(pad(bytes([0x3c, 0, 2, 0, 0, 0])))).toBeNull();
    expect(sniffImageFormat(pad(bytes([0, 0, 2, 0, 1, 0, 0x20, 0x20])))).toBe(
      'unsupported'
    ); // CUR, 1 image
    expect(sniffImageFormat(pad(bytes('Pf\n2 2\n-1.0\n')))).toBe('supported'); // grayscale PFM
    expect(sniffImageFormat(pad(bytes('PF\n2 2\n-1.0\n')))).toBeNull(); // colour PFM isn't read
    expect(sniffImageFormat(pad(bytes('P7\nWIDTH 2\n')))).toBe('unsupported'); // PAM
  });

  test('turns down other formats the backend has no reader for', () => {
    const emf = pad(bytes([1, 0, 0, 0]));
    emf.set(bytes(' EMF'), 40);
    const others: [string, Uint8Array][] = [
      ['JPEG XR', pad(bytes('II', [0xbc, 0x01]))],
      ['WMF', pad(bytes([0xd7, 0xcd, 0xc6, 0x9a]))],
      ['EMF', emf],
      ['SGI', pad(bytes([0x01, 0xda, 0x01, 0x01]))],
      ['Sun raster', pad(bytes([0x59, 0xa6, 0x6a, 0x95]))],
      ['MNG', pad(bytes([0x8a], 'MNG', [0x0d, 0x0a]))],
      ['JNG', pad(bytes([0x8b], 'JNG', [0x0d, 0x0a]))],
      ['XPM', pad(bytes('/* XPM */\nstatic char *x[] = {'))],
      ['XBM', pad(bytes('#define x_width 8\n'))],
    ];
    for (const [name, head] of others) {
      expect([name, sniffImageFormat(head)]).toEqual([name, 'unsupported']);
    }
    expect(sniffImageFormat(ftyp('mif2'))).toBeNull(); // no reader accepts this major brand
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
    expect(
      imageFormatFromTypeAndName('image/vnd.ms-photo', 'capture.jxr')
    ).toBe('unsupported');
    expect(imageFormatFromTypeAndName('image/x-emf', 'chart.emf')).toBe(
      'unsupported'
    );
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

  test('a real uncompressed TGA is supported by its name or type', async () => {
    const tga = bytes(
      [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 24, 0],
      [0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0, 255]
    );
    expect(
      await checkAttachmentFormat(new File([tga], 'texture.tga', { type: '' }))
    ).toBe('supported');
    expect(
      await checkAttachmentFormat(
        new File([tga], 'image', { type: 'image/x-tga' })
      )
    ).toBe('supported');
    const cur = bytes([
      0, 0, 2, 0, 1, 0, 16, 16, 0, 0, 1, 0, 1, 0, 0x30, 0, 0, 0, 0x16, 0, 0, 0,
    ]);
    expect(
      await checkAttachmentFormat(new File([cur], 'pointer.tga', { type: '' }))
    ).toBe('unsupported');
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

describe('sniffPdf', () => {
  test('recognises the PDF header, also after a BOM or whitespace', () => {
    expect(sniffPdf(pad(bytes('%PDF-1.7')))).toBe(true);
    expect(sniffPdf(pad(bytes([0xef, 0xbb, 0xbf], '%PDF-2.0')))).toBe(true);
    expect(sniffPdf(pad(bytes('\r\n %PDF-1.4')))).toBe(true);
  });

  test('anything else is not a PDF', () => {
    expect(sniffPdf(pad(bytes('%PDF1.4')))).toBe(false);
    expect(sniffPdf(pad(bytes('%!PS-Adobe-3.0')))).toBe(false);
    expect(sniffPdf(pad(bytes([0xff, 0xd8, 0xff, 0xe0])))).toBe(false);
    expect(sniffPdf(bytes('%PD'))).toBe(false);
  });
});

describe('classifyAttachment', () => {
  const pdf = bytes('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj');
  const png = bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a], 'rest');

  test('a PDF goes by its bytes, whatever its name or declared type', async () => {
    expect(
      await classifyAttachment(
        new File([pdf], 'report.pdf', { type: 'application/pdf' })
      )
    ).toBe('pdf');
    // Pasted or dragged without a type or extension
    expect(
      await classifyAttachment(new File([pdf], 'document', { type: '' }))
    ).toBe('pdf');
    // A PNG renamed .pdf is still an image
    expect(
      await classifyAttachment(
        new File([png], 'scan.pdf', { type: 'application/pdf' })
      )
    ).toBe('image');
  });

  test('a file declared as a PDF whose bytes are not one is turned down', async () => {
    expect(
      await classifyAttachment(
        new File(['<html></html>'], 'invoice.pdf', { type: 'application/pdf' })
      )
    ).toBe('unsupported');
    expect(
      await classifyAttachment(new File(['xyz'], 'notes.pdf', { type: '' }))
    ).toBe('unsupported');
  });

  test('an unreadable file declared as a PDF counts as one', async () => {
    const unreadable = new File(['xyz'], 'scan.pdf', { type: '' });
    unreadable.slice = () => {
      throw new Error('not available offline');
    };
    expect(await classifyAttachment(unreadable)).toBe('pdf');
  });

  test('images and other files keep their image verdicts', async () => {
    expect(
      await classifyAttachment(new File([png], 'shot.png', { type: '' }))
    ).toBe('image');
    expect(
      await classifyAttachment(
        new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })
      )
    ).toBe('unsupported');
    expect(
      await classifyAttachment(
        new File([], 'empty.pdf', { type: 'application/pdf' })
      )
    ).toBe('unsupported');
  });
});

test('PDF is listed as the supported document format', () => {
  expect(SUPPORTED_DOCUMENT_FORMATS).toEqual(['PDF']);
});
