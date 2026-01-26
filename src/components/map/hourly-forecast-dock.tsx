"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { WeatherIcon } from "@/components/hazr-weather-icon";
import { cn } from "@/lib/utils";
import { useWeather } from "@/hooks/use-weather";

type HourlyForecastDockProps = {
  latitude: number | null;
  longitude: number | null;
  className?: string;
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
    if (!isPlaying) return;
    if (visibleHours.length === 0) return;

    const intervalId = window.setInterval(() => {
      const nextIndex = selectedIndexRef.current >= maxIndex ? 0 : selectedIndexRef.current + 1;
      setSelectedHourIndex(nextIndex);
    }, 1200);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, maxIndex, setSelectedHourIndex, visibleHours.length]);

  const handlePrev = () => {
    if (safeIndex <= 0) return;
    setIsPlaying(false);
    setSelectedHourIndex(safeIndex - 1);
  };

  const handleNext = () => {
    if (safeIndex >= maxIndex) return;
    setIsPlaying(false);
    setSelectedHourIndex(safeIndex + 1);
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextIndex = Number(event.target.value);
    if (Number.isNaN(nextIndex)) return;
    setIsPlaying(false);
    setSelectedHourIndex(nextIndex);
  };

  const handleTogglePlay = () => {
    if (visibleHours.length === 0) return;
    setIsPlaying((prev) => !prev);
  };

  if (isLoading && hourly.length === 0) {
    return (
      <div
        className={cn(
          "w-full max-w-3xl rounded-2xl border border-border/60 bg-background/90 px-5 py-4 shadow-xl shadow-black/10 backdrop-blur-xl",
          className,
        )}
      >
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          Loading forecast...
        </div>
      </div>
    );
  }

  if (error || !selectedHour) {
    return (
      <div
        className={cn(
          "w-full max-w-3xl rounded-2xl border border-border/60 bg-background/90 px-5 py-4 shadow-xl shadow-black/10 backdrop-blur-xl",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>{error ? "Forecast unavailable" : "Select a location to view forecast"}</span>
          {locationInfo?.displayName && (
            <span className="truncate text-xs text-muted-foreground/70">
              {locationInfo.displayName}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full max-w-3xl rounded-2xl border border-border/60 bg-background/90 px-5 py-4 shadow-xl shadow-black/10 backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted/70">
            <WeatherIcon
              code={selectedHour.weatherCode}
              isDay={selectedHour.isDay}
              className="size-5 text-foreground"
            />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold">
                {Math.round(selectedHour.temperature)}°
              </span>
              <span className="text-xs text-muted-foreground">
                {formatHour(selectedHour.time)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {locationInfo?.displayName || "Current location"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-semibold">12-Hour Forecast</p>
          <p className="text-xs text-muted-foreground">
            {formatDockDate(selectedHour.time)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous hour"
            onClick={handlePrev}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              handlePrev();
            }}
            tabIndex={0}
            className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next hour"
            onClick={handleNext}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              handleNext();
            }}
            tabIndex={0}
            className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <input
          type="range"
          aria-label="Forecast hour"
          min={0}
          max={maxIndex}
          step={1}
          value={safeIndex}
          onChange={handleSliderChange}
          className="h-2 w-full cursor-pointer accent-foreground"
        />
        <div className="mt-3 grid grid-cols-6 gap-2 text-[10px] text-muted-foreground sm:grid-cols-12">
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
                index === safeIndex && "bg-muted/70 text-foreground",
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
