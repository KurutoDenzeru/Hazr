"use client";

import * as React from "react";
import {
  Menu,
  X,
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

import {
  Map as MapComponent,
  useMap,
  MapMarker,
  MarkerContent,
} from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { HazrMenuPanel } from "@/components/hazr-menu-panel";
import { HazrSidebar } from "@/components/hazr-sidebar";
import { WeatherDock } from "@/components/map/weather-dock";
import { useEarthquakes } from "@/hooks/use-earthquakes";
import type { ProcessedEarthquake } from "@/types/api";
import { getMagnitudeColor, getMagnitudeLabel } from "@/types/api";

// Helper to get approximate location based on timezone
const getInitialLocation = () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const locations: Record<string, [number, number]> = {
    "America/Los_Angeles": [-122.4194, 37.7749],
    "America/New_York": [-74.006, 40.7128],
    "Europe/London": [-0.1278, 51.5074],
    "Asia/Tokyo": [139.6917, 35.6895],
    "Asia/Manila": [120.9842, 14.5995],
    "Europe/Paris": [2.3522, 48.8566],
    "Australia/Sydney": [151.2093, -33.8688],
  };

  return locations[tz] || [-122.4194, 37.7749]; // Default to SF
};

const BAR_SURFACE_CLASS =
  "rounded-2xl border border-border/60 bg-background/80 shadow-xl shadow-black/5 supports-backdrop-filter:bg-background/60 supports-backdrop-filter:backdrop-blur-xl";

type MapViewState = {
  center: [number, number];
  zoom: number;
};

export default function GoogleMapsClone() {
  const [userLocation, setUserLocationState] = React.useState<
    [number, number] | null
  >(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("user-location");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === 2 &&
          typeof parsed[0] === "number" &&
          typeof parsed[1] === "number"
        ) {
          return parsed as [number, number];
        }
      } catch {
        // ignore
      }
    }
    return null;
  });

  // Wrapper to persist user location to localStorage
  const setUserLocation = React.useCallback((coords: [number, number]) => {
    setUserLocationState(coords);
    localStorage.setItem("user-location", JSON.stringify(coords));
  }, []);

  const [isLocateAnimating, setIsLocateAnimating] = React.useState(false);
  const locateAnimationTimeoutRef = React.useRef<number | null>(null);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = React.useState(true);
  const [selectedEarthquake, setSelectedEarthquake] =
    React.useState<ProcessedEarthquake | null>(null);

  // Fetch earthquake data
  const { earthquakes } = useEarthquakes({
    magnitude: "2.5",
    range: "day",
  });

  // Handle selecting an earthquake (will fly to it via EarthquakeFlyTo component)
  const handleEarthquakeSelect = React.useCallback(
    (earthquake: ProcessedEarthquake) => {
      setSelectedEarthquake(earthquake);
    },
    []
  );

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

  const [viewState, setViewState] = React.useState<MapViewState>(() => {
    if (typeof window === "undefined")
      return { center: [-122.4194, 37.7749], zoom: 12 };
    const saved = localStorage.getItem("map-view-state");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return { center: getInitialLocation(), zoom: 12 };
  });

  return (
    <SidebarProvider
      open={isDesktopSidebarOpen}
      onOpenChange={setIsDesktopSidebarOpen}
    >
      <div className="flex h-screen w-full overflow-hidden bg-background font-sans">
        <HazrSidebar
          userLocation={userLocation}
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
                <MapStateSync setViewState={setViewState} />

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
                        {/* Pulse ring for recent earthquakes */}
                        {Date.now() - eq.time.getTime() < 3600000 && (
                          <span
                            aria-hidden="true"
                            className="absolute size-8 rounded-full animate-ping"
                            style={{
                              backgroundColor: `${getMagnitudeColor(eq.magnitude)}30`,
                            }}
                          />
                        )}
                        {/* Main marker */}
                        <div
                          className="relative flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-lg transition-transform group-hover:scale-110"
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
                  userLocation={userLocation}
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
}: {
  setViewState: (s: MapViewState) => void;
}) {
  const { map } = useMap();

  React.useEffect(() => {
    if (!map) return;

    const handleMoveEnd = () => {
      const newState = {
        center: [map.getCenter().lng, map.getCenter().lat] as [number, number],
        zoom: map.getZoom(),
      };
      setViewState(newState);
      localStorage.setItem("map-view-state", JSON.stringify(newState));
    };

    map.on("moveend", handleMoveEnd);
    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [map, setViewState]);

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

    map.flyTo({
      center: [earthquake.coordinates[0], earthquake.coordinates[1]],
      zoom: 8,
      duration: 2000,
      curve: 1.42,
      essential: true,
    });
  }, [map, earthquake]);

  return null;
}

