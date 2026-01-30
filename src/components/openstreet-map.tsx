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
  Maximize,
  Sun,
  Moon,
  Box,
  Loader2,
  SlidersHorizontal,
  Mountain,
  Globe2,
  AlertTriangle,
  CircleDot,
  Clock,
  ExternalLink,
  Gauge,
  MapPin,
  Radio,
  Signal,
  Users,
  Waves,
  X,
  Wind,
} from "lucide-react";

import type { Map as MapLibreMap } from "maplibre-gl";
import {
  Map as MapComponent,
  useMap,
  MapMarker,
  MarkerContent,
  MapClusterLayer,
} from "@/components/ui/map";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { resolveIpLocation } from "@/lib/ip-location";
import { HazrMenuPanel } from "@/components/hazr-menu-panel";
import { HazrSidebar } from "@/components/hazr-sidebar";
import { EarthquakeItem } from "@/components/hazr-earthquake-item";
import { HourlyForecastDock } from "@/components/map/hourly-forecast-dock";
import { WeatherDock } from "@/components/map/weather-dock";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useEarthquakes } from "@/hooks/use-earthquakes";
import { useAirQuality } from "@/hooks/use-air-quality";
import { useEonetEvents } from "@/hooks/use-eonet-events";
import { useTsunamiAlerts } from "@/hooks/use-tsunami-alerts";
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

const DEFAULT_COUNTRY_ZOOM = 6;
const DEFAULT_FALLBACK_CENTER: [number, number] = [-122.4194, 37.7749];
const MAP_VIEW_STATE_KEY = "map-view-state";
const MAP_VIEW_STATE_SOURCE_KEY = "map-view-state-source";
const SIDEBAR_STATE_KEY = "sidebar-state";

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

const useIsTablet = () => {
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

type MapViewState = {
  center: [number, number];
  zoom: number;
};

const getEventIcon = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes("storm")) return "⛈";
  if (normalized.includes("wildfire") || normalized.includes("fire")) return "🔥";
  if (normalized.includes("flood")) return "🌊";
  if (normalized.includes("volcano")) return "🌋";
  if (normalized.includes("ice")) return "🧊";
  if (normalized.includes("drought")) return "🌵";
  if (normalized.includes("dust")) return "🌀";
  return "•";
};


