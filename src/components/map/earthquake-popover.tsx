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
      ? "Reviewed"
      : earthquake.status === "deleted"
        ? "Deleted"
        : "Automatic";
  const StatusIcon =
    earthquake.status === "reviewed"
      ? CheckCircle2
      : earthquake.status === "deleted"
        ? AlertTriangle
        : CircleDot;
  const typeList = earthquake.types
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");

  const detailItems = [
    { label: "Depth", value: `${earthquake.depth.toFixed(1)} km`, icon: Ruler },
    { label: "Significance", value: `${earthquake.sig}`, icon: Signal },
    earthquake.felt !== null
      ? { label: "Felt", value: `${earthquake.felt}`, icon: Users }
      : null,
    earthquake.mmi !== null
      ? { label: "MMI", value: earthquake.mmi.toFixed(1), icon: Gauge }
      : null,
    earthquake.cdi !== null
      ? { label: "CDI", value: earthquake.cdi.toFixed(1), icon: Signal }
      : null,
    earthquake.gap !== null
      ? { label: "Gap", value: `${earthquake.gap.toFixed(0)}°`, icon: CircleDot }
      : null,
    earthquake.rms !== null
      ? { label: "RMS", value: earthquake.rms.toFixed(2), icon: Radio }
      : null,
    earthquake.nst !== null
      ? { label: "Stations", value: `${earthquake.nst}`, icon: Radio }
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
      className="w-80 max-h-[70vh] overflow-auto rounded-lg border border-border/60 bg-background/95 p-4 shadow-lg"
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white shadow-lg"
            style={{
              backgroundColor: magColor,
              boxShadow: `0 4px 14px ${magColor}40`,
            }}
          >
            {earthquake.magnitude.toFixed(1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                <span className="line-clamp-2 text-foreground font-semibold">
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
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {getMagnitudeLabel(earthquake.magnitude)}
              </span>
              <span className="opacity-50">•</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatRelativeTime(earthquake.time)}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground/70">
              Updated {formatRelativeTime(earthquake.updated)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <StatusIcon className="size-3" />
            {statusLabel}
          </Badge>
          {earthquake.magType ? (
            <Badge variant="outline">Mag: {earthquake.magType.toUpperCase()}</Badge>
          ) : null}
          {earthquake.net ? (
            <Badge variant="outline">Net: {earthquake.net.toUpperCase()}</Badge>
          ) : null}
          {earthquake.alert ? (
            <Badge
              variant="destructive"
              className={cn(
                "gap-1",
                earthquake.alert === "yellow" && "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
                earthquake.alert === "orange" && "bg-orange-500/10 text-orange-700 border-orange-500/20",
                earthquake.alert === "red" && "bg-red-500/10 text-red-700 border-red-500/20",
                earthquake.alert === "green" && "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
              )}
            >
              <AlertTriangle className="size-3" />
              Alert {earthquake.alert}
            </Badge>
          ) : null}
          {earthquake.tsunami ? (
            <Badge variant="outline" className="gap-1 border-blue-500/40 text-blue-600">
              <Waves className="size-3" />
              Tsunami risk
            </Badge>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {detailItems.map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                <item.icon className="size-3" />
                <span>{item.label}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        {typeList ? (
          <div className="text-[10px] text-muted-foreground/70">
            Types: {typeList}
          </div>
        ) : null}

        <a
          href={earthquake.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2.5 text-sm font-medium transition-colors"
        >
          View on USGS
          <ExternalLink className="size-4" />
        </a>

        <p className="text-[10px] text-muted-foreground/60">
          {earthquake.coordinates[1].toFixed(4)}°, {earthquake.coordinates[0].toFixed(4)}°
        </p>
      </div>
    </MapPopup>
  );
}