// Format relative time for display
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

// Earthquake detail popover
function EarthquakePopover({
  earthquake,
  onClose,
}: {
  earthquake: ProcessedEarthquake | null;
  onClose: () => void;
}) {
  if (!earthquake) return null;

  const magColor = getMagnitudeColor(earthquake.magnitude);
  const getMagnitudeLabel = (mag: number): string => {
    if (mag < 3) return "Minor";
    if (mag < 4) return "Light";
    if (mag < 5) return "Moderate";
    if (mag < 6) return "Strong";
    if (mag < 7) return "Major";
    return "Great";
  };

  return (
    <div className="absolute top-4 right-4 z-30 pointer-events-auto max-w-xs w-full">
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/95 shadow-xl supports-backdrop-filter:bg-background/85 supports-backdrop-filter:backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-border/30">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-lg"
            style={{
              backgroundColor: magColor,
              boxShadow: `0 4px 14px ${magColor}40`,
            }}
          >
            {earthquake.magnitude.toFixed(1)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {earthquake.place}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{getMagnitudeLabel(earthquake.magnitude)}</span>
              <span className="opacity-50">•</span>
              <span>{formatRelativeTime(earthquake.time)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Depth</p>
              <p className="text-sm font-medium">{earthquake.depth.toFixed(1)} km</p>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Time</p>
              <p className="text-sm font-medium">
                {earthquake.time.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {earthquake.tsunami && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-amber-600 dark:text-amber-400">
              <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-xs font-medium">Tsunami Warning</span>
            </div>
          )}

          {earthquake.alert && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border",
                earthquake.alert === "red" && "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
                earthquake.alert === "orange" && "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400",
                earthquake.alert === "yellow" && "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                earthquake.alert === "green" && "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
              )}
            >
              PAGER Alert: {earthquake.alert.charAt(0).toUpperCase() + earthquake.alert.slice(1)}
            </div>
          )}

          <a
            href={earthquake.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2.5 text-sm font-medium transition-colors"
          >
            View on USGS
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Footer with coordinates */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-muted-foreground/60">
            {earthquake.coordinates[1].toFixed(4)}°, {earthquake.coordinates[0].toFixed(4)}°
          </p>
        </div>
      </div>
    </div>
  );
}

