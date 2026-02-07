import { useCallback, useEffect, useRef, useState } from "react";
import type { OpenAQLatestResponse, ProcessedAirQualitySite } from "@/types/api";

const OPENAQ_PARAMETER = {
  id: 2,
  label: "PM2.5",
  unit: "ug/m3",
};
const OPENAQ_BASE_URL = `/api/openaq/parameters/${OPENAQ_PARAMETER.id}/latest`;
const OPENAQ_API_KEY = import.meta.env.VITE_OPENAQ_API_KEY ?? "";

type UseAirQualityOptions = {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
};

type UseAirQualityReturn = {
  sites: ProcessedAirQualitySite[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
};

const buildOpenAqUrl = (limit: number) => {
  const params = new URLSearchParams({ limit: `${limit}` });
  return `${OPENAQ_BASE_URL}?${params.toString()}`;
};

const buildOpenAqLocationUrl = (locationId: number) => `https://openaq.org/locations/${locationId}`;

const toProcessedSites = (data: OpenAQLatestResponse): ProcessedAirQualitySite[] => {
  return data.results
    .map((result, index): ProcessedAirQualitySite | null => {
      const { latitude, longitude } = result.coordinates;
      if (latitude === null || longitude === null) return null;
      const measuredAt = result.datetime?.utc ? new Date(result.datetime.utc) : null;
      const hasValidMeasuredAt = measuredAt instanceof Date && !Number.isNaN(measuredAt.getTime());
      return {
        id: `${result.locationsId}-${result.sensorsId}-${index}`,
        location: result.location?.trim() || `Location ${result.locationsId}`,
        parameter: OPENAQ_PARAMETER.label,
        value: result.value,
        unit: OPENAQ_PARAMETER.unit,
        coordinates: [longitude, latitude],
        locationId: result.locationsId,
        sensorId: result.sensorsId,
        measuredAt: hasValidMeasuredAt ? measuredAt : null,
        locationName: result.location ?? null,
        city: result.city ?? null,
        country: result.country ?? null,
        averagingPeriod: result.period?.label ?? result.period?.interval ?? null,
        coveragePercent: result.coverage?.percentCoverage ?? null,
        averageValue: result.summary?.avg ?? null,
        minValue: result.summary?.min ?? null,
        maxValue: result.summary?.max ?? null,
        sourceUrl: buildOpenAqLocationUrl(result.locationsId),
      };
    })
    .filter((site): site is ProcessedAirQualitySite => Boolean(site));
};

export const useAirQuality = (options: UseAirQualityOptions = {}): UseAirQualityReturn => {
  const { limit = 200, autoRefresh = true, refreshInterval = 300000 } = options;

  const [sites, setSites] = useState<ProcessedAirQualitySite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSites = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    if (!OPENAQ_API_KEY) {
      setError(new Error("OpenAQ API key is required."));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(buildOpenAqUrl(limit), {
        signal: abortControllerRef.current.signal,
        headers: {
          "X-API-Key": OPENAQ_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch air quality: ${response.statusText}`);
      }

      const data: OpenAQLatestResponse = await response.json();
      setSites(toProcessedSites(data));
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchSites();
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchSites, refreshInterval);
    return () => {
      clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, [fetchSites, autoRefresh, refreshInterval]);

  return { sites, isLoading, error, lastUpdated, refetch: fetchSites };
};

export default useAirQuality;
