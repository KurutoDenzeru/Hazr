import * as React from "react";

import type { AppSettings, DataLayerVisibility } from "@/types/settings";
import {
  APP_SETTINGS_STORAGE_KEY,
  DATA_LAYER_VISIBILITY_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  DEFAULT_LAYER_VISIBILITY,
} from "@/types/settings";

export const useAppSettings = () => {
  const [appSettings, setAppSettings] = React.useState<AppSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_APP_SETTINGS;
    try {
      const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
      if (!raw) return DEFAULT_APP_SETTINGS;
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed,
      };
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  });

  const [layerVisibility, setLayerVisibility] =
    React.useState<DataLayerVisibility>(() => {
      if (typeof window === "undefined") return DEFAULT_LAYER_VISIBILITY;
      try {
        const raw = localStorage.getItem(DATA_LAYER_VISIBILITY_STORAGE_KEY);
        if (!raw) return DEFAULT_LAYER_VISIBILITY;
        const parsed = JSON.parse(raw) as Partial<DataLayerVisibility>;
        return {
          ...DEFAULT_LAYER_VISIBILITY,
          ...parsed,
        };
      } catch {
        return DEFAULT_LAYER_VISIBILITY;
      }
    });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
    } catch {
      // ignore
    }
  }, [appSettings]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        DATA_LAYER_VISIBILITY_STORAGE_KEY,
        JSON.stringify(layerVisibility),
      );
    } catch {
      // ignore
    }
  }, [layerVisibility]);

  const resetDefaults = React.useCallback(() => {
    setAppSettings(DEFAULT_APP_SETTINGS);
    setLayerVisibility(DEFAULT_LAYER_VISIBILITY);
  }, []);

  return {
    appSettings,
    setAppSettings,
    layerVisibility,
    setLayerVisibility,
    resetDefaults,
  };
};
