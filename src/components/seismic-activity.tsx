"use client";

import React from "react";
import { Mountain, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { EarthquakeItem } from "@/components/hazr-earthquake-item";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEarthquakes } from "@/hooks/use-earthquakes";
import type { EarthquakeMagnitude, ProcessedEarthquake } from "@/types/api";

type SeismicActivityProps = {
  collapsed: boolean;
  onEarthquakeSelect?: (earthquake: ProcessedEarthquake) => void;
  onOpenSection?: () => void;
  magnitude?: EarthquakeMagnitude;
};

// Format time for display
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getPaginationRange = (totalPages: number, currentPage: number) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages] as const;
};

export const SeismicActivity = ({
  collapsed,
  onEarthquakeSelect,
  onOpenSection,
  magnitude = "2.5",
}: SeismicActivityProps) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 7;
  const { earthquakes, isLoading, error, lastUpdated, refetch, metadata } =
    useEarthquakes({
      magnitude,
      range: "day",
    });
  const totalPages = Math.max(1, Math.ceil(earthquakes.length / pageSize));
  const currentPageEarthquakes = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return earthquakes.slice(startIndex, startIndex + pageSize);
  }, [currentPage, earthquakes]);
  const paginationRange = React.useMemo(
    () => getPaginationRange(totalPages, currentPage),
    [currentPage, totalPages],
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [earthquakes]);

  const handleRefresh = () => {
    void refetch();
  };

  const handlePreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const strongestMagnitude = earthquakes.reduce<number>(
    (currentStrongest, earthquake) =>
      Math.max(currentStrongest, earthquake.magnitude),
    0
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onOpenSection}
            className="flex size-12 items-center justify-center rounded-md transition-colors hover:bg-muted/70"
            aria-label="USGS earthquakes"
          >
            <div className="flex size-9 items-center justify-center rounded-md bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-200">
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mountain className="size-4" />
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-56">
          <p className="font-medium">USGS Earthquakes</p>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Updating earthquake feed...</p>
          ) : error ? (
            <p className="text-xs text-muted-foreground">Unable to load latest data right now.</p>
          ) : earthquakes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No earthquakes reported in the last 24h.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {metadata?.count ?? earthquakes.length} in last 24h, strongest M
              {strongestMagnitude.toFixed(1)}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
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
              <h3 className="text-sm font-medium">USGS Earthquakes</h3>
              <p className="text-sm text-muted-foreground">{metadata?.count ?? 0} in the last 24h</p>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-md text-muted-foreground hover:bg-muted/80 dark:hover:bg-muted/40"
                type="button"
                onClick={handleRefresh}
                aria-label="Refresh earthquakes"
              >
                <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isLoading
                ? "Refreshing..."
                : lastUpdated
                  ? `Updated ${formatTime(lastUpdated)}`
                  : "Refresh feed"}
            </TooltipContent>
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
              <ScrollArea className="h-[30rem] rounded-md bg-muted/30 dark:bg-muted/15 pr-3">
                <div className="flex flex-col gap-1">
                  {currentPageEarthquakes.map((eq) => (
                    <EarthquakeItem key={eq.id} earthquake={eq} onClick={() => onEarthquakeSelect?.(eq)} />
                  ))}
                </div>
              </ScrollArea>
              {totalPages > 1 ? (
                <Pagination className="mt-3">
                  <PaginationContent className="hidden sm:flex">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        aria-disabled={currentPage === 1}
                      />
                    </PaginationItem>
                    {paginationRange.map((entry, index) => (
                      <PaginationItem key={`quake-page-${entry}-${index}`}>
                        {entry === "ellipsis" ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationButton
                            onClick={() => setCurrentPage(entry)}
                            isActive={entry === currentPage}
                            aria-label={`Go to page ${entry}`}
                          >
                            {entry}
                          </PaginationButton>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        aria-disabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                  <PaginationContent className="flex w-full items-center justify-between gap-2 sm:hidden">
                    <PaginationItem>
                      <PaginationButton
                        size="sm"
                        className="px-2.5"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        aria-disabled={currentPage === 1}
                        aria-label="Go to previous page"
                      >
                        Prev
                      </PaginationButton>
                    </PaginationItem>
                    <PaginationItem>
                      <span className="text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationButton
                        size="sm"
                        className="px-2.5"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        aria-disabled={currentPage === totalPages}
                        aria-label="Go to next page"
                      >
                        Next
                      </PaginationButton>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </>
          )}
        </div>

      </div>
    </TooltipProvider>
  );
};

export default SeismicActivity;
