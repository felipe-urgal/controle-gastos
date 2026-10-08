import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/receipts/receipt-image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/lib/receipts/receipt-image')>()),
  prepareReceiptImage: vi.fn(async () => new Blob(['img'])),
}));

import {
  assertReceiptOcrSupport,
  recognizeReceiptImage,
  type ReceiptOcrPhase,
} from '@/app/lib/receipts/receipt-ocr-browser';
import type { ReceiptOcrEngine } from '@/app/lib/receipts/receipt-ocr-engine';
import { ReceiptOcrError } from '@/app/lib/receipts/receipt-ocr-errors';
import { prepareReceiptImage } from '@/app/lib/receipts/receipt-image';

const file = { name: 'r.png', type: 'image/png', size: 10 } as File;

function stubBrowser(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', {});
  vi.stubGlobal('Worker', class {});
  for (const [key, value] of Object.entries(overrides)) vi.stubGlobal(key, value);
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error instanceof ReceiptOcrError ? error.code : `other:${String(error)}`;
  }
  return null;
}

describe('recognizeReceiptImage', () => {
  beforeEach(() => {
    stubBrowser();
    vi.mocked(prepareReceiptImage).mockImplementation(async () => new Blob(['img']));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reports unsupported browsers without Worker or WebAssembly', async () => {
    vi.stubGlobal('Worker', undefined);
    expect(() => assertReceiptOcrSupport()).toThrow(/não é suportado/);
    expect(await codeOf(recognizeReceiptImage(file, { engine: { recognize: vi.fn() } }))).toBe('unsupported-browser');

    stubBrowser({ WebAssembly: undefined });
    expect(await codeOf(recognizeReceiptImage(file, { engine: { recognize: vi.fn() } }))).toBe('unsupported-browser');
  });

  it('rejects invalid files before preparing or loading the engine', async () => {
    const engine = { recognize: vi.fn() };
    const bad = { name: 'a.heic', type: 'image/heic', size: 10 } as File;
    expect(await codeOf(recognizeReceiptImage(bad, { engine }))).toBe('unsupported-format');
    expect(await codeOf(recognizeReceiptImage({ ...file, size: 0 } as File, { engine }))).toBe('empty-file');
    expect(prepareReceiptImage).not.toHaveBeenCalled();
    expect(engine.recognize).not.toHaveBeenCalled();
  });

  it('returns engine text and reports phases and progress', async () => {
    const phases: ReceiptOcrPhase[] = [];
    const progress: number[] = [];
    const engine: ReceiptOcrEngine = {
      recognize: async (_image, { onProgress }) => {
        onProgress?.(0.5);
        return 'TOTAL R$ 10,00';
      },
    };
    const text = await recognizeReceiptImage(file, {
      engine,
      onPhase: (phase) => phases.push(phase),
      onProgress: (value) => progress.push(value),
    });
    expect(text).toBe('TOTAL R$ 10,00');
    expect(phases).toEqual(['preparing', 'loading', 'reading']);
    expect(progress).toEqual([0.5]);
  });

  it('propagates preparation errors (corrupted / too large dimensions)', async () => {
    vi.mocked(prepareReceiptImage).mockRejectedValueOnce(new ReceiptOcrError('dimensions-too-large'));
    expect(await codeOf(recognizeReceiptImage(file, { engine: { recognize: vi.fn() } }))).toBe('dimensions-too-large');
  });

  it('surfaces engine load and recognition failures', async () => {
    for (const code of ['engine-unavailable', 'recognition-failed'] as const) {
      const engine = { recognize: vi.fn().mockRejectedValue(new ReceiptOcrError(code)) };
      expect(await codeOf(recognizeReceiptImage(file, { engine }))).toBe(code);
    }
  });

  it('cancels before loading without calling the engine', async () => {
    const controller = new AbortController();
    controller.abort();
    const engine = { recognize: vi.fn() };
    expect(await codeOf(recognizeReceiptImage(file, { engine, signal: controller.signal }))).toBe('canceled');
    expect(engine.recognize).not.toHaveBeenCalled();
  });

  it('cancels immediately while the engine is working and signals the engine', async () => {
    const controller = new AbortController();
    let engineSignal: AbortSignal | undefined;
    const engine: ReceiptOcrEngine = {
      recognize: (_image, { signal }) => {
        engineSignal = signal;
        return new Promise<string>(() => undefined); // hung worker
      },
    };
    const pending = recognizeReceiptImage(file, { engine, signal: controller.signal });
    await vi.waitFor(() => expect(engineSignal).toBeDefined());
    controller.abort();
    expect(await codeOf(pending)).toBe('canceled');
    expect(engineSignal?.aborted).toBe(true);
  });

  it('times out a hung engine and aborts it so the worker is terminated', async () => {
    vi.useFakeTimers();
    let engineSignal: AbortSignal | undefined;
    const engine: ReceiptOcrEngine = {
      recognize: (_image, { signal }) => {
        engineSignal = signal;
        return new Promise<string>(() => undefined);
      },
    };
    const result = codeOf(recognizeReceiptImage(file, { engine, timeoutMs: 1000 }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toBe('timeout');
    expect(engineSignal?.aborted).toBe(true);
  });

  it('does not reuse a broken engine: each call invokes the engine afresh', async () => {
    const engine = {
      recognize: vi.fn()
        .mockRejectedValueOnce(new ReceiptOcrError('recognition-failed'))
        .mockResolvedValueOnce('ok'),
    };
    expect(await codeOf(recognizeReceiptImage(file, { engine }))).toBe('recognition-failed');
    expect(await recognizeReceiptImage(file, { engine })).toBe('ok');
  });
});