export default function GoogleMapsClone() {
  const hasSidebarPreferenceRef = React.useRef(false);
  const [approximateLocation, setApproximateLocationState] = React.useState<
    [number, number] | null
  >(null);

  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);

  const setApproximateLocation = React.useCallback((coords: [number, number]) => {
    setApproximateLocationState(coords);
  }, []);

  const [isLocateAnimating, setIsLocateAnimating] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const locateAnimationTimeoutRef = React.useRef<number | null>(null);
  const [activeQuakePulseId, setActiveQuakePulseId] = React.useState<string | null>(null);
  const hasRequestedLocationRef = React.useRef(false);
  const [shouldAutoCenter, setShouldAutoCenter] = React.useState(() => {
    try {
      return localStorage.getItem(MAP_VIEW_STATE_SOURCE_KEY) !== "user";
    } catch {
      return true;
    }
  });
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = React.useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (saved) {
        hasSidebarPreferenceRef.current = true;
        return saved === "open";
      }
    } catch {
      // ignore
    }
    return !window.matchMedia("(max-width: 1024px)").matches;
  });
  const [selectedEarthquake, setSelectedEarthquake] =
    React.useState<ProcessedEarthquake | null>(null);
  const [selectedEonetEvent, setSelectedEonetEvent] =
    React.useState<ProcessedEonetEvent | null>(null);
  const [selectedTsunamiAlert, setSelectedTsunamiAlert] =
    React.useState<ProcessedTsunamiAlert | null>(null);
  const [selectedAirQualitySite, setSelectedAirQualitySite] =
    React.useState<ProcessedAirQualitySite | null>(null);
  const [activeSignalType, setActiveSignalType] = React.useState<
    "earthquake" | "global" | null
  >(null);
  const [layerVisibility, setLayerVisibility] = React.useState(() => ({
    earthquakes: true,
    eonet: true,
    airQuality: true,
    tsunami: true,
  }));

  // Fetch earthquake data
  const { earthquakes } = useEarthquakes({
    magnitude: "all",
    range: "day",
  });

  const eonetState = useEonetEvents();
  const airQualityState = useAirQuality();
  const tsunamiState = useTsunamiAlerts();


  const eonetGeojson = React.useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: eonetState.events.map((event) => ({
        type: "Feature",
        properties: {
          id: event.id,
          title: event.title,
          category: event.category,
          date: event.date.toISOString(),
          url: event.url,
          icon: getEventIcon(event.category),
        },
        geometry: {
          type: "Point",
          coordinates: event.coordinates,
        },
      })),
    }),
    [eonetState.events],
  );

  const airQualityGeojson = React.useMemo<
    GeoJSON.FeatureCollection<GeoJSON.Point>
  >(
    () => ({
      type: "FeatureCollection",
      features: airQualityState.sites.map((site) => ({
        type: "Feature",
        properties: {
          id: site.id,
          location: site.location,
          parameter: site.parameter,
          value: site.value,
          unit: site.unit,
        },
        geometry: {
          type: "Point",
          coordinates: site.coordinates,
        },
      })),
    }),
    [airQualityState.sites],
  );

  const tsunamiGeojson = React.useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: tsunamiState.alerts.map((alert) => ({
        type: "Feature",
        properties: {
          id: alert.id,
          headline: alert.headline,
          severity: alert.severity,
          sent: alert.sent?.toISOString() ?? null,
          url: alert.url,
          icon: "🌊",
        },
        geometry: {
          type: "Point",
          coordinates: alert.coordinates,
        },
      })),
    }),
    [tsunamiState.alerts],
  );

  const [now] = React.useState(() => Date.now());
  const getPulseWidth = (magnitude: number) => {
    if (magnitude >= 7) return 74;
    if (magnitude >= 6) return 66;
    if (magnitude >= 5) return 58;
    if (magnitude >= 4) return 50;
    return 44;
  };

  const getPulseHeight = (magnitude: number) => {
    if (magnitude >= 7) return 40;
    if (magnitude >= 6) return 36;
    if (magnitude >= 5) return 32;
    if (magnitude >= 4) return 28;
    return 26;
  };

  const getPulseInnerWidth = (magnitude: number) => {
    const base = getPulseWidth(magnitude) - 16;
    return Math.max(base, getMarkerMinWidth(magnitude) + 12);
  };

  const getPulseInnerHeight = (magnitude: number) => {
    const base = getPulseHeight(magnitude) - 12;
    return Math.max(base, getMarkerHeight(magnitude) + 8);
  };

  const getPulseDuration = (magnitude: number) => {
    if (magnitude >= 7) return 2200;
    if (magnitude >= 6) return 2000;
    if (magnitude >= 5) return 1850;
    if (magnitude >= 4) return 1700;
    return 1500;
  };

  const getMarkerMinWidth = (magnitude: number) => {
    if (magnitude >= 7) return 56;
    if (magnitude >= 6) return 52;
    if (magnitude >= 5) return 48;
    if (magnitude >= 4) return 44;
    return 40;
  };

  const getMarkerHeight = (magnitude: number) => {
    if (magnitude >= 7) return 30;
    if (magnitude >= 6) return 28;
    if (magnitude >= 5) return 26;
    if (magnitude >= 4) return 24;
    return 22;
  };

  const getMarkerPaddingX = (magnitude: number) => {
    if (magnitude >= 7) return 10;
    if (magnitude >= 6) return 9;
    if (magnitude >= 5) return 8;
    return 7;
  };

  const getMarkerFontSize = (magnitude: number) => {
    if (magnitude >= 6) return 11;
    if (magnitude >= 4) return 10;
    return 9;
  };

  const getMarkerIconSize = (magnitude: number) => {
    if (magnitude >= 6) return 12;
    if (magnitude >= 4) return 11;
    return 10;
  };

  const handleTriggerQuakePulse = React.useCallback(
    (earthquake: ProcessedEarthquake) => {
      if (typeof window === "undefined") return;

      setActiveQuakePulseId(earthquake.id);
    },
    []
  );

  // Handle selecting an earthquake (will fly to it via EarthquakeFlyTo component)
  const handleEarthquakeSelect = React.useCallback(
    (earthquake: ProcessedEarthquake) => {
      setSelectedEarthquake(earthquake);
      setActiveSignalType("earthquake");
      handleTriggerQuakePulse(earthquake);
    },
    [handleTriggerQuakePulse]
  );


  const handleSidebarOpenChange = React.useCallback((open: boolean) => {
    setIsDesktopSidebarOpen(open);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, open ? "open" : "collapsed");
      hasSidebarPreferenceRef.current = true;
    } catch {
      // ignore
    }
  }, []);

  // Close the earthquake popover
  const handleCloseEarthquakePopover = React.useCallback(() => {
    setSelectedEarthquake(null);
    setActiveQuakePulseId(null);
    setActiveSignalType((prev) =>
      prev === "earthquake"
        ? selectedEonetEvent || selectedTsunamiAlert || selectedAirQualitySite
          ? "global"
          : null
        : prev
    );
  }, [selectedEonetEvent, selectedTsunamiAlert, selectedAirQualitySite]);

  const handleCloseEonetEvent = React.useCallback(() => {
    setSelectedEonetEvent(null);
    setSelectedTsunamiAlert(null);
    setSelectedAirQualitySite(null);
    setActiveSignalType((prev) =>
      prev === "global" ? (selectedEarthquake ? "earthquake" : null) : prev
    );
  }, [selectedEarthquake]);

  const handleTriggerLocateAnimation = React.useCallback(() => {
    if (typeof window === "undefined") return;

    setIsLocateAnimating(true);
    if (locateAnimationTimeoutRef.current) {
      window.clearTimeout(locateAnimationTimeoutRef.current);
    }

    locateAnimationTimeoutRef.current = window.setTimeout(() => {
      setIsLocateAnimating(false);
    }, 1200);
  }, []);

  React.useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      if (!locateAnimationTimeoutRef.current) return;
      window.clearTimeout(locateAnimationTimeoutRef.current);
    };
  }, []);

  const isTablet = useIsTablet();

  React.useEffect(() => {
    if (hasSidebarPreferenceRef.current) return;
    setIsDesktopSidebarOpen(!isTablet);
  }, [isTablet]);


  const [viewState, setViewState] = React.useState<MapViewState>(() => {
    if (typeof window === "undefined")
      return { center: DEFAULT_FALLBACK_CENTER, zoom: DEFAULT_COUNTRY_ZOOM };
    let saved: string | null = null;
    let source: string | null = null;
    try {
      saved = localStorage.getItem(MAP_VIEW_STATE_KEY);
      source = localStorage.getItem(MAP_VIEW_STATE_SOURCE_KEY);
    } catch {
      saved = null;
      source = null;
    }
    if (saved && source === "user") {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return { center: DEFAULT_FALLBACK_CENTER, zoom: DEFAULT_COUNTRY_ZOOM };
  });

  const resolvedLocation = userLocation ?? approximateLocation;

  const hasUserInteractedRef = React.useRef(false);
  const handleUserInteraction = React.useCallback(() => {
    hasUserInteractedRef.current = true;
    setShouldAutoCenter(false);
  }, []);

  const handleEonetSelect = React.useCallback(
    (event: ProcessedEonetEvent) => {
      setLayerVisibility((prev) => ({ ...prev, eonet: true }));
      setSelectedEonetEvent(event);
      setSelectedTsunamiAlert(null);
      setSelectedAirQualitySite(null);
      setActiveSignalType("global");
      handleUserInteraction();
      setViewState((prev) => ({
        center: event.coordinates,
        zoom: Math.max(prev.zoom, 5.8),
      }));
    },
    [handleUserInteraction]
  );

  const handleTsunamiSelect = React.useCallback(
    (alert: ProcessedTsunamiAlert) => {
      setLayerVisibility((prev) => ({ ...prev, tsunami: true }));
      setSelectedTsunamiAlert(alert);
      setSelectedEonetEvent(null);
      setSelectedAirQualitySite(null);
      setActiveSignalType("global");
      handleUserInteraction();
      setViewState((prev) => ({
        center: alert.coordinates,
        zoom: Math.max(prev.zoom, 5.8),
      }));
    },
    [handleUserInteraction]
  );

  const handleAirQualitySelect = React.useCallback(
    (site: ProcessedAirQualitySite) => {
      setLayerVisibility((prev) => ({ ...prev, airQuality: true }));
      setSelectedAirQualitySite(site);
      setSelectedEonetEvent(null);
      setSelectedTsunamiAlert(null);
      setActiveSignalType("global");
      handleUserInteraction();
      setViewState((prev) => ({
        center: site.coordinates,
        zoom: Math.max(prev.zoom, 6),
      }));
    },
    [handleUserInteraction]
  );

  const globalClusterMaxZoom = 6;

  const isDefaultCenter = React.useCallback((center: [number, number]) => {
    return (
      Math.abs(center[0] - DEFAULT_FALLBACK_CENTER[0]) < 0.01 &&
      Math.abs(center[1] - DEFAULT_FALLBACK_CENTER[1]) < 0.01
    );
  }, []);

  React.useEffect(() => {
    if (approximateLocation || hasRequestedLocationRef.current) return;
    if (typeof window === "undefined") return;
    hasRequestedLocationRef.current = true;
    const controller = new AbortController();

    const fetchIpLocation = async () => {
      try {
        setIsLocating(true);
        const result = await resolveIpLocation(controller.signal);
        if (result) {
          setApproximateLocation(result.coords);

          const hasSavedView =
            (() => {
              try {
                return localStorage.getItem(MAP_VIEW_STATE_SOURCE_KEY) === "user";
              } catch {
                return false;
              }
            })();
          if (
            shouldAutoCenter &&
            !hasUserInteractedRef.current &&
            (!hasSavedView || isDefaultCenter(viewState.center))
          ) {
            setViewState({ center: result.coords, zoom: DEFAULT_COUNTRY_ZOOM });
          }
        }
      } finally {
        setIsLocating(false);
      }
    };

    fetchIpLocation();
    return () => controller.abort();
  }, [
    approximateLocation,
    setApproximateLocation,
    isDefaultCenter,
    viewState.center,
    shouldAutoCenter,
  ]);

  return (
    <SidebarProvider
      open={isDesktopSidebarOpen}
      onOpenChange={handleSidebarOpenChange}
    >
      <div className="flex h-screen w-full overflow-hidden bg-background font-sans">
        <HazrSidebar
          userLocation={resolvedLocation}
          isLocating={isLocating}
          onEarthquakeSelect={handleEarthquakeSelect}
          onEonetSelect={handleEonetSelect}
          eonetState={eonetState}
          airQualityState={airQualityState}
          tsunamiState={tsunamiState}
        />

        <SidebarInset>
          <main className="flex-1 flex flex-col p-1.5 bg-muted/20 min-w-0">
            <div className="relative flex-1 bg-background rounded-md border border-border/50 shadow-xl overflow-hidden group">
              <MapComponent
                center={viewState.center}
                zoom={viewState.zoom}
                scrollZoom={true}
              >
                <MapViewController
                  viewState={viewState}
                  shouldAutoCenter={shouldAutoCenter}
                />
                <MapStateSync
                  setViewState={setViewState}
                  onUserInteract={handleUserInteraction}
                />

                {userLocation && (
                  <MapMarker
                    longitude={userLocation[0]}
                    latitude={userLocation[1]}
                  >
                    <MarkerContent>
                      <div className="relative flex items-center justify-center pointer-events-none">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute size-16 rounded-full bg-blue-500/15 shadow-[0_0_22px_rgba(59,130,246,0.25)]",
                            isLocateAnimating ? "animate-ping" : "opacity-0",
                          )}
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute size-10 rounded-full bg-blue-500/10",
                            isLocateAnimating ? "animate-pulse" : "opacity-0",
                          )}
                        />
                        <div
                          className={cn(
                            "relative size-4 rounded-full bg-blue-600 border-2 border-white shadow-lg",
                            isLocateAnimating && "motion-safe:animate-bounce",
                          )}
                        />
                      </div>
                    </MarkerContent>
                  </MapMarker>
                )}

                {/* Earthquake Markers */}
                {layerVisibility.earthquakes &&
                  earthquakes.map((eq) => (
                    <MapMarker
                      key={eq.id}
                      longitude={eq.coordinates[0]}
                      latitude={eq.coordinates[1]}
                    >
                      <MarkerContent>
                        <button
                          type="button"
                          onClick={() => handleEarthquakeSelect(eq)}
                          className="group relative flex items-center justify-center cursor-pointer"
                          aria-label={`Earthquake: ${eq.title}`}
                        >
                          {activeQuakePulseId === eq.id && (
                            <>
                              <span
                                aria-hidden="true"
                                className="absolute rounded-full animate-ping"
                                style={{
                                  backgroundColor: `${getMagnitudeColor(eq.magnitude)}26`,
                                  width: `${getPulseWidth(eq.magnitude)}px`,
                                  height: `${getPulseHeight(eq.magnitude)}px`,
                                  borderRadius: 9999,
                                }}
                              />
                              <span
                                aria-hidden="true"
                                className="absolute rounded-full animate-pulse"
                                style={{
                                  backgroundColor: `${getMagnitudeColor(eq.magnitude)}1f`,
                                  width: `${getPulseInnerWidth(eq.magnitude)}px`,
                                  height: `${getPulseInnerHeight(eq.magnitude)}px`,
                                  borderRadius: 9999,
                                }}
                              />
                            </>
                          )}
                          {/* Pulse ring for recent earthquakes */}
                          {!activeQuakePulseId && now - eq.time.getTime() < 3600000 && (
                            <span
                              aria-hidden="true"
                              className="absolute rounded-full animate-ping"
                              style={{
                                backgroundColor: `${getMagnitudeColor(eq.magnitude)}30`,
                                width: `${getPulseWidth(eq.magnitude)}px`,
                                height: `${getPulseHeight(eq.magnitude)}px`,
                                borderRadius: 9999,
                                animationDuration: `${getPulseDuration(eq.magnitude)}ms`,
                              }}
                            />
                          )}
                        {/* Main marker */}
                          <div
                            className={cn(
                              "relative flex items-center justify-center rounded-full font-bold text-white shadow-lg transition-transform group-hover:scale-110",
                              activeQuakePulseId === eq.id && "motion-safe:animate-bounce",
                            )}
                            style={{
                              minWidth: `${getMarkerMinWidth(eq.magnitude)}px`,
                              height: `${getMarkerHeight(eq.magnitude)}px`,
                              paddingLeft: `${getMarkerPaddingX(eq.magnitude)}px`,
                              paddingRight: `${getMarkerPaddingX(eq.magnitude)}px`,
                              fontSize: `${getMarkerFontSize(eq.magnitude)}px`,
                              backgroundColor: getMagnitudeColor(eq.magnitude),
                              boxShadow: `0 2px 8px ${getMagnitudeColor(eq.magnitude)}60`,
                            }}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center rounded-full bg-white/90 px-1">
                                <Mountain
                                  style={{
                                    width: getMarkerIconSize(eq.magnitude),
                                    height: getMarkerIconSize(eq.magnitude),
                                    color: getMagnitudeColor(eq.magnitude),
                                  }}
                                />
                              </span>
                              <span>{eq.magnitude.toFixed(1)}</span>
                            </span>
                          </div>
                        </button>
                      </MarkerContent>
                    </MapMarker>
                  ))}

                <MapClusterLayer
                  data={eonetGeojson}
                  visible={layerVisibility.eonet}
                  labelPrefix="E"
                  pointColor="transparent"
                  pointLabelVisible={false}
                  clusterMaxZoom={globalClusterMaxZoom}
                  clusterColors={["#fbbf24", "#f59e0b", "#d97706"]}
                  clusterRadius={45}
                  onPointClick={(feature) => {
                    const id = feature.properties?.id as string | undefined;
                    const match = eonetState.events.find((event) => event.id === id);
                    if (match) {
                      setSelectedEonetEvent(match);
                      setActiveSignalType("global");
                    }
                  }}
                />
                <MapClusterLayer
                  data={airQualityGeojson}
                  visible={layerVisibility.airQuality}
                  labelPrefix="AQ"
                  pointColor="transparent"
                  pointLabelVisible={false}
                  clusterMaxZoom={globalClusterMaxZoom}
                  clusterColors={["#34d399", "#10b981", "#059669"]}
                  clusterRadius={45}
                  onPointClick={(feature) => {
                    const id = feature.properties?.id as string | undefined;
                    const match = airQualityState.sites.find((site) => site.id === id);
                    if (match) {
                      handleAirQualitySelect(match);
                    }
                  }}
                />
                <MapClusterLayer
                  data={tsunamiGeojson}
                  visible={layerVisibility.tsunami}
                  labelPrefix="T"
                  pointColor="transparent"
                  pointLabelVisible={false}
                  clusterMaxZoom={globalClusterMaxZoom}
                  clusterColors={["#60a5fa", "#3b82f6", "#1d4ed8"]}
                  clusterRadius={45}
                  onPointClick={(feature) => {
                    const id = feature.properties?.id as string | undefined;
                    const match = tsunamiState.alerts.find((alert) => alert.id === id);
                    if (match) {
                      handleTsunamiSelect(match);
                    }
                  }}
                />

                {/* Fly to selected earthquake */}
                <EarthquakeFlyTo earthquake={selectedEarthquake} />

                <EonetFlyTo event={selectedEonetEvent} />

                <SignalOverlay
                  activeType={activeSignalType}
                  earthquake={selectedEarthquake}
                  event={selectedEonetEvent}
                  tsunamiAlert={selectedTsunamiAlert}
                  airQualitySite={selectedAirQualitySite}
                  onCloseEarthquake={handleCloseEarthquakePopover}
                  onCloseEvent={handleCloseEonetEvent}
                />

                <GlobalSignalMarkers
                  events={eonetState.events}
                  tsunamiAlerts={tsunamiState.alerts}
                  airQualitySites={airQualityState.sites}
                  layerVisibility={layerVisibility}
                  clusterMaxZoom={globalClusterMaxZoom}
                  onEventSelect={handleEonetSelect}
                  onTsunamiSelect={handleTsunamiSelect}
                  onAirQualitySelect={handleAirQualitySelect}
                />

                <MapOverlayUI
                  setUserLocation={setUserLocation}
                  onLocateAnimation={handleTriggerLocateAnimation}
                  resolvedLocation={resolvedLocation}
                  isLocating={isLocating}
                  earthquakes={earthquakes}
                  onEarthquakeSelect={handleEarthquakeSelect}
                  layerVisibility={layerVisibility}
                  onLayerVisibilityChange={setLayerVisibility}
                />
              </MapComponent>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function MapStateSync({
  setViewState,
  onUserInteract,
}: {
  setViewState: (s: MapViewState) => void;
  onUserInteract?: () => void;
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
        localStorage.setItem(MAP_VIEW_STATE_KEY, JSON.stringify(newState));
        localStorage.setItem(MAP_VIEW_STATE_SOURCE_KEY, "user");
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
  }, [map, setViewState, onUserInteract]);

  return null;
}

