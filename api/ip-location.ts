import type { VercelRequest, VercelResponse } from "@vercel/node";

const IP_API_URL =
  "http://ip-api.com/json/?fields=query,status,country,countryCode,region,regionName,city,timezone,isp,org,lat,lon";
const IPWHOIS_URL = "https://ipwho.is/";
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

  // Try ip-api.com first
  try {
    const response = await fetchWithTimeout(IP_API_URL, TIMEOUT_MS);
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

  // Fallback: ipwho.is
  try {
    const response = await fetchWithTimeout(IPWHOIS_URL, TIMEOUT_MS);
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
