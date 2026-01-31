"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Menu,
  Plus,
  Minus,
  Locate,
  Map as MapIcon,
  Activity,
  Cloud,
  CloudLightning,
  Flame,
  Maximize,
  Sun,
  Moon,
  Box,
  Loader2,
  SlidersHorizontal,
  Globe2,
  AlertTriangle,
  CircleDot,
  Clock,
  ExternalLink,
  Gauge,
  MapPin,
  Radio,
  Signal,
  Snowflake,
  Users,
  Waves,
  X,
  Wind,
  Mountain,
} from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  useMap,
  MapMarker,
  MarkerContent,
} from "@/components/ui/map";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { HazrMenuPanel } from "@/components/hazr-menu-panel";
import { EarthquakeItem } from "@/components/hazr-earthquake-item";
import { HourlyForecastDock } from "@/components/map/hourly-forecast-dock";
import { WeatherDock } from "@/components/map/weather-dock";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import type {
  ProcessedAirQualitySite,
  ProcessedEarthquake,
  ProcessedEonetEvent,
  ProcessedTsunamiAlert,
} from "@/types/api";
import { getMagnitudeColor, getMagnitudeLabel } from "@/types/api";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MapViewState = {
  center: [number, number];
  zoom: number;
};

export type LayerVisibility = {
  earthquakes: boolean;
  eonet: boolean;
  airQuality: boolean;
  tsunami: boolean;
};

export const useIsMobile = () => {
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

export const useIsTablet = () => {
  const [isTablet, setIsTablet] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)");
    const handleChange = () => setIsTablet(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return isTablet;
};

export const getEventIcon = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes("storm")) return CloudLightning;
  if (normalized.includes("wildfire") || normalized.includes("fire")) return Flame;
  if (normalized.includes("flood")) return Waves;
  if (normalized.includes("volcano")) return Mountain;
  if (normalized.includes("ice")) return Snowflake;
  if (normalized.includes("drought")) return Sun;
  if (normalized.includes("dust")) return Wind;
  return Globe2;
};

export function MapStateSync({
  setViewState,
  onUserInteract,
  viewStateKey,
  viewStateSourceKey,
}: {
  setViewState: (s: MapViewState) => void;
  onUserInteract?: () => void;
  viewStateKey: string;
  viewStateSourceKey: string;
}) {
  const { map } = useMap();
  const hasUserInteractedRef = React.useRef(false);

  React.useEffect(() => {
    if (!map) return;

    const markUserInteraction = () => {
      hasUserInteractedRef.current = true;
      onUserInteract?.();
    };

    const handleMoveEnd = () => {
      if (!hasUserInteractedRef.current) return;
      const newState = {
        center: [map.getCenter().lng, map.getCenter().lat] as [number, number],
        zoom: map.getZoom(),
      };
      setViewState(newState);
      try {
        localStorage.setItem(viewStateKey, JSON.stringify(newState));
        localStorage.setItem(viewStateSourceKey, "user");
      } catch {
        // ignore storage errors
      }
    };

    map.on("dragstart", markUserInteraction);
    map.on("zoomstart", markUserInteraction);
    map.on("rotatestart", markUserInteraction);
    map.on("pitchstart", markUserInteraction);
    map.on("moveend", handleMoveEnd);
    return () => {
      map.off("dragstart", markUserInteraction);
      map.off("zoomstart", markUserInteraction);
      map.off("rotatestart", markUserInteraction);
      map.off("pitchstart", markUserInteraction);
      map.off("moveend", handleMoveEnd);
    };
  }, [map, setViewState, onUserInteract, viewStateKey, viewStateSourceKey]);

  return null;
}

export function MapViewController({
  viewState,
  shouldAutoCenter,
}: {
  viewState: MapViewState;
  shouldAutoCenter: boolean;
}) {
  const { map, isLoaded } = useMap();
  const lastAppliedRef = React.useRef<MapViewState | null>(null);

  React.useEffect(() => {
    if (!map || !isLoaded || !shouldAutoCenter) return;

    const lastApplied = lastAppliedRef.current;
    if (
      lastApplied &&
      lastApplied.center[0] === viewState.center[0] &&
      lastApplied.center[1] === viewState.center[1] &&
      lastApplied.zoom === viewState.zoom
    ) {
      return;
    }

    map.easeTo({
      center: viewState.center,
      zoom: viewState.zoom,
      duration: 900,
      essential: true,
    });
    lastAppliedRef.current = viewState;
  }, [map, isLoaded, shouldAutoCenter, viewState]);

  return null;
}