function MapViewController({
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

function GlobalSignalMarkers({
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
  layerVisibility: {
    eonet: boolean;
    airQuality: boolean;
    tsunami: boolean;
  };
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
                  className="flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg transition-transform hover:scale-105"
                  style={{
                    backgroundColor: tone,
                    boxShadow: `0 6px 16px ${tone}55`,
                  }}
                  aria-label={`Event: ${event.title}`}
                >
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-white/85 text-[9px]">
                    {getEventIcon(event.category)}
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
                className="flex items-center gap-2 rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg transition-transform hover:scale-105"
                style={{ boxShadow: "0 6px 16px #3b82f680" }}
                aria-label="Tsunami alert"
              >
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-white/85 text-[9px]">
                  🌊
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
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg transition-transform hover:scale-105"
                style={{ boxShadow: "0 6px 16px #10b98170" }}
                aria-label={`Air quality: ${site.location}`}
              >
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-white/85 text-[9px]">
                  🌬
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

// Component to fly to earthquake location when selected
function EarthquakeFlyTo({
  earthquake,
}: {
  earthquake: ProcessedEarthquake | null;
}) {
  const { map } = useMap();
  const prevEarthquakeId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!map || !earthquake) return;

    // Only fly if it's a new earthquake selection
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

function EonetFlyTo({
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

function SignalOverlay({
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
        .filter(Boolean)
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
                <Badge className="gap-1 bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
                  Status {activeEarthquake.status}
                </Badge>
                <Badge className="gap-1 bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
                  Network {activeEarthquake.net}
                </Badge>
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
                <Badge className="bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
                  ID {activeEvent.id}
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
            type="button"
            className="w-full"
            onClick={() => {
              if (typeof window === "undefined") return;
              window.open(activeEvent.url, "_blank", "noopener,noreferrer");
            }}
            aria-label="View event source"
          >
            View source
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



function MapOverlayUI({
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
  layerVisibility: {
    earthquakes: boolean;
    eonet: boolean;
    airQuality: boolean;
    tsunami: boolean;
  };
  onLayerVisibilityChange: React.Dispatch<
    React.SetStateAction<{
      earthquakes: boolean;
      eonet: boolean;
      airQuality: boolean;
      tsunami: boolean;
    }>
  >;
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
      {/* Top Section: Desktop Sidebar Toggle */}

      {/* Bottom Section: Controls */}
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

      {/* Mobile Menu Drawer */}
      <Drawer
        open={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
      >
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

      {/* Mobile Quakes Drawer (bottom) */}
      <Drawer
        open={isQuakesDrawerOpen}
        onOpenChange={setIsQuakesDrawerOpen}
      >
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

      {/* Mobile Weather Drawer (bottom) */}
      <Drawer
        open={isWeatherDrawerOpen}
        onOpenChange={setIsWeatherDrawerOpen}
      >
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

      {/* Mobile Bottom Bar */}
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


function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-md border border-border bg-background shadow-sm overflow-hidden [&>button:not(:last-child)]:border-b [&>button:not(:last-child)]:border-border">
      {children}
    </div>
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

function CustomMapControls({
  setUserLocation,
  onLocateAnimation,
  layerVisibility,
  onLayerVisibilityChange,
}: {
  setUserLocation: (l: [number, number]) => void;
  onLocateAnimation: () => void;
  layerVisibility: {
    earthquakes: boolean;
    eonet: boolean;
    airQuality: boolean;
    tsunami: boolean;
  };
  onLayerVisibilityChange: React.Dispatch<
    React.SetStateAction<{
      earthquakes: boolean;
      eonet: boolean;
      airQuality: boolean;
      tsunami: boolean;
    }>
  >;
}) {
  const { map } = useMap();
  const { resolvedTheme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [is3D, setIs3D] = React.useState(false);
  const [waitingForLocation, setWaitingForLocation] = React.useState(false);
  const compassRef = React.useRef<SVGSVGElement>(null);

  // Sync compass rotation
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

  // Handle 3D buildings extrusion
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

  const handleToggleLayer = (key: keyof typeof layerVisibility) => {
    onLayerVisibilityChange((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col gap-2 items-end">
        {/* Utility Controls (Theme, 3D, Fullscreen) */}
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

        {/* Compass/Locate */}
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

        {/* Zoom Controls Group */}
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
