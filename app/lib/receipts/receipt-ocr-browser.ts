import { prepareReceiptImage, validateReceiptImage } from "./receipt-image";
import { tesseractReceiptEngine, type ReceiptOcrEngine } from "./receipt-ocr-engine";
import { ReceiptOcrError } from "./receipt-ocr-errors";

export {
  RECEIPT_OCR_MAX_DIMENSION,
  RECEIPT_OCR_MAX_FILE_BYTES,
  validateReceiptImage,
} from "./receipt-image";

export const RECEIPT_OCR_TIMEOUT_MS = 120_000;

export type ReceiptOcrPhase = "preparing" | "loading" | "reading";

export function assertReceiptOcrSupport() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof Worker === "undefined" ||
    typeof WebAssembly === "undefined"
  ) {
    throw new ReceiptOcrError("unsupported-browser");
  }
}

export interface RecognizeReceiptOptions {
  signal?: AbortSignal;
  /** Only reported while the engine is actually reading text. */
  onProgress?: (progress: number) => void;
  onPhase?: (phase: ReceiptOcrPhase) => void;
  timeoutMs?: number;
  engine?: ReceiptOcrEngine;
}

/**
 * Prepares the image, then runs the OCR engine with cancellation and a
 * timeout. Receipt pixels and text stay in the browser.
 */
export async function recognizeReceiptImage(
  file: File,
  options: RecognizeReceiptOptions = {},
) {
  validateReceiptImage(file);
  assertReceiptOcrSupport();

  const { signal, onProgress, onPhase, timeoutMs = RECEIPT_OCR_TIMEOUT_MS } = options;
  const engine = options.engine ?? tesseractReceiptEngine;
  if (signal?.aborted) throw new ReceiptOcrError("canceled");

  const controller = new AbortController();
  let timedOut = false;
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  // Rejects as soon as the signal fires so cancel/timeout are immediate even
  // if the engine is stuck; the engine still terminates its worker.
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(new ReceiptOcrError(timedOut ? "timeout" : "canceled")),
      { once: true },
    );
  });
  aborted.catch(() => undefined);

  try {
    return await Promise.race([
      (async () => {
        onPhase?.("preparing");
        const image = await prepareReceiptImage(file);
        if (controller.signal.aborted) throw new ReceiptOcrError("canceled");

        onPhase?.("loading");
        const text = await engine.recognize(image, {
          signal: controller.signal,
          onProgress: (progress) => {
            onPhase?.("reading");
            onProgress?.(progress);
          },
        });
        if (controller.signal.aborted) {
          throw new ReceiptOcrError(timedOut ? "timeout" : "canceled");
        }
        return text;
      })(),
      aborted,
    ]);
  } catch (error) {
    if (timedOut) throw new ReceiptOcrError("timeout");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}
