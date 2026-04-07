import * as React from "react";

import { isWebGPUAvailable } from "@/lib/webgpu";

export type ViewportBounds = {
  west: number;
  east: number;
  south: number;
  north: number;
};

export type ViewportPoint = {
  coordinates: [number, number];
};

type VisibilityWorkerRequest = {
  requestId: number;
  bounds: ViewportBounds;
  datasets: Array<{
    key: string;
    coordinates: Float32Array;
  }>;
};

type VisibilityWorkerResponse = {
  requestId: number;
  supported: boolean;
  datasets: Array<{
    key: string;
    visibility: ArrayBuffer;
  }>;
};

type UseWebGpuVisibilityArgs = {
  bounds: ViewportBounds | null;
  datasets: Record<string, ViewportPoint[]>;
  enabled?: boolean;
  threshold?: number;
};

type UseWebGpuVisibilityState = {
  isSupported: boolean;
  isPending: boolean;
  masks: Record<string, Uint32Array | null>;
};

export const containsViewportBounds = (
  bounds: ViewportBounds,
  coordinates: [number, number],
) => {
  const [longitude, latitude] = coordinates;
  const isLongitudeVisible =
    bounds.west <= bounds.east
      ? longitude >= bounds.west && longitude <= bounds.east
      : longitude >= bounds.west || longitude <= bounds.east;
  const isLatitudeVisible = latitude >= bounds.south && latitude <= bounds.north;

  return isLongitudeVisible && isLatitudeVisible;
};

export function useWebGpuVisibility(
  args: UseWebGpuVisibilityArgs,
): UseWebGpuVisibilityState {
  const { bounds, datasets, enabled = true, threshold = 180 } = args;
  const workerRef = React.useRef<Worker | null>(null);
  const requestIdRef = React.useRef(0);
  const [isSupported, setIsSupported] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [masks, setMasks] = React.useState<Record<string, Uint32Array | null>>({});

  const datasetEntries = React.useMemo(() => Object.entries(datasets), [datasets]);
  const totalPointCount = React.useMemo(
    () => datasetEntries.reduce((sum, [, items]) => sum + items.length, 0),
    [datasetEntries],
  );

  const shouldUseWebGpu =
    enabled && Boolean(bounds) && totalPointCount >= threshold && isWebGPUAvailable();

  React.useEffect(() => {
    if (!shouldUseWebGpu) {
      setIsSupported(false);
      setIsPending(false);
      setMasks({});

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      return;
    }

    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(
          new URL("../workers/webgpu-viewport-culling.worker.ts", import.meta.url),
          { type: "module" },
        );
      } catch {
        setIsSupported(false);
        setIsPending(false);
        setMasks({});
        return;
      }
    }

    const worker = workerRef.current;
    const handleMessage = (event: MessageEvent<VisibilityWorkerResponse>) => {
      const payload = event.data;
      if (payload.requestId !== requestIdRef.current) {
        return;
      }

      if (!payload.supported) {
        setIsSupported(false);
        setIsPending(false);
        setMasks({});

        worker.terminate();
        workerRef.current = null;
        return;
      }

      const nextMasks = payload.datasets.reduce<Record<string, Uint32Array | null>>(
        (accumulator, dataset) => {
          accumulator[dataset.key] = new Uint32Array(dataset.visibility);
          return accumulator;
        },
        {},
      );

      setIsSupported(true);
      setIsPending(false);
      setMasks(nextMasks);
    };

    const handleError = () => {
      setIsSupported(false);
      setIsPending(false);
      setMasks({});

      worker.terminate();
      workerRef.current = null;
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    const payloadDatasets = datasetEntries
      .filter(([, items]) => items.length > 0)
      .map(([key, items]) => {
        const coordinates = new Float32Array(items.length * 2);

        items.forEach((item, index) => {
          coordinates[index * 2] = item.coordinates[0];
          coordinates[index * 2 + 1] = item.coordinates[1];
        });

        return {
          key,
          coordinates,
        };
      });

    if (payloadDatasets.length === 0 || !bounds) {
      setIsSupported(true);
      setIsPending(false);
      setMasks({});

      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsSupported(true);
    setIsPending(true);

    const requestPayload: VisibilityWorkerRequest = {
      requestId,
      bounds,
      datasets: payloadDatasets,
    };

    worker.postMessage(
      requestPayload,
      payloadDatasets.map((dataset) => dataset.coordinates.buffer),
    );

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
    };
  }, [bounds, datasetEntries, enabled, shouldUseWebGpu, threshold, totalPointCount]);

  React.useEffect(() => {
    return () => {
      if (!workerRef.current) return;
      workerRef.current.terminate();
      workerRef.current = null;
    };
  }, []);

  return {
    isSupported,
    isPending,
    masks,
  };
}
