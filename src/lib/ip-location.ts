type IpLocationMeta = {
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

type CachedIpLocation = {
  coords: [number, number];
  meta: IpLocationMeta | null;
  timestamp: number;
};

const IP_LOCATION_CACHE_KEY = "ip-location-cache";
const IP_LOCATION_CACHE_TTL = 1000 * 60 * 60 * 12;

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

const readCachedIpLocation = (): CachedIpLocation | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(IP_LOCATION_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedIpLocation;
    if (!parsed || !parsed.coords || !parsed.timestamp) return null;
    if (!isValidCoords(parsed.coords)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCachedIpLocation = (entry: CachedIpLocation) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(IP_LOCATION_CACHE_KEY, JSON.stringify(entry));
};

const isCacheFresh = (timestamp: number) =>
  Date.now() - timestamp < IP_LOCATION_CACHE_TTL;

export const resolveIpLocation = async (
  signal?: AbortSignal,
): Promise<IpLocationResult> => {
  const cached = readCachedIpLocation();
  if (cached && isCacheFresh(cached.timestamp)) {
    return { coords: cached.coords, meta: cached.meta, source: "ip" };
  }

  try {
    const response = await fetch("https://ipapi.co/json/", { signal });
    if (!response.ok) throw new Error("ipapi request failed");
    const data = await response.json();
    const latitude = Number(data?.latitude);
    const longitude = Number(data?.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new Error("invalid ip coordinates");
    }

    const coords: [number, number] = [longitude, latitude];
    const meta: IpLocationMeta = {
      country: data?.country_name,
      countryCode: data?.country_code,
      region: data?.region,
      city: data?.city,
      timezone: data?.timezone,
      isp: data?.org ?? data?.asn,
      languages: data?.languages,
      currency: data?.currency,
    };

    writeCachedIpLocation({ coords, meta, timestamp: Date.now() });

    return { coords, meta, source: "ip" };
  } catch {
    const coords = getInitialLocation();
    return { coords, meta: null, source: "timezone" };
  }
};

export type { IpLocationMeta, IpLocationResult };
