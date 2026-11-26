import pica from 'pica';
import {
  prepareImageForUpload,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_PIXELS,
} from './imageUpload';

jest.mock('pica', () => {
  const instance = { resize: jest.fn(), toBlob: jest.fn() };
  return { __esModule: true, default: () => instance };
});

const mockHeic = { isHeic: jest.fn(), heicTo: jest.fn() };
jest.mock('heic-to', () => ({
  isHeic: (...args: unknown[]) => mockHeic.isHeic(...args),
  heicTo: (...args: unknown[]) => mockHeic.heicTo(...args),
}));

const resizer = pica() as unknown as { resize: jest.Mock; toBlob: jest.Mock };

const MB = 1024 * 1024;

const makeFile = (name: string, type: string, size: number): File => {
  const file = new File(['x'], name, { type, lastModified: 42 });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const blobOf = (size: number): Blob =>
  new Blob([new Uint8Array(Math.round(size))], { type: 'image/png' });

let decoded: { width: number; height: number } | null;

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:mock');
  URL.revokeObjectURL = jest.fn();
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {
    configurable: true,
    value: () =>
      decoded ? Promise.resolve() : Promise.reject(new Error('EncodingError')),
  });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
    configurable: true,
    get: () => decoded?.width ?? 0,
  });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
    configurable: true,
    get: () => decoded?.height ?? 0,
  });
});

beforeEach(() => {
  decoded = { width: 8064, height: 6048 };
  resizer.resize.mockReset().mockImplementation(async (_from, to) => to);
  resizer.toBlob.mockReset();
  mockHeic.isHeic.mockReset().mockResolvedValue(false);
  mockHeic.heicTo.mockReset();
});

