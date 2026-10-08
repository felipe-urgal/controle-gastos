import { describe, expect, it } from 'vitest';

import {
  assertReceiptImageDimensions,
  readReceiptImageDimensions,
  RECEIPT_OCR_MAX_FILE_BYTES,
  scaledReceiptDimensions,
  validateReceiptImage,
} from '@/app/lib/receipts/receipt-image';
import { ReceiptOcrError } from '@/app/lib/receipts/receipt-ocr-errors';

function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function jpeg(width: number, height: number) {
  // SOI, APP0 (len 4), SOF0 (len 11)
  const bytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0, 0, 0, 0, 0x01, 0x01, 0x11, 0x00,
  ]);
  const view = new DataView(bytes.buffer);
  view.setUint16(13, height);
  view.setUint16(15, width);
  return bytes;
}

function codeOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    return error instanceof ReceiptOcrError ? error.code : 'other';
  }
  return null;
}

describe('validateReceiptImage', () => {
  const file = (name: string, type: string, size: number) =>
    ({ name, type, size }) as File;

  it('accepts JPG/PNG by MIME or by extension when MIME is empty', () => {
    expect(codeOf(() => validateReceiptImage(file('a.jpg', 'image/jpeg', 10)))).toBeNull();
    expect(codeOf(() => validateReceiptImage(file('a.png', 'image/png', 10)))).toBeNull();
    expect(codeOf(() => validateReceiptImage(file('a.JPEG', '', 10)))).toBeNull();
  });

  it.each([
    ['photo.heic', 'image/heic'],
    ['photo.webp', 'image/webp'],
    ['doc.pdf', 'application/pdf'],
    ['photo.heic', ''],
  ])('rejects %s (%s) as unsupported format', (name, type) => {
    expect(codeOf(() => validateReceiptImage(file(name, type, 10)))).toBe('unsupported-format');
  });

  it('rejects empty and oversized files, accepting exactly 6 MB', () => {
    expect(codeOf(() => validateReceiptImage(file('a.png', 'image/png', 0)))).toBe('empty-file');
    expect(codeOf(() => validateReceiptImage(file('a.png', 'image/png', RECEIPT_OCR_MAX_FILE_BYTES + 1)))).toBe('file-too-large');
    expect(codeOf(() => validateReceiptImage(file('a.png', 'image/png', RECEIPT_OCR_MAX_FILE_BYTES)))).toBeNull();
  });
});

describe('image header dimensions', () => {
  it('reads PNG and JPEG dimensions without decoding', () => {
    expect(readReceiptImageDimensions(png(800, 1200))).toEqual({ width: 800, height: 1200 });
    expect(readReceiptImageDimensions(jpeg(3000, 4000))).toEqual({ width: 3000, height: 4000 });
  });

  it('rejects a renamed or corrupted file', () => {
    expect(codeOf(() => assertReceiptImageDimensions(new TextEncoder().encode('not an image')))).toBe('corrupted-image');
    expect(codeOf(() => assertReceiptImageDimensions(new Uint8Array([0xff, 0xd8, 0xff])))).toBe('corrupted-image');
    expect(codeOf(() => assertReceiptImageDimensions(png(0, 10)))).toBe('corrupted-image');
  });

  it('rejects a tiny file that declares gigantic dimensions', () => {
    expect(codeOf(() => assertReceiptImageDimensions(png(30000, 30000)))).toBe('dimensions-too-large');
    expect(codeOf(() => assertReceiptImageDimensions(jpeg(8000, 5000)))).toBeNull();
    expect(codeOf(() => assertReceiptImageDimensions(jpeg(8000, 5001)))).toBe('dimensions-too-large');
  });

  it('scales the longest side to 2200px and keeps small images', () => {
    expect(scaledReceiptDimensions({ width: 4400, height: 2200 })).toEqual({ width: 2200, height: 1100 });
    expect(scaledReceiptDimensions({ width: 1000, height: 3000 })).toEqual({ width: 733, height: 2200 });
    expect(scaledReceiptDimensions({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });
});
