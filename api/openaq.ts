import type { VercelRequest, VercelResponse } from "@vercel/node";

const OPENAQ_BASE = "https://api.openaq.org/v3";
const TIMEOUT_MS = 8000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Extract path after /api/openaq
  const rawUrl = req.url ?? "";
  const pathStart = rawUrl.indexOf("/api/openaq");
  const subPath = pathStart >= 0 ? rawUrl.slice(pathStart + "/api/openaq".length) : rawUrl;
  const targetUrl = `${OPENAQ_BASE}${subPath}`;

  const headers: Record<string, string> = {};
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string" && apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      signal: controller.signal,
    });

    const body = await response.text();
    res.status(response.status);

    // Forward relevant headers
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) res.setHeader("Cache-Control", cacheControl);

    res.setHeader("Content-Type", response.headers.get("Content-Type") ?? "application/json");
    return res.send(body);
  } catch {
    return res.status(502).json({ error: "OpenAQ upstream request failed" });
  } finally {
    clearTimeout(timer);
  }
}