function useMapZoom() {
  const { map } = useMap();
  const [zoom, setZoom] = React.useState(() => map?.getZoom() ?? 0);

  React.useEffect(() => {
    if (!map) return;
    const handleMove = () => setZoom(map.getZoom());
    map.on("move", handleMove);
    return () => {
      map.off("move", handleMove);
    };
  }, [map]);

  return zoom;
}

export function GlobalSignalMarkers({
  events,
  tsunamiAlerts,
  airQualitySites,
  layerVisibility,
  clusterMaxZoom,
  onEventSelect,
  onTsunamiSelect,
  onAirQualitySelect,
}: {
  events: ProcessedEonetEvent[];
  tsunamiAlerts: ProcessedTsunamiAlert[];
  airQualitySites: ProcessedAirQualitySite[];
  layerVisibility: Pick<LayerVisibility, "eonet" | "airQuality" | "tsunami">;
  clusterMaxZoom: number;
  onEventSelect: (event: ProcessedEonetEvent) => void;
  onTsunamiSelect: (alert: ProcessedTsunamiAlert) => void;
  onAirQualitySelect: (site: ProcessedAirQualitySite) => void;
}) {
  const zoom = useMapZoom();
  if (zoom < clusterMaxZoom) return null;

  const getEventTone = (category: string) => {
    const normalized = category.toLowerCase();
    if (normalized.includes("storm")) return "#f59e0b";
    if (normalized.includes("wildfire") || normalized.includes("fire")) return "#f97316";
    if (normalized.includes("flood")) return "#38bdf8";
    if (normalized.includes("volcano")) return "#fb7185";
    if (normalized.includes("ice")) return "#22d3ee";
    if (normalized.includes("drought")) return "#a16207";
    if (normalized.includes("dust")) return "#fbbf24";
    return "#f59e0b";
  };

  return (
    <>
      {layerVisibility.eonet &&
        events.map((event) => {
          const tone = getEventTone(event.category);
          const EventIcon = getEventIcon(event.category);
          return (
            <MapMarker
              key={event.id}
              longitude={event.coordinates[0]}
              latitude={event.coordinates[1]}
            >
              <MarkerContent>
                <button
                  type="button"
                  onClick={() => onEventSelect(event)}
                  className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur transition-transform hover:scale-105"
                  style={{
                    backgroundColor: tone,
                    boxShadow: `0 6px 16px ${tone}55`,
                  }}
                  aria-label={`Event: ${event.title}`}
                >
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/90">
                    <EventIcon className="size-3.5" style={{ color: tone }} />
                  </span>
                  <span className="truncate max-w-[80px]">
                    {event.category}
                  </span>
                </button>
              </MarkerContent>
            </MapMarker>
          );
        })}

      {layerVisibility.tsunami &&
        tsunamiAlerts.map((alert) => (
          <MapMarker
            key={alert.id}
            longitude={alert.coordinates[0]}
            latitude={alert.coordinates[1]}
          >
            <MarkerContent>
                <button
                  type="button"
                  onClick={() => onTsunamiSelect(alert)}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-blue-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur transition-transform hover:scale-105"
                  style={{ boxShadow: "0 6px 16px #3b82f680" }}
                  aria-label="Tsunami alert"
                >
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/90">
                    <Waves className="size-3.5 text-blue-600" />
                  </span>
                  <span className="truncate max-w-[80px]">Tsunami</span>
                </button>
            </MarkerContent>
          </MapMarker>
        ))}

      {layerVisibility.airQuality &&
        airQualitySites.map((site) => (
          <MapMarker
            key={site.id}
            longitude={site.coordinates[0]}
            latitude={site.coordinates[1]}
          >
            <MarkerContent>
                <button
                  type="button"
                  onClick={() => onAirQualitySelect(site)}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur transition-transform hover:scale-105"
                  style={{ boxShadow: "0 6px 16px #10b98170" }}
                  aria-label={`Air quality: ${site.location}`}
                >
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/90">
                    <Wind className="size-3.5 text-emerald-600" />
                  </span>
                  <span className="truncate max-w-[90px]">
                    {site.parameter.toUpperCase()} {Number.isFinite(site.value) ? site.value.toFixed(1) : site.value}
                  </span>
              </button>
            </MarkerContent>
          </MapMarker>
        ))}
    </>
  );
}

