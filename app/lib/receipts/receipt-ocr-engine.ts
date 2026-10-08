import { ReceiptOcrError } from "./receipt-ocr-errors";

/** Minimal OCR contract; the browser pipeline never touches Tesseract directly. */
export interface ReceiptOcrEngine {
  recognize(
    image: Blob,
    options: { signal: AbortSignal; onProgress?: (progress: number) => void },
  ): Promise<string>;
}

type TesseractApi = typeof import("tesseract.js");

let tesseractLoader: Promise<TesseractApi> | null = null;

function loadTesseract(): Promise<TesseractApi> {
  // Next.js emits a separate async chunk; no third-party script runs in the page.
  tesseractLoader ??= import("tesseract.js").catch((error: unknown) => {
    tesseractLoader = null;
    throw error;
  });
  return tesseractLoader;
}

/**
 * Version-pinned Tesseract. Worker, WASM and Portuguese traineddata are copied
 * from installed packages into /ocr at build time and fetched only from this
 * origin. A fresh worker is created per call and always terminated, so a hung
 * or aborted worker is never reused.
 */
export const tesseractReceiptEngine: ReceiptOcrEngine = {
  async recognize(image, { signal, onProgress }) {
    let tesseract: TesseractApi;
    try {
      tesseract = await loadTesseract();
    } catch {
      throw new ReceiptOcrError("engine-unavailable");
    }
    if (signal.aborted) throw new ReceiptOcrError("canceled");

    let worker: Awaited<ReturnType<TesseractApi["createWorker"]>> | null = null;
    let termination: Promise<void> | null = null;
    const terminate = () => {
      if (!worker) return Promise.resolve();
      termination ??= worker.terminate().then(() => undefined, () => undefined);
      return termination;
    };
    signal.addEventListener("abort", () => void terminate(), { once: true });

    try {
      try {
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
      } catch {
        throw new ReceiptOcrError(signal.aborted ? "canceled" : "engine-unavailable");
      }
      if (signal.aborted) throw new ReceiptOcrError("canceled");

      try {
        return (await worker.recognize(image)).data.text;
      } catch {
        throw new ReceiptOcrError(signal.aborted ? "canceled" : "recognition-failed");
      }
    } finally {
      await terminate();
    }
  },
};
