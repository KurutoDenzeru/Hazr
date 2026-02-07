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
  CalendarClock,
  MapPinned,
  ScanLine,
  FlaskConical,
  Building2,
  Ruler,
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
  if (normalized.includes("volcano")) return AlertTriangle;
  if (normalized.includes("ice")) return Snowflake;
  if (normalized.includes("drought")) return Sun;
  if (normalized.includes("dust")) return Wind;
  return Globe2;
};

const getEventCategoryLabel = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes("storm")) return "Storm";
  if (normalized.includes("wildfire") || normalized.includes("fire")) return "Wildfire";
  if (normalized.includes("flood")) return "Flood";
  if (normalized.includes("drought")) return "Drought";
  if (normalized.includes("ice")) return "Ice";
  if (normalized.includes("dust")) return "Dust";
  if (normalized.includes("volcano")) return "Volcano";
  return category;
};

const formatAirQualityParameterLabel = (parameter: string) => {
  const normalized = parameter.trim().toLowerCase();
  if (normalized === "pm2.5") return "Fine particles (PM2.5)";
  if (normalized === "pm10") return "Coarse particles (PM10)";
  if (normalized === "no2") return "Nitrogen dioxide (NO₂)";
  if (normalized === "o3") return "Ozone (O₃)";
  return parameter.toUpperCase();
};

const formatAirQualityConcentration = (value: number, unit: string) => {
  return `${value.toFixed(1)} ${unit}`;
};

type EventToneKey =
  | "wildfire"
  | "storm"
  | "flood"
  | "volcano"
  | "ice"
  | "drought"
  | "dust"
  | "default";

const getEventToneKey = (category: string): EventToneKey => {
  const normalized = category.toLowerCase();
  if (normalized.includes("wildfire") || normalized.includes("fire")) return "wildfire";
  if (normalized.includes("storm")) return "storm";
  if (normalized.includes("flood") || normalized.includes("tsunami")) return "flood";
  if (normalized.includes("volcano")) return "volcano";
  if (normalized.includes("ice")) return "ice";
  if (normalized.includes("drought")) return "drought";
  if (normalized.includes("dust")) return "dust";
  return "default";
};

const getEventToneHex = (category: string) => {
  const toneByKey: Record<EventToneKey, string> = {
    wildfire: "#f97316",
    storm: "#f59e0b",
    flood: "#38bdf8",
    volcano: "#fb7185",
    ice: "#22d3ee",
    drought: "#a16207",
    dust: "#fbbf24",
    default: "#f59e0b",
  };
  return toneByKey[getEventToneKey(category)];
};

type OverlayBadge = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
};

type OverlayDetailItem = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  cardClassName?: string;
  labelClassName?: string;
};

type OverlayAction = {
  label: string;
  url: string;
  ariaLabel: string;
};

const isDefined = <T,>(value: T | null | undefined): value is T => value !== null && value !== undefined;

const OverlayDetailGrid = ({ details }: { details: OverlayDetailItem[] }) => {
  if (details.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {details.map((detail) => (
        <div
          key={detail.label}
          className={cn("rounded-lg bg-muted/40 px-3 py-2 dark:bg-muted/20", detail.cardClassName)}
        >
          <div
            className={cn(
              "flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground",
              detail.labelClassName,
            )}
          >
            {detail.icon ? <detail.icon className="size-3" /> : null}
            <span>{detail.label}</span>
          </div>
          <p className="text-sm font-medium text-foreground">{detail.value}</p>
        </div>
      ))}
    </div>
  );
};

