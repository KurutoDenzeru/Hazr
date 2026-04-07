export const isWebGPUAvailable = (): boolean => {
  if (typeof navigator === "undefined") return false;

  return "gpu" in navigator;
};

export const shouldUseWebGPU = (
  itemCount: number,
  threshold = 180,
): boolean => {
  return isWebGPUAvailable() && itemCount >= threshold;
};
