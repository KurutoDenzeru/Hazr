/// <reference lib="webworker" />

type ViewportBounds = {
  west: number;
  east: number;
  south: number;
  north: number;
};

type VisibilityDatasetPayload = {
  key: string;
  coordinates: ArrayBuffer;
};

type VisibilityRequestPayload = {
  requestId: number;
  bounds: ViewportBounds;
  datasets: VisibilityDatasetPayload[];
};

type VisibilityDatasetResponse = {
  key: string;
  visibility: ArrayBuffer;
};

type VisibilityResponsePayload = {
  requestId: number;
  supported: boolean;
  datasets: VisibilityDatasetResponse[];
};

type GpuAdapter = {
  requestDevice: () => Promise<GpuDevice>;
};

type GpuDevice = {
  queue: {
    writeBuffer: (
      buffer: GpuBuffer,
      offset: number,
      data: ArrayBuffer | ArrayBufferView,
    ) => void;
    submit: (commands: unknown[]) => void;
  };
  createBuffer: (options: {
    size: number;
    usage: number;
  }) => GpuBuffer;
  createBindGroup: (options: {
    layout: unknown;
    entries: Array<{
      binding: number;
      resource: { buffer: GpuBuffer };
    }>;
  }) => unknown;
  createCommandEncoder: () => GpuCommandEncoder;
  createComputePipeline: (options: {
    layout: "auto";
    compute: {
      module: GpuShaderModule;
      entryPoint: string;
    };
  }) => GpuComputePipeline;
  createShaderModule: (options: { code: string }) => GpuShaderModule;
  lost: Promise<unknown>;
};

type GpuBuffer = {
  destroy: () => void;
  mapAsync: (mode: number) => Promise<void>;
  getMappedRange: () => ArrayBuffer;
  unmap: () => void;
};

type GpuCommandEncoder = {
  beginComputePass: () => GpuComputePassEncoder;
  copyBufferToBuffer: (
    source: GpuBuffer,
    sourceOffset: number,
    destination: GpuBuffer,
    destinationOffset: number,
    size: number,
  ) => void;
  finish: () => unknown;
};

type GpuComputePassEncoder = {
  setPipeline: (pipeline: GpuComputePipeline) => void;
  setBindGroup: (index: number, bindGroup: unknown) => void;
  dispatchWorkgroups: (x: number) => void;
  end: () => void;
};

type GpuComputePipeline = {
  getBindGroupLayout: (index: number) => unknown;
};

type GpuShaderModule = unknown;

type NavigatorWithGpu = Navigator & {
  gpu: {
    requestAdapter: (options?: { powerPreference?: "high-performance" | "low-power" }) => Promise<GpuAdapter | null>;
  };
};

const WORKGROUP_SIZE = 64;
const BOUNDS_BUFFER_SIZE = 16;

const GPU_BUFFER_USAGE = {
  MAP_READ: 0x0001,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
} as const;

const GPU_MAP_MODE = {
  READ: 0x0001,
} as const;

const shaderCode = /* wgsl */ `
struct Bounds {
  west: f32,
  east: f32,
  south: f32,
  north: f32,
}

@group(0) @binding(0) var<storage, read> coordinates: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> visibility: array<u32>;
@group(0) @binding(2) var<uniform> bounds: Bounds;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let index = globalId.x;
  if (index >= arrayLength(&coordinates)) {
    return;
  }

  let coord = coordinates[index];
  let withinLongitude =
    (bounds.west <= bounds.east && coord.x >= bounds.west && coord.x <= bounds.east) ||
    (bounds.west > bounds.east && (coord.x >= bounds.west || coord.x <= bounds.east));
  let withinLatitude = coord.y >= bounds.south && coord.y <= bounds.north;

  visibility[index] = select(0u, 1u, withinLongitude && withinLatitude);
}
`;

let devicePromise: Promise<GpuDevice | null> | null = null;
let pipelinePromise: Promise<GpuComputePipeline | null> | null = null;

const getGpuDevice = async (): Promise<GpuDevice | null> => {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) return null;

  const gpuNavigator = navigator as NavigatorWithGpu;
  const adapter = await gpuNavigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) return null;

  return (await adapter.requestDevice()) as unknown as GpuDevice;
};