const getEventTone = (category: string) => {
  const toneKey = getEventToneKey(category);
  if (toneKey === "wildfire") {
    return {
      lead: "bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-200",
      badge: "bg-orange-500/15 text-orange-700 dark:bg-orange-500/25 dark:text-orange-200",
      detailCard: "bg-orange-500/8 border border-orange-500/20 dark:bg-orange-500/12 dark:border-orange-400/20",
      detailLabel: "text-orange-700/80 dark:text-orange-200/80",
    };
  }
  if (toneKey === "storm") {
    return {
      lead: "bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200",
      badge: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200",
      detailCard: "bg-amber-500/8 border border-amber-500/20 dark:bg-amber-500/12 dark:border-amber-400/20",
      detailLabel: "text-amber-700/80 dark:text-amber-200/80",
    };
  }
  if (toneKey === "flood") {
    return {
      lead: "bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200",
      badge: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200",
      detailCard: "bg-sky-500/8 border border-sky-500/20 dark:bg-sky-500/12 dark:border-sky-400/20",
      detailLabel: "text-sky-700/80 dark:text-sky-200/80",
    };
  }
  if (toneKey === "volcano") {
    return {
      lead: "bg-pink-500/20 text-pink-700 dark:bg-pink-500/30 dark:text-pink-200",
      badge: "bg-pink-500/15 text-pink-700 dark:bg-pink-500/25 dark:text-pink-200",
      detailCard: "bg-pink-500/8 border border-pink-500/20 dark:bg-pink-500/12 dark:border-pink-400/20",
      detailLabel: "text-pink-700/80 dark:text-pink-200/80",
    };
  }
  if (toneKey === "ice") {
    return {
      lead: "bg-cyan-500/20 text-cyan-700 dark:bg-cyan-500/30 dark:text-cyan-200",
      badge: "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/25 dark:text-cyan-200",
      detailCard: "bg-cyan-500/8 border border-cyan-500/20 dark:bg-cyan-500/12 dark:border-cyan-400/20",
      detailLabel: "text-cyan-700/80 dark:text-cyan-200/80",
    };
  }
  if (toneKey === "drought") {
    return {
      lead: "bg-yellow-700/20 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-200",
      badge: "bg-yellow-700/15 text-yellow-700 dark:bg-yellow-700/25 dark:text-yellow-200",
      detailCard: "bg-yellow-700/8 border border-yellow-700/20 dark:bg-yellow-700/12 dark:border-yellow-500/20",
      detailLabel: "text-yellow-700/80 dark:text-yellow-200/80",
    };
  }
  if (toneKey === "dust") {
    return {
      lead: "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-200",
      badge: "bg-yellow-500/15 text-yellow-700 dark:bg-yellow-500/25 dark:text-yellow-200",
      detailCard: "bg-yellow-500/8 border border-yellow-500/20 dark:bg-yellow-500/12 dark:border-yellow-400/20",
      detailLabel: "text-yellow-700/80 dark:text-yellow-200/80",
    };
  }
  return {
    lead: "bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200",
    badge: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200",
    detailCard: "bg-amber-500/8 border border-amber-500/20 dark:bg-amber-500/12 dark:border-amber-400/20",
    detailLabel: "text-amber-700/80 dark:text-amber-200/80",
  };
};

