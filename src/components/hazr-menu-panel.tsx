"use client";

import {
  Mountain,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { EarthquakeItem } from "@/components/hazr-earthquake-item";
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
import { useEarthquakes } from "@/hooks/use-earthquakes";
import type { ProcessedEarthquake } from "@/types/api";

type HazrMenuPanelProps = {
  onSelect?: () => void;
  collapsed?: boolean;
  userLocation?: [number, number] | null;
  isLocating?: boolean;
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
              <div className="flex size-10 items-center justify-center rounded-xl text-sm font-medium text-muted-foreground">
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
      <div className="flex items-center justify-between px-0 pb-1">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-red-500 p-2.5 shadow-lg shadow-red-500/20">
            <Mountain className="size-5 text-white" />
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
          <div className="flex max-h-70 flex-col gap-0 overflow-y-auto scrollbar-hide">
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
  isLocating = false,
  onEarthquakeSelect,
}: HazrMenuPanelProps) {
  const handleSettingsClick = () => onSelect?.();

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex flex-col", collapsed ? "p-2" : "p-4")}>
        {/* Weather Section */}
        {!collapsed && (
          <p className="px-2 pb-2 text-sm font-medium text-muted-foreground">
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
          <p className="px-0 pb-1 text-sm font-medium text-muted-foreground">
            Seismic Activity
          </p>
        )}
        <div className={cn(collapsed && "flex flex-col items-center")}
        >
          <EarthquakeFeed
            collapsed={collapsed}
            onEarthquakeSelect={onEarthquakeSelect}
          />
        </div>

        <Separator className={cn(collapsed ? "my-2" : "my-2")} />


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
