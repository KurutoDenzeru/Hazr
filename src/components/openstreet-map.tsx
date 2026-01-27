"use client";

import * as React from "react";
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
} from "lucide-react";

import type { Map as MapLibreMap } from "maplibre-gl";
import {
  Map as MapComponent,
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
import type { ProcessedEarthquake } from "@/types/api";
import { getMagnitudeColor } from "@/types/api";
import { Separator } from "@/components/ui/separator";
import { EarthquakePopover } from "@/components/map/earthquake-popover";

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

  // Fetch earthquake data
  const { earthquakes } = useEarthquakes({
    magnitude: "2.5",
    range: "day",
  });

  const [now] = React.useState(() => Date.now());
  const getPulseSize = (magnitude: number) => {
    if (magnitude >= 7) return 56;
    if (magnitude >= 6) return 48;
    if (magnitude >= 5) return 40;
    if (magnitude >= 4) return 34;
    return 28;
  };

  const getPulseDuration = (magnitude: number) => {
    if (magnitude >= 7) return 2200;
    if (magnitude >= 6) return 2000;
    if (magnitude >= 5) return 1850;
    if (magnitude >= 4) return 1700;
    return 1500;
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
  }, []);

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
                {earthquakes.map((eq) => (
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
                                width: `${getPulseSize(eq.magnitude)}px`,
                                height: `${getPulseSize(eq.magnitude)}px`,
                              }}
                            />
                            <span
                              aria-hidden="true"
                              className="absolute rounded-full animate-pulse"
                              style={{
                                backgroundColor: `${getMagnitudeColor(eq.magnitude)}1f`,
                                width: `${Math.max(getPulseSize(eq.magnitude) - 35, 55)}px`,
                                height: `${Math.max(getPulseSize(eq.magnitude) - 35, 55)}px`,
                              }}
                            />
                          </>
                        )}
                        {/* Pulse ring for recent earthquakes */}
                        {now - eq.time.getTime() < 3600000 && (
                          <span
                            aria-hidden="true"
                            className="absolute rounded-full animate-ping"
                            style={{
                              backgroundColor: `${getMagnitudeColor(eq.magnitude)}30`,
                              width: `${getPulseSize(eq.magnitude)}px`,
                              height: `${getPulseSize(eq.magnitude)}px`,
                              animationDuration: `${getPulseDuration(eq.magnitude)}ms`,
                            }}
                          />
                        )}
                        {/* Main marker */}
                        <div
                          className={cn(
                            "relative flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-lg transition-transform group-hover:scale-110",
                            activeQuakePulseId === eq.id && "motion-safe:animate-bounce",
                          )}
                          style={{
                            backgroundColor: getMagnitudeColor(eq.magnitude),
                            boxShadow: `0 2px 8px ${getMagnitudeColor(eq.magnitude)}60`,
                          }}
                        >
                          {eq.magnitude.toFixed(1)}
                        </div>
                      </button>
                    </MarkerContent>
                  </MapMarker>
                ))}

                {/* Fly to selected earthquake */}
                <EarthquakeFlyTo earthquake={selectedEarthquake} />

                {/* Earthquake detail popover */}
                <EarthquakePopover
                  earthquake={selectedEarthquake}
                  onClose={handleCloseEarthquakePopover}
                />

                <MapOverlayUI
                  setUserLocation={setUserLocation}
                  onLocateAnimation={handleTriggerLocateAnimation}
                  resolvedLocation={resolvedLocation}
                  isLocating={isLocating}
                  earthquakes={earthquakes}
                  onEarthquakeSelect={handleEarthquakeSelect}
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



function MapOverlayUI({
  setUserLocation,
  onLocateAnimation,
  resolvedLocation,
  isLocating,
  earthquakes,
  onEarthquakeSelect,
}: {
  setUserLocation: (l: [number, number]) => void;
  onLocateAnimation: () => void;
  resolvedLocation: [number, number] | null;
  isLocating: boolean;
  earthquakes: ProcessedEarthquake[];
  onEarthquakeSelect: (eq: ProcessedEarthquake) => void;
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
}: {
  setUserLocation: (l: [number, number]) => void;
  onLocateAnimation: () => void;
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

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col gap-2 items-end">
        {/* Utility Controls (Theme, 3D, Fullscreen) */}
        <ControlGroup>
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
