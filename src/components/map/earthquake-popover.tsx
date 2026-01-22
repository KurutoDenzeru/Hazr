"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  ExternalLink,
  Gauge,
  X,
  MapPin,
  Radio,
  Ruler,
  Signal,
  Users,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MapPopup } from "@/components/ui/map";
import { cn } from "@/lib/utils";
import { getMagnitudeColor, getMagnitudeLabel } from "@/types/api";
import type { ProcessedEarthquake } from "@/types/api";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
};

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

export function EarthquakePopover({
  earthquake,
  onClose,
}: {
  earthquake: ProcessedEarthquake | null;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();

  if (!earthquake) return null;

  const magColor = getMagnitudeColor(earthquake.magnitude);
  const statusLabel =
    earthquake.status === "reviewed"
      ? "Status: Reviewed"
      : earthquake.status === "deleted"
        ? "Status: Deleted"
        : "Status: Automatic";
  const StatusIcon =
    earthquake.status === "reviewed"
      ? CheckCircle2
      : earthquake.status === "deleted"
        ? AlertTriangle
        : CircleDot;

  const statusBadgeClass = cn(
    "gap-1",
    earthquake.status === "reviewed" && "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200",
    earthquake.status === "deleted" && "bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-200",
    earthquake.status === "automatic" && "bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200",
  );

  const detailItems = [
    { label: "Depth below ground", value: `${earthquake.depth.toFixed(1)} km`, icon: Ruler },
    { label: "Impact score", value: `${earthquake.sig}`, icon: Signal },
    earthquake.felt !== null
      ? { label: "Felt", value: `${earthquake.felt}`, icon: Users }
      : null,
    earthquake.mmi !== null
      ? { label: "Intensity (MMI)", value: earthquake.mmi.toFixed(1), icon: Gauge }
      : null,
    earthquake.cdi !== null
      ? { label: "Community intensity", value: earthquake.cdi.toFixed(1), icon: Signal }
      : null,
    earthquake.gap !== null
      ? { label: "Azimuthal gap", value: `${earthquake.gap.toFixed(0)}°`, icon: CircleDot }
      : null,
    earthquake.dmin !== null
      ? { label: "Nearest station", value: earthquake.dmin.toFixed(2), icon: MapPin }
      : null,
    earthquake.rms !== null
      ? { label: "Wave residual", value: earthquake.rms.toFixed(2), icon: Radio }
      : null,
    earthquake.nst !== null
      ? { label: "Stations reporting", value: `${earthquake.nst}`, icon: Radio }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;

  const popupOffset: [number, number] = isMobile ? [0, -140] : [0, -18];

  return (
    <MapPopup
      key={earthquake.id}
      longitude={earthquake.coordinates[0]}
      latitude={earthquake.coordinates[1]}
      onClose={onClose}
      closeOnClick={false}
      offset={popupOffset}
      className="w-[92vw] max-w-sm sm:max-w-md max-h-[75vh] overflow-y-auto rounded-lg border border-border/60 bg-background/95 p-4 sm:p-5 shadow-lg"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white shadow-lg"
            style={{
              backgroundColor: magColor,
              boxShadow: `0 4px 14px ${magColor}40`,
            }}
          >
            {earthquake.magnitude.toFixed(1)}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                <span className="line-clamp-3 text-foreground font-semibold">
                  {earthquake.place}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-indigo-500/20 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200">
                {getMagnitudeLabel(earthquake.magnitude)}
              </Badge>
              <Badge className="gap-1 bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200">
                <Clock className="size-3" />
                {formatRelativeTime(earthquake.time)}
              </Badge>
              <Badge className="gap-1 bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200">
                <Clock className="size-3" />
                Last updated {formatRelativeTime(earthquake.updated)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={statusBadgeClass}>
            <StatusIcon className="size-3" />
            {statusLabel}
          </Badge>
          {earthquake.magType ? (
            <Badge className="bg-slate-500/20 text-slate-700 dark:bg-slate-500/30 dark:text-slate-200">
              Magnitude scale: {earthquake.magType.toUpperCase()}
            </Badge>
          ) : null}
          {earthquake.net ? (
            <Badge className="bg-slate-500/20 text-slate-700 dark:bg-slate-500/30 dark:text-slate-200">
              Network: {earthquake.net.toUpperCase()}
            </Badge>
          ) : null}
          {earthquake.alert ? (
            <Badge
              className={cn(
                "gap-1",
                earthquake.alert === "yellow" && "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-200",
                earthquake.alert === "orange" && "bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-200",
                earthquake.alert === "red" && "bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-200",
                earthquake.alert === "green" && "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200",
              )}
            >
              <AlertTriangle className="size-3" />
              Alert {earthquake.alert}
            </Badge>
          ) : null}
          {earthquake.tsunami ? (
            <Badge className="gap-1 bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-200">
              <Waves className="size-3" />
              Tsunami risk
            </Badge>
          ) : null}
          {/* <Badge className="bg-muted/60 text-foreground/80 dark:bg-muted/25 dark:text-foreground">
            ID: {earthquake.id}
          </Badge> */}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {detailItems.map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/40 px-3 py-2 dark:bg-muted/20">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                <item.icon className="size-3" />
                <span>{item.label}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        {/* {typeBadges.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Types
            </p>
            <div className="flex flex-wrap gap-2">
              {typeBadges.map((type) => (
                <Badge
                  key={type}
                  className="bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200"
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        ) : null} */}

        <div className="flex flex-wrap gap-2">
          <Badge className="gap-1 bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
            <MapPin className="size-3" />
            Latitude: {earthquake.coordinates[1].toFixed(4)}
          </Badge>
          <Badge className="gap-1 bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
            <MapPin className="size-3" />
            Longitude: {earthquake.coordinates[0].toFixed(4)}
          </Badge>
        </div>

        <a
          href={earthquake.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2.5 text-sm font-medium transition-colors"
        >
          View on USGS
          <ExternalLink className="size-4" />
        </a>

      </div>
    </MapPopup>
  );
}
