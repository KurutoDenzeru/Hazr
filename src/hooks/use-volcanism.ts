import { useCallback, useEffect, useRef, useState } from "react";
import type { ProcessedVolcano, VolcanismRecord, VolcanismResponse } from "@/types/api";

const VOLCANO_API_URL = "https://volcano.si.edu/database/webservices/volcanoes?format=json";

type UseVolcanismOptions = {
  endpoint?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
};

type UseVolcanismReturn = {
  volcanoes: ProcessedVolcano[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toProcessedVolcanoes = (records: VolcanismRecord[]): ProcessedVolcano[] => {
  return records
    .map((record, index): ProcessedVolcano | null => {
      const latitude = toNumber(record.latitude ?? record.lat);
      const longitude = toNumber(record.longitude ?? record.lon);
      if (latitude === null || longitude === null) return null;

      const name = record.volcano_name ?? record.name ?? "Unknown volcano";
      const id = String(record.volcano_id ?? record.id ?? `${name}-${index}`);
      const country = record.country ?? "Unknown";
      const status = record.status ?? "Unknown";
      const url = record.url ?? record.link;

      const base: ProcessedVolcano = {
        id,
        name,
        country,
        status,
        coordinates: [longitude, latitude],
      };
      return url ? { ...base, url } : base;
    })
    .filter((volcano): volcano is ProcessedVolcano => Boolean(volcano));
};

const extractRecords = (data: VolcanismResponse | VolcanismRecord[]): VolcanismRecord[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.volcanoes)) return data.volcanoes;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

export const useVolcanism = (options: UseVolcanismOptions = {}): UseVolcanismReturn => {
  const {
    endpoint = VOLCANO_API_URL,
    autoRefresh = true,
    refreshInterval = 3600000,
  } = options;

  const [volcanoes, setVolcanoes] = useState<ProcessedVolcano[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchVolcanoes = useCallback(async () => {
    if (!endpoint) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch volcanoes: ${response.statusText}`);
      }

      const data = (await response.json()) as VolcanismResponse | VolcanismRecord[];
      const records = extractRecords(data);
      setVolcanoes(toProcessedVolcanoes(records));
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchVolcanoes();
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchVolcanoes, refreshInterval);
    return () => {
      clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, [fetchVolcanoes, autoRefresh, refreshInterval]);

  return { volcanoes, isLoading, error, lastUpdated, refetch: fetchVolcanoes };
};

export default useVolcanism;
