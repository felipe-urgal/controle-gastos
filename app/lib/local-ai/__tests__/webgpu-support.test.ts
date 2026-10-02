import { describe, expect, it } from "vitest";

import { hasWebGpuSupport } from "@/app/lib/local-ai/webgpu-support";

describe("WebGPU support detection", () => {
  it("retorna false quando WebGPU não existe", async () => {
    await expect(hasWebGpuSupport({} as Navigator)).resolves.toBe(false);
  });

  it("retorna false quando não há adapter disponível", async () => {
    const browser = {
      gpu: { requestAdapter: async () => null },
    } as unknown as Navigator;

    await expect(hasWebGpuSupport(browser)).resolves.toBe(false);
  });

  it("retorna true quando há adapter WebGPU", async () => {
    const browser = {
      gpu: { requestAdapter: async () => ({}) },
    } as unknown as Navigator;

    await expect(hasWebGpuSupport(browser)).resolves.toBe(true);
  });

  it("degrada com segurança quando requestAdapter falha", async () => {
    const browser = {
      gpu: {
        requestAdapter: async () => {
          throw new Error("device failure");
        },
      },
    } as unknown as Navigator;

    await expect(hasWebGpuSupport(browser)).resolves.toBe(false);
  });
});
