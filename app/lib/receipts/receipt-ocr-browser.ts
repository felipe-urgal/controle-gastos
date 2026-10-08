export const RECEIPT_OCR_MAX_FILE_BYTES = 6 * 1024 * 1024;
export const RECEIPT_OCR_MAX_DIMENSION = 2200;

type TesseractApi = typeof import("tesseract.js");
type TesseractWorker = Awaited<ReturnType<TesseractApi["createWorker"]>>;

let tesseractLoader: Promise<TesseractApi> | null = null;

function abortError() {
  return new DOMException("OCR cancelado", "AbortError");
}

export function assertReceiptOcrSupport() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof Worker === "undefined" ||
    typeof WebAssembly === "undefined"
  ) {
    throw new Error("OCR local não é suportado neste navegador.");
  }
}

export function validateReceiptImage(file: File) {
  const lowerName = file.name.toLowerCase();
  const supportedType =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    (!file.type && /\.(jpe?g|png)$/.test(lowerName));

  if (!supportedType) {
    throw new Error("Use uma imagem JPG ou PNG.");
  }

  if (file.size <= 0) {
    throw new Error("A imagem está vazia.");
  }

  if (file.size > RECEIPT_OCR_MAX_FILE_BYTES) {
    throw new Error("A imagem deve ter no máximo 6 MB.");
  }
}

function loadTesseract(): Promise<TesseractApi> {
  assertReceiptOcrSupport();
  if (!tesseractLoader) {
    // Next.js generates a separate async chunk; no third-party script runs in the page.
    tesseractLoader = import("tesseract.js").catch((error: unknown) => {
      tesseractLoader = null;
      throw error;
    });
  }
  return tesseractLoader;
}

async function loadImageElement(file: File) {
  const url = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
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

async function loadImageSource(file: File) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap as CanvasImageSource,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }

  return loadImageElement(file);
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível preparar a imagem para OCR."));
      },
      "image/jpeg",
      0.9,
    );
  });
}

async function normalizeReceiptImage(file: File) {
  validateReceiptImage(file);
  const image = await loadImageSource(file);

  try {
    if (image.width <= 0 || image.height <= 0) {
      throw new Error("A imagem não possui dimensões válidas.");
    }

    const longestSide = Math.max(image.width, image.height);
    if (longestSide <= RECEIPT_OCR_MAX_DIMENSION) return file;

    const scale = RECEIPT_OCR_MAX_DIMENSION / longestSide;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Não foi possível preparar a imagem para OCR.");
    }

    context.drawImage(image.source, 0, 0, width, height);
    return await canvasToBlob(canvas);
  } finally {
    image.cleanup();
  }
}

export interface RecognizeReceiptOptions {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

/**
 * The version-pinned OCR API is imported on demand. Worker, WASM and Portuguese
 * traineddata are copied from installed packages into /ocr at build time and
 * fetched only from this application's origin. Receipt pixels stay in-browser.
 */
export async function recognizeReceiptImage(
  file: File,
  options: RecognizeReceiptOptions = {},
) {
  validateReceiptImage(file);
  assertReceiptOcrSupport();

  const { signal, onProgress } = options;
  if (signal?.aborted) throw abortError();

  let worker: TesseractWorker | null = null;
  let termination: Promise<void> | null = null;

  const terminateWorker = () => {
    if (!worker) return Promise.resolve();
    if (!termination) {
      termination = worker.terminate().then(() => undefined, () => undefined);
    }
    return termination;
  };

  const handleAbort = () => {
    void terminateWorker();
  };

  signal?.addEventListener("abort", handleAbort, { once: true });

  try {
    const image = await normalizeReceiptImage(file);
    if (signal?.aborted) throw abortError();

    const tesseract = await loadTesseract();
    if (signal?.aborted) throw abortError();

    worker = await tesseract.createWorker("por", undefined, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
      logger(message) {
        if (message.status === "recognizing text" && Number.isFinite(message.progress)) {
          onProgress?.(Math.max(0, Math.min(1, message.progress)));
        }
      },
    });

    if (signal?.aborted) {
      await terminateWorker();
      throw abortError();
    }

    const result = await worker.recognize(image);
    if (signal?.aborted) throw abortError();

    return result.data.text;
  } finally {
    signal?.removeEventListener("abort", handleAbort);
    await terminateWorker();
  }
}
