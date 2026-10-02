import { describe, expect, it } from "vitest";

import {
  getWebGpuSupportStatus,
  hasWebGpuSupport,
} from "@/app/lib/local-ai/webgpu-support";

describe("WebGPU support detection", () => {
  it("identifica quando a API WebGPU não existe", async () => {
    await expect(getWebGpuSupportStatus({} as Navigator)).resolves.toBe(
      "api-unavailable",
    );
    await expect(hasWebGpuSupport({} as Navigator)).resolves.toBe(false);
  });

  it("diferencia WebGPU presente sem adapter disponível", async () => {
    const browser = {
      gpu: { requestAdapter: async () => null },
    } as unknown as Navigator;

    await expect(getWebGpuSupportStatus(browser)).resolves.toBe(
      "adapter-unavailable",
    );
    await expect(hasWebGpuSupport(browser)).resolves.toBe(false);
  });

  it("identifica adapter WebGPU disponível", async () => {
    const browser = {
      gpu: { requestAdapter: async () => ({}) },
    } as unknown as Navigator;

    await expect(getWebGpuSupportStatus(browser)).resolves.toBe("supported");
    await expect(hasWebGpuSupport(browser)).resolves.toBe(true);
  });

  it("diferencia erro durante requestAdapter", async () => {
    const browser = {
      gpu: {
        requestAdapter: async () => {
          throw new Error("device failure");
        },
      },
    } as unknown as Navigator;

    await expect(getWebGpuSupportStatus(browser)).resolves.toBe(
      "adapter-error",
    );
    await expect(hasWebGpuSupport(browser)).resolves.toBe(false);
  });
});
