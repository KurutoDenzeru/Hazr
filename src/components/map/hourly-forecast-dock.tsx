"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";

import { WeatherIcon } from "@/components/hazr-weather-icon";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useWeather } from "@/hooks/use-weather";
import type { TemperatureUnit, TimeFormat } from "@/types/settings";

type HourlyForecastDockProps = {
  latitude: number | null;
  longitude: number | null;
  className?: string;
  temperatureUnit?: TemperatureUnit;
  compact?: boolean;
  timeFormat?: TimeFormat;
};

const toDisplayTemperature = (value: number, unit: TemperatureUnit) => {
  if (unit === "fahrenheit") {
    return (value * 9) / 5 + 32;
  }
  if (unit === "kelvin") {
    return value + 273.15;
  }
  return value;
};

const formatHour = (date: Date, timeFormat: TimeFormat): string =>
  date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  });

const formatDockDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const HourlyForecastDock = ({
  latitude,
  longitude,
  className,
  temperatureUnit = "celsius",
  compact = false,
  timeFormat = "12h",
}: HourlyForecastDockProps) => {
  const {
    hourly,
    isLoading,
    error,
    locationInfo,
    selectedHourIndex,
    setSelectedHourIndex,
  } = useWeather({
    latitude,
    longitude,
    forecastHours: 24,
  });

  const visibleHours = React.useMemo(() => hourly.slice(0, 12), [hourly]);
  const maxIndex = Math.max(0, visibleHours.length - 1);
  const safeIndex = Math.min(selectedHourIndex, maxIndex);
  const selectedHour = visibleHours[safeIndex];
  const forecastLabel = timeFormat === "24h" ? "24-Hour Forecast" : "12-Hour Forecast";
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const selectedIndexRef = React.useRef(safeIndex);

  React.useEffect(() => {
    selectedIndexRef.current = safeIndex;
  }, [safeIndex]);

  React.useEffect(() => {
    if (hourly.length === 0) return;
    if (selectedHourIndex <= maxIndex) return;
    setSelectedHourIndex(maxIndex);
  }, [hourly.length, maxIndex, selectedHourIndex, setSelectedHourIndex]);

  React.useEffect(() => {
    if (isLoading || error || !selectedHour) {
      setIsVisible(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, 10);

    return () => window.clearTimeout(timer);
  }, [error, isLoading, selectedHour]);

  React.useEffect(() => {
    if (!isPlaying) return;
    if (visibleHours.length === 0) return;

    const intervalId = window.setInterval(() => {
      const nextIndex = selectedIndexRef.current >= maxIndex ? 0 : selectedIndexRef.current + 1;
      setSelectedHourIndex(nextIndex);
    }, 1200);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, maxIndex, setSelectedHourIndex, visibleHours.length]);

  const handleSliderChange = (value: number[]) => {
    const nextIndex = value[0] ?? 0;
    setIsPlaying(false);
    setSelectedHourIndex(nextIndex);
  };

  const handleTogglePlay = () => {
    if (visibleHours.length === 0) return;
    setIsPlaying((prev) => !prev);
  };

  if (isLoading || error || !selectedHour) return null;

  return (
    <div
      className={cn(
        compact
          ? "w-full rounded-md border border-border/60 bg-background px-3 py-3 transition-all duration-200 ease-out"
          : "w-full max-w-3xl rounded-2xl border border-border/50 bg-background/85 px-3 py-3 backdrop-blur-2xl supports-backdrop-filter:bg-background/85 shadow-xs transition-all duration-240 ease-out will-change-transform sm:px-6 sm:py-5",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          compact && "gap-3 sm:flex-col sm:items-stretch",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label={isPlaying ? "Pause forecast playback" : "Play forecast playback"}
            onClick={handleTogglePlay}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              handleTogglePlay();
            }}
            tabIndex={0}
            className={cn(
              "flex items-center justify-center border border-border/60 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
              compact ? "size-8 rounded-md bg-background" : "size-9 rounded-full border-white/15 bg-background/35",
            )}
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <div
            className={cn(
              "flex items-center justify-center bg-muted/70",
              compact ? "size-8 rounded-md" : "size-10 rounded-lg bg-background/35 border border-white/10",
            )}
          >
            <WeatherIcon
              code={selectedHour.weatherCode}
              isDay={selectedHour.isDay}
              className={cn("text-foreground", compact ? "size-4" : "size-5")}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <span className={cn(compact ? "text-sm font-semibold" : "text-3xl font-semibold tracking-tight")}>
                {Math.round(toDisplayTemperature(selectedHour.temperature, temperatureUnit))}
                {temperatureUnit === "fahrenheit"
                  ? "°F"
                  : temperatureUnit === "kelvin"
                    ? "K"
                    : "°C"}
              </span>
              <span className={cn(compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground")}>
                {formatHour(selectedHour.time, timeFormat)}
              </span>
            </div>
            <p
              className={cn(
                "truncate text-muted-foreground",
                compact ? "max-w-[12rem] text-xs" : "max-w-[14rem] text-sm sm:max-w-[18rem]",
              )}
            >
              {locationInfo?.displayName || "Current location"}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex items-end justify-between gap-4 sm:flex-col sm:items-end sm:gap-3 sm:text-right",
            compact && "items-start gap-2 sm:items-start sm:text-left",
          )}
        >
          <div className={cn("flex flex-col items-start gap-2 text-left sm:items-end", compact && "sm:items-start")}>
            <p
              className={cn(
                "inline-flex w-fit items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground",
                compact ? "px-2.5 py-1 text-xs" : "border-white/15 bg-background/35",
              )}
            >
              {forecastLabel}
            </p>
            <p className={cn("leading-none text-muted-foreground", compact ? "text-xs" : "text-sm")}>
              {formatDockDate(selectedHour.time)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-2 sm:mt-4">
        <Slider
          aria-label="Forecast hour"
          min={0}
          max={maxIndex}
          step={1}
          value={[safeIndex]}
          onValueChange={handleSliderChange}
          className="**:data-[slot=slider-range]:transition-all **:data-[slot=slider-range]:duration-500 **:data-[slot=slider-range]:ease-in-out **:data-[slot=slider-thumb]:transition-transform **:data-[slot=slider-thumb]:duration-500 **:data-[slot=slider-thumb]:ease-in-out"
        />
        <div className="mt-3 flex gap-2 overflow-x-auto overflow-y-hidden pb-1 pr-1 no-scrollbar touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] scroll-smooth">
          {visibleHours.map((hour, index) => (
            <button
              key={hour.time.toISOString()}
              type="button"
              aria-label={`Forecast for ${formatHour(hour.time, timeFormat)}`}
              onClick={() => setSelectedHourIndex(index)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                setIsPlaying(false);
                setSelectedHourIndex(index);
              }}
              tabIndex={0}
              className={cn(
                "rounded-md px-2 py-1 text-center transition-colors whitespace-nowrap",
                index === safeIndex && "font-medium text-foreground",
                index !== safeIndex && "hover:bg-background/30",
                compact
                  ? index === safeIndex && "bg-muted/70"
                  : index === safeIndex && "bg-background/45 border border-white/15",
              )}
            >
              {formatHour(hour.time, timeFormat)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export { HourlyForecastDock };
