import type { EarthquakeMagnitude } from "@/types/api";

export type TemperatureUnit = "celsius" | "fahrenheit" | "kelvin";
export type TimeFormat = "12h" | "24h";

export type DataLayerVisibility = {
  earthquakes: boolean;
  eonet: boolean;
  airQuality: boolean;
  tsunami: boolean;
};

export type AppSettings = {
  temperatureUnit: TemperatureUnit;
  timeFormat: TimeFormat;
  showDesktopForecastDock: boolean;
  openAqLimit: number;
  eonetLimit: number;
  earthquakeMagnitude: EarthquakeMagnitude;
};

export const APP_SETTINGS_STORAGE_KEY = "hazr-app-settings-v2";
export const DATA_LAYER_VISIBILITY_STORAGE_KEY = "hazr-layer-visibility-v1";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  temperatureUnit: "celsius",
  timeFormat: "12h",
  showDesktopForecastDock: true,
  openAqLimit: 200,
  eonetLimit: 200,
  earthquakeMagnitude: "all",
};

export const DEFAULT_LAYER_VISIBILITY: DataLayerVisibility = {
  earthquakes: true,
  eonet: true,
  airQuality: true,
  tsunami: true,
};