const getDevice = async (): Promise<GpuDevice | null> => {
  if (!devicePromise) {
    devicePromise = getGpuDevice();
  }

  const device = await devicePromise;
  if (!device) {
    devicePromise = null;
  }

  return device;
};

const getPipeline = async (): Promise<GpuComputePipeline | null> => {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const device = await getDevice();
      if (!device) return null;

      const pipeline = device.createComputePipeline({
        layout: "auto",
        compute: {
          module: device.createShaderModule({ code: shaderCode }),
          entryPoint: "main",
        },
      });

      device.lost.then(() => {
        devicePromise = null;
        pipelinePromise = null;
      });

      return pipeline;
    })();
  }

  const pipeline = await pipelinePromise;
  if (!pipeline) {
    pipelinePromise = null;
  }

  return pipeline;
};

const processDataset = async (
  device: GpuDevice,
  pipeline: GpuComputePipeline,
  bounds: ViewportBounds,
  coordinatesBuffer: ArrayBuffer,
): Promise<ArrayBuffer> => {
  const pointCount = coordinatesBuffer.byteLength / (Float32Array.BYTES_PER_ELEMENT * 2);
  if (pointCount === 0) return new Uint32Array(0).buffer;

  const storageBuffer = device.createBuffer({
    size: coordinatesBuffer.byteLength,
    usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
  });
  device.queue.writeBuffer(storageBuffer, 0, coordinatesBuffer);

  const visibilityBuffer = device.createBuffer({
    size: pointCount * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_SRC,
  });

  const readbackBuffer = device.createBuffer({
    size: pointCount * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPU_BUFFER_USAGE.COPY_DST | GPU_BUFFER_USAGE.MAP_READ,
  });

  const boundsBuffer = device.createBuffer({
    size: BOUNDS_BUFFER_SIZE,
    usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
  });
  device.queue.writeBuffer(
    boundsBuffer,
    0,
    new Float32Array([bounds.west, bounds.east, bounds.south, bounds.north]),
  );

  const commandEncoder = device.createCommandEncoder();
  const pass = commandEncoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(
    0,
    device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: storageBuffer } },
        { binding: 1, resource: { buffer: visibilityBuffer } },
        { binding: 2, resource: { buffer: boundsBuffer } },
      ],
    }),
  );
  pass.dispatchWorkgroups(Math.ceil(pointCount / WORKGROUP_SIZE));
  pass.end();

  commandEncoder.copyBufferToBuffer(
    visibilityBuffer,
    0,
    readbackBuffer,
    0,
    pointCount * Uint32Array.BYTES_PER_ELEMENT,
  );

  device.queue.submit([commandEncoder.finish()]);
  await readbackBuffer.mapAsync(GPU_MAP_MODE.READ);

  const mapped = readbackBuffer.getMappedRange().slice(0);
  readbackBuffer.unmap();

  storageBuffer.destroy();
  visibilityBuffer.destroy();
  readbackBuffer.destroy();
  boundsBuffer.destroy();

  return mapped;
};

const workerGlobal = self as DedicatedWorkerGlobalScope;

workerGlobal.onmessage = async (event: MessageEvent<VisibilityRequestPayload>) => {
  const { requestId, bounds, datasets } = event.data;
  const pipeline = await getPipeline();

  if (!pipeline) {
    const response: VisibilityResponsePayload = {
      requestId,
      supported: false,
      datasets: [],
    };
    workerGlobal.postMessage(response);
    return;
  }

  const device = await getDevice();
  if (!device) {
    const response: VisibilityResponsePayload = {
      requestId,
      supported: false,
      datasets: [],
    };
    workerGlobal.postMessage(response);
    return;
  }

  try {
    const processed = await Promise.all(
      datasets.map(async (dataset) => ({
        key: dataset.key,
        visibility: await processDataset(device, pipeline, bounds, dataset.coordinates),
      })),
    );

    const response: VisibilityResponsePayload = {
      requestId,
      supported: true,
      datasets: processed,
    };

    workerGlobal.postMessage(
      response,
      processed.map((dataset) => dataset.visibility),
    );
  } catch {
    pipelinePromise = null;
    devicePromise = null;

    const response: VisibilityResponsePayload = {
      requestId,
      supported: false,
      datasets: [],
    };
    workerGlobal.postMessage(response);
  }
};
