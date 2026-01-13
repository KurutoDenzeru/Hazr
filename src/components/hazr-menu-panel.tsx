"use client";

import {
  Activity,
  AlertTriangle,
  Cloud,
  Droplets,
  Loader2,
  RefreshCw,
  Settings2,
  Thermometer,
  Wind,
} from "lucide-react";
import { WeatherIcon } from "@/components/hazr-weather-icon";
import { EarthquakeItem } from "@/components/hazr-earthquake-item";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEarthquakes } from "@/hooks/use-earthquakes";
import { useWeather } from "@/hooks/use-weather";
import type { ProcessedEarthquake } from "@/types/api";

type HazrMenuPanelProps = {
  onSelect?: () => void;
  collapsed?: boolean;
  userLocation?: [number, number] | null;
  onEarthquakeSelect?: (earthquake: ProcessedEarthquake) => void;
};

// Format relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// Weather card component
const WeatherCard = ({
  latitude,
  longitude,
  collapsed,
}: {
  latitude: number | null;
  longitude: number | null;
  collapsed: boolean;
}) => {
  const { current, daily, isLoading, error, lastUpdated, refetch } = useWeather({
    latitude,
    longitude,
  });

  if (collapsed) {
    if (isLoading) {
      return (
        <div className="flex size-10 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!current) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex size-10 items-center justify-center rounded-xl text-muted-foreground">
              <Cloud className="size-5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            Enable location for weather
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex size-10 flex-col items-center justify-center rounded-xl">
            <WeatherIcon
              code={current.weatherCode}
              isDay={current.isDay}
              className="size-5 text-sky-500"
            />
            <span className="text-[10px] font-medium">
              {Math.round(current.temperature)}°
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{current.description}</p>
          <p className="text-xs text-muted-foreground">
            Feels like {Math.round(current.feelsLike)}°C
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/40 p-3">
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className="rounded-2xl border border-border/40 p-3">
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
          <Cloud className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {error ? "Failed to load weather" : "Enable location for weather"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Current weather */}
      <div className="p-1">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500 p-2.5 shadow-lg shadow-sky-500/20">
              <WeatherIcon
                code={current.weatherCode}
                isDay={current.isDay}
                className="size-6 text-white"
              />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-light tracking-tight">
                  {Math.round(current.temperature)}
                </span>
                <span className="text-lg text-muted-foreground">°C</span>
              </div>
              <p className="text-sm text-muted-foreground">{current.description}</p>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-lg text-muted-foreground hover:bg-muted/70"
                onClick={() => refetch()}
                aria-label="Refresh weather"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>

        {/* Weather stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2 py-1.5 cursor-help">
                <Thermometer className="size-3.5 text-orange-500" />
                <span className="text-xs">
                  {Math.round(current.feelsLike)}°
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Feels like {Math.round(current.feelsLike)}°C</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2 py-1.5 cursor-help">
                <Wind className="size-3.5 text-cyan-500" />
                <span className="text-xs">{Math.round(current.windSpeed)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Wind speed {Math.round(current.windSpeed)} km/h</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2 py-1.5 cursor-help">
                <Droplets className="size-3.5 text-blue-500" />
                <span className="text-xs">{current.humidity}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Humidity {current.humidity}%</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Daily forecast */}
      {daily.length > 0 && (
        <div className="mt-4 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {daily.slice(0, 5).map((day, index) => (
            <Tooltip key={day.date.toISOString()}>
              <TooltipTrigger asChild>
                <div className="flex min-w-[52px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-muted/30 cursor-help">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {index === 0
                      ? "Today"
                      : day.date.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <WeatherIcon
                    code={day.weatherCode}
                    isDay={true}
                    className="size-5 text-muted-foreground"
                  />
                  <div className="flex gap-1 text-[10px]">
                    <span className="font-medium">{Math.round(day.tempMax)}°</span>
                    <span className="text-muted-foreground">{Math.round(day.tempMin)}°</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {day.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <div className="pt-2 px-1">
          <p className="text-[10px] text-muted-foreground/60">
            Updated {formatRelativeTime(lastUpdated)}
          </p>
        </div>
      )}
    </div>
  );
};

// Earthquake feed component
const EarthquakeFeed = ({
  collapsed,
  onEarthquakeSelect,
}: {
  collapsed: boolean;
  onEarthquakeSelect?: (earthquake: ProcessedEarthquake) => void;
}) => {
  const { earthquakes, isLoading, error, lastUpdated, refetch, metadata } =
    useEarthquakes({
      magnitude: "2.5",
      range: "day",
    });

  if (collapsed) {
    if (isLoading) {
      return (
        <div className="flex size-10 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    const recentQuakes = earthquakes.slice(0, 3);
    return (
      <div className="flex flex-col gap-1">
        {recentQuakes.map((eq) => (
          <EarthquakeItem
            key={eq.id}
            earthquake={eq}
            collapsed
            onClick={() => onEarthquakeSelect?.(eq)}
          />
        ))}
        {earthquakes.length > 3 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex size-10 items-center justify-center rounded-xl text-xs font-medium text-muted-foreground">
                +{earthquakes.length - 3}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {earthquakes.length - 3} more earthquakes
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-red-500 p-1.5 shadow-lg shadow-red-500/20">
            <Activity className="size-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Live Earthquakes</h3>
            <p className="text-[10px] text-muted-foreground">
              {metadata?.count ?? 0} in the last 24h
            </p>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg text-muted-foreground hover:bg-muted/70"
              onClick={() => refetch()}
              aria-label="Refresh earthquakes"
            >
              <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </div>

      {/* Content */}
      <div className="pb-1">
        {isLoading && earthquakes.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <AlertTriangle className="size-6 text-amber-500" />
            <p className="text-sm text-muted-foreground">Failed to load data</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : earthquakes.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No recent earthquakes</p>
          </div>
        ) : (
          <div className="flex max-h-70 flex-col gap-0.5 overflow-y-auto scrollbar-hide">
            {earthquakes.slice(0, 10).map((eq) => (
              <EarthquakeItem
                key={eq.id}
                earthquake={eq}
                onClick={() => onEarthquakeSelect?.(eq)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <div className="pt-2 px-1">
          <p className="text-[10px] text-muted-foreground/60">
            Updated {formatRelativeTime(lastUpdated)}
          </p>
        </div>
      )}
    </div>
  );
};

function HazrMenuPanel({
  onSelect,
  collapsed = false,
  userLocation = null,
  onEarthquakeSelect,
}: HazrMenuPanelProps) {
  const handleSettingsClick = () => onSelect?.();

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex flex-col", collapsed ? "p-2" : "p-4")}>
        {/* Weather Section */}
        {!collapsed && (
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
            Weather
          </p>
        )}
        <div className={cn("mb-4", collapsed && "flex flex-col items-center")}>
          <WeatherCard
            latitude={userLocation?.[1] ?? null}
            longitude={userLocation?.[0] ?? null}
            collapsed={collapsed}
          />
        </div>

        <Separator className={cn(collapsed ? "my-2" : "my-3")} />

        {/* Earthquakes Section */}
        {!collapsed && (
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
            Seismic Activity
          </p>
        )}
        <div className={cn(collapsed && "flex flex-col items-center")}>
          <EarthquakeFeed
            collapsed={collapsed}
            onEarthquakeSelect={onEarthquakeSelect}
          />
        </div>

        <Separator className={cn(collapsed ? "my-2" : "my-3")} />

        {/* Settings */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="justify-center rounded-xl px-0 text-foreground/90 hover:bg-muted/70 hover:text-foreground"
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
            className="w-full justify-start gap-3 rounded-xl text-foreground/90 hover:bg-muted/70 hover:text-foreground"
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
