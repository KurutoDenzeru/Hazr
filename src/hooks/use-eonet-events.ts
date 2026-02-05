import { useCallback, useEffect, useRef, useState } from "react";
import type { EonetEventsResponse, ProcessedEonetEvent } from "@/types/api";
import { toPointFromGeometry } from "@/lib/geo";

const EONET_BASE_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";

type UseEonetEventsOptions = {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
};

type UseEonetEventsReturn = {
  events: ProcessedEonetEvent[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
};

const buildEonetUrl = (limit: number) => {
  const params = new URLSearchParams({ status: "open", limit: `${limit}` });
  return `${EONET_BASE_URL}?${params.toString()}`;
};

const toProcessedEvents = (data: EonetEventsResponse): ProcessedEonetEvent[] => {
  return data.events
    .map((event) => {
      const geometry = [...event.geometry].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0];
      const coordinates = toPointFromGeometry(geometry ?? null);
      if (!coordinates) return null;
      return {
        id: event.id,
        title: event.title,
        category: event.categories?.[0]?.title ?? "Natural Event",
        date: new Date(geometry.date),
        coordinates,
        url: event.link,
      };
    })
    .filter((event): event is ProcessedEonetEvent => Boolean(event))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const useEonetEvents = (options: UseEonetEventsOptions = {}): UseEonetEventsReturn => {
  const { limit = 200, autoRefresh = true, refreshInterval = 300000 } = options;

  const [events, setEvents] = useState<ProcessedEonetEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchEvents = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(buildEonetUrl(limit), {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch EONET events: ${response.statusText}`);
      }

      const data: EonetEventsResponse = await response.json();
      setEvents(toProcessedEvents(data));
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchEvents();
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchEvents, refreshInterval);
    return () => {
      clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, [fetchEvents, autoRefresh, refreshInterval]);

  return { events, isLoading, error, lastUpdated, refetch: fetchEvents };
};

export default useEonetEvents;
