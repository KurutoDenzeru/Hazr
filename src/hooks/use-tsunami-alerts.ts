import { useCallback, useEffect, useRef, useState } from "react";
import type { NwsAlertsResponse, ProcessedTsunamiAlert } from "@/types/api";
import { toPointFromGeometry } from "@/lib/geo";

const NWS_TSUNAMI_URL = "https://api.weather.gov/alerts/active?event=Tsunami";

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

const toProcessedAlerts = (data: NwsAlertsResponse): ProcessedTsunamiAlert[] => {
  const alerts = data.features
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

  return alerts.sort((a, b) => (b.sent?.getTime() ?? 0) - (a.sent?.getTime() ?? 0));
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

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(NWS_TSUNAMI_URL, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tsunami alerts: ${response.statusText}`);
      }

      const data: NwsAlertsResponse = await response.json();
      setAlerts(toProcessedAlerts(data));
      setLastUpdated(new Date());
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