const UnifiedSignalPopover = ({
  leading,
  title,
  titlePrefixIcon: TitlePrefixIcon,
  onClose,
  badges,
  details,
  footerAction,
  children,
}: {
  leading: React.ReactNode;
  title: string;
  titlePrefixIcon?: React.ComponentType<{ className?: string }>;
  onClose: () => void;
  badges?: OverlayBadge[];
  details?: OverlayDetailItem[];
  footerAction?: OverlayAction | null;
  children?: React.ReactNode;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
              {TitlePrefixIcon ? <TitlePrefixIcon className="size-3.5 shrink-0" /> : null}
              <p className="line-clamp-2 text-foreground font-semibold leading-snug">{title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
              aria-label="Close popover"
            >
              <X className="size-4" />
            </button>
          </div>
          {badges && badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.label} className={badge.className}>
                  {badge.icon ? <badge.icon className="size-3" /> : null}
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {details ? <OverlayDetailGrid details={details} /> : null}
      {children}

      {footerAction ? (
        <Button
          asChild
          className="w-full gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <a
            href={footerAction.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={footerAction.ariaLabel}
          >
            {footerAction.label}
            <ExternalLink className="size-4" />
          </a>
        </Button>
      ) : null}
    </div>
  );
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

export function GlobalSignalMarkers({
  events,
  tsunamiAlerts,
  airQualitySites,
  selectedEvent,
  selectedTsunamiAlert,
  selectedAirQualitySite,
  layerVisibility,
  onEventSelect,
  onTsunamiSelect,
  onAirQualitySelect,
}: {
  events: ProcessedEonetEvent[];
  tsunamiAlerts: ProcessedTsunamiAlert[];
  airQualitySites: ProcessedAirQualitySite[];
  selectedEvent: ProcessedEonetEvent | null;
  selectedTsunamiAlert: ProcessedTsunamiAlert | null;
  selectedAirQualitySite: ProcessedAirQualitySite | null;
  layerVisibility: Pick<LayerVisibility, "eonet" | "airQuality" | "tsunami">;
  onEventSelect: (event: ProcessedEonetEvent) => void;
  onTsunamiSelect: (alert: ProcessedTsunamiAlert) => void;
  onAirQualitySelect: (site: ProcessedAirQualitySite) => void;
}) {
  const { map, isLoaded } = useMap();
  const [viewportState, setViewportState] = React.useState(() => ({
    zoom: 0,
    bounds: null as maplibregl.LngLatBounds | null,
  }));
  const [expandedMarkerKey, setExpandedMarkerKey] = React.useState<string | null>(null);
  const collapseTimeoutRef = React.useRef<number | null>(null);
  const GLOBAL_COMPACT_MAX_ZOOM = 4.2;
  const GLOBAL_DETAIL_MIN_ZOOM = 6;
  const GLOBAL_COMPACT_NODE_SIZE = 13;
  const MAX_VISIBLE_GLOBAL_MARKERS = 90;

  const activePopoverMarkerKey = React.useMemo(() => {
    if (layerVisibility.eonet && selectedEvent) {
      return `event-${selectedEvent.id}`;
    }
    if (layerVisibility.tsunami && selectedTsunamiAlert) {
      return `tsunami-${selectedTsunamiAlert.id}`;
    }
    if (layerVisibility.airQuality && selectedAirQualitySite) {
      return `air-${selectedAirQualitySite.id}`;
    }
    return null;
  }, [
    layerVisibility.airQuality,
    layerVisibility.eonet,
    layerVisibility.tsunami,
    selectedAirQualitySite,
    selectedEvent,
    selectedTsunamiAlert,
  ]);

  const clearExpandedTimeout = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (collapseTimeoutRef.current === null) return;
    window.clearTimeout(collapseTimeoutRef.current);
    collapseTimeoutRef.current = null;
  }, []);

  React.useEffect(() => {
    return () => {
      clearExpandedTimeout();
    };
  }, [clearExpandedTimeout]);

  React.useEffect(() => {
    clearExpandedTimeout();
    if (!activePopoverMarkerKey) {
      setExpandedMarkerKey(null);
      return;
    }
    setExpandedMarkerKey(activePopoverMarkerKey);
  }, [activePopoverMarkerKey, clearExpandedTimeout]);

  React.useEffect(() => {
    if (!map || !isLoaded) return;

    const syncViewportState = () => {
      setViewportState({
        zoom: map.getZoom(),
        bounds: map.getBounds(),
      });
    };

    syncViewportState();
    map.on("moveend", syncViewportState);
    map.on("zoomend", syncViewportState);

    return () => {
      map.off("moveend", syncViewportState);
      map.off("zoomend", syncViewportState);
    };
  }, [map, isLoaded]);

  const isPointVisible = React.useCallback(
    (coordinates: [number, number]) => {
      const bounds = viewportState.bounds;
      if (!bounds) return false;
      return bounds.contains([coordinates[0], coordinates[1]]);
    },
    [viewportState.bounds]
  );

  const isCompactNodeMode = viewportState.zoom <= GLOBAL_COMPACT_MAX_ZOOM;
  const isDetailMode = viewportState.zoom >= GLOBAL_DETAIL_MIN_ZOOM;
  const shouldRenderGlobalMarkers = isCompactNodeMode || isDetailMode;
  const isBridgeZoomMode = !isCompactNodeMode && !isDetailMode;

  const withSelectedPriority = React.useCallback(
    <T extends { id: string; coordinates: [number, number] }>(
      items: T[],
      selected: T | null
    ) => {
      if (!selected) return items;

      const selectedIsVisible = isPointVisible(selected.coordinates);
      if (!selectedIsVisible) return items;

      const alreadyIncluded = items.some((item) => item.id === selected.id);
      if (alreadyIncluded) return items;

      if (items.length === 0) return [selected];
      return [selected, ...items.slice(0, items.length - 1)];
    },
    [isPointVisible]
  );

  const visibleEvents = React.useMemo(() => {
    if (isBridgeZoomMode) {
      if (!layerVisibility.eonet || !selectedEvent) return [];
      if (!isPointVisible(selectedEvent.coordinates)) return [];
      return [selectedEvent];
    }
    if (!shouldRenderGlobalMarkers) return [];
    const base = events
      .filter((event) => isPointVisible(event.coordinates))
      .slice(0, MAX_VISIBLE_GLOBAL_MARKERS);
    return withSelectedPriority(base, layerVisibility.eonet ? selectedEvent : null);
  }, [
    events,
    isBridgeZoomMode,
    isPointVisible,
    layerVisibility.eonet,
    selectedEvent,
    shouldRenderGlobalMarkers,
    withSelectedPriority,
  ]);

  const visibleTsunamiAlerts = React.useMemo(() => {
    if (isBridgeZoomMode) {
      if (!layerVisibility.tsunami || !selectedTsunamiAlert) return [];
      if (!isPointVisible(selectedTsunamiAlert.coordinates)) return [];
      return [selectedTsunamiAlert];
    }
    if (!shouldRenderGlobalMarkers) return [];
    const base = tsunamiAlerts
      .filter((alert) => isPointVisible(alert.coordinates))
      .slice(0, MAX_VISIBLE_GLOBAL_MARKERS);
    return withSelectedPriority(
      base,
      layerVisibility.tsunami ? selectedTsunamiAlert : null
    );
  }, [
    isBridgeZoomMode,
    isPointVisible,
    layerVisibility.tsunami,
    selectedTsunamiAlert,
    shouldRenderGlobalMarkers,
    tsunamiAlerts,
    withSelectedPriority,
  ]);

  const visibleAirQualitySites = React.useMemo(() => {
    if (isBridgeZoomMode) {
      if (!layerVisibility.airQuality || !selectedAirQualitySite) return [];
      if (!isPointVisible(selectedAirQualitySite.coordinates)) return [];
      return [selectedAirQualitySite];
    }
    if (!shouldRenderGlobalMarkers) return [];
    const base = airQualitySites
      .filter((site) => isPointVisible(site.coordinates))
      .slice(0, MAX_VISIBLE_GLOBAL_MARKERS);
    return withSelectedPriority(
      base,
      layerVisibility.airQuality ? selectedAirQualitySite : null
    );
  }, [
    airQualitySites,
    isBridgeZoomMode,
    isPointVisible,
    layerVisibility.airQuality,
    selectedAirQualitySite,
    shouldRenderGlobalMarkers,
    withSelectedPriority,
  ]);

  const handleMarkerPress = React.useCallback(
    (markerKey: string, onSelect: () => void) => {
      setExpandedMarkerKey(markerKey);
      clearExpandedTimeout();
      if (markerKey !== activePopoverMarkerKey && typeof window !== "undefined") {
        collapseTimeoutRef.current = window.setTimeout(() => {
          setExpandedMarkerKey((current) =>
            current === markerKey ? null : current
          );
        }, 1600);
      }
      onSelect();
    },
    [activePopoverMarkerKey, clearExpandedTimeout]
  );

  if (!viewportState.bounds) return null;

  return (
    <>
      {layerVisibility.eonet &&
        visibleEvents.map((event) => {
          const tone = getEventToneHex(event.category);
          const EventIcon = getEventIcon(event.category);
          const eventLabel = getEventCategoryLabel(event.category);
          const markerKey = `event-${event.id}`;
          const isExpanded =
            expandedMarkerKey === markerKey || activePopoverMarkerKey === markerKey;
          return (
            <MapMarker
              key={event.id}
              longitude={event.coordinates[0]}
              latitude={event.coordinates[1]}
            >
              <MarkerContent>
                <button
                  type="button"
                  onClick={() => handleMarkerPress(markerKey, () => onEventSelect(event))}
                  className={cn(
                    "relative border text-[10px] font-bold text-white backdrop-blur transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                    isCompactNodeMode
                      ? "group rounded-full border-white/55 shadow-[0_0_0_1px_rgba(0,0,0,0.24),0_0_14px_rgba(0,0,0,0.3)]"
                      : "flex items-center rounded-full border-white/15 px-1.5 py-1"
                  )}
                  style={
                    isCompactNodeMode
                      ? {
                          width: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                          height: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                          minWidth: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                          minHeight: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                          backgroundColor: tone,
                        }
                      : {
                          backgroundColor: tone,
                        }
                  }
                  aria-label={`Event: ${event.title}`}
                  title={`${eventLabel}: ${event.title}`}
                >
                  {isCompactNodeMode ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95"
                      />
                      <span
                        className={cn(
                          "pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-semibold text-white transition-all duration-200",
                          isExpanded ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                        )}
                      >
                        {eventLabel}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/90">
                        <EventIcon className="size-3.5" style={{ color: tone }} />
                      </span>
                      <span
                        className={cn(
                          "truncate whitespace-nowrap overflow-hidden transition-all duration-250",
                          isExpanded ? "ml-1 max-w-24 opacity-100" : "ml-0 max-w-0 opacity-0"
                        )}
                      >
                        {eventLabel}
                      </span>
                    </>
                  )}
                </button>
              </MarkerContent>
            </MapMarker>
          );
        })}

      {layerVisibility.tsunami &&
        visibleTsunamiAlerts.map((alert) => {
          const markerKey = `tsunami-${alert.id}`;
          const isExpanded =
            expandedMarkerKey === markerKey || activePopoverMarkerKey === markerKey;
          return (
            <MapMarker
              key={alert.id}
              longitude={alert.coordinates[0]}
              latitude={alert.coordinates[1]}
            >
              <MarkerContent>
                  <button
                    type="button"
                    onClick={() => handleMarkerPress(markerKey, () => onTsunamiSelect(alert))}
                    className={cn(
                      "relative border text-[10px] font-bold text-white backdrop-blur transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                      isCompactNodeMode
                        ? "group rounded-full border-white/55 shadow-[0_0_0_1px_rgba(0,0,0,0.24),0_0_14px_rgba(0,0,0,0.3)]"
                        : "flex items-center rounded-full border-white/15 bg-blue-500 px-1.5 py-1"
                    )}
                    style={
                      isCompactNodeMode
                        ? {
                            width: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                            height: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                            minWidth: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                            minHeight: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                            backgroundColor: "#3b82f6",
                          }
                        : undefined
                    }
                    aria-label="Tsunami alert"
                    title="Tsunami"
                  >
                    {isCompactNodeMode ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95"
                        />
                        <span
                          className={cn(
                            "pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-semibold text-white transition-all duration-200",
                            isExpanded ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                          )}
                        >
                          Tsunami
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/90">
                          <Waves className="size-3.5 text-blue-600" />
                        </span>
                        <span
                          className={cn(
                            "truncate whitespace-nowrap overflow-hidden transition-all duration-250",
                            isExpanded ? "ml-1 max-w-24 opacity-100" : "ml-0 max-w-0 opacity-0"
                          )}
                        >
                          Tsunami
                        </span>
                      </>
                    )}
                  </button>
              </MarkerContent>
            </MapMarker>
          );
        })}

      {layerVisibility.airQuality &&
        visibleAirQualitySites.map((site) => {
          const markerKey = `air-${site.id}`;
          const isExpanded =
            expandedMarkerKey === markerKey || activePopoverMarkerKey === markerKey;
          const valueLabel = Number.isFinite(site.value)
            ? site.value.toFixed(1)
            : `${site.value}`;
          return (
            <MapMarker
              key={site.id}
              longitude={site.coordinates[0]}
              latitude={site.coordinates[1]}
            >
              <MarkerContent>
                  <button
                    type="button"
                    onClick={() => handleMarkerPress(markerKey, () => onAirQualitySelect(site))}
                    className={cn(
                      "relative border text-[10px] font-bold text-white backdrop-blur transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                      isCompactNodeMode
                        ? "group rounded-full border-white/55 shadow-[0_0_0_1px_rgba(0,0,0,0.24),0_0_14px_rgba(0,0,0,0.3)]"
                        : "flex items-center rounded-full border-white/15 bg-emerald-500 px-1.5 py-1"
                    )}
                    style={
                      isCompactNodeMode
                        ? {
                            width: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                            height: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                            minWidth: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                            minHeight: `${GLOBAL_COMPACT_NODE_SIZE}px`,
                            backgroundColor: "#10b981",
                          }
                        : undefined
                    }
                    aria-label={`Air quality: ${site.location}`}
                    title={`${site.parameter.toUpperCase()} ${valueLabel}`}
                  >
                    {isCompactNodeMode ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95"
                        />
                        <span
                          className={cn(
                            "pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-semibold text-white transition-all duration-200",
                            isExpanded ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                          )}
                        >
                          {site.parameter.toUpperCase()} {valueLabel}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/90">
                          <Wind className="size-3.5 text-emerald-600" />
                        </span>
                        <span
                          className={cn(
                            "truncate whitespace-nowrap overflow-hidden transition-all duration-250",
                            isExpanded ? "ml-1 max-w-28 opacity-100" : "ml-0 max-w-0 opacity-0"
                          )}
                        >
                          {site.parameter.toUpperCase()} {valueLabel}
                        </span>
                      </>
                    )}
                  </button>
              </MarkerContent>
            </MapMarker>
          );
        })}
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

  React.useEffect(() => {
    if (!map || !event) return;

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

export function TsunamiFlyTo({
  alert,
}: {
  alert: ProcessedTsunamiAlert | null;
}) {
  const { map } = useMap();

  React.useEffect(() => {
    if (!map || !alert) return;

    map.stop();
    map.easeTo({
      center: alert.coordinates,
      zoom: Math.max(map.getZoom(), 5.8),
      duration: 900,
      essential: true,
    });
  }, [map, alert]);

  return null;
}

export function AirQualityFlyTo({
  site,
}: {
  site: ProcessedAirQualitySite | null;
}) {
  const { map } = useMap();

  React.useEffect(() => {
    if (!map || !site) return;

    map.stop();
    map.easeTo({
      center: site.coordinates,
      zoom: Math.max(map.getZoom(), 6),
      duration: 900,
      essential: true,
    });
  }, [map, site]);

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

  const detailItems: OverlayDetailItem[] = activeEarthquake
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
        ].filter(isDefined)
      )
    : [];

  const earthquakeBadges: OverlayBadge[] = activeEarthquake
    ? [
        {
          label: `Updated ${formatRelativeTime(activeEarthquake.updated)}`,
          icon: Clock,
          className: "gap-1 bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200",
        },
        activeEarthquake.alert
          ? {
              label: `Alert ${activeEarthquake.alert}`,
              icon: AlertTriangle,
              className: cn(
                "gap-1",
                activeEarthquake.alert === "yellow" &&
                  "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-200",
                activeEarthquake.alert === "orange" &&
                  "bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-200",
                activeEarthquake.alert === "red" &&
                  "bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-200",
                activeEarthquake.alert === "green" &&
                  "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200",
              ),
            }
          : null,
        activeEarthquake.tsunami
          ? {
              label: "Tsunami risk",
              icon: Waves,
              className: "gap-1 bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-200",
            }
          : null,
      ].filter(isDefined)
    : [];

  const eventDetails: OverlayDetailItem[] = activeEvent
    ? [
        {
          label: "Coordinates",
          value: `${activeEvent.coordinates[1].toFixed(4)}, ${activeEvent.coordinates[0].toFixed(4)}`,
          icon: MapPinned,
        },
        {
          label: "Reported",
          value: activeEvent.date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          icon: CalendarClock,
        },
      ]
    : [];

  const eventBadges: OverlayBadge[] = activeEvent
    ? [
        {
          label: getEventCategoryLabel(activeEvent.category),
          icon: activeEvent ? getEventIcon(activeEvent.category) : Globe2,
          className: cn("gap-1", getEventTone(activeEvent.category).badge),
        },
      ]
    : [];

  const tsunamiDetails: OverlayDetailItem[] = activeTsunami
    ? [
        {
          label: "Coordinates",
          value: `${activeTsunami.coordinates[1].toFixed(4)}, ${activeTsunami.coordinates[0].toFixed(4)}`,
          icon: MapPinned,
        },
      ]
    : [];

  const tsunamiBadges: OverlayBadge[] = activeTsunami
    ? [
        {
          label: activeTsunami.severity,
          className: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200",
        },
          activeTsunami.sent
            ? {
                label: activeTsunami.sent.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }),
                icon: CalendarClock,
                className: "bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200",
              }
            : null,
      ].filter(isDefined)
    : [];

  const airQualityBadges: OverlayBadge[] = activeAirQuality
    ? [
        {
          label: formatAirQualityParameterLabel(activeAirQuality.parameter),
          className: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200",
        },
        {
          label: `Concentration ${formatAirQualityConcentration(activeAirQuality.value, activeAirQuality.unit)}`,
          className: "bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200",
        },
      ]
    : [];

  const airQualityDetails: OverlayDetailItem[] = activeAirQuality
    ? (
        [
          {
            label: "Coordinates",
            value: `${activeAirQuality.coordinates[1].toFixed(4)}, ${activeAirQuality.coordinates[0].toFixed(4)}`,
            icon: MapPinned,
          },
          activeAirQuality.measuredAt
            ? {
                label: "Measured",
                value: activeAirQuality.measuredAt.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }),
                icon: CalendarClock,
              }
            : null,
          activeAirQuality.averagingPeriod
            ? {
                label: "Averaging period",
                value: activeAirQuality.averagingPeriod,
                icon: ScanLine,
              }
            : null,
          activeAirQuality.coveragePercent !== null && activeAirQuality.coveragePercent !== undefined
            ? {
                label: "Data coverage",
                value: `${activeAirQuality.coveragePercent.toFixed(0)}%`,
                icon: Signal,
              }
            : null,
          {
            label: "Location ID",
            value: `${activeAirQuality.locationId}`,
            icon: Building2,
          },
          {
            label: "Sensor ID",
            value: `${activeAirQuality.sensorId}`,
            icon: Radio,
          },
          activeAirQuality.city || activeAirQuality.country
            ? {
                label: "Region",
                value: [activeAirQuality.city, activeAirQuality.country].filter(Boolean).join(", "),
                icon: MapPin,
              }
            : null,
          activeAirQuality.averageValue !== null && activeAirQuality.averageValue !== undefined
            ? {
                label: "Average",
                value: formatAirQualityConcentration(activeAirQuality.averageValue, activeAirQuality.unit),
                icon: Ruler,
              }
            : null,
          activeAirQuality.minValue !== null && activeAirQuality.minValue !== undefined
            ? {
                label: "Minimum",
                value: formatAirQualityConcentration(activeAirQuality.minValue, activeAirQuality.unit),
                icon: FlaskConical,
              }
            : null,
          activeAirQuality.maxValue !== null && activeAirQuality.maxValue !== undefined
            ? {
                label: "Maximum",
                value: formatAirQualityConcentration(activeAirQuality.maxValue, activeAirQuality.unit),
                icon: FlaskConical,
              }
            : null,
        ].filter(isDefined)
      )
    : [];

  const ActiveEventIcon = activeEvent ? getEventIcon(activeEvent.category) : Globe2;
  const activeEventTone = activeEvent ? getEventTone(activeEvent.category) : getEventTone("default");

  return createPortal(
    <div className="w-full max-w-sm sm:max-w-md max-h-[75vh] overflow-y-auto rounded-lg border border-border/60 bg-background/95 p-3 shadow-lg">
      {activeEarthquake ? (
        <UnifiedSignalPopover
          leading={(
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white shadow-lg"
              style={{
                backgroundColor: getMagnitudeColor(activeEarthquake.magnitude),
                boxShadow: `0 4px 14px ${getMagnitudeColor(activeEarthquake.magnitude)}40`,
              }}
            >
              {activeEarthquake.magnitude.toFixed(1)}
            </div>
          )}
          title={activeEarthquake.place}
          titlePrefixIcon={MapPin}
          onClose={onCloseEarthquake}
          badges={earthquakeBadges}
          details={detailItems}
          footerAction={{
            label: "View on USGS",
            url: activeEarthquake.url,
            ariaLabel: "View USGS event details",
          }}
        >
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
        </UnifiedSignalPopover>
      ) : null}

      {activeEvent ? (
        <UnifiedSignalPopover
          leading={(
            <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg shadow-lg", activeEventTone.lead)}>
              <ActiveEventIcon className="size-6" />
            </div>
          )}
          title={activeEvent.title}
          onClose={onCloseEvent}
          badges={eventBadges}
          details={eventDetails}
        />
      ) : null}

      {activeTsunami ? (
        <UnifiedSignalPopover
          leading={(
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-700 shadow-lg dark:bg-sky-500/30 dark:text-sky-200">
              <Waves className="size-6" />
            </div>
          )}
          title={activeTsunami.headline}
          onClose={onCloseEvent}
          badges={tsunamiBadges}
          details={tsunamiDetails}
        />
      ) : null}

      {activeAirQuality ? (
        <UnifiedSignalPopover
          leading={(
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700 shadow-lg dark:bg-emerald-500/30 dark:text-emerald-200">
              <Wind className="size-6" />
            </div>
          )}
          title={activeAirQuality.location}
          onClose={onCloseEvent}
          badges={airQualityBadges}
          details={airQualityDetails}
        />
      ) : null}
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
  const is3DEnabledRef = React.useRef(false);
  const sync3DBuildingsRef = React.useRef<(() => void) | null>(null);
  const buildingLayerVisibilityRef = React.useRef<Record<string, "visible" | "none" | undefined>>({});

  React.useEffect(() => {
    is3DEnabledRef.current = is3D;
  }, [is3D]);

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
    type StyleLayerLike = {
      id: string;
      type?: string;
      source?: string;
      "source-layer"?: string;
      layout?: {
        visibility?: "visible" | "none";
      };
      minzoom?: number;
    };

    const setLayerVisibilitySafe = (targetLayerId: string, visibility: "visible" | "none") => {
      try {
        globeMap.setLayoutProperty(targetLayerId, "visibility", visibility);
      } catch {
        // Ignore layer timing races during style switches.
      }
    };

    const isBuildingSourceLayer = (sourceLayerName?: string) => {
      return typeof sourceLayerName === "string" && sourceLayerName.toLowerCase().includes("building");
    };

    const getBuildingFillLayers = () => {
      const styleLayers = (globeMap.getStyle().layers ?? []) as StyleLayerLike[];
      return styleLayers.filter((layer) => {
        if (layer.type !== "fill") return false;
        if (typeof layer.source !== "string") return false;
        return isBuildingSourceLayer(layer["source-layer"]);
      });
    };

    const getBuildingExtrusionLayers = () => {
      const styleLayers = (globeMap.getStyle().layers ?? []) as StyleLayerLike[];
      return styleLayers.filter((layer) => {
        if (layer.type !== "fill-extrusion") return false;
        if (typeof layer.source !== "string") return false;
        if (isBuildingSourceLayer(layer["source-layer"])) return true;
        return layer.id.toLowerCase().includes("building");
      });
    };

    const hideBuildingFillLayers = () => {
      const buildingFillLayers = getBuildingFillLayers();
      for (const layer of buildingFillLayers) {
        if (!(layer.id in buildingLayerVisibilityRef.current)) {
          buildingLayerVisibilityRef.current[layer.id] = layer.layout?.visibility;
        }
        setLayerVisibilitySafe(layer.id, "none");
      }
    };

    const restoreBuildingFillLayers = () => {
      const originalVisibility = buildingLayerVisibilityRef.current;
      const layerIds = Object.keys(originalVisibility);
      for (const layerIdToRestore of layerIds) {
        setLayerVisibilitySafe(layerIdToRestore, originalVisibility[layerIdToRestore] ?? "visible");
      }
      buildingLayerVisibilityRef.current = {};
    };

    const hideBuildingExtrusions = () => {
      const buildingExtrusionLayers = getBuildingExtrusionLayers();
      for (const layer of buildingExtrusionLayers) {
        if (layer.id === layerId) continue;
        setLayerVisibilitySafe(layer.id, "none");
      }
    };

    const handle3DBuildings = () => {
      const is3DEnabled = is3DEnabledRef.current;
      globeMap.setProjection({ name: is3DEnabled ? "globe" : "mercator" });

      if (is3DEnabled) {
        hideBuildingFillLayers();
        hideBuildingExtrusions();

        const baseBuildingLayer = getBuildingFillLayers()[0] ?? getBuildingExtrusionLayers()[0];
        if (!baseBuildingLayer?.source || !baseBuildingLayer["source-layer"]) return;

        const styleLayers = globeMap.getStyle().layers ?? [];
        const beforeLayerId = styleLayers.find((layer) => layer.type === "symbol")?.id;
        const minZoom = baseBuildingLayer.minzoom ?? 14.5;

        if (!globeMap.getLayer(layerId)) {
          try {
            globeMap.addLayer(
              {
                id: layerId,
                source: baseBuildingLayer.source,
                "source-layer": baseBuildingLayer["source-layer"],
                type: "fill-extrusion",
                minzoom: minZoom,
                paint: {
                  "fill-extrusion-color": [
                    "interpolate",
                    ["linear"],
                    ["coalesce", ["get", "render_height"], ["get", "height"], 0],
                    0,
                    "#a3a3a3",
                    180,
                    "#737373",
                  ],
                  "fill-extrusion-height": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    minZoom,
                    0,
                    minZoom + 0.1,
                    ["coalesce", ["get", "render_height"], ["get", "height"], 0],
                  ],
                  "fill-extrusion-base": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    minZoom,
                    0,
                    minZoom + 0.1,
                    ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
                  ],
                  "fill-extrusion-opacity": 0.9,
                },
              },
              beforeLayerId,
            );
          } catch {
            // Ignore transient add errors during style updates.
          }
          return;
        }

        setLayerVisibilitySafe(layerId, "visible");
        return;
      }

      restoreBuildingFillLayers();
      hideBuildingExtrusions();
      if (globeMap.getLayer(layerId)) {
        setLayerVisibilitySafe(layerId, "none");
      }
    };

    sync3DBuildingsRef.current = handle3DBuildings;
    globeMap.on("styledata", handle3DBuildings);
    if (globeMap.isStyleLoaded()) {
      handle3DBuildings();
    }

    return () => {
      globeMap.off("styledata", handle3DBuildings);
      if (sync3DBuildingsRef.current === handle3DBuildings) {
        sync3DBuildingsRef.current = null;
      }
    };
  }, [map]);

  React.useEffect(() => {
    if (!map) return;
    sync3DBuildingsRef.current?.();
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
    is3DEnabledRef.current = new3D;
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

    sync3DBuildingsRef.current?.();
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
