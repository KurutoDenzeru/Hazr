import type { VercelRequest, VercelResponse } from "@vercel/node";

const getClientIp = (req: VercelRequest): string | null => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0]?.trim() ?? null;
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string") return realIp;
  return null;
};

const TIMEOUT_MS = 4000;

type NormalizedResponse = {
  status: "success" | "fail";
  query?: string;
  lat?: number;
  lon?: number;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  timezone?: string;
  isp?: string;
};

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Hazr/1.0" },
    });
  } finally {
    clearTimeout(timer);
  }
};

const normalizeIpApi = (data: Record<string, unknown>): NormalizedResponse => ({
  status: data.status === "success" ? "success" : "fail",
  query: data.query as string | undefined,
  lat: Number(data.lat) || undefined,
  lon: Number(data.lon) || undefined,
  country: data.country as string | undefined,
  countryCode: data.countryCode as string | undefined,
  region: data.regionName as string | undefined,
  city: data.city as string | undefined,
  timezone: data.timezone as string | undefined,
  isp: (data.isp as string | undefined) ?? (data.org as string | undefined),
});

const normalizeIpWhoIs = (data: Record<string, unknown>): NormalizedResponse => {
  if (data.success === false) {
    return { status: "fail" };
  }
  const geo = data.location as Record<string, unknown> | undefined;
  return {
    status: "success",
    query: data.ip as string | undefined,
    lat: Number(geo?.latitude) || undefined,
    lon: Number(geo?.longitude) || undefined,
    country: data.country as string | undefined,
    countryCode: data.country_code as string | undefined,
    region: data.region as string | undefined,
    city: data.city as string | undefined,
    timezone: (geo?.timezone_id as string | undefined) ?? (data.timezone as string | undefined),
    isp: data.connection?.isp as string | undefined,
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Extract client IP from Vercel forwarded headers
  const clientIp = getClientIp(req);

  // Try ip-api.com first (supports /json/{IP} for specific IP lookup)
  try {
    const url = clientIp
      ? `http://ip-api.com/json/${clientIp}?fields=query,status,country,countryCode,region,regionName,city,timezone,isp,org,lat,lon`
      : "http://ip-api.com/json/?fields=query,status,country,countryCode,region,regionName,city,timezone,isp,org,lat,lon";
    const response = await fetchWithTimeout(url, TIMEOUT_MS);
    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      const normalized = normalizeIpApi(data);
      if (normalized.status === "success" && normalized.lat && normalized.lon) {
        return res.status(200).json(normalized);
      }
    }
  } catch {
    // fall through
  }

  // Fallback: ipwho.is (supports /{IP} for specific IP lookup)
  try {
    const url = clientIp ? `https://ipwho.is/${clientIp}` : "https://ipwho.is/";
    const response = await fetchWithTimeout(url, TIMEOUT_MS);
    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      const normalized = normalizeIpWhoIs(data);
      if (normalized.status === "success" && normalized.lat && normalized.lon) {
        return res.status(200).json(normalized);
      }
    }
  } catch {
    // fall through
  }

  return res.status(502).json({ error: "All IP location providers failed" });
}
