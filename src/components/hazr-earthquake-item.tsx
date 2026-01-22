"use client";

import {
  ChevronRight,
  Clock,
  Ruler,
  Users,
  Gauge,
  Waves,
  AlertTriangle,
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
            className="flex size-10 items-center justify-center rounded-md transition-colors hover:bg-muted/80 dark:hover:bg-muted/40"
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

  const detailBadges = [
    {
      label: `Magnitude ${earthquake.magnitude.toFixed(1)}`,
      icon: Gauge,
      className: "bg-indigo-500/20 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200",
    },
    {
      label: `Depth ${earthquake.depth.toFixed(1)}km`,
      icon: Ruler,
      className: "bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200",
    },
    {
      label: `${formatRelativeTime(earthquake.time)}`,
      icon: Clock,
      className: "bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200",
    },
    earthquake.felt !== null
      ? {
          label: `${earthquake.felt} felt`,
          icon: Users,
          className: "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200",
        }
      : null,
    earthquake.mmi !== null
      ? {
          label: `MMI ${earthquake.mmi.toFixed(1)}`,
          icon: Gauge,
          className: "bg-violet-500/20 text-violet-700 dark:bg-violet-500/30 dark:text-violet-200",
        }
      : null,
    earthquake.tsunami
      ? {
          label: "Tsunami",
          icon: Waves,
          className: "bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200",
        }
      : null,
    earthquake.alert
      ? {
          label: `Alert ${earthquake.alert}`,
          icon: AlertTriangle,
          className: cn(
            "bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-200",
            earthquake.alert === "yellow" && "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-200",
            earthquake.alert === "orange" && "bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-200",
            earthquake.alert === "green" && "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200",
          ),
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }>;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-2 rounded-md bg-muted/30 px-2 py-2 text-left transition-all hover:bg-muted/60 dark:bg-muted/10 dark:hover:bg-muted/30"
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
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pl-13">
        {detailBadges.map((badge) => (
          <div
            key={badge.label}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium",
              badge.className,
            )}
          >
            <badge.icon className="size-3" />
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    </button>
  );
};

export { EarthquakeItem };