describe('prepareImageForUpload', () => {
  test('re-encodes a PNG already within both limits', async () => {
    decoded = { width: 1290, height: 2796 };
    resizer.toBlob.mockResolvedValue(blobOf(1.5 * MB));
    const file = makeFile('screenshot.png', 'image/png', 2 * MB);
    const out = await prepareImageForUpload(file);

    expect(out).not.toBe(file);
    expect(out.type).toBe('image/png');
    expect(resizer.resize).toHaveBeenCalledTimes(1);
    const canvas = resizer.resize.mock.calls[0][1] as HTMLCanvasElement;
    expect([canvas.width, canvas.height]).toEqual([1290, 2796]);
  });

  test('shrinks a PNG within the limit whose re-encode comes out larger', async () => {
    decoded = { width: 1290, height: 2796 };
    resizer.toBlob
      .mockResolvedValueOnce(blobOf(3.4 * MB))
      .mockResolvedValueOnce(blobOf(2.6 * MB));
    const out = await prepareImageForUpload(
      makeFile('screenshot.png', 'image/png', 2.9 * MB)
    );

    expect(out.size).toBe(Math.round(2.6 * MB));
    const [first, second] = resizer.resize.mock.calls.map(
      call => call[1] as HTMLCanvasElement
    );
    expect(first.width).toBe(1290);
    expect(second.width).toBeLessThan(1290);
  });

  test('converts a 12 MP phone photo already under 3 MB', async () => {
    decoded = { width: 3024, height: 4032 };
    resizer.toBlob.mockResolvedValue(blobOf(2.7 * MB));
    const out = await prepareImageForUpload(
      makeFile('IMG_0036.jpg', 'image/jpeg', 2.5 * MB)
    );

    expect(out.type).toBe('image/png');
    expect(out.name).toBe('IMG_0036.png');
    expect(out.size).toBeLessThanOrEqual(MAX_IMAGE_UPLOAD_BYTES);
    const canvas = resizer.resize.mock.calls[0][1] as HTMLCanvasElement;
    expect(canvas.width * canvas.height).toBeLessThan(3024 * 4032);
    expect(canvas.height).toBeGreaterThan(canvas.width);
  });

  test('targets 3 MB', () => {
    expect(MAX_IMAGE_UPLOAD_BYTES).toBe(3 * MB);
  });

  test('never steps above 5 MP even when the PNG is small', async () => {
    decoded = { width: 4000, height: 3000 };
    resizer.toBlob.mockResolvedValue(blobOf(1 * MB));
    await prepareImageForUpload(makeFile('flat.jpg', 'image/jpeg', 1 * MB));

    const canvases = resizer.resize.mock.calls.map(
      call => call[1] as HTMLCanvasElement
    );
    canvases.forEach(c =>
      expect(c.width * c.height).toBeLessThanOrEqual(
        MAX_IMAGE_UPLOAD_PIXELS * 1.001
      )
    );
    const last = canvases[canvases.length - 1];
    expect(last.width * last.height).toBeGreaterThan(
      MAX_IMAGE_UPLOAD_PIXELS * 0.99
    );
  });

  test('shrinks a PNG over 5 MP even when it is small in bytes', async () => {
    decoded = { width: 6000, height: 4000 };
    resizer.toBlob.mockResolvedValue(blobOf(2 * MB));
    const diagram = makeFile('diagram.png', 'image/png', 2 * MB);
    const out = await prepareImageForUpload(diagram);

    expect(resizer.resize).toHaveBeenCalled();
    const canvases = resizer.resize.mock.calls.map(
      call => call[1] as HTMLCanvasElement
    );
    canvases.forEach(c =>
      expect(c.width * c.height).toBeLessThanOrEqual(
        MAX_IMAGE_UPLOAD_PIXELS * 1.001
      )
    );
    expect(out).not.toBe(diagram);
  });

  test('leaves a PDF untouched whatever its size', async () => {
    const file = makeFile('report.pdf', 'application/pdf', 9 * MB);
    expect(await prepareImageForUpload(file)).toBe(file);
    expect(resizer.resize).not.toHaveBeenCalled();
  });

  test('leaves a file the browser cannot decode for the backend', async () => {
    decoded = null;
    const file = makeFile('IMG_0001.HEIC', '', 12 * MB);
    expect(await prepareImageForUpload(file)).toBe(file);
    expect(resizer.resize).not.toHaveBeenCalled();
  });

  test('decodes a HEIC the browser cannot open with heic-to and uploads a PNG', async () => {
    decoded = null;
    const bitmap = { width: 3024, height: 4032, close: jest.fn() };
    mockHeic.isHeic.mockResolvedValue(true);
    mockHeic.heicTo.mockResolvedValue(bitmap);
    resizer.toBlob.mockResolvedValue(blobOf(2.7 * MB));
    const file = makeFile('IMG_0036.HEIC', '', 2 * MB);

    const out = await prepareImageForUpload(file);

    expect(mockHeic.heicTo).toHaveBeenCalledWith({
      blob: file,
      type: 'bitmap',
    });
    expect(resizer.resize.mock.calls[0][0]).toBe(bitmap);
    expect(out.type).toBe('image/png');
    expect(out.name).toBe('IMG_0036.png');
    const canvas = resizer.resize.mock.calls[0][1] as HTMLCanvasElement;
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(
      MAX_IMAGE_UPLOAD_PIXELS
    );
    expect(canvas.height).toBeGreaterThan(canvas.width);
    expect(bitmap.close).toHaveBeenCalled();
  });

  test('leaves a HEIC for the backend when heic-to fails', async () => {
    decoded = null;
    mockHeic.isHeic.mockResolvedValue(true);
    mockHeic.heicTo.mockRejectedValue(new Error('unsupported'));
    const file = makeFile('IMG_0037.HEIC', '', 2 * MB);

    expect(await prepareImageForUpload(file)).toBe(file);
    expect(resizer.resize).not.toHaveBeenCalled();
  });

  test('turns a large photo into a PNG under the limit, keeping the aspect ratio', async () => {
    resizer.toBlob.mockResolvedValue(blobOf(2.8 * MB));
    const out = await prepareImageForUpload(
      makeFile('IMG_0001.jpg', 'image/jpeg', 24 * MB)
    );

    expect(out.type).toBe('image/png');
    expect(out.name).toBe('IMG_0001.png');
    expect(out.size).toBeLessThanOrEqual(MAX_IMAGE_UPLOAD_BYTES);
    expect(out.lastModified).toBe(42);
    const canvas = resizer.resize.mock.calls[0][1] as HTMLCanvasElement;
    expect(canvas.width * canvas.height * 2.5).toBeLessThanOrEqual(
      MAX_IMAGE_UPLOAD_BYTES * 1.01
    );
    expect(canvas.width / canvas.height).toBeCloseTo(8064 / 6048, 2);
    expect(resizer.toBlob).toHaveBeenCalledWith(canvas, 'image/png');
  });

  test('shrinks again when the first PNG is still too large', async () => {
    resizer.toBlob
      .mockResolvedValueOnce(blobOf(8 * MB))
      .mockResolvedValueOnce(blobOf(2.8 * MB));
    const out = await prepareImageForUpload(
      makeFile('big.jpg', 'image/jpeg', 30 * MB)
    );

    expect(out.type).toBe('image/png');
    expect(resizer.resize).toHaveBeenCalledTimes(2);
    const [first, second] = resizer.resize.mock.calls.map(
      call => call[1] as HTMLCanvasElement
    );
    expect(second.width).toBeLessThan(first.width);
  });

  test('steps up once when the first PNG lands well under the limit, keeping the larger one', async () => {
    resizer.toBlob
      .mockResolvedValueOnce(blobOf(1.2 * MB))
      .mockResolvedValueOnce(blobOf(2.7 * MB));
    const out = await prepareImageForUpload(
      makeFile('IMG_0003.jpg', 'image/jpeg', 20 * MB)
    );

    expect(resizer.resize).toHaveBeenCalledTimes(2);
    const [first, second] = resizer.resize.mock.calls.map(
      call => call[1] as HTMLCanvasElement
    );
    expect(second.width).toBeGreaterThan(first.width);
    expect(out.size).toBe(Math.round(2.7 * MB));
  });

  test('keeps the smaller PNG when stepping up overshoots', async () => {
    resizer.toBlob
      .mockResolvedValueOnce(blobOf(1.2 * MB))
      .mockResolvedValueOnce(blobOf(3.5 * MB));
    const out = await prepareImageForUpload(
      makeFile('IMG_0004.jpg', 'image/jpeg', 20 * MB)
    );

    expect(resizer.resize).toHaveBeenCalledTimes(2);
    expect(out.size).toBe(Math.round(1.2 * MB));
  });

  test('caps the long edge at 8000 px', async () => {
    decoded = { width: 20000, height: 100 };
    resizer.toBlob.mockResolvedValue(blobOf(1 * MB));
    await prepareImageForUpload(makeFile('pano.jpg', 'image/jpeg', 6 * MB));

    const canvas = resizer.resize.mock.calls[0][1] as HTMLCanvasElement;
    expect(canvas.width).toBeLessThanOrEqual(8000);
  });

  test('names a pasted image without a name', async () => {
    resizer.toBlob.mockResolvedValue(blobOf(1 * MB));
    const out = await prepareImageForUpload(makeFile('', 'image/png', 6 * MB));
    expect(out.name).toBe('pasted-image.png');
  });
});
