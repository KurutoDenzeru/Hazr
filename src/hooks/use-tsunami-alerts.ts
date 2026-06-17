import { useCallback, useEffect, useRef, useState } from "react";
import type { NwsAlertsResponse, ProcessedTsunamiAlert } from "@/types/api";
import { toPointFromGeometry } from "@/lib/geo";

const NWS_TSUNAMI_URL = "https://api.weather.gov/alerts/active?event=Tsunami";

const PTWC_FEEDS = [
  "https://www.tsunami.gov/events/xml/PHEBAtom.xml",
  "https://www.tsunami.gov/events/xml/PAAQAtom.xml",
] as const;
const GEO_NS = "http://www.w3.org/2003/01/geo/wgs84_pos#";

type UseTsunamiAlertsOptions = {
  autoRefresh?: boolean;
  refreshInterval?: number;
};

type UseTsunamiAlertsReturn = {
  alerts: ProcessedTsunamiAlert[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
};

/** Map PTWC category text to a severity label */
const mapPtwcSeverity = (summaryText: string): string => {
  const lower = summaryText.toLowerCase();
  if (lower.includes("warning")) return "Warning";
  if (lower.includes("watch")) return "Watch";
  if (lower.includes("advisory")) return "Advisory";
  if (lower.includes("information")) return "Information";
  return "Unknown";
};

/** Extract text content from an XHTML summary element */
const extractSummaryText = (el: Element | null): string => {
  if (!el) return "";
  const div = document.createElement("div");
  div.appendChild(el.cloneNode(true));
  return div.textContent?.trim() ?? "";
};

/** Parse a single PTWC Atom XML string into ProcessedTsunamiAlert[] */
const parsePtwcAtom = (xmlText: string): ProcessedTsunamiAlert[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const entries = doc.querySelectorAll("entry");
  const alerts: ProcessedTsunamiAlert[] = [];

  entries.forEach((entry) => {
    const titleEl = entry.querySelector("title");
    const updatedEl = entry.querySelector("updated");
    const latEl = entry.getElementsByTagNameNS(GEO_NS, "lat")[0];
    const lonEl = entry.getElementsByTagNameNS(GEO_NS, "long")[0];
    const summaryEl = entry.querySelector("summary");
    const idEl = entry.querySelector("id");

    const lat = latEl ? parseFloat(latEl.textContent ?? "") : NaN;
    const lon = lonEl ? parseFloat(lonEl.textContent ?? "") : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;

    const summaryText = extractSummaryText(summaryEl);
    const headline = titleEl?.textContent?.trim() ?? "PTWC Tsunami Bulletin";
    const category = mapPtwcSeverity(summaryText);

    // Find bulletin link
    let bulletinUrl: string | undefined;
    entry.querySelectorAll("link").forEach((link) => {
      const title = link.getAttribute("title") ?? "";
      if (title === "Bulletin") {
        bulletinUrl = link.getAttribute("href") ?? undefined;
      }
    });

    alerts.push({
      id: idEl?.textContent?.trim() ?? `ptwc-${lat}-${lon}-${updatedEl?.textContent ?? ""}`,
      headline: `[${category}] ${headline}`,
      severity: category,
      sent: updatedEl?.textContent ? new Date(updatedEl.textContent) : null,
      coordinates: [lon, lat],
      url: bulletinUrl,
    });
  });

  return alerts;
};

/** Parse NWS GeoJSON alerts */
const parseNwsAlerts = (data: NwsAlertsResponse): ProcessedTsunamiAlert[] => {
  return data.features
    .map((feature): ProcessedTsunamiAlert | null => {
      const coordinates = toPointFromGeometry(feature.geometry ?? null);
      if (!coordinates) return null;
      const base: ProcessedTsunamiAlert = {
        id: feature.id,
        headline: feature.properties?.headline ?? "Tsunami Alert",
        severity: feature.properties?.severity ?? "Unknown",
        sent: feature.properties?.sent ? new Date(feature.properties.sent) : null,
        coordinates,
      };
      return feature.properties?.web ? { ...base, url: feature.properties.web } : base;
    })
    .filter((alert): alert is ProcessedTsunamiAlert => Boolean(alert));
};

/** Fetch and parse all PTWC Atom feeds */
const fetchPtwcAlerts = async (signal?: AbortSignal): Promise<ProcessedTsunamiAlert[]> => {
  const results = await Promise.allSettled(
    PTWC_FEEDS.map(async (url) => {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`PTWC ${res.status}`);
      return res.text();
    }),
  );

  const alerts: ProcessedTsunamiAlert[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      alerts.push(...parsePtwcAtom(result.value));
    }
  }
  return alerts;
};

/** Fetch active NWS tsunami alerts */
const fetchNwsAlerts = async (signal?: AbortSignal): Promise<ProcessedTsunamiAlert[]> => {
  const res = await fetch(NWS_TSUNAMI_URL, { signal });
  if (!res.ok) throw new Error(`NWS ${res.status}`);
  const data: NwsAlertsResponse = await res.json();
  return parseNwsAlerts(data);
};

export const useTsunamiAlerts = (
  options: UseTsunamiAlertsOptions = {},
): UseTsunamiAlertsReturn => {
  const { autoRefresh = true, refreshInterval = 300000 } = options;

  const [alerts, setAlerts] = useState<ProcessedTsunamiAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setError(null);

    try {
      // Try PTWC first (has real tsunami data), then NWS as supplement
      const [ptwcAlerts, nwsAlerts] = await Promise.allSettled([
        fetchPtwcAlerts(signal),
        fetchNwsAlerts(signal),
      ]);

      const allAlerts: ProcessedTsunamiAlert[] = [];
      if (ptwcAlerts.status === "fulfilled") allAlerts.push(...ptwcAlerts.value);
      if (nwsAlerts.status === "fulfilled") allAlerts.push(...nwsAlerts.value);

      // Deduplicate by coordinates + date proximity
      const seen = new Set<string>();
      const deduplicated = allAlerts.filter((alert) => {
        const key = `${alert.coordinates[0]},${alert.coordinates[1]},${alert.sent?.toISOString()?.slice(0, 10) ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Sort newest first
      deduplicated.sort((a, b) => (b.sent?.getTime() ?? 0) - (a.sent?.getTime() ?? 0));

      setAlerts(deduplicated);
      setLastUpdated(new Date());

      // Only set error if both sources failed
      if (ptwcAlerts.status === "rejected" && nwsAlerts.status === "rejected") {
        setError(new Error("All tsunami data sources failed"));
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchAlerts, refreshInterval);
    return () => {
      clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, [fetchAlerts, autoRefresh, refreshInterval]);

  return { alerts, isLoading, error, lastUpdated, refetch: fetchAlerts };
};

export default useTsunamiAlerts;
