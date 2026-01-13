import { useState, useEffect, useCallback, useRef } from "react";
import type {
  WeatherResponse,
  ProcessedWeather,
  WeatherCode,
} from "@/types/api";

const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Import the descriptions from api.ts
const WEATHER_DESCRIPTIONS: Record<WeatherCode, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

type UseWeatherOptions = {
  latitude: number | null;
  longitude: number | null;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
};

type HourlyForecast = {
  time: Date;
  temperature: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: WeatherCode;
  windSpeed: number;
};

type DailyForecast = {
  date: Date;
  tempMax: number;
  tempMin: number;
  weatherCode: WeatherCode;
  precipitationSum: number;
  precipitationProbability: number;
  sunrise: Date;
  sunset: Date;
  windSpeedMax: number;
};

type UseWeatherReturn = {
  current: ProcessedWeather | null;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
  } | null;
};

const buildWeatherUrl = (lat: number, lng: number): string => {
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
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
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
    ].join(","),
    timezone: "auto",
    forecast_days: "7",
  });

  return `${OPEN_METEO_BASE_URL}?${params.toString()}`;
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
    precipitation: current.precipitation,
    cloudCover: current.cloud_cover,
    weatherCode: current.weather_code,
    isDay: current.is_day === 1,
    description: WEATHER_DESCRIPTIONS[current.weather_code] || "Unknown",
  };
};

const processHourlyForecast = (data: WeatherResponse): HourlyForecast[] => {
  if (!data.hourly) return [];

  const hourly = data.hourly;
  const forecasts: HourlyForecast[] = [];

  // Get next 24 hours
  const now = new Date();
  for (let i = 0; i < Math.min(24, hourly.time.length); i++) {
    const time = new Date(hourly.time[i]);
    if (time < now) continue;

    forecasts.push({
      time,
      temperature: hourly.temperature_2m[i],
      precipitation: hourly.precipitation[i],
      precipitationProbability: hourly.precipitation_probability[i],
      weatherCode: hourly.weather_code[i],
      windSpeed: hourly.wind_speed_10m[i],
    });

    if (forecasts.length >= 12) break;
  }

  return forecasts;
};

const processDailyForecast = (data: WeatherResponse): DailyForecast[] => {
  if (!data.daily) return [];

  const daily = data.daily;
  const forecasts: DailyForecast[] = [];

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
  } = options;

  const [current, setCurrent] = useState<ProcessedWeather | null>(null);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [daily, setDaily] = useState<DailyForecast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [location, setLocation] = useState<UseWeatherReturn["location"]>(null);

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
      const url = buildWeatherUrl(latitude, longitude);
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch weather: ${response.statusText}`);
      }

      const data: WeatherResponse = await response.json();

      setCurrent(processCurrentWeather(data));
      setHourly(processHourlyForecast(data));
      setDaily(processDailyForecast(data));
      setLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        elevation: data.elevation,
        timezone: data.timezone,
      });
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (latitude === null || longitude === null) {
      setCurrent(null);
      setHourly([]);
      setDaily([]);
      setLocation(null);
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

  return {
    current,
    hourly,
    daily,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchWeather,
    location,
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
