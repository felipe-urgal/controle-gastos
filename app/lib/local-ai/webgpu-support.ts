type NavigatorWithWebGpu = Navigator & {
  gpu?: {
    requestAdapter(): Promise<unknown | null>;
  };
};

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
