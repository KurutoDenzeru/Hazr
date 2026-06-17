import { useCallback, useEffect, useRef, useState } from "react";
import type { ProcessedTsunamiAlert } from "@/types/api";

const TSUNAMI_API_URL = "/api/tsunami";

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

interface TsunamiApiResponse {
  alerts: Array<{
    id: string;
    headline: string;
    severity: string;
    sent: string | null;
    coordinates: [number, number];
    url?: string;
  }>;
}

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
      const response = await fetch(TSUNAMI_API_URL, { signal });

      if (!response.ok) {
        throw new Error(`Failed to fetch tsunami alerts: ${response.statusText}`);
      }

      const data: TsunamiApiResponse = await response.json();
      const processed: ProcessedTsunamiAlert[] = data.alerts.map((alert) => ({
        id: alert.id,
        headline: alert.headline,
        severity: alert.severity,
        sent: alert.sent ? new Date(alert.sent) : null,
        coordinates: alert.coordinates,
        url: alert.url,
      }));

      setAlerts(processed);
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
