type NavigatorWithWebGpu = Navigator & {
  gpu?: {
    requestAdapter(): Promise<unknown | null>;
  };
};

export type WebGpuSupportStatus =
  | "supported"
  | "api-unavailable"
  | "adapter-unavailable"
  | "adapter-error";

export async function getWebGpuSupportStatus(
  browserNavigator: NavigatorWithWebGpu = navigator as NavigatorWithWebGpu,
): Promise<WebGpuSupportStatus> {
  if (!browserNavigator.gpu) return "api-unavailable";

  try {
    const adapter = await browserNavigator.gpu.requestAdapter();
    return adapter ? "supported" : "adapter-unavailable";
  } catch {
    return "adapter-error";
  }
}

export async function hasWebGpuSupport(
  browserNavigator: NavigatorWithWebGpu = navigator as NavigatorWithWebGpu,
) {
  return (await getWebGpuSupportStatus(browserNavigator)) === "supported";
}
