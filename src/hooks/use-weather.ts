import { useState, useEffect, useCallback, useRef } from "react";
import type {
  WeatherResponse,
  ProcessedWeather,
  ProcessedHourlyForecast,
  ProcessedDailyForecast,
  LocationInfo,
  WeatherCode,
} from "@/types/api";
import { WEATHER_CODE_DESCRIPTIONS } from "@/types/api";
import { resolveIpLocation } from "@/lib/ip-location";

const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/reverse";
const LOCATION_LOOKUP_TIMEOUT_MS = 1800;


type UseWeatherOptions = {
  latitude: number | null;
  longitude: number | null;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  forecastHours?: number; // how many hours to fetch (default 48)
};

type UseWeatherReturn = {
  current: ProcessedWeather | null;
  hourly: ProcessedHourlyForecast[];
  daily: ProcessedDailyForecast[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  locationInfo: LocationInfo | null;
  selectedHourIndex: number;
  setSelectedHourIndex: (index: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  goNextHour: () => void;
  goPrevHour: () => void;
};

const buildWeatherUrl = (lat: number, lng: number, forecastDays: number = 7): string => {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "uv_index",
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "uv_index",
      "is_day",
      "visibility",
      "surface_pressure",
      "dew_point_2m",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "sunrise",
      "sunset",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "uv_index_max",
    ].join(","),
    timezone: "auto",
    forecast_days: forecastDays.toString(),
  });

  return `${OPEN_METEO_BASE_URL}?${params.toString()}`;
};

