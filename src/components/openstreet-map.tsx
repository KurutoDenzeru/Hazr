"use client";

import * as React from "react";
import { Activity, Mountain, Waves, Wind } from "lucide-react";
import {
  Map as MapComponent,
  MapMarker,
  MarkerContent,
  MapClusterLayer,
} from "@/components/ui/map";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { resolveIpLocation } from "@/lib/ip-location";
import { HazrSidebar } from "@/components/hazr-sidebar";
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
import { getMagnitudeColor } from "@/types/api";
import {
  EarthquakeFlyTo,
  EonetFlyTo,
  GlobalSignalMarkers,
  MapOverlayUI,
  MapStateSync,
  MapViewController,
  SignalOverlay,
  useIsTablet,
  type MapViewState,
} from "@/components/map/openstreet-map-helpers";

const DEFAULT_COUNTRY_ZOOM = 6;
const DEFAULT_FALLBACK_CENTER: [number, number] = [-122.4194, 37.7749];
const MAP_VIEW_STATE_KEY = "map-view-state";
const MAP_VIEW_STATE_SOURCE_KEY = "map-view-state-source";
const SIDEBAR_STATE_KEY = "sidebar-state";

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
        },
        geometry: {
          type: "Point",
          coordinates: alert.coordinates,
        },
      })),
    }),
    [tsunamiState.alerts],
  );

  const getQuakeNodeSize = (magnitude: number) => {
    if (magnitude >= 7) return 18;
    if (magnitude >= 6) return 16;
    if (magnitude >= 5) return 14;
    if (magnitude >= 4) return 13;
    return 12;
  };

  const clearGlobalSelections = React.useCallback(() => {
    setSelectedEonetEvent(null);
    setSelectedTsunamiAlert(null);
    setSelectedAirQualitySite(null);
  }, []);

  const clearEarthquakeSelection = React.useCallback(() => {
    setSelectedEarthquake(null);
    setActiveQuakePulseId(null);
  }, []);

  // Handle selecting an earthquake (will fly to it via EarthquakeFlyTo component)
  const handleEarthquakeSelect = React.useCallback(
    (earthquake: ProcessedEarthquake) => {
      clearGlobalSelections();
      setSelectedEarthquake(earthquake);
      setActiveSignalType("earthquake");
      setActiveQuakePulseId(earthquake.id);
    },
    [clearGlobalSelections]
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
    clearEarthquakeSelection();
    setActiveSignalType(null);
  }, [clearEarthquakeSelection]);

  const handleCloseEonetEvent = React.useCallback(() => {
    clearGlobalSelections();
    clearEarthquakeSelection();
    setActiveSignalType(null);
  }, [clearGlobalSelections, clearEarthquakeSelection]);

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
      clearEarthquakeSelection();
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
    [handleUserInteraction, clearEarthquakeSelection]
  );

  const handleTsunamiSelect = React.useCallback(
    (alert: ProcessedTsunamiAlert) => {
      clearEarthquakeSelection();
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
    [handleUserInteraction, clearEarthquakeSelection]
  );

  const handleAirQualitySelect = React.useCallback(
    (site: ProcessedAirQualitySite) => {
      clearEarthquakeSelection();
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
    [handleUserInteraction, clearEarthquakeSelection]
  );

  const globalClusterMaxZoom = 6;
  const isZoomedOutNodeMode = viewState.zoom <= 3.8;

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
                  viewStateKey={MAP_VIEW_STATE_KEY}
                  viewStateSourceKey={MAP_VIEW_STATE_SOURCE_KEY}
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
                  earthquakes.map((eq) => {
                    const magnitudeColor = getMagnitudeColor(eq.magnitude);
                    const quakeNodeSize = getQuakeNodeSize(eq.magnitude);
                    const isActive = activeQuakePulseId === eq.id;

                    if (isZoomedOutNodeMode) {
                      return (
                        <MapMarker
                          key={eq.id}
                          longitude={eq.coordinates[0]}
                          latitude={eq.coordinates[1]}
                        >
                          <MarkerContent>
                            <button
                              type="button"
                              onClick={() => handleEarthquakeSelect(eq)}
                              className="group relative cursor-pointer rounded-full border border-white/55 shadow-[0_0_0_1px_rgba(0,0,0,0.24),0_0_14px_rgba(0,0,0,0.3)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                              aria-label={`Earthquake: ${eq.title}`}
                              title={`${eq.title} (${eq.magnitude.toFixed(1)})`}
                              style={{
                                width: `${quakeNodeSize}px`,
                                height: `${quakeNodeSize}px`,
                                minWidth: `${quakeNodeSize}px`,
                                minHeight: `${quakeNodeSize}px`,
                                backgroundColor: magnitudeColor,
                              }}
                            >
                              <span
                                aria-hidden="true"
                                className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95"
                              />
                            </button>
                          </MarkerContent>
                        </MapMarker>
                      );
                    }

                    return (
                      <MapMarker
                        key={eq.id}
                        longitude={eq.coordinates[0]}
                        latitude={eq.coordinates[1]}
                      >
                        <MarkerContent>
                          <button
                            type="button"
                            onClick={() => handleEarthquakeSelect(eq)}
                            className="relative flex items-center justify-center cursor-pointer"
                            aria-label={`Earthquake: ${eq.title}`}
                          >
                            {/* Main marker */}
                            <div
                              className={cn(
                                "relative flex items-center rounded-full border border-white/15 px-1.5 py-1 text-[10px] font-bold text-white backdrop-blur transition-all duration-250",
                              )}
                              style={{
                                backgroundColor: magnitudeColor,
                              }}
                            >
                              <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/90">
                                  <Mountain
                                    className="size-3.5"
                                    style={{ color: magnitudeColor }}
                                  />
                              </span>
                              <span
                                className={cn(
                                  "overflow-hidden whitespace-nowrap transition-all duration-250",
                                  isActive ? "ml-1 max-w-24 opacity-100" : "ml-0 max-w-0 opacity-0"
                                )}
                              >
                                Quake {eq.magnitude.toFixed(1)}
                              </span>
                            </div>
                          </button>
                        </MarkerContent>
                      </MapMarker>
                    );
                  })}

                <MapClusterLayer
                  data={eonetGeojson}
                  visible={layerVisibility.eonet}
                  labelPrefix="E"
                  clusterLabel="Signals"
                  clusterIcon={Activity}
                  compactAtOrBelowZoom={4.2}
                  pointColor="transparent"
                  pointLabelVisible={false}
                  clusterMaxZoom={globalClusterMaxZoom}
                  clusterColors={["#fbbf24", "#f59e0b", "#d97706"]}
                  clusterRadius={45}
                  onPointClick={(feature) => {
                    const id = feature.properties?.id as string | undefined;
                    const match = eonetState.events.find((event) => event.id === id);
                    if (match) {
                      handleEonetSelect(match);
                    }
                  }}
                />
                <MapClusterLayer
                  data={airQualityGeojson}
                  visible={layerVisibility.airQuality}
                  labelPrefix="AQ"
                  clusterLabel="Air"
                  clusterIcon={Wind}
                  compactAtOrBelowZoom={4.2}
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
                  clusterLabel="Tsunami"
                  clusterIcon={Waves}
                  compactAtOrBelowZoom={4.2}
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