function MapOverlayUI({
  setUserLocation,
  onLocateAnimation,
  userLocation,
  earthquakes,
  onEarthquakeSelect,
}: {
  setUserLocation: (l: [number, number]) => void;
  onLocateAnimation: () => void;
  userLocation: [number, number] | null;
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
      <div className="hidden md:flex p-2 md:p-4 pointer-events-auto z-20 [padding-top:calc(env(safe-area-inset-top)+0.5rem)]">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-10 rounded-2xl text-muted-foreground hover:bg-muted/70",
                    BAR_SURFACE_CLASS
                  )}
                  aria-label="Toggle sidebar"
                >
                  <Menu className="size-5" />
                </Button>
              </SidebarTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Menu</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Bottom Section: Controls */}
      <div className="pointer-events-auto p-4 flex flex-col gap-4 items-end sm:flex-row sm:justify-end sm:items-end w-full mt-auto">
        <div className="flex flex-col gap-4 items-end w-full sm:w-auto">
          <CustomMapControls
            setUserLocation={setUserLocation}
            onLocateAnimation={onLocateAnimation}
          />
        </div>
      </div>

      {/* Mobile Menu Drawer (left slide) */}
      <Drawer
        direction="left"
        open={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
      >
        <DrawerContent className="h-full w-[18.5rem] rounded-none rounded-r-2xl border-y-0 border-l-0 bg-sidebar text-sidebar-foreground supports-backdrop-filter:bg-sidebar/85 supports-backdrop-filter:backdrop-blur-xl">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20">
                  <Activity className="size-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none tracking-tight">
                    Hazr
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Live Quakes & Weather
                  </p>
                </div>
              </div>

              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-xl text-muted-foreground hover:bg-muted/70"
                  aria-label="Close menu"
                >
                  <X className="size-4" />
                </Button>
              </DrawerClose>
            </div>

            <div className="flex-1 overflow-auto py-2">
              <HazrMenuPanel onSelect={handleCloseMobileMenu} userLocation={userLocation} />
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
          <DrawerHeader className="border-b border-border/30 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/20">
                  <Activity className="size-5 text-white" />
                </div>
                <div>
                  <DrawerTitle>Live Earthquakes</DrawerTitle>
                  <p className="text-xs text-muted-foreground">{earthquakes.length} in the last 24h</p>
                </div>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon-sm" className="rounded-xl" aria-label="Close">
                  <X className="size-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="overflow-y-auto max-h-[60vh] p-2">
            {earthquakes.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent earthquakes
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {earthquakes.map((eq) => (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => handleQuakeClick(eq)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-muted/70"
                    aria-label={eq.title}
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg"
                      style={{
                        backgroundColor: getMagnitudeColor(eq.magnitude),
                        boxShadow: `0 4px 14px ${getMagnitudeColor(eq.magnitude)}40`,
                      }}
                    >
                      {eq.magnitude.toFixed(1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{eq.place}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getMagnitudeLabel(eq.magnitude)}</span>
                        <span className="opacity-50">•</span>
                        <span>{formatRelativeTime(eq.time)}</span>
                      </div>
                    </div>
                  </button>
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
          <DrawerHeader className="border-b border-border/30 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 shadow-lg shadow-sky-500/20">
                  <Cloud className="size-5 text-white" />
                </div>
                <DrawerTitle>Weather</DrawerTitle>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon-sm" className="rounded-xl" aria-label="Close">
                  <X className="size-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto max-h-[70vh]">
            <WeatherDock
              latitude={userLocation?.[1] ?? null}
              longitude={userLocation?.[0] ?? null}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden pointer-events-auto mx-2 mb-2 grid grid-cols-4 gap-1 rounded-2xl border border-border/60 bg-background/80 p-2 shadow-xl shadow-black/5 supports-backdrop-filter:bg-background/60 supports-backdrop-filter:backdrop-blur-xl [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)]">
        <BottomNavItem
          icon={MapIcon}
          label="Explore"
          active
        />
        <BottomNavItem
          icon={Activity}
          label="Quakes"
          onClick={() => setIsQuakesDrawerOpen(true)}
        />
        <BottomNavItem
          icon={Cloud}
          label="Weather"
          onClick={() => setIsWeatherDrawerOpen(true)}
        />
        <BottomNavItem
          icon={Menu}
          label="Menu"
          onClick={() => setIsMobileMenuOpen(true)}
        />
      </div>
    </div>
  );
}

function BottomNavItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-2xl bg-muted/70"
        />
      ) : null}
      <Icon className="size-6" />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
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

    const layerId = "3d-buildings";

    const handle3DBuildings = () => {
      if (is3D) {
        if (!map.getLayer(layerId)) {
          // Find building source - usually 'openmaptiles' or 'carto'
          const sources = map.getStyle().sources;
          const buildingSource = Object.keys(sources).find(
            (s) => s.includes("maptiles") || s.includes("carto"),
          );

          if (buildingSource) {
            map.addLayer(
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
              // Add below labels if possible
              map
                .getStyle()
                .layers.find((l) => l.type === "symbol")?.id,
            );
          }
        } else {
          map.setLayoutProperty(layerId, "visibility", "visible");
        }
      } else {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", "none");
        }
      }
    };

    if (map.isStyleLoaded()) {
      handle3DBuildings();
    } else {
      map.once("styledata", handle3DBuildings);
    }
  }, [map, is3D]);

  const handleZoomIn = () => map?.zoomTo(map.getZoom() + 1, { duration: 300 });
  const handleZoomOut = () => map?.zoomTo(map.getZoom() - 1, { duration: 300 });

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

  const handleResetBearing = () => map?.resetNorthPitch({ duration: 300 });
  const handleFullscreen = () => {
    const container = map?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen();
  };

  const toggle3D = () => {
    const new3D = !is3D;
    setIs3D(new3D);
    map?.easeTo({ pitch: new3D ? 60 : 0, duration: 300 });
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

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleFullscreen} label="Fullscreen">
                <Maximize className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>Fullscreen</TooltipContent>
          </Tooltip>
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
