"use client";

import { ChevronRight, Activity, Clock, Info } from "lucide-react";
import type { ProcessedEarthquake } from "@/types/api";
import { getMagnitudeColor, getMagnitudeLabel } from "@/types/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

type EarthquakeItemProps = {
  earthquake: ProcessedEarthquake;
  onClick?: () => void;
  collapsed?: boolean;
};

const EarthquakeItem = ({
  earthquake,
  onClick,
  collapsed,
}: EarthquakeItemProps) => {
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
          <p className="font-medium">
            {earthquake.magnitude.toFixed(1)} - {earthquake.place}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(earthquake.time)}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-2 rounded-xl px-3 py-3 text-left transition-all hover:bg-muted/70"
      aria-label={earthquake.title}
    >
      <div className="flex items-center gap-3">
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
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-semibold text-foreground">
              {earthquake.place}
            </p>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/70">
              {getMagnitudeLabel(earthquake.magnitude)}
            </span>
            <span className="opacity-50">•</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatRelativeTime(earthquake.time)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pl-13">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Activity className="size-3" />
          <span>Depth: {earthquake.depth.toFixed(1)}km</span>
        </div>
        {earthquake.tsunami && (
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <Info className="size-3" />
            <span>Tsunami Risk</span>
          </div>
        )}
      </div>
    </button>
  );
};

export { EarthquakeItem };
