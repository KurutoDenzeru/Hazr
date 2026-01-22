import { useState, useEffect, useCallback, useRef } from "react";
import type {
  EarthquakeFeedResponse,
  EarthquakeFeedRange,
  EarthquakeMagnitude,
  ProcessedEarthquake,
} from "@/types/api";

const USGS_BASE_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary";

const buildFeedUrl = (magnitude: EarthquakeMagnitude, range: EarthquakeFeedRange): string => {
  const magPath = magnitude === "significant" ? "significant" : `${magnitude}`;
  return `${USGS_BASE_URL}/${magPath}_${range}.geojson`;
};

const processEarthquake = (feature: EarthquakeFeedResponse["features"][0]): ProcessedEarthquake => {
  const { properties, geometry, id } = feature;
  return {
    id,
    magnitude: properties.mag ?? 0,
    place: properties.place ?? "Unknown location",
    time: new Date(properties.time),
    updated: new Date(properties.updated),
    depth: geometry.coordinates[2],
    coordinates: [geometry.coordinates[0], geometry.coordinates[1]],
    url: properties.url,
    alert: properties.alert,
    tsunami: properties.tsunami === 1,
    title: properties.title,
    status: properties.status,
    sig: properties.sig,
    felt: properties.felt,
    cdi: properties.cdi,
    mmi: properties.mmi,
    magType: properties.magType,
    gap: properties.gap,
    rms: properties.rms,
    nst: properties.nst,
    dmin: properties.dmin,
    net: properties.net,
    types: properties.types,
  };
};

type UseEarthquakesOptions = {
  magnitude?: EarthquakeMagnitude;
  range?: EarthquakeFeedRange;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
};

type UseEarthquakesReturn = {
  earthquakes: ProcessedEarthquake[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  metadata: {
    title: string;
    count: number;
    generated: Date;
  } | null;
};

export const useEarthquakes = (options: UseEarthquakesOptions = {}): UseEarthquakesReturn => {
  const {
    magnitude = "all",
    range = "day",
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute default
  } = options;

  const [earthquakes, setEarthquakes] = useState<ProcessedEarthquake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [metadata, setMetadata] = useState<UseEarthquakesReturn["metadata"]>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchEarthquakes = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const url = buildFeedUrl(magnitude, range);
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch earthquakes: ${response.statusText}`);
      }

      const data: EarthquakeFeedResponse = await response.json();

      const processed = data.features
        .map(processEarthquake)
        .sort((a, b) => b.time.getTime() - a.time.getTime());

      setEarthquakes(processed);
      setMetadata({
        title: data.metadata.title,
        count: data.metadata.count,
        generated: new Date(data.metadata.generated),
      });
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore abort errors
      }
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [magnitude, range]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchEarthquakes();

    if (!autoRefresh) return;

    const intervalId = setInterval(fetchEarthquakes, refreshInterval);

    return () => {
      clearInterval(intervalId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchEarthquakes, autoRefresh, refreshInterval]);

  return {
    earthquakes,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchEarthquakes,
    metadata,
  };
};

export default useEarthquakes;
