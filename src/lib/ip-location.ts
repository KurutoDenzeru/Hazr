type IpLocationMeta = {
  ip?: string;
  provider?: "ip-location";
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  timezone?: string;
  isp?: string;
  languages?: string;
  currency?: string;
};

type IpLocationResult = {
  coords: [number, number];
  meta: IpLocationMeta | null;
  source: "ip" | "timezone";
};

const IP_LOCATION_TIMEOUT_MS = 2500;
const PROVIDER_BACKOFF_MS = 60000;
const RECENT_RESULT_TTL_MS = 5000;

const providerBackoff: Record<string, number> = {};
let inFlightPromise: Promise<IpLocationResult | null> | null = null;
let lastResult: IpLocationResult | null = null;
let lastResolvedAt = 0;

const getInitialLocation = (): [number, number] => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const locations: Record<string, [number, number]> = {
    "America/Los_Angeles": [-122.4194, 37.7749],
    "America/New_York": [-74.006, 40.7128],
    "Europe/London": [-0.1278, 51.5074],
    "Asia/Tokyo": [139.6917, 35.6895],
    "Asia/Manila": [120.9842, 14.5995],
    "Europe/Paris": [2.3522, 48.8566],
    "Australia/Sydney": [151.2093, -33.8688],
  };

  return locations[tz] || [-122.4194, 37.7749];
};

const isValidCoords = (coords: [number, number]) =>
  coords.length === 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1]);

const fetchWithTimeout = async (
  url: string,
  signal?: AbortSignal,
) => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    IP_LOCATION_TIMEOUT_MS,
  );

  const abortHandler = () => controller.abort();
  if (signal) {
    signal.addEventListener("abort", abortHandler, { once: true });
  }

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", abortHandler);
    }
  }
};

const parseIpApiCom = (data: Record<string, unknown>): IpLocationResult | null => {
  if (data?.status === "fail") return null;

  const latitude = Number(data?.lat);
  const longitude = Number(data?.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const coords: [number, number] = [longitude, latitude];
  if (!isValidCoords(coords)) return null;

  const meta: IpLocationMeta = {
    ip: data?.query as string | undefined,
    provider: "ip-location",
    country: data?.country as string | undefined,
    countryCode: data?.countryCode as string | undefined,
    region: data?.region as string | undefined,
    city: data?.city as string | undefined,
    timezone: data?.timezone as string | undefined,
    isp: (data?.isp as string | undefined) ?? (data?.org as string | undefined),
  };

  return { coords, meta, source: "ip" };
};

export const resolveIpLocation = async (
  signal?: AbortSignal,
  options: { allowTimezoneFallback?: boolean } = {},
): Promise<IpLocationResult | null> => {
  const { allowTimezoneFallback = false } = options;

  if (lastResult && Date.now() - lastResolvedAt < RECENT_RESULT_TTL_MS) {
    return lastResult;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  const resolver = async () => {
    try {
    const providers = [
      {
        key: "ip-location",
        url: "/api/ip-location",
        parser: parseIpApiCom,
      },
    ];

      for (const provider of providers) {
        const lastBackoff = providerBackoff[provider.key] ?? 0;
        if (Date.now() - lastBackoff < PROVIDER_BACKOFF_MS) {
          continue;
        }

        try {
          const response = await fetchWithTimeout(provider.url, signal);
          if (response.status === 429) {
            providerBackoff[provider.key] = Date.now();
            continue;
          }
          if (!response.ok) continue;
          const data = await response.json();
          const parsed = provider.parser(data as Record<string, unknown>);
          if (!parsed) continue;
          lastResult = parsed;
          lastResolvedAt = Date.now();
          return parsed;
        } catch {
          continue;
        }
      }

      throw new Error("all ip providers failed");
    } catch {
      if (!allowTimezoneFallback) return null;
      const coords = getInitialLocation();
      const fallback: IpLocationResult = { coords, meta: null, source: "timezone" };
      lastResult = fallback;
      lastResolvedAt = Date.now();
      return fallback;
    } finally {
      inFlightPromise = null;
    }
  };

  inFlightPromise = resolver();
  return inFlightPromise;
};

export type { IpLocationMeta, IpLocationResult };
