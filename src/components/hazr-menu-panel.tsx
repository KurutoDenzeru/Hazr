"use client";

import React from "react";
import { Settings2 } from "lucide-react";

import { WeatherDock } from "@/components/map/weather-dock";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type {
  EarthquakeMagnitude,
  ProcessedAirQualitySite,
  ProcessedEarthquake,
  ProcessedEonetEvent,
  ProcessedTsunamiAlert,
} from "@/types/api";
import type { DataLayerVisibility, TemperatureUnit } from "@/types/settings";

export type HazrMenuFocusTarget =
  | "weather"
  | "seismic"
  | "global-live-events"
  | "global-openaq"
  | "global-tsunami";

type HazrMenuPanelProps = {
  onSelect?: () => void;
  collapsed?: boolean;
  focusTarget?: HazrMenuFocusTarget | null;
  onFocusTargetHandled?: () => void;
  onRequestExpandAndFocus?: (target: HazrMenuFocusTarget) => void;
  userLocation?: [number, number] | null;
  isLocating?: boolean;
  onEarthquakeSelect?: (earthquake: ProcessedEarthquake) => void;
  onEonetSelect?: (event: ProcessedEonetEvent) => void;
  onAirQualitySelect?: (site: ProcessedAirQualitySite) => void;
  onTsunamiSelect?: (alert: ProcessedTsunamiAlert) => void;
  temperatureUnit?: TemperatureUnit;
  earthquakeMagnitude?: EarthquakeMagnitude;
  layerVisibility?: DataLayerVisibility;
  eonetState?: {
    events: ProcessedEonetEvent[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: Date | null;
    refetch: () => Promise<void>;
  };
  airQualityState?: {
    sites: ProcessedAirQualitySite[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: Date | null;
    refetch: () => Promise<void>;
  };
  tsunamiState?: {
    alerts: ProcessedTsunamiAlert[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: Date | null;
    refetch: () => Promise<void>;
  };
};

import { SeismicActivity } from "@/components/seismic-activity";
import { GlobalActivity } from "@/components/global-activity";

function HazrMenuPanel({
  onSelect,
  collapsed = false,
  focusTarget = null,
  onFocusTargetHandled,
  onRequestExpandAndFocus,
  userLocation = null,
  isLocating = false,
  onEarthquakeSelect,
  onEonetSelect,
  onAirQualitySelect,
  onTsunamiSelect,
  temperatureUnit = "celsius",
  earthquakeMagnitude = "all",
  layerVisibility = {
    earthquakes: true,
    eonet: true,
    airQuality: true,
    tsunami: true,
  },
  eonetState,
  airQualityState,
  tsunamiState,
}: HazrMenuPanelProps) {
  const weatherSectionRef = React.useRef<HTMLDivElement | null>(null);
  const seismicSectionRef = React.useRef<HTMLDivElement | null>(null);
  const globalSectionRef = React.useRef<HTMLDivElement | null>(null);

  const globalFocusTarget =
    focusTarget === "global-live-events" ||
    focusTarget === "global-openaq" ||
    focusTarget === "global-tsunami"
      ? focusTarget
      : null;

  const handleOpenSeismicSection = React.useCallback(() => {
    onRequestExpandAndFocus?.("seismic");
  }, [onRequestExpandAndFocus]);

  const handleOpenWeatherSection = React.useCallback(() => {
    onRequestExpandAndFocus?.("weather");
  }, [onRequestExpandAndFocus]);

  const handleOpenGlobalSection = React.useCallback(
    (target: "global-live-events" | "global-openaq" | "global-tsunami") => {
      onRequestExpandAndFocus?.(target);
    },
    [onRequestExpandAndFocus]
  );

  React.useEffect(() => {
    if (collapsed || !focusTarget) return;

    const targetElement =
      focusTarget === "weather"
        ? weatherSectionRef.current
        : focusTarget === "seismic"
        ? seismicSectionRef.current
        : focusTarget.startsWith("global-")
          ? globalSectionRef.current
          : null;

    if (!targetElement) {
      onFocusTargetHandled?.();
      return;
    }

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    targetElement.focus({ preventScroll: true });

    if (focusTarget === "weather" || focusTarget === "seismic") {
      onFocusTargetHandled?.();
    }
  }, [collapsed, focusTarget, onFocusTargetHandled]);

  const handleSettingsClick = () => onSelect?.();

  const shouldShowSeismic = layerVisibility.earthquakes;
  const shouldShowGlobalSignals =
    layerVisibility.eonet || layerVisibility.airQuality || layerVisibility.tsunami;

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex flex-col", collapsed ? "p-2" : "p-4")}>
        {/* Weather Section */}
        {!collapsed && (
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Open Meteo Weather
          </p>
        )}
        <div
          ref={weatherSectionRef}
          id="sidebar-weather"
          tabIndex={-1}
          className={cn(!collapsed && "mb-2", collapsed && "flex flex-col items-center")}
        >
          <WeatherDock
            latitude={userLocation?.[1] ?? null}
            longitude={userLocation?.[0] ?? null}
            collapsed={collapsed}
            isLocating={isLocating}
            onOpenSection={handleOpenWeatherSection}
            temperatureUnit={temperatureUnit}
            unstyled
          />
        </div>

        {shouldShowSeismic ? (
          <>
            <Separator className={cn(collapsed ? "my-2" : "my-2")} />
            {/* Earthquakes Section */}
            {!collapsed && (
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                USGS Earthquakes
              </p>
            )}
            <div
              ref={seismicSectionRef}
              id="sidebar-seismic"
              tabIndex={-1}
              className={cn(collapsed && "flex flex-col items-center")}
            >
              <SeismicActivity
                collapsed={collapsed}
                magnitude={earthquakeMagnitude}
                onEarthquakeSelect={onEarthquakeSelect}
                onOpenSection={handleOpenSeismicSection}
              />
            </div>
          </>
        ) : null}

        {shouldShowGlobalSignals && (eonetState || airQualityState || tsunamiState) ? (
          <>
            <Separator className={cn(collapsed ? "my-2" : "my-2")} />
            <div
              ref={globalSectionRef}
              id="sidebar-global-signals"
              tabIndex={-1}
              className={cn(collapsed && "flex flex-col items-center")}
            >
              <GlobalActivity
                collapsed={collapsed}
                visibility={{
                  eonet: layerVisibility.eonet,
                  airQuality: layerVisibility.airQuality,
                  tsunami: layerVisibility.tsunami,
                }}
                eonetState={
                  eonetState ?? {
                    events: [],
                    isLoading: false,
                    error: null,
                    lastUpdated: null,
                    refetch: async () => {},
                  }
                }
                airQualityState={
                  airQualityState ?? {
                    sites: [],
                    isLoading: false,
                    error: null,
                    lastUpdated: null,
                    refetch: async () => {},
                  }
                }
                tsunamiState={
                  tsunamiState ?? {
                    alerts: [],
                    isLoading: false,
                    error: null,
                    lastUpdated: null,
                    refetch: async () => {},
                  }
                }
                onEonetSelect={onEonetSelect}
                onAirQualitySelect={onAirQualitySelect}
                onTsunamiSelect={onTsunamiSelect}
                focusTarget={globalFocusTarget}
                onFocusTargetHandled={onFocusTargetHandled}
                onOpenSection={handleOpenGlobalSection}
              />
            </div>
          </>
        ) : null}

        {shouldShowSeismic || shouldShowGlobalSignals ? (
          <Separator className={cn(collapsed ? "my-2" : "my-2")} />
        ) : null}
        
        {/* Settings */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-12 justify-center rounded-md px-0 text-muted-foreground hover:bg-muted/70"
                onClick={handleSettingsClick}
                aria-label="Settings"
              >
                <Settings2 className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="default"
            className="w-full justify-start gap-3 rounded-md text-foreground/90 hover:bg-muted/70 hover:text-foreground"
            onClick={handleSettingsClick}
            aria-label="Settings"
          >
            <Settings2 className="size-4" />
            <span className="truncate">Settings</span>
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

export { HazrMenuPanel };
