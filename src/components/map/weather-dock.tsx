"use client";

import * as React from "react";
import {
  ChevronLeft,
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
  Eye,
  Gauge,
  Loader2,
  MapPin,
  Moon,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useWeather, getWeatherIcon } from "@/hooks/use-weather";
import type { WeatherCode, ProcessedHourlyForecast } from "@/types/api";
import { getUVRiskLevel, UV_RISK_INFO, getWindDirection } from "@/types/api";

type WeatherDockProps = {
  latitude: number | null;
  longitude: number | null;
  className?: string;
  collapsed?: boolean;
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

// Format time for display
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Format date for display
const formatDate = (date: Date): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

// UV Index Badge with tooltip
const UVBadge = ({ uvIndex }: { uvIndex: number }) => {
  const riskLevel = getUVRiskLevel(uvIndex);
  const info = UV_RISK_INFO[riskLevel];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-white cursor-help"
          style={{ backgroundColor: info.color }}
        >
          <Sun className="size-3" />
          <span>UV {uvIndex.toFixed(0)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-semibold">{info.label} UV Index</p>
        <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
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
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium cursor-help",
            hasRain
              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "bg-muted/50 text-muted-foreground"
          )}
        >
          <Droplets className="size-3" />
          <span>{probability}%</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-semibold">{probability}% chance of precipitation</p>
        {amount > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Expected: {amount.toFixed(1)}mm
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

// Hourly forecast card
const HourlyCard = ({
  forecast,
  isSelected,
  onClick,
}: {
  forecast: ProcessedHourlyForecast;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all min-w-[60px]",
        isSelected
          ? "bg-primary text-primary-foreground shadow-md"
          : "hover:bg-muted/70"
      )}
    >
      <span className="text-[10px] font-medium opacity-70">
        {formatTime(forecast.time)}
      </span>
      <WeatherIcon
        code={forecast.weatherCode}
        isDay={forecast.isDay}
        className="size-5"
      />
      <span className="text-sm font-semibold">
        {Math.round(forecast.temperature)}°
      </span>
    </button>
  );
};

