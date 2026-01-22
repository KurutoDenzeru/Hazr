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

const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/reverse";

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

const fetchLocationName = async (lat: number, lng: number): Promise<LocationInfo | null> => {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: "json",
      zoom: "10",
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
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

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchWeather = useCallback(async () => {
    if (latitude === null || longitude === null) {
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
      // Fetch weather and location in parallel
      const [weatherResponse, locationData] = await Promise.all([
        fetch(buildWeatherUrl(latitude, longitude), {
          signal: abortControllerRef.current.signal,
        }),
        fetchLocationName(latitude, longitude),
      ]);

      if (!weatherResponse.ok) {
        throw new Error(`Failed to fetch weather: ${weatherResponse.statusText}`);
      }

      const data: WeatherResponse = await weatherResponse.json();

      const processedCurrent = processCurrentWeather(data);
      const processedHourly = processHourlyForecast(data, forecastHours);
      const processedDaily = processDailyForecast(data);

      setCurrent(processedCurrent);
      setHourly(processedHourly);
      setDaily(processedDaily);
      setSelectedHourIndex(0); // Reset to current hour
      
      // Merge location data with weather location info
      if (locationData) {
        setLocationInfo({
          ...locationData,
          elevation: data.elevation,
          timezone: data.timezone,
        });
      } else {
        setLocationInfo({
          city: "",
          region: "",
          country: "",
          countryCode: "",
          displayName: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
          latitude: data.latitude,
          longitude: data.longitude,
          elevation: data.elevation,
          timezone: data.timezone,
        });
      }

      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude, forecastHours]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (latitude === null || longitude === null) {
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
  }, [fetchWeather, autoRefresh, refreshInterval, latitude, longitude]);

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

  return {
    current,
    hourly,
    daily,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchWeather,
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
