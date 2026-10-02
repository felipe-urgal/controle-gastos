"use client";

import {
  CreateWebWorkerMLCEngine,
  type InitProgressReport,
  type WebWorkerMLCEngine,
} from "@mlc-ai/web-llm";

import type { LocalAssistantGenerator } from "@/app/lib/local-ai/local-assistant-runtime";
import { hasWebGpuSupport } from "@/app/lib/local-ai/webgpu-support";

export const LOCAL_ASSISTANT_MODEL_ID =
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

let enginePromise: Promise<WebWorkerMLCEngine> | null = null;

async function loadEngine(
  onProgress?: (progress: { progress: number; text: string }) => void,
) {
  if (!enginePromise) {
    enginePromise = CreateWebWorkerMLCEngine(
      new Worker(new URL("./webllm.worker.ts", import.meta.url), {
        type: "module",
      }),
      LOCAL_ASSISTANT_MODEL_ID,
      {
        initProgressCallback: (report: InitProgressReport) => {
          onProgress?.({
            progress: Math.max(0, Math.min(1, report.progress)),
            text: report.text,
          });
        },
      },
      {
        context_window_size: 2048,
      },
    ).catch((error) => {
      enginePromise = null;
      throw error;
    });
  }

  const engine = await enginePromise;
  return engine;
}

export const webLlmFinancialGenerator: LocalAssistantGenerator = {
  isSupported: () => hasWebGpuSupport(),

  async generate({ messages, onProgress, signal }) {
    const engine = await loadEngine(onProgress);
    if (signal?.aborted) throw new DOMException("Operação cancelada", "AbortError");

    const interrupt = () => {
      engine.interruptGenerate();
    };
    signal?.addEventListener("abort", interrupt, { once: true });

    try {
      const response = await engine.chat.completions.create({
        messages,
        temperature: 0.2,
        max_tokens: 320,
      });

      return response.choices[0]?.message.content ?? "";
    } finally {
      signal?.removeEventListener("abort", interrupt);
    }
  },
};
