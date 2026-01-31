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

export type EonetGeometry = {
  magnitudeValue?: number | null;
  magnitudeUnit?: string | null;
  date: string;
  type: "Point" | "Polygon" | "MultiPolygon";
  coordinates: GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][];
};

export type EonetCategory = {
  id: string;
  title: string;
};

export type EonetSource = {
  id: string;
  url: string;
};

export type EonetEvent = {
  id: string;
  title: string;
  description?: string | null;
  link: string;
  closed?: string | null;
  categories: EonetCategory[];
  sources: EonetSource[];
  geometry: EonetGeometry[];
};

export type EonetEventsResponse = {
  title: string;
  description: string;
  link: string;
  events: EonetEvent[];
};

export type ProcessedEonetEvent = {
  id: string;
  title: string;
  category: string;
  date: Date;
  coordinates: [number, number];
  url: string;
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
  uv_index: string;
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
  uv_index: number;
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
  uv_index: string;
  visibility: string;
  surface_pressure: string;
  dew_point_2m: string;
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
  uv_index: number[];
  is_day: (0 | 1)[];
  visibility: number[];
  surface_pressure: number[];
  dew_point_2m: number[];
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
  uv_index_max: string;
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
  uv_index_max: number[];
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

export type VolcanismRecord = {
  id?: string | number;
  volcano_id?: string | number;
  volcano_name?: string;
  name?: string;
  country?: string;
  region?: string;
  status?: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lon?: number | string;
  link?: string;
  url?: string;
};

export type VolcanismResponse = {
  volcanoes?: VolcanismRecord[];
  results?: VolcanismRecord[];
  data?: VolcanismRecord[];
};

export type ProcessedVolcano = {
  id: string;
  name: string;
  country: string;
  status: string;
  coordinates: [number, number];
  url?: string;
};

export type OpenAQLatestResult = {
  datetime: {
    utc: string;
    local: string;
  };
  value: number;
  coordinates: {
    latitude: number | null;
    longitude: number | null;
  };
  sensorsId: number;
  locationsId: number;
};

export type OpenAQLatestResponse = {
  results: OpenAQLatestResult[];
};

export type ProcessedAirQualitySite = {
  id: string;
  location: string;
  parameter: string;
  value: number;
  unit: string;
  coordinates: [number, number];
};

export type NwsAlertFeature = {
  type: "Feature";
  id: string;
  properties: {
    headline?: string;
    severity?: string;
    urgency?: string;
    event?: string;
    sent?: string;
    ends?: string | null;
    description?: string;
    areaDesc?: string;
    web?: string;
  };
  geometry: GeoJSON.Geometry | null;
};

export type NwsAlertsResponse = {
  type: "FeatureCollection";
  features: NwsAlertFeature[];
  title?: string;
  updated?: string;
};

export type ProcessedTsunamiAlert = {
  id: string;
  headline: string;
  severity: string;
  sent: Date | null;
  coordinates: [number, number];
  url?: string;
};

// Open-Meteo Geocoding API Types
export type GeocodingResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  feature_code: string;
  country_code: string;
  admin1_id?: number;
  admin2_id?: number;
  admin3_id?: number;
  admin4_id?: number;
  timezone: string;
  population?: number;
  postcodes?: string[];
  country_id: number;
  country: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
};

export type GeocodingResponse = {
  results?: GeocodingResult[];
  generationtime_ms: number;
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
  updated: Date;
  depth: number;
  coordinates: [number, number];
  url: string;
  alert: EarthquakeProperties["alert"];
  tsunami: boolean;
  title: string;
  status: EarthquakeProperties["status"];
  sig: number;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  magType: string | null;
  gap: number | null;
  rms: number | null;
  nst: number | null;
  dmin: number | null;
  net: string;
  types: string;
};

// Helper type for processed weather data
export type ProcessedWeather = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  precipitation: number;
  cloudCover: number;
  weatherCode: WeatherCode;
  isDay: boolean;
  description: string;
  uvIndex: number;
  visibility: number;
};

// Helper type for processed hourly forecast
export type ProcessedHourlyForecast = {
  time: Date;
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: WeatherCode;
  windSpeed: number;
  uvIndex: number;
  isDay: boolean;
  visibility: number;
  pressure: number;
  dewPoint: number;
};

// Helper type for processed daily forecast
export type ProcessedDailyForecast = {
  date: Date;
  tempMax: number;
  tempMin: number;
  weatherCode: WeatherCode;
  precipitationSum: number;
  precipitationProbability: number;
  sunrise: Date;
  sunset: Date;
  windSpeedMax: number;
  uvIndexMax: number;
};

// Location info from reverse geocoding
export type LocationInfo = {
  city: string;
  region: string;
  country: string;
  countryCode: string;
  displayName: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
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

// UV Index risk levels and descriptions
export type UVRiskLevel = "low" | "moderate" | "high" | "very-high" | "extreme";

export const getUVRiskLevel = (uvIndex: number): UVRiskLevel => {
  if (uvIndex < 3) return "low";
  if (uvIndex < 6) return "moderate";
  if (uvIndex < 8) return "high";
  if (uvIndex < 11) return "very-high";
  return "extreme";
};

export const UV_RISK_INFO: Record<UVRiskLevel, { label: string; color: string; description: string }> = {
  low: {
    label: "Low",
    color: "#22c55e",
    description: "No protection needed. Safe for most skin types.",
  },
  moderate: {
    label: "Moderate",
    color: "#eab308",
    description: "Some protection recommended. Wear sunglasses on bright days.",
  },
  high: {
    label: "High",
    color: "#f97316",
    description: "Protection essential. Reduce sun exposure between 10am-4pm.",
  },
  "very-high": {
    label: "Very High",
    color: "#ef4444",
    description: "Extra protection needed. Avoid being outside during midday hours.",
  },
  extreme: {
    label: "Extreme",
    color: "#7f1d1d",
    description: "Maximum protection essential. Avoid sun exposure if possible.",
  },
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

// Wind direction to compass label
export const getWindDirection = (degrees: number): string => {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};
