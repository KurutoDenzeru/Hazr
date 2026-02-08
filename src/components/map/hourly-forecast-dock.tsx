"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";

import { WeatherIcon } from "@/components/hazr-weather-icon";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useWeather } from "@/hooks/use-weather";
import type { TemperatureUnit } from "@/types/settings";

type HourlyForecastDockProps = {
  latitude: number | null;
  longitude: number | null;
  className?: string;
  temperatureUnit?: TemperatureUnit;
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

const formatHour = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
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
        "w-full max-w-3xl rounded-xl border border-border/60 bg-[linear-gradient(135deg,theme(colors.background/96%),theme(colors.background/88%))] px-3 py-3 shadow-sm shadow-black/25 backdrop-blur-xl transition-all duration-240 ease-out will-change-transform sm:px-6 sm:py-5",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
            className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted/70">
            <WeatherIcon
              code={selectedHour.weatherCode}
              isDay={selectedHour.isDay}
              className="size-5 text-foreground"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-semibold tracking-tight">
                {Math.round(toDisplayTemperature(selectedHour.temperature, temperatureUnit))}
                {temperatureUnit === "fahrenheit"
                  ? "°F"
                  : temperatureUnit === "kelvin"
                    ? "K"
                    : "°C"}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatHour(selectedHour.time)}
              </span>
            </div>
            <p className="max-w-[14rem] truncate text-sm text-muted-foreground sm:max-w-[18rem]">
              {locationInfo?.displayName || "Current location"}
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 sm:flex-col sm:items-end sm:gap-3 sm:text-right">
          <div className="flex flex-col items-start gap-2 text-left sm:items-end">
            <p className="inline-flex w-fit items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              12-Hour Forecast
            </p>
            <p className="text-sm leading-none text-muted-foreground">
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
          className="**:data-[slot=slider-range]:transition-[width] **:data-[slot=slider-range]:duration-250 **:data-[slot=slider-range]:ease-out **:data-[slot=slider-thumb]:transition-transform **:data-[slot=slider-thumb]:duration-250 **:data-[slot=slider-thumb]:ease-out"
        />
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-muted-foreground sm:grid-cols-6 sm:gap-2.5 lg:grid-cols-12">
          {visibleHours.map((hour, index) => (
            <button
              key={hour.time.toISOString()}
              type="button"
              aria-label={`Forecast for ${formatHour(hour.time)}`}
              onClick={() => setSelectedHourIndex(index)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                setIsPlaying(false);
                setSelectedHourIndex(index);
              }}
              tabIndex={0}
              className={cn(
                "rounded-md px-1.5 py-1 text-center transition-colors",
                index === safeIndex && "bg-muted/70 font-medium text-foreground",
                index !== safeIndex && "hover:bg-muted/50",
              )}
            >
              {index === 0 ? "Now" : formatHour(hour.time)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export { HourlyForecastDock };
