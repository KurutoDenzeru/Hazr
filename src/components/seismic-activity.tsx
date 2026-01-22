"use client";

import { Mountain, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { EarthquakeItem } from "@/components/hazr-earthquake-item";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEarthquakes } from "@/hooks/use-earthquakes";
import type { ProcessedEarthquake } from "@/types/api";

type SeismicActivityProps = {
  collapsed: boolean;
  onEarthquakeSelect?: (earthquake: ProcessedEarthquake) => void;
};

// Format time for display
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const SeismicActivity = ({ collapsed, onEarthquakeSelect }: SeismicActivityProps) => {
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
              <div className="flex size-10 items-center justify-center rounded-md text-sm font-medium text-muted-foreground">
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
    <TooltipProvider delayDuration={0}>
      <div className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-0 my-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-red-500/20 p-2.5 dark:bg-red-500/30">
              <Mountain className="size-5 text-red-700 dark:text-red-200" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Live Earthquakes</h3>
              <p className="text-sm text-muted-foreground">{metadata?.count ?? 0} in the last 24h</p>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-md text-muted-foreground hover:bg-muted/80 dark:hover:bg-muted/40"
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
            <>
              <p className="px-1 my-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                History
              </p>
              <ScrollArea className="h-70 rounded-md bg-muted/30 dark:bg-muted/15 pr-3">
                <div className="flex flex-col gap-1">
                  {earthquakes.slice(0, 10).map((eq) => (
                    <EarthquakeItem key={eq.id} earthquake={eq} onClick={() => onEarthquakeSelect?.(eq)} />
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Footer */}
        {lastUpdated && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground/60">Updated {formatTime(lastUpdated)}</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default SeismicActivity;
