import { ReceiptOcrError } from "./receipt-ocr-errors";

export const RECEIPT_OCR_MAX_FILE_BYTES = 6 * 1024 * 1024;
export const RECEIPT_OCR_MAX_DIMENSION = 2200;
/** Source pixel cap checked from the file header, before any bitmap is decoded. */
export const RECEIPT_OCR_MAX_SOURCE_PIXELS = 40_000_000;

export interface ReceiptImageDimensions {
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

/** Validates name/MIME/size only; content is verified by {@link readReceiptImageDimensions}. */
export function validateReceiptImage(file: File) {
  const lowerName = file.name.toLowerCase();
  const supportedType =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    (!file.type && /\.(jpe?g|png)$/.test(lowerName));

  if (!supportedType) throw new ReceiptOcrError("unsupported-format");
  if (file.size <= 0) throw new ReceiptOcrError("empty-file");
  if (file.size > RECEIPT_OCR_MAX_FILE_BYTES) throw new ReceiptOcrError("file-too-large");
}

/**
 * Reads width/height from the PNG IHDR or the JPEG SOF marker without decoding
 * pixels. Returns null when the bytes are not a well-formed JPEG/PNG header.
 */
export function readReceiptImageDimensions(bytes: Uint8Array): ReceiptImageDimensions | null {
  if (hasPrefix(bytes, PNG_SIGNATURE)) {
    if (bytes.length < 24) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // Markers without a length payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = view.getUint16(offset + 2);
    if (length < 2) return null;
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) {
      if (offset + 9 > bytes.length) return null;
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

/** Rejects corrupted or oversized-in-pixels images before they are decoded. */
export function assertReceiptImageDimensions(bytes: Uint8Array) {
  const dimensions = readReceiptImageDimensions(bytes);
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    throw new ReceiptOcrError("corrupted-image");
  }
  if (dimensions.width * dimensions.height > RECEIPT_OCR_MAX_SOURCE_PIXELS) {
    throw new ReceiptOcrError("dimensions-too-large");
  }
  return dimensions;
}

export function scaledReceiptDimensions({ width, height }: ReceiptImageDimensions) {
  const longestSide = Math.max(width, height);
  if (longestSide <= RECEIPT_OCR_MAX_DIMENSION) return { width, height };
  const scale = RECEIPT_OCR_MAX_DIMENSION / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function loadImageElement(file: File) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new ReceiptOcrError("corrupted-image"));
      image.src = url;
    });
    return {
      source: image as CanvasImageSource,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

// Both paths honour EXIF orientation ("from-image" is the default of
// createImageBitmap and of <img>), so portrait photos reach the OCR upright.
async function loadImageSource(file: File) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap as CanvasImageSource,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      throw new ReceiptOcrError("corrupted-image");
    }
  }
  return loadImageElement(file);
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ReceiptOcrError("recognition-failed"))),
      "image/png",
    );
  });
}

/**
 * Validates, decodes with the orientation applied and always re-renders on a
 * canvas (downscaled to the OCR limit), so both decode paths feed the engine
 * the same upright pixels.
 */
export async function prepareReceiptImage(file: File): Promise<Blob> {
  validateReceiptImage(file);
  assertReceiptImageDimensions(new Uint8Array(await file.arrayBuffer()));

  const image = await loadImageSource(file);
  try {
    if (image.width <= 0 || image.height <= 0) throw new ReceiptOcrError("corrupted-image");

    const { width, height } = scaledReceiptDimensions(image);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new ReceiptOcrError("recognition-failed");

    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image.source, 0, 0, width, height);
    return await canvasToBlob(canvas);
  } finally {
    image.cleanup();
  }
}
