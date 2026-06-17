import type { Plugin } from "vite";

const PTWC_FEEDS = [
  "https://www.tsunami.gov/events/xml/PHEBAtom.xml",
  "https://www.tsunami.gov/events/xml/PAAQAtom.xml",
];

const TIMEOUT_MS = 5000;

type PtwcAlert = {
  id: string;
  headline: string;
  severity: string;
  sent: string | null;
  coordinates: [number, number];
  url?: string;
};

const mapSeverity = (summary: string): string => {
  const lower = summary.toLowerCase();
  if (lower.includes("warning")) return "Warning";
  if (lower.includes("watch")) return "Watch";
  if (lower.includes("advisory")) return "Advisory";
  if (lower.includes("information")) return "Information";
  return "Unknown";
};

const parseAtomXml = (xml: string): PtwcAlert[] => {
  const alerts: PtwcAlert[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const getTag = (tag: string): string => {
      const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
      return m?.[1]?.trim() ?? "";
    };

    const title = getTag("title");
    const updated = getTag("updated");
    const id = getTag("id");

    const latMatch = entry.match(/<geo:lat[^>]*>([\d.\-]+)<\/geo:lat>/i);
    const lonMatch = entry.match(/<geo:long[^>]*>([\d.\-]+)<\/geo:long>/i);
    if (!latMatch || !lonMatch) continue;

    const lat = parseFloat(latMatch[1]);
    const lon = parseFloat(lonMatch[1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

    const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    const summaryRaw = summaryMatch?.[1] ?? "";
    const summaryText = summaryRaw.replace(/<[^>]+>/g, "").trim();

    const severity = mapSeverity(summaryText);

    let bulletinUrl: string | undefined;
    const linkRegex = /<link[^>]*title="Bulletin"[^>]*href="([^"]+)"/gi;
    const linkMatch = linkRegex.exec(entry);
    if (linkMatch) bulletinUrl = linkMatch[1];

    alerts.push({
      id: id || `ptwc-${lat}-${lon}-${updated}`,
      headline: `[${severity}] ${title || "PTWC Tsunami Bulletin"}`,
      severity,
      sent: updated || null,
      coordinates: [lon, lat],
      url: bulletinUrl,
    });
  }

  return alerts;
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

export function tsunamiDevProxy(): Plugin {
  return {
    name: "tsunami-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/api/tsunami", async (_req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");

        if (_req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }

        const results = await Promise.allSettled(
          PTWC_FEEDS.map(async (url) => {
            const response = await fetchWithTimeout(url, TIMEOUT_MS);
            if (!response.ok) throw new Error(`${response.status}`);
            return response.text();
          }),
        );

        const allAlerts: PtwcAlert[] = [];
        for (const result of results) {
          if (result.status === "fulfilled") {
            allAlerts.push(...parseAtomXml(result.value));
          }
        }

        allAlerts.sort((a, b) => {
          const dateA = a.sent ? new Date(a.sent).getTime() : 0;
          const dateB = b.sent ? new Date(b.sent).getTime() : 0;
          return dateB - dateA;
        });

        if (allAlerts.length === 0 && results.every((r) => r.status === "rejected")) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "All PTWC feeds failed" }));
          return;
        }

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ alerts: allAlerts }));
      });
    },
  };
}