export const WeatherDock = ({
  latitude,
  longitude,
  className,
  collapsed = false,
}: WeatherDockProps) => {
  const {
    current,
    hourly,
    daily,
    isLoading,
    error,
    lastUpdated,
    refetch,
    locationInfo,
    selectedHourIndex,
    setSelectedHourIndex,
    canGoNext,
    canGoPrev,
    goNextHour,
    goPrevHour,
  } = useWeather({
    latitude,
    longitude,
    forecastHours: 48,
  });

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Scroll to selected hour
  React.useEffect(() => {
    if (scrollContainerRef.current && hourly.length > 0) {
      const container = scrollContainerRef.current;
      const selectedElement = container.children[selectedHourIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [selectedHourIndex, hourly.length]);

  // Get selected hour data or current
  const selectedHour = hourly[selectedHourIndex];
  const displayData = selectedHour || null;

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
          <TooltipContent side="right">Enable location for weather</TooltipContent>
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
            {locationInfo?.displayName || "Current location"}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isLoading && !current) {
    return (
      <div className={cn("rounded-2xl border border-border/50 bg-gradient-to-br from-sky-500/5 to-blue-500/5 p-4", className)}>
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className={cn("rounded-2xl border border-border/50 bg-gradient-to-br from-slate-500/5 to-slate-600/5 p-4", className)}>
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
          <Cloud className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {error ? "Failed to load weather" : "Enable location for weather"}
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

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-sky-500/5 via-transparent to-blue-500/5",
          className
        )}
      >
        {/* Header with location */}
        <div className="flex items-center justify-between gap-2 border-b border-border/30 px-4 py-3">
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
                className="shrink-0 rounded-lg text-muted-foreground hover:bg-muted/70"
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

        {/* Current/Selected weather display */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 p-3 shadow-lg shadow-sky-500/20">
                <WeatherIcon
                  code={displayData?.weatherCode ?? current.weatherCode}
                  isDay={displayData?.isDay ?? current.isDay}
                  className="size-8 text-white"
                />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-light tracking-tight">
                    {Math.round(displayData?.temperature ?? current.temperature)}
                  </span>
                  <span className="text-xl text-muted-foreground">°C</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {displayData
                    ? `${formatDate(displayData.time)}, ${formatTime(displayData.time)}`
                    : current.description}
                </p>
              </div>
            </div>

            {/* UV and Precip badges */}
            <div className="flex flex-col gap-1.5">
              <UVBadge uvIndex={displayData?.uvIndex ?? current.uvIndex} />
              <PrecipBadge
                probability={displayData?.precipitationProbability ?? 0}
                amount={displayData?.precipitation ?? current.precipitation}
              />
            </div>
          </div>

          {/* Weather stats grid */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/30 px-2 py-2 cursor-help">
                  <Thermometer className="size-4 text-orange-500" />
                  <span className="text-xs font-medium">
                    {Math.round(displayData?.feelsLike ?? current.feelsLike)}°
                  </span>
                  <span className="text-[10px] text-muted-foreground">Feels</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Feels like temperature</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/30 px-2 py-2 cursor-help">
                  <Wind className="size-4 text-cyan-500" />
                  <span className="text-xs font-medium">
                    {Math.round(displayData?.windSpeed ?? current.windSpeed)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">km/h</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Wind speed: {Math.round(displayData?.windSpeed ?? current.windSpeed)} km/h</p>
                <p className="text-xs text-muted-foreground">
                  Direction: {getWindDirection(current.windDirection)}
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/30 px-2 py-2 cursor-help">
                  <Droplets className="size-4 text-blue-500" />
                  <span className="text-xs font-medium">
                    {displayData?.humidity ?? current.humidity}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">Humid</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Relative humidity</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/30 px-2 py-2 cursor-help">
                  {displayData?.visibility ? (
                    <>
                      <Eye className="size-4 text-violet-500" />
                      <span className="text-xs font-medium">
                        {(displayData.visibility / 1000).toFixed(0)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">km</span>
                    </>
                  ) : (
                    <>
                      <Gauge className="size-4 text-violet-500" />
                      <span className="text-xs font-medium">
                        {current.cloudCover}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">Cloud</span>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {displayData?.visibility
                  ? `Visibility: ${(displayData.visibility / 1000).toFixed(1)} km`
                  : `Cloud cover: ${current.cloudCover}%`}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Hourly timeline with navigation */}
        {hourly.length > 0 && (
          <div className="border-t border-border/30">
            <div className="flex items-center gap-1 px-2 py-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 rounded-lg"
                    onClick={goPrevHour}
                    disabled={!canGoPrev}
                    aria-label="Previous hour"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous hour</TooltipContent>
              </Tooltip>

              <div
                ref={scrollContainerRef}
                className="flex-1 flex gap-1 overflow-x-auto py-1 scrollbar-hide"
              >
                {hourly.slice(0, 24).map((forecast, index) => (
                  <HourlyCard
                    key={forecast.time.toISOString()}
                    forecast={forecast}
                    isSelected={index === selectedHourIndex}
                    onClick={() => setSelectedHourIndex(index)}
                  />
                ))}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 rounded-lg"
                    onClick={goNextHour}
                    disabled={!canGoNext}
                    aria-label="Next hour"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next hour</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* 7-day forecast */}
        {daily.length > 0 && (
          <div className="border-t border-border/30 px-3 py-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {daily.slice(0, 7).map((day) => (
                <Tooltip key={day.date.toISOString()}>
                  <TooltipTrigger asChild>
                    <div className="flex min-w-[56px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-muted/50 cursor-help">
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
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
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
          <div className="px-4 pb-2">
            <p className="text-[10px] text-muted-foreground/60">
              Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default WeatherDock;