const fetchLocationName = async (
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<LocationInfo | null> => {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: "json",
      zoom: "10",
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      signal,
      headers: {
        "Accept-Language": "en",
        "User-Agent": "Naero Weather App",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const address = data.address || {};

    const city = address.city || address.town || address.village || address.municipality || address.county || "";
    const region = address.state || address.region || "";
    const country = address.country || "";
    const countryCode = address.country_code?.toUpperCase() || "";

    // Build display name
    const parts = [city, region, country].filter(Boolean);
    const displayName = parts.join(", ");

    return {
      city,
      region,
      country,
      countryCode,
      displayName: displayName || "Unknown Location",
      latitude: lat,
      longitude: lng,
      elevation: 0,
      timezone: "",
    };
  } catch {
    return null;
  }
};

const fetchLocationNameWithTimeout = async (
  lat: number,
  lng: number,
): Promise<LocationInfo | null> => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    LOCATION_LOOKUP_TIMEOUT_MS,
  );

  try {
    return await fetchLocationName(lat, lng, controller.signal);
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

const processCurrentWeather = (data: WeatherResponse): ProcessedWeather | null => {
  if (!data.current) return null;

  const current = data.current;
  return {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    windDirection: current.wind_direction_10m,
    windGusts: current.wind_gusts_10m,
    precipitation: current.precipitation,
    cloudCover: current.cloud_cover,
    weatherCode: current.weather_code,
    isDay: current.is_day === 1,
    description: WEATHER_CODE_DESCRIPTIONS[current.weather_code] || "Unknown",
    uvIndex: current.uv_index,
    visibility: data.hourly?.visibility?.[0] ?? 0,
  };
};

const processHourlyForecast = (data: WeatherResponse, maxHours: number = 48): ProcessedHourlyForecast[] => {
  if (!data.hourly) return [];

  const hourly = data.hourly;
  const forecasts: ProcessedHourlyForecast[] = [];
  const now = new Date();

  for (let i = 0; i < Math.min(maxHours, hourly.time.length); i++) {
    const time = new Date(hourly.time[i]);
    
    // Include current hour and future hours
    if (time.getTime() < now.getTime() - 3600000) continue; // Skip past hours (allow 1 hour buffer)

    forecasts.push({
      time,
      temperature: hourly.temperature_2m[i],
      feelsLike: hourly.apparent_temperature[i],
      humidity: hourly.relative_humidity_2m[i],
      precipitation: hourly.precipitation[i],
      precipitationProbability: hourly.precipitation_probability[i],
      weatherCode: hourly.weather_code[i],
      windSpeed: hourly.wind_speed_10m[i],
      uvIndex: hourly.uv_index[i],
      isDay: hourly.is_day[i] === 1,
      visibility: hourly.visibility?.[i] ?? 0,
      pressure: hourly.surface_pressure?.[i] ?? 0,
      dewPoint: hourly.dew_point_2m?.[i] ?? 0,
    });

    if (forecasts.length >= maxHours) break;
  }

  return forecasts;
};

const processDailyForecast = (data: WeatherResponse): ProcessedDailyForecast[] => {
  if (!data.daily) return [];

  const daily = data.daily;
  const forecasts: ProcessedDailyForecast[] = [];

  for (let i = 0; i < daily.time.length; i++) {
    forecasts.push({
      date: new Date(daily.time[i]),
      tempMax: daily.temperature_2m_max[i],
      tempMin: daily.temperature_2m_min[i],
      weatherCode: daily.weather_code[i],
      precipitationSum: daily.precipitation_sum[i],
      precipitationProbability: daily.precipitation_probability_max[i],
      sunrise: new Date(daily.sunrise[i]),
      sunset: new Date(daily.sunset[i]),
      windSpeedMax: daily.wind_speed_10m_max[i],
      uvIndexMax: daily.uv_index_max[i],
    });
  }

  return forecasts;
};

export const useWeather = (options: UseWeatherOptions): UseWeatherReturn => {
  const {
    latitude,
    longitude,
    autoRefresh = true,
    refreshInterval = 300000, // 5 minutes default
    forecastHours = 48,
  } = options;

  const [current, setCurrent] = useState<ProcessedWeather | null>(null);
  const [hourly, setHourly] = useState<ProcessedHourlyForecast[]>([]);
  const [daily, setDaily] = useState<ProcessedDailyForecast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [selectedHourIndex, setSelectedHourIndex] = useState(0);
  const [ipLocation, setIpLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [ipMeta, setIpMeta] = useState<{ ip?: string; city?: string; region?: string; country?: string; countryCode?: string; timezone?: string } | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const hasResolvedIpRef = useRef(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const resolvedLatitude = latitude ?? ipLocation?.latitude ?? null;
  const resolvedLongitude = longitude ?? ipLocation?.longitude ?? null;

  const fetchWeather = useCallback(async () => {
    if (resolvedLatitude === null || resolvedLongitude === null) {
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const weatherResponse = await fetch(
        buildWeatherUrl(resolvedLatitude, resolvedLongitude),
        { signal: abortControllerRef.current.signal },
      );

      if (!weatherResponse.ok) {
        throw new Error(`Failed to fetch weather: ${weatherResponse.statusText}`);
      }

      const data: WeatherResponse = await weatherResponse.json();
      const locationPromise = fetchLocationNameWithTimeout(
        resolvedLatitude,
        resolvedLongitude,
      );

      const processedCurrent = processCurrentWeather(data);
      const processedHourly = processHourlyForecast(data, forecastHours);
      const processedDaily = processDailyForecast(data);

      setCurrent(processedCurrent);
      setHourly(processedHourly);
      setDaily(processedDaily);
      setSelectedHourIndex(0); // Reset to current hour
      
      const fallbackDisplay = ipMeta?.city || ipMeta?.region || ipMeta?.country
        ? [ipMeta?.city, ipMeta?.region, ipMeta?.country]
            .filter(Boolean)
            .join(", ")
        : `${resolvedLatitude.toFixed(2)}°, ${resolvedLongitude.toFixed(2)}°`;

      const baseLocationInfo: LocationInfo = {
        city: ipMeta?.city ?? "",
        region: ipMeta?.region ?? "",
        country: ipMeta?.country ?? "",
        countryCode: ipMeta?.countryCode ?? "",
        displayName: fallbackDisplay,
        latitude: data.latitude,
        longitude: data.longitude,
        elevation: data.elevation,
        timezone: ipMeta?.timezone ?? data.timezone,
      };

      setLocationInfo(baseLocationInfo);

      const updatedAt = new Date();
      setLastUpdated(updatedAt);

      locationPromise
        .then((locationData) => {
          if (!locationData) return;
          const enrichedLocation = {
            ...locationData,
            elevation: data.elevation,
            timezone: data.timezone,
          };
          setLocationInfo(enrichedLocation);
        })
        .catch(() => null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [resolvedLatitude, resolvedLongitude, forecastHours, ipMeta]);

  const resolveIpLocationIfNeeded = useCallback(async (force = false) => {
    if (latitude !== null && longitude !== null) return true;
    if (ipLocation && !force) return true;
    if (isResolvingLocation) return false;
    if (!force && hasResolvedIpRef.current) return false;

    const controller = new AbortController();
    try {
      setIsResolvingLocation(true);
      hasResolvedIpRef.current = true;
      const result = await resolveIpLocation(controller.signal, {
        allowTimezoneFallback: false,
      });
      if (!result) {
        setError(new Error("Unable to resolve IP location"));
        return false;
      }
      setIpLocation({ latitude: result.coords[1], longitude: result.coords[0] });
      if (result.meta) {
        setIpMeta({
          ip: result.meta.ip,
          city: result.meta.city,
          region: result.meta.region,
          country: result.meta.country,
          countryCode: result.meta.countryCode,
          timezone: result.meta.timezone,
        });
      }
      if (result.meta?.ip) {
        console.log("[useWeather] IP location", {
          ip: result.meta.ip,
          coords: result.coords,
          country: result.meta.country,
          city: result.meta.city,
        });
      } else {
        console.log("[useWeather] IP location", { coords: result.coords });
      }
      return true;
    } finally {
      setIsResolvingLocation(false);
      controller.abort();
    }
  }, [latitude, longitude, ipLocation, isResolvingLocation]);

  useEffect(() => {
    if (latitude !== null && longitude !== null) return;
    if (ipLocation || isResolvingLocation || hasResolvedIpRef.current) return;
    void resolveIpLocationIfNeeded(false);
  }, [latitude, longitude, ipLocation, isResolvingLocation, resolveIpLocationIfNeeded]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (resolvedLatitude === null || resolvedLongitude === null) {
      setCurrent(null);
      setHourly([]);
      setDaily([]);
      setLocationInfo(null);
      return;
    }

    fetchWeather();

    if (!autoRefresh) return;

    const intervalId = setInterval(fetchWeather, refreshInterval);

    return () => {
      clearInterval(intervalId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchWeather, autoRefresh, refreshInterval, resolvedLatitude, resolvedLongitude]);

  // Navigation helpers
  const canGoNext = selectedHourIndex < hourly.length - 1;
  const canGoPrev = selectedHourIndex > 0;

  const goNextHour = useCallback(() => {
    if (canGoNext) {
      setSelectedHourIndex((prev) => prev + 1);
    }
  }, [canGoNext]);

  const goPrevHour = useCallback(() => {
    if (canGoPrev) {
      setSelectedHourIndex((prev) => prev - 1);
    }
  }, [canGoPrev]);

  const refetch = useCallback(async () => {
    const canFetch = await resolveIpLocationIfNeeded(true);
    if (!canFetch && (resolvedLatitude === null || resolvedLongitude === null)) {
      return;
    }
    await fetchWeather();
  }, [fetchWeather, resolveIpLocationIfNeeded, resolvedLatitude, resolvedLongitude]);

  return {
    current,
    hourly,
    daily,
    isLoading,
    error,
    lastUpdated,
    refetch,
    locationInfo,
    selectedHourIndex,
    setSelectedHourIndex,
    canGoNext,
    canGoPrev,
    goNextHour,
    goPrevHour,
  };
};

// Helper to get weather icon name based on weather code
export const getWeatherIcon = (code: WeatherCode, isDay: boolean = true): string => {
  // Clear
  if (code === 0) return isDay ? "sun" : "moon";
  // Mainly clear
  if (code === 1) return isDay ? "sun" : "moon";
  // Partly cloudy
  if (code === 2) return isDay ? "cloud-sun" : "cloud-moon";
  // Overcast
  if (code === 3) return "cloud";
  // Fog
  if (code === 45 || code === 48) return "cloud-fog";
  // Drizzle
  if (code >= 51 && code <= 57) return "cloud-drizzle";
  // Rain
  if (code >= 61 && code <= 67) return "cloud-rain";
  // Snow
  if (code >= 71 && code <= 77) return "cloud-snow";
  // Rain showers
  if (code >= 80 && code <= 82) return "cloud-rain";
  // Snow showers
  if (code >= 85 && code <= 86) return "cloud-snow";
  // Thunderstorm
  if (code >= 95) return "cloud-lightning";

  return "cloud";
};

export default useWeather;
