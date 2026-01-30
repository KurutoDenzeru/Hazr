"use client";

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
  ProcessedAirQualitySite,
  ProcessedEarthquake,
  ProcessedEonetEvent,
  ProcessedTsunamiAlert,
} from "@/types/api";

type HazrMenuPanelProps = {
  onSelect?: () => void;
  collapsed?: boolean;
  userLocation?: [number, number] | null;
  isLocating?: boolean;
  onEarthquakeSelect?: (earthquake: ProcessedEarthquake) => void;
  eonetState?: {
    events: ProcessedEonetEvent[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
  };
  airQualityState?: {
    sites: ProcessedAirQualitySite[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
  };
  tsunamiState?: {
    alerts: ProcessedTsunamiAlert[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
  };
};

import { SeismicActivity } from "@/components/seismic-activity";
import { GlobalActivity } from "@/components/global-activity";

function HazrMenuPanel({
  onSelect,
  collapsed = false,
  userLocation = null,
  isLocating = false,
  onEarthquakeSelect,
  eonetState,
  airQualityState,
  tsunamiState,
}: HazrMenuPanelProps) {
  const handleSettingsClick = () => onSelect?.();

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex flex-col", collapsed ? "p-2" : "p-4")}>
        {/* Weather Section */}
        {!collapsed && (
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Weather
          </p>
        )}
        <div className={cn("mb-2", collapsed && "flex flex-col items-center")}> 
          <WeatherDock
            latitude={userLocation?.[1] ?? null}
            longitude={userLocation?.[0] ?? null}
            collapsed={collapsed}
            isLocating={isLocating}
            unstyled
          />
        </div>

        <Separator className={cn(collapsed ? "my-2" : "my-2")} />

        {/* Earthquakes Section */}
        {!collapsed && (
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Seismic Activity
          </p>
        )}
        <div className={cn(collapsed && "flex flex-col items-center")}
        >
          <SeismicActivity
            collapsed={collapsed}
            onEarthquakeSelect={onEarthquakeSelect}
          />
        </div>

        <Separator className={cn(collapsed ? "my-2" : "my-2")} />

        {(eonetState || airQualityState || tsunamiState) && (
          <>
            {!collapsed && (
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Global Signals
              </p>
            )}
            <div className={cn(collapsed && "flex flex-col items-center")}>
              <GlobalActivity
                collapsed={collapsed}
                eonetState={
                  eonetState ?? {
                    events: [],
                    isLoading: false,
                    error: null,
                    refetch: async () => {},
                  }
                }
                airQualityState={
                  airQualityState ?? {
                    sites: [],
                    isLoading: false,
                    error: null,
                    refetch: async () => {},
                  }
                }
                tsunamiState={
                  tsunamiState ?? {
                    alerts: [],
                    isLoading: false,
                    error: null,
                    refetch: async () => {},
                  }
                }
              />
            </div>

            <Separator className={cn(collapsed ? "my-2" : "my-2")} />
          </>
        )}


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
