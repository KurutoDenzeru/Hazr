"use client";

import {
  Cloud,
  Droplets,
  Eye,
  Gauge,
  Loader2,
  MapPin,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";

import { WeatherIcon } from "@/components/hazr-weather-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useWeather } from "@/hooks/use-weather";
import { getUVRiskLevel, UV_RISK_INFO, getWindDirection } from "@/types/api";

type WeatherDockProps = {
  latitude: number | null;
  longitude: number | null;
  className?: string;
  collapsed?: boolean;
  isLocating?: boolean;
  unstyled?: boolean;
};

// Format time for display
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// UV Index Badge with tooltip
const UVBadge = ({ uvIndex }: { uvIndex: number }) => {
  const riskLevel = getUVRiskLevel(uvIndex);
  const info = UV_RISK_INFO[riskLevel];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className="flex h-auto items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-white cursor-pointer border-none"
          style={{ backgroundColor: info.color }}
        >
          <Sun className="size-3" />
          <span>UV {uvIndex.toFixed(0)}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-50">
        <p className="font-semibold">{info.label} UV Index</p>
        <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Precipitation Badge with tooltip
const PrecipBadge = ({ probability, amount }: { probability: number; amount: number }) => {
  const hasRain = probability > 0 || amount > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className={cn(
            "flex h-auto items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium cursor-pointer border-none",
            hasRain
              ? "bg-blue-500/25 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300"
              : "bg-muted/70 text-foreground/70 dark:bg-muted/35 dark:text-foreground/80"
          )}
        >
          <Droplets className="size-3" />
          <span>{probability}%</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-semibold">{probability}% chance of precipitation</p>
        {amount > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Expected: {amount.toFixed(1)}mm
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export const WeatherDock = ({
  latitude,
  longitude,
  className,
  collapsed = false,
  isLocating = false,
  unstyled = false,
}: WeatherDockProps) => {
  const {
    current,
    daily,
    isLoading,
    error,
    lastUpdated,
    refetch,
    locationInfo,
  } = useWeather({
    latitude,
    longitude,
    forecastHours: 48,
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
            <div className="flex size-10 items-center justify-center rounded-md text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isLocating ? "Locating weather..." : "Fetching weather..."}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex size-10 flex-col items-center justify-center rounded-md">
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
          <p className="text-sm text-muted-foreground">
            {locationInfo?.displayName || "Current location"}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isLoading && !current) {
    return (
      <div className={cn("rounded-md border border-border/50 p-4 bg-background", className)}>
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className={cn(unstyled ? "p-0" : "rounded-md border border-border/50 p-4 bg-background", className)}>
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
          {error ? (
            <Cloud className="size-8 text-muted-foreground/50" />
          ) : (
            <Loader2 className="size-8 animate-spin text-muted-foreground/60" />
          )}
          <p className="text-sm text-muted-foreground">
            {error
              ? "Failed to load weather"
              : isLocating
                ? "Locating weather..."
                : "Fetching weather..."}
          </p>
          {error && (
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }

  const containerClasses = unstyled
    ? cn("bg-transparent border-none shadow-none p-0", className)
    : cn(
        "overflow-hidden rounded-md border border-border/50 bg-background/80 backdrop-blur-xl",
        className,
      );

  return (
    <TooltipProvider delayDuration={0}>
      <div className={containerClasses}>
        {/* Header with location */}
        <div className={cn(
          "flex items-center justify-between gap-2 border-b border-border/30 px-4",
          unstyled && "border-none px-0",
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium truncate">
              {locationInfo?.displayName || "Loading location..."}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 rounded-md text-muted-foreground hover:bg-muted/80 dark:hover:bg-muted/40"
                onClick={() => refetch()}
                disabled={isLoading}
                aria-label="Refresh weather"
              >
                <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>

        {/* Current weather display */}
        <div className={cn("p-4", unstyled && "p-0 my-2!")}> 
          <div className="flex items-start justify-between gap-4!">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-sky-500 p-2.5">
                <WeatherIcon
                  code={current.weatherCode}
                  isDay={current.isDay}
                  className="size-5 text-white"
                />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-light tracking-tight">
                    {Math.round(current.temperature)}
                  </span>
                  <span className="text-lg text-muted-foreground">°C</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {current.description}
                </p>
              </div>
            </div>

            {/* UV and Precip badges */}
            <div className="flex flex-col gap-1.5">
              <UVBadge uvIndex={current.uvIndex} />
              <PrecipBadge
                probability={0}
                amount={current.precipitation}
              />
            </div>
          </div>

          {/* Weather stats grid */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1 rounded-md bg-muted/60 dark:bg-muted/25 px-2 py-2 cursor-pointer hover:bg-muted/80 dark:hover:bg-muted/35 transition-colors">
                  <Thermometer className="size-4 text-orange-500" />
                  <span className="text-sm font-medium">
                    {Math.round(current.feelsLike)}°
                  </span>
                  <span className="text-[10px] text-muted-foreground">Feels</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Feels like temperature</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1 rounded-md bg-muted/60 dark:bg-muted/25 px-2 py-2 cursor-pointer hover:bg-muted/80 dark:hover:bg-muted/35 transition-colors">
                  <Wind className="size-4 text-cyan-500" />
                  <span className="text-sm font-medium">
                    {Math.round(current.windSpeed)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">km/h</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Wind speed: {Math.round(current.windSpeed)} km/h</p>
                <p className="text-sm text-muted-foreground">
                  Direction: {getWindDirection(current.windDirection)}
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1 rounded-md bg-muted/60 dark:bg-muted/25 px-2 py-2 cursor-pointer hover:bg-muted/80 dark:hover:bg-muted/35 transition-colors">
                  <Droplets className="size-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {current.humidity}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">Humid</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Relative humidity</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1 rounded-md bg-muted/60 dark:bg-muted/25 px-2 py-2 cursor-pointer hover:bg-muted/80 dark:hover:bg-muted/35 transition-colors">
                  {current.visibility !== undefined ? (
                    <>
                      <Eye className="size-4 text-violet-500" />
                      <span className="text-sm font-medium">
                        {(current.visibility / 1000).toFixed(0)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">km</span>
                    </>
                  ) : (
                    <>
                      <Gauge className="size-4 text-violet-500" />
                      <span className="text-sm font-medium">
                        {current.cloudCover}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">Cloud</span>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {current.visibility !== undefined
                  ? `Visibility: ${(current.visibility / 1000).toFixed(1)} km`
                  : `Cloud cover: ${current.cloudCover}%`}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 7-day forecast */}
        {daily.length > 0 && (
          <div className="border-t border-border/30 py-2">
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              7-Day Forecast
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {daily.slice(0, 7).map((day) => (
                <Tooltip key={day.date.toISOString()}>
                  <TooltipTrigger asChild>
                    <div className="flex min-w-14 flex-col items-center gap-1 rounded-md bg-muted/40 dark:bg-muted/15 px-2 py-2 hover:bg-muted/70 dark:hover:bg-muted/35 cursor-pointer transition-colors">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {day.date.toDateString() === new Date().toDateString()
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
                    <p className="font-medium">
                      {day.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </p>
                    <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
                      <p>High: {Math.round(day.tempMax)}°C / Low: {Math.round(day.tempMin)}°C</p>
                      <p>Precipitation: {day.precipitationProbability}% ({day.precipitationSum.toFixed(1)}mm)</p>
                      <p>UV Index Max: {day.uvIndexMax.toFixed(0)}</p>
                      <p>Wind: {Math.round(day.windSpeedMax)} km/h</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground/60">
              Updated {formatTime(lastUpdated)}
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default WeatherDock;
