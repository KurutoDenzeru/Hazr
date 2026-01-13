"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Loader2,
  Moon,
  RefreshCw,
  Settings2,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";

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
import { useWeather, getWeatherIcon } from "@/hooks/use-weather";
import type { ProcessedEarthquake, WeatherCode } from "@/types/api";
import { getMagnitudeColor, getMagnitudeLabel } from "@/types/api";

type HazrMenuPanelProps = {
  onSelect?: () => void;
  collapsed?: boolean;
  userLocation?: [number, number] | null;
  onEarthquakeSelect?: (earthquake: ProcessedEarthquake) => void;
};

// Weather icon component based on weather code
const WeatherIcon = ({
  code,
  isDay,
  className,
}: {
  code: WeatherCode;
  isDay: boolean;
  className?: string;
}) => {
  const iconName = getWeatherIcon(code, isDay);

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    sun: Sun,
    moon: Moon,
    "cloud-sun": CloudSun,
    "cloud-moon": CloudMoon,
    cloud: Cloud,
    "cloud-fog": CloudFog,
    "cloud-drizzle": CloudDrizzle,
    "cloud-rain": CloudRain,
    "cloud-snow": CloudSnow,
    "cloud-lightning": CloudLightning,
  };

  const Icon = iconMap[iconName] || Cloud;
  return <Icon className={className} />;
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

// Earthquake list item
const EarthquakeItem = ({
  earthquake,
  onClick,
  collapsed,
}: {
  earthquake: ProcessedEarthquake;
  onClick?: () => void;
  collapsed?: boolean;
}) => {
  const magColor = getMagnitudeColor(earthquake.magnitude);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className="flex size-10 items-center justify-center rounded-xl transition-colors hover:bg-muted/70"
            aria-label={earthquake.title}
          >
            <div
              className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: magColor }}
            >
              {earthquake.magnitude.toFixed(1)}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-50">
          <p className="font-medium">{earthquake.magnitude.toFixed(1)} - {earthquake.place}</p>
          <p className="text-xs text-muted-foreground">{formatRelativeTime(earthquake.time)}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-muted/70"
      aria-label={earthquake.title}
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg transition-transform group-hover:scale-105"
        style={{
          backgroundColor: magColor,
          boxShadow: `0 4px 14px ${magColor}40`,
        }}
      >
        {earthquake.magnitude.toFixed(1)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {earthquake.place}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{getMagnitudeLabel(earthquake.magnitude)}</span>
          <span className="opacity-50">•</span>
          <span>{formatRelativeTime(earthquake.time)}</span>
          {earthquake.tsunami && (
            <>
              <span className="opacity-50">•</span>
              <span className="text-amber-500">Tsunami</span>
            </>
          )}
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
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
      <div className="rounded-2xl border border-border/50 bg-linear-to-br from-sky-500/5 to-blue-500/5 p-4">
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className="rounded-2xl border border-border/50 bg-linear-to-br from-slate-500/5 to-slate-600/5 p-4">
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
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-sky-500/5 via-transparent to-blue-500/5">
      {/* Current weather */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-linear-to-br from-sky-400 to-blue-500 p-2.5 shadow-lg shadow-sky-500/20">
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
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2 py-1.5">
            <Thermometer className="size-3.5 text-orange-500" />
            <span className="text-xs">
              {Math.round(current.feelsLike)}° feel
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2 py-1.5">
            <Wind className="size-3.5 text-cyan-500" />
            <span className="text-xs">{Math.round(current.windSpeed)} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2 py-1.5">
            <Droplets className="size-3.5 text-blue-500" />
            <span className="text-xs">{current.humidity}%</span>
          </div>
        </div>
      </div>

      {/* Daily forecast */}
      {daily.length > 0 && (
        <>
          <Separator />
          <div className="flex gap-1 overflow-x-auto p-3 scrollbar-hide">
            {daily.slice(0, 5).map((day, index) => (
              <div
                key={day.date.toISOString()}
                className="flex min-w-[52px] flex-col items-center gap-1 rounded-lg px-2 py-1.5"
              >
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
            ))}
          </div>
        </>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <div className="px-4 pb-2">
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
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-red-500 to-orange-500 p-1.5 shadow-lg shadow-red-500/20">
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
      <div className="px-2 pb-2">
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
        <div className="border-t border-border/50 px-4 py-2">
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
