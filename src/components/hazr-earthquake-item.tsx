"use client";

import {
  ChevronRight,
  Clock,
  Ruler,
  Gauge,
  Waves,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import type { ProcessedEarthquake } from "@/types/api";
import { getMagnitudeColor } from "@/types/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
            className="relative flex size-12 items-center justify-center rounded-md transition-colors hover:bg-muted/80 dark:hover:bg-muted/40"
            aria-label={earthquake.title}
          >
            <div
              className="flex size-8 items-center justify-center rounded-md text-xs font-bold text-white"
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

  const detailBadges = [
    {
      label: `Magnitude ${earthquake.magnitude.toFixed(1)}`,
      icon: Gauge,
      className: "bg-tone-info-bg text-tone-info-fg",
    },
    {
      label: `Depth ${earthquake.depth.toFixed(1)}km`,
      icon: Ruler,
      className: "bg-tone-meta-bg text-tone-meta-fg",
    },
    {
      label: `${formatRelativeTime(earthquake.time)}`,
      icon: Clock,
      className: "bg-tone-warning-bg text-tone-warning-fg",
    },
    earthquake.mmi !== null
      ? {
          label: `MMI ${earthquake.mmi.toFixed(1)}`,
          icon: Gauge,
          className: "bg-tone-info-bg text-tone-info-fg",
        }
      : null,
    earthquake.tsunami
      ? {
          label: "Tsunami",
          icon: Waves,
          className: "bg-tone-tsunami-bg text-tone-tsunami-fg",
        }
      : null,
    earthquake.alert
      ? {
          label: `Alert ${earthquake.alert}`,
          icon: AlertTriangle,
          className: cn(
            "bg-tone-danger-bg text-tone-danger-fg",
            earthquake.alert === "yellow" && "bg-tone-warning-bg text-tone-warning-fg",
            earthquake.alert === "orange" && "bg-tone-earthquake-bg text-tone-earthquake-fg",
            earthquake.alert === "green" && "bg-tone-airquality-bg text-tone-airquality-fg",
          ),
        }
      : null,
    {
      label: `${Math.abs(earthquake.coordinates[1]).toFixed(1)}°${earthquake.coordinates[1] >= 0 ? "N" : "S"} ${Math.abs(earthquake.coordinates[0]).toFixed(1)}°${earthquake.coordinates[0] >= 0 ? "E" : "W"}`,
      icon: MapPin,
      className: "bg-tone-meta-bg text-tone-meta-fg",
    },
  ].filter(Boolean) as Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }>;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-2 rounded-md border border-border/60 bg-background/35 px-2.5 py-2.5 text-left transition-all hover:bg-muted/40 dark:bg-background/20 dark:hover:bg-muted/20"
      aria-label={earthquake.title}
    >
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-md border border-white/15 text-sm font-bold text-white transition-transform group-hover:scale-105"
            style={{
              backgroundColor: magColor,
            }}
          >
            <span className="flex items-center gap-1">
              {earthquake.magnitude.toFixed(1)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-semibold text-foreground">
                {earthquake.place}
              </p>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5" />
            </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {detailBadges.map((badge) => (
              <div
                key={badge.label}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1 text-xs font-semibold",
                  badge.className,
                )}
              >
                <badge.icon className="size-3" />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
};

export { EarthquakeItem };
