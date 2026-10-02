"use client";

import {
  CreateWebWorkerMLCEngine,
  type InitProgressReport,
  type WebWorkerMLCEngine,
} from "@mlc-ai/web-llm";

import type { LocalAssistantGenerator } from "@/app/lib/local-ai/local-assistant-runtime";

export const LOCAL_ASSISTANT_MODEL_ID =
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

type NavigatorWithWebGpu = Navigator & {
  gpu?: {
    requestAdapter(): Promise<unknown | null>;
  };
};

let enginePromise: Promise<WebWorkerMLCEngine> | null = null;

export async function hasWebGpuSupport(
  browserNavigator: NavigatorWithWebGpu = navigator as NavigatorWithWebGpu,
) {
  if (!browserNavigator.gpu) return false;

  try {
    return Boolean(await browserNavigator.gpu.requestAdapter());
  } catch {
    return false;
  }
}

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

  async generate({ messages, onProgress }) {
    const engine = await loadEngine(onProgress);
    const response = await engine.chat.completions.create({
      messages,
      temperature: 0.2,
      max_tokens: 320,
    });

    return response.choices[0]?.message.content ?? "";
  },
};