export function EarthquakeFlyTo({
  earthquake,
}: {
  earthquake: ProcessedEarthquake | null;
}) {
  const { map } = useMap();
  const prevEarthquakeId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!map || !earthquake) return;

    if (prevEarthquakeId.current === earthquake.id) return;
    prevEarthquakeId.current = earthquake.id;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    map.stop();
    map.easeTo({
      center: [earthquake.coordinates[0], earthquake.coordinates[1]],
      zoom: Math.max(map.getZoom(), 8),
      duration: 900,
      easing: easeOut,
      essential: true,
    });
  }, [map, earthquake]);

  return null;
}

export function EonetFlyTo({
  event,
}: {
  event: ProcessedEonetEvent | null;
}) {
  const { map } = useMap();
  const prevEventId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!map || !event) return;
    if (prevEventId.current === event.id) return;
    prevEventId.current = event.id;

    map.stop();
    map.easeTo({
      center: event.coordinates,
      zoom: Math.max(map.getZoom(), 5.8),
      duration: 900,
      essential: true,
    });
  }, [map, event]);

  return null;
}

export function SignalOverlay({
  activeType,
  earthquake,
  event,
  tsunamiAlert,
  airQualitySite,
  onCloseEarthquake,
  onCloseEvent,
}: {
  activeType: "earthquake" | "global" | null;
  earthquake: ProcessedEarthquake | null;
  event: ProcessedEonetEvent | null;
  tsunamiAlert: ProcessedTsunamiAlert | null;
  airQualitySite: ProcessedAirQualitySite | null;
  onCloseEarthquake: () => void;
  onCloseEvent: () => void;
}) {
  const { map } = useMap();
  const overlayContainer = React.useMemo(() => document.createElement("div"), []);

  React.useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    overlayContainer.className =
      "absolute left-3 right-3 top-3 z-30 pointer-events-auto sm:left-auto sm:right-4 sm:top-4";
    container.appendChild(overlayContainer);
    return () => {
      overlayContainer.remove();
    };
  }, [map, overlayContainer]);

  const activeEarthquake = activeType === "earthquake" ? earthquake : null;
  const activeEvent = activeType === "global" ? event : null;
  const activeTsunami = activeType === "global" ? tsunamiAlert : null;
  const activeAirQuality = activeType === "global" ? airQualitySite : null;

  if (!map || (!activeEarthquake && !activeEvent && !activeTsunami && !activeAirQuality)) return null;

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

  const detailItems = activeEarthquake
    ? (
        [
          {
            label: "Magnitude",
            value: `${activeEarthquake.magnitude.toFixed(1)} (${getMagnitudeLabel(activeEarthquake.magnitude)})`,
            icon: Gauge,
          },
          activeEarthquake.magType
            ? {
                label: "Magnitude scale",
                value: activeEarthquake.magType.toUpperCase(),
                icon: Gauge,
              }
            : null,
          { label: "Depth below ground", value: `${activeEarthquake.depth.toFixed(1)} km`, icon: MapPin },
          { label: "Impact score", value: `${activeEarthquake.sig}`, icon: Signal },
          activeEarthquake.felt !== null
            ? { label: "Felt", value: `${activeEarthquake.felt}`, icon: Users }
            : null,
          activeEarthquake.mmi !== null
            ? { label: "Intensity (MMI)", value: activeEarthquake.mmi.toFixed(1), icon: Gauge }
            : null,
          activeEarthquake.cdi !== null
            ? { label: "Community intensity", value: activeEarthquake.cdi.toFixed(1), icon: Signal }
            : null,
          activeEarthquake.gap !== null
            ? { label: "Azimuthal gap", value: `${activeEarthquake.gap.toFixed(0)}°`, icon: CircleDot }
            : null,
          activeEarthquake.dmin !== null
            ? { label: "Nearest station", value: activeEarthquake.dmin.toFixed(2), icon: MapPin }
            : null,
          activeEarthquake.rms !== null
            ? { label: "Wave residual", value: activeEarthquake.rms.toFixed(2), icon: Radio }
            : null,
          activeEarthquake.nst !== null
            ? { label: "Stations reporting", value: `${activeEarthquake.nst}`, icon: Radio }
            : null,
        ].filter(Boolean) as Array<{ label: string; value: string; icon: React.ComponentType<{ className?: string }> }>
      )
    : [];

  const typeBadges = activeEarthquake?.types
    ? activeEarthquake.types
        .split(",")
        .map((type) => type.trim())
        .filter((type) =>
          Boolean(type) && !["origin", "phase-data"].includes(type.toLowerCase()),
        )
    : [];

  return createPortal(
    <div className="w-full max-w-sm sm:max-w-md max-h-[75vh] overflow-y-auto rounded-lg border border-border/60 bg-background/95 p-3 shadow-lg">
      {activeEarthquake && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white shadow-lg"
              style={{
                backgroundColor: getMagnitudeColor(activeEarthquake.magnitude),
                boxShadow: `0 4px 14px ${getMagnitudeColor(activeEarthquake.magnitude)}40`,
              }}
            >
              {activeEarthquake.magnitude.toFixed(1)}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  <span className="line-clamp-2 text-foreground font-semibold leading-snug">
                    {activeEarthquake.place}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseEarthquake}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="gap-1 bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200">
                  <Clock className="size-3" />
                  Updated {formatRelativeTime(activeEarthquake.updated)}
                </Badge>
                {activeEarthquake.alert ? (
                  <Badge
                    className={cn(
                      "gap-1",
                      activeEarthquake.alert === "yellow" &&
                        "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-200",
                      activeEarthquake.alert === "orange" &&
                        "bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-200",
                      activeEarthquake.alert === "red" &&
                        "bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-200",
                      activeEarthquake.alert === "green" &&
                        "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200",
                    )}
                  >
                    <AlertTriangle className="size-3" />
                    Alert {activeEarthquake.alert}
                  </Badge>
                ) : null}
                {activeEarthquake.tsunami ? (
                  <Badge className="gap-1 bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-200">
                    <Waves className="size-3" />
                    Tsunami risk
                  </Badge>
                ) : null}
              </div>
            </div>
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

          {typeBadges.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Event tags
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
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
              <MapPin className="size-3" />
              Latitude: {activeEarthquake.coordinates[1].toFixed(4)}
            </Badge>
            <Badge className="gap-1 bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
              <MapPin className="size-3" />
              Longitude: {activeEarthquake.coordinates[0].toFixed(4)}
            </Badge>
          </div>

          <Button
            asChild
            className="w-full gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <a href={activeEarthquake.url} target="_blank" rel="noopener noreferrer">
              View on USGS
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      )}

      {activeEvent && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 shadow-lg dark:bg-amber-500/30 dark:text-amber-200">
              <Globe2 className="size-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-2 text-sm font-semibold text-foreground">{activeEvent.title}</p>
                <button
                  type="button"
                  onClick={onCloseEvent}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200">
                  {activeEvent.category}
                </Badge>
                <Badge className="bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
                  {activeEvent.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 px-3 py-2 dark:bg-muted/20">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coordinates</p>
              <p className="text-sm font-medium text-foreground">
                {activeEvent.coordinates[1].toFixed(4)}, {activeEvent.coordinates[0].toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2 dark:bg-muted/20">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reported</p>
              <p className="text-sm font-medium text-foreground">
                {activeEvent.date.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <Button
            asChild
            className="w-full gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <a
              href={activeEvent.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View event source"
            >
              View source
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      )}

      {activeTsunami && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-700 shadow-lg dark:bg-sky-500/30 dark:text-sky-200">
              <Waves className="size-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-2 text-sm font-semibold text-foreground">{activeTsunami.headline}</p>
                <button
                  type="button"
                  onClick={onCloseEvent}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200">
                  {activeTsunami.severity}
                </Badge>
                {activeTsunami.sent && (
                  <Badge className="bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
                    {activeTsunami.sent.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 px-3 py-2 dark:bg-muted/20">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coordinates</p>
              <p className="text-sm font-medium text-foreground">
                {activeTsunami.coordinates[1].toFixed(4)}, {activeTsunami.coordinates[0].toFixed(4)}
              </p>
            </div>
          </div>

          {activeTsunami.url && (
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                if (typeof window === "undefined") return;
                window.open(activeTsunami.url, "_blank", "noopener,noreferrer");
              }}
              aria-label="View alert source"
            >
              View source
            </Button>
          )}
        </div>
      )}

      {activeAirQuality && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700 shadow-lg dark:bg-emerald-500/30 dark:text-emerald-200">
              <Wind className="size-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-2 text-sm font-semibold text-foreground">{activeAirQuality.location}</p>
                <button
                  type="button"
                  onClick={onCloseEvent}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200">
                  {activeAirQuality.parameter.toUpperCase()}
                </Badge>
                <Badge className="bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
                  {activeAirQuality.value} {activeAirQuality.unit}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 px-3 py-2 dark:bg-muted/20">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coordinates</p>
              <p className="text-sm font-medium text-foreground">
                {activeAirQuality.coordinates[1].toFixed(4)}, {activeAirQuality.coordinates[0].toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>,
    overlayContainer
  );
}

type ControlButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "children" | "aria-label"
> & {
  label: string;
  children: React.ReactNode;
  active?: boolean;
};

const ControlButton = React.forwardRef<HTMLButtonElement, ControlButtonProps>(
  function ControlButton(
    { label, children, active = false, className, type, disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        aria-label={label}
        className={cn(
          "flex items-center justify-center size-8 transition-colors",
          active
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-accent hover:text-accent-foreground text-foreground",
          disabled && "opacity-50 pointer-events-none cursor-not-allowed",
          className,
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  },
);

function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-md border border-border bg-background shadow-sm overflow-hidden [&>button:not(:last-child)]:border-b [&>button:not(:last-child)]:border-border">
      {children}
    </div>
  );
}

export function MapOverlayUI({
  setUserLocation,
  onLocateAnimation,
  resolvedLocation,
  isLocating,
  earthquakes,
  onEarthquakeSelect,
  layerVisibility,
  onLayerVisibilityChange,
}: {
  setUserLocation: (l: [number, number]) => void;
  onLocateAnimation: () => void;
  resolvedLocation: [number, number] | null;
  isLocating: boolean;
  earthquakes: ProcessedEarthquake[];
  onEarthquakeSelect: (eq: ProcessedEarthquake) => void;
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: React.Dispatch<React.SetStateAction<LayerVisibility>>;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isQuakesDrawerOpen, setIsQuakesDrawerOpen] = React.useState(false);
  const [isWeatherDrawerOpen, setIsWeatherDrawerOpen] = React.useState(false);
  const handleCloseMobileMenu = () => setIsMobileMenuOpen(false);

  const handleQuakeClick = (eq: ProcessedEarthquake) => {
    setIsQuakesDrawerOpen(false);
    onEarthquakeSelect(eq);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
      <div className="pointer-events-none p-4 flex flex-col gap-4 items-end sm:flex-row sm:justify-end sm:items-end w-full mt-auto">
        <div className="pointer-events-auto flex flex-col gap-4 items-end w-auto">
          <CustomMapControls
            setUserLocation={setUserLocation}
            onLocateAnimation={onLocateAnimation}
            layerVisibility={layerVisibility}
            onLayerVisibilityChange={onLayerVisibilityChange}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 hidden md:flex justify-center">
        <div className="pointer-events-auto">
          <HourlyForecastDock
            latitude={resolvedLocation?.[1] ?? null}
            longitude={resolvedLocation?.[0] ?? null}
          />
        </div>
      </div>

      <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="flex h-full flex-col p-4">
            <div className="flex-1 overflow-auto">
              <HazrMenuPanel
                onSelect={handleCloseMobileMenu}
                userLocation={resolvedLocation}
                isLocating={isLocating}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={isQuakesDrawerOpen} onOpenChange={setIsQuakesDrawerOpen}>
        <DrawerContent className="max-h-[80vh]">
          <div className="overflow-y-auto max-h-[80vh] p-4">
            {earthquakes.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent earthquakes
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-red-500 shadow-lg shadow-red-500/20">
                    <Activity className="size-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Live Earthquakes</h3>
                    <p className="text-xs text-muted-foreground">{earthquakes.length} in the last 24h</p>
                  </div>
                </div>
                <Separator className="my-2" />
                {earthquakes.map((eq) => (
                  <EarthquakeItem
                    key={eq.id}
                    earthquake={eq}
                    onClick={() => handleQuakeClick(eq)}
                  />
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={isWeatherDrawerOpen} onOpenChange={setIsWeatherDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="p-4 overflow-y-auto max-h-[85vh]">
            <WeatherDock
              latitude={resolvedLocation?.[1] ?? null}
              longitude={resolvedLocation?.[0] ?? null}
              unstyled
            />
            <HourlyForecastDock
              latitude={resolvedLocation?.[1] ?? null}
              longitude={resolvedLocation?.[0] ?? null}
              className="mt-4 md:hidden"
            />
          </div>
        </DrawerContent>
      </Drawer>

      <MobileBottomNav
        items={[
          {
            icon: MapIcon,
            label: "Explore",
            active: true,
          },
          {
            icon: Activity,
            label: "Quakes",
            onClick: () => setIsQuakesDrawerOpen(true),
          },
          {
            icon: Cloud,
            label: "Weather",
            onClick: () => setIsWeatherDrawerOpen(true),
          },
          {
            icon: Menu,
            label: "Menu",
            onClick: () => setIsMobileMenuOpen(true),
          },
        ]}
      />
    </div>
  );
}

function CustomMapControls({
  setUserLocation,
  onLocateAnimation,
  layerVisibility,
  onLayerVisibilityChange,
}: {
  setUserLocation: (l: [number, number]) => void;
  onLocateAnimation: () => void;
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: React.Dispatch<React.SetStateAction<LayerVisibility>>;
}) {
  const { map } = useMap();
  const { resolvedTheme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [is3D, setIs3D] = React.useState(false);
  const [waitingForLocation, setWaitingForLocation] = React.useState(false);
  const compassRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!map) return;

    const updateRotation = () => {
      if (!compassRef.current) return;
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      compassRef.current.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`;
    };

    map.on("rotate", updateRotation);
    map.on("pitch", updateRotation);
    updateRotation();
    return () => {
      map.off("rotate", updateRotation);
      map.off("pitch", updateRotation);
    };
  }, [map]);

  React.useEffect(() => {
    if (!map) return;

    const globeMap = map as GlobeCapableMap;
    const layerId = "3d-buildings";

    const handle3DBuildings = () => {
      globeMap.setProjection({ name: is3D ? "globe" : "mercator" });

      if (is3D) {
        if (!globeMap.getLayer(layerId)) {
          const sources = map.getStyle().sources;
          const buildingSource = Object.keys(sources).find(
            (s) => s.includes("maptiles") || s.includes("carto"),
          );

          if (buildingSource) {
            globeMap.addLayer(
              {
                id: layerId,
                source: buildingSource,
                "source-layer": "building",
                type: "fill-extrusion",
                minzoom: 15,
                paint: {
                  "fill-extrusion-color": [
                    "interpolate",
                    ["linear"],
                    ["get", "render_height"],
                    0,
                    "#aaa",
                    200,
                    "#888",
                  ],
                  "fill-extrusion-height": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    15,
                    0,
                    15.05,
                    ["get", "render_height"],
                  ],
                  "fill-extrusion-base": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    15,
                    0,
                    15.05,
                    ["get", "render_min_height"],
                  ],
                  "fill-extrusion-opacity": 0.8,
                },
              },
              map
                .getStyle()
                .layers.find((l) => l.type === "symbol")?.id,
            );
          }
        } else {
          globeMap.setLayoutProperty(layerId, "visibility", "visible");
        }
      } else if (globeMap.getLayer(layerId)) {
        globeMap.setLayoutProperty(layerId, "visibility", "none");
      }
    };

    globeMap.on("styledata", handle3DBuildings);
    if (globeMap.isStyleLoaded()) {
      handle3DBuildings();
    }

    return () => {
      globeMap.off("styledata", handle3DBuildings);
    };
  }, [map, is3D]);

  type GlobeCapableMap = MapLibreMap & {
    setProjection: (projection: { name: "globe" | "mercator" }) => void;
    setFog?: (fog?: {
      color?: string;
      "high-color"?: string;
      "horizon-blend"?: number;
      range?: [number, number];
    }) => void;
  };

  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  const animateZoom = (delta: number) => {
    if (!map) return;
    map.flyTo({
      zoom: map.getZoom() + delta,
      duration: 500,
      easing: ease,
      curve: 1.3,
      essential: true,
    });
  };

  const handleZoomIn = () => animateZoom(1);
  const handleZoomOut = () => animateZoom(-1);

  const handleLocate = () => {
    if (navigator.geolocation && map) {
      setWaitingForLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          setUserLocation(coords);
          onLocateAnimation();
          map.flyTo({
            center: coords,
            zoom: 17,
            duration: 2500,
            curve: 1.42,
            speed: 0.6,
            essential: true,
            easing: (t) => 1 - Math.pow(1 - t, 3),
          });
          setWaitingForLocation(false);
        },
        () => setWaitingForLocation(false),
      );
    }
  };

  const handleResetBearing = () =>
    map?.easeTo({ bearing: 0, pitch: 0, duration: 900, easing: ease, essential: true });
  const handleFullscreen = () => {
    const container = map?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen();
  };

  const toggle3D = () => {
    const new3D = !is3D;
    setIs3D(new3D);
    if (!map) return;

    const globeMap = map as GlobeCapableMap;
    globeMap.setProjection({ name: new3D ? "globe" : "mercator" });

    if (new3D) {
      globeMap.setFog?.({
        color: "#dbeafe",
        "high-color": "#0b172a",
        "horizon-blend": 0.15,
        range: [0.6, 10],
      });
      map.easeTo({
        pitch: 55,
        duration: 800,
        easing: ease,
        essential: true,
      });
    } else {
      globeMap.setFog?.(undefined);
      map.easeTo({ pitch: 0, duration: 600, easing: ease, essential: true });
    }
  };

  const toggleTheme = () => {
    const current = resolvedTheme ?? "light";
    setTheme(current === "dark" ? "light" : "dark");
  };

  const handleToggleLayer = (key: keyof LayerVisibility) => {
    onLayerVisibilityChange((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col gap-2 items-end">
        <ControlGroup>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <ControlButton label="Filter layers">
                    <SlidersHorizontal className="size-4" />
                  </ControlButton>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>Filters</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Map Layers</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={layerVisibility.earthquakes}
                onCheckedChange={() => handleToggleLayer("earthquakes")}
              >
                Earthquakes
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={layerVisibility.eonet}
                onCheckedChange={() => handleToggleLayer("eonet")}
              >
                NASA EONET
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={layerVisibility.airQuality}
                onCheckedChange={() => handleToggleLayer("airQuality")}
              >
                Air Quality
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={layerVisibility.tsunami}
                onCheckedChange={() => handleToggleLayer("tsunami")}
              >
                Tsunamis
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={toggleTheme} label="Toggle theme">
                {resolvedTheme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>Theme</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={toggle3D} label="Toggle 3D" active={is3D}>
                <Box className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>Toggle 3D</TooltipContent>
          </Tooltip>

          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ControlButton onClick={handleFullscreen} label="Fullscreen">
                  <Maximize className="size-4" />
                </ControlButton>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>Fullscreen</TooltipContent>
            </Tooltip>
          )}
        </ControlGroup>

        <ControlGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleResetBearing} label="Reset bearing">
                <svg
                  ref={compassRef}
                  viewBox="0 0 24 24"
                  className="size-5 transition-transform duration-200"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <title>Compass</title>
                  <path d="M12 2L16 12H12V2Z" className="fill-red-500" />
                  <path d="M12 2L8 12H12V2Z" className="fill-red-300" />
                  <path
                    d="M12 22L16 12H12V22Z"
                    className="fill-muted-foreground/60"
                  />
                  <path
                    d="M12 22L8 12H12V22Z"
                    className="fill-muted-foreground/30"
                  />
                </svg>
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>Reset North</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton
                onClick={handleLocate}
                label="Find my location"
                disabled={waitingForLocation}
              >
                {waitingForLocation ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Locate className="size-4" />
                )}
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>Your location</TooltipContent>
          </Tooltip>
        </ControlGroup>

        <ControlGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleZoomIn} label="Zoom In">
                <Plus className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>Zoom In</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleZoomOut} label="Zoom Out">
                <Minus className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>Zoom Out</TooltipContent>
          </Tooltip>
        </ControlGroup>
      </div>
    </TooltipProvider>
  );
}
