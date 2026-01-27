type IpLocationMeta = {
  ip?: string;
  provider?: "ipapi" | "ipwhois" | "ipinfo";
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

const fetchWithTimeout = async (url: string, signal?: AbortSignal) => {
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

const parseIpApi = (data: Record<string, unknown>): IpLocationResult | null => {
  const latitude = Number(data?.latitude);
  const longitude = Number(data?.longitude);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const coords: [number, number] = [longitude, latitude];
  if (!isValidCoords(coords)) return null;

  const meta: IpLocationMeta = {
    ip: data?.ip as string | undefined,
    provider: "ipapi",
    country: data?.country_name as string | undefined,
    countryCode: data?.country_code as string | undefined,
    region: data?.region as string | undefined,
    city: data?.city as string | undefined,
    timezone: data?.timezone as string | undefined,
    isp: (data?.org as string | undefined) ?? (data?.asn as string | undefined),
    languages: data?.languages as string | undefined,
    currency: data?.currency as string | undefined,
  };

  return { coords, meta, source: "ip" };
};

const parseIpInfo = (data: Record<string, unknown>): IpLocationResult | null => {
  const loc = (data?.loc as string | undefined)?.split(",");
  if (!loc || loc.length !== 2) return null;
  const latitude = Number(loc[0]);
  const longitude = Number(loc[1]);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const coords: [number, number] = [longitude, latitude];
  if (!isValidCoords(coords)) return null;

  const meta: IpLocationMeta = {
    ip: data?.ip as string | undefined,
    provider: "ipinfo",
    country: data?.country as string | undefined,
    countryCode: data?.country as string | undefined,
    region: data?.region as string | undefined,
    city: data?.city as string | undefined,
    timezone: data?.timezone as string | undefined,
    isp: data?.org as string | undefined,
  };

  return { coords, meta, source: "ip" };
};

export const resolveIpLocation = async (
  signal?: AbortSignal,
  options: { allowTimezoneFallback?: boolean } = {},
): Promise<IpLocationResult | null> => {
  const { allowTimezoneFallback = false } = options;

  try {
    const providers = [
      {
        url: "https://ipinfo.io/json",
        parser: parseIpInfo,
      },
      {
        url: "https://ipapi.co/json/",
        parser: parseIpApi,
      },
    ];

    for (const provider of providers) {
      const response = await fetchWithTimeout(provider.url, signal);
      if (!response.ok) continue;
      const data = await response.json();
      const parsed = provider.parser(data as Record<string, unknown>);
      if (!parsed) continue;
      return parsed;
    }

    throw new Error("all ip providers failed");
  } catch {
    if (!allowTimezoneFallback) return null;
    const coords = getInitialLocation();
    return { coords, meta: null, source: "timezone" };
  }
};

export type { IpLocationMeta, IpLocationResult };
