// USGS Earthquake API Types (GeoJSON format)
// https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php

export type EarthquakeProperties = {
  mag: number | null;
  place: string | null;
  time: number;
  updated: number;
  tz: number | null;
  url: string;
  detail: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: "green" | "yellow" | "orange" | "red" | null;
  status: "automatic" | "reviewed" | "deleted";
  tsunami: 0 | 1;
  sig: number;
  net: string;
  code: string;
  ids: string;
  sources: string;
  types: string;
  nst: number | null;
  dmin: number | null;
  rms: number | null;
  gap: number | null;
  magType: string | null;
  type: string;
  title: string;
};

export type EarthquakeGeometry = {
  type: "Point";
  coordinates: [number, number, number]; // [longitude, latitude, depth]
};

export type EarthquakeFeature = {
  type: "Feature";
  properties: EarthquakeProperties;
  geometry: EarthquakeGeometry;
  id: string;
};

export type EarthquakeFeedResponse = {
  type: "FeatureCollection";
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: EarthquakeFeature[];
  bbox?: [number, number, number, number, number, number];
};

// Open-Meteo Weather API Types
// https://open-meteo.com/en/docs

export type WeatherCode =
  | 0 // Clear sky
  | 1 | 2 | 3 // Mainly clear, partly cloudy, overcast
  | 45 | 48 // Fog
  | 51 | 53 | 55 // Drizzle
  | 56 | 57 // Freezing drizzle
  | 61 | 63 | 65 // Rain
  | 66 | 67 // Freezing rain
  | 71 | 73 | 75 // Snow fall
  | 77 // Snow grains
  | 80 | 81 | 82 // Rain showers
  | 85 | 86 // Snow showers
  | 95 // Thunderstorm
  | 96 | 99; // Thunderstorm with hail

export type WeatherCurrentUnits = {
  time: string;
  interval: string;
  temperature_2m: string;
  relative_humidity_2m: string;
  apparent_temperature: string;
  is_day: string;
  precipitation: string;
  rain: string;
  showers: string;
  snowfall: string;
  weather_code: string;
  cloud_cover: string;
  wind_speed_10m: string;
  wind_direction_10m: string;
  wind_gusts_10m: string;
};

export type WeatherCurrent = {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: 0 | 1;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weather_code: WeatherCode;
  cloud_cover: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
};

export type WeatherHourlyUnits = {
  time: string;
  temperature_2m: string;
  relative_humidity_2m: string;
  apparent_temperature: string;
  precipitation_probability: string;
  precipitation: string;
  weather_code: string;
  wind_speed_10m: string;
};

export type WeatherHourly = {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weather_code: WeatherCode[];
  wind_speed_10m: number[];
};

export type WeatherDailyUnits = {
  time: string;
  weather_code: string;
  temperature_2m_max: string;
  temperature_2m_min: string;
  apparent_temperature_max: string;
  apparent_temperature_min: string;
  sunrise: string;
  sunset: string;
  precipitation_sum: string;
  precipitation_probability_max: string;
  wind_speed_10m_max: string;
};

export type WeatherDaily = {
  time: string[];
  weather_code: WeatherCode[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  sunrise: string[];
  sunset: string[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
};

export type WeatherResponse = {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units?: WeatherCurrentUnits;
  current?: WeatherCurrent;
  hourly_units?: WeatherHourlyUnits;
  hourly?: WeatherHourly;
  daily_units?: WeatherDailyUnits;
  daily?: WeatherDaily;
};

// Earthquake feed time ranges
export type EarthquakeFeedRange = "hour" | "day" | "week" | "month";

// Earthquake magnitude filter
export type EarthquakeMagnitude = "all" | "1.0" | "2.5" | "4.5" | "significant";

// Helper type for processed earthquake data
export type ProcessedEarthquake = {
  id: string;
  magnitude: number;
  place: string;
  time: Date;
  depth: number;
  coordinates: [number, number];
  url: string;
  alert: EarthquakeProperties["alert"];
  tsunami: boolean;
  title: string;
};

// Helper type for processed weather data
export type ProcessedWeather = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  weatherCode: WeatherCode;
  isDay: boolean;
  description: string;
};

// Weather code to description mapping
export const WEATHER_CODE_DESCRIPTIONS: Record<WeatherCode, string> = {
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

// Get magnitude color based on Richter scale
export const getMagnitudeColor = (magnitude: number): string => {
  if (magnitude < 2) return "#22c55e"; // green-500 - micro
  if (magnitude < 4) return "#eab308"; // yellow-500 - minor
  if (magnitude < 5) return "#f97316"; // orange-500 - light
  if (magnitude < 6) return "#ef4444"; // red-500 - moderate
  if (magnitude < 7) return "#dc2626"; // red-600 - strong
  if (magnitude < 8) return "#b91c1c"; // red-700 - major
  return "#7f1d1d"; // red-900 - great
};

// Get magnitude label
export const getMagnitudeLabel = (magnitude: number): string => {
  if (magnitude < 2) return "Micro";
  if (magnitude < 4) return "Minor";
  if (magnitude < 5) return "Light";
  if (magnitude < 6) return "Moderate";
  if (magnitude < 7) return "Strong";
  if (magnitude < 8) return "Major";
  return "Great";
};
