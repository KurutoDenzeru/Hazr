"use client";

import * as React from "react";
import {
  Menu,
  Locate,
  Activity,
  Cloud,
  Loader2,
  Globe2,
  
  
  X,
   Map, Maximize, Minus, Moon, Plus, SlidersHorizontal, Sun,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
type ControlButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "children" | "aria-label"
> & {
  label: string;
  children: React.ReactNode;
  active?: boolean;
};
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { useMap } from "@/components/ui/map";
import { useTheme } from "next-themes";
import type { LayerVisibility } from "@/components/map/openstreet-map-helpers";
import { useIsMobile } from "@/hooks/use-responsive";
import { toast } from "sonner";
import { getLocationErrorMessage, requestCurrentCoordinates } from "@/lib/browser-geolocation";
import { EarthquakeItem } from "@/components/hazr-earthquake-item";
import { HourlyForecastDock } from "@/components/map/hourly-forecast-dock";
import { WeatherDock } from "@/components/map/weather-dock";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { GlobalActivity } from "@/components/global-activity";
import { HazrSettingsPanel } from "@/components/hazr-settings-panel";
import { HazrAboutContent } from "@/components/hazr-about-dialog";
import type {
  ProcessedAirQualitySite,
  ProcessedEarthquake,
  ProcessedEonetEvent,
  ProcessedTsunamiAlert,
} from "@/types/api";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { AppSettings } from "@/types/settings";
import { useMap3DMode } from "@/hooks/use-map-3d-mode";
import { MapLayersControl } from "@/components/map/controls/map-layers-control";
import { MapCameraDock } from "@/components/map/controls/map-camera-dock";
import {
  getPaginationRange,
} from "@/components/map/openstreet-map-helpers";

// Note: I will copy the text for MapOverlayUI, CustomMapControls, ControlButton, ControlGroup, MobileDrawerHeader into this file.
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

function MobileDrawerHeader({
  icon: Icon,
  title,
  description,
  iconToneClassName,
  onClose,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  iconToneClassName: string;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-border/60 px-4 pb-3 pt-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md border border-white/20",
              iconToneClassName,
            )}
          >
            <Icon className="size-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="shrink-0 rounded-md border border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={onClose}
          aria-label={`Close ${title} drawer`}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function MapOverlayUI({
  setUserLocation,
  onLocateAnimation,
  resolvedLocation,
  earthquakes,
  onEarthquakeSelect,
  onEonetSelect,
  onAirQualitySelect,
  onTsunamiSelect,
  appSettings,
  onAppSettingsChange,
  onResetDefaults,
  eonetState,
  airQualityState,
  tsunamiState,
  layerVisibility,
  onLayerVisibilityChange,
}: {
  setUserLocation: (l: [number, number]) => void;
  onLocateAnimation: () => void;
  resolvedLocation: [number, number] | null;
  earthquakes: ProcessedEarthquake[];
  onEarthquakeSelect: (eq: ProcessedEarthquake) => void;
  onEonetSelect: (event: ProcessedEonetEvent) => void;
  onAirQualitySelect: (site: ProcessedAirQualitySite) => void;
  onTsunamiSelect: (alert: ProcessedTsunamiAlert) => void;
  appSettings: AppSettings;
  onAppSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
  onResetDefaults: () => void;
  eonetState: {
    events: ProcessedEonetEvent[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: Date | null;
    refetch: () => Promise<void>;
  };
  airQualityState: {
    sites: ProcessedAirQualitySite[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: Date | null;
    refetch: () => Promise<void>;
  };
  tsunamiState: {
    alerts: ProcessedTsunamiAlert[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: Date | null;
    refetch: () => Promise<void>;
  };
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: React.Dispatch<React.SetStateAction<LayerVisibility>>;
}) {
  const [activeMobileDrawer, setActiveMobileDrawer] = React.useState<"menu" | "quakes" | "weather" | "global" | null>(null);
  const [isMap3DMode, setIsMap3DMode] = React.useState(false);
  const [isMapGlobeMode, setIsMapGlobeMode] = React.useState(false);
  const { is3D, toggle3D, isGlobe, toggleGlobe } = useMap3DMode(setIsMap3DMode, setIsMapGlobeMode);
  const isMobile = useIsMobile();
  const [quakePage, setQuakePage] = React.useState(1);
  const quakePageSize = 8;
  const totalQuakePages = Math.max(1, Math.ceil(earthquakes.length / quakePageSize));
  const paginatedEarthquakes = React.useMemo(() => {
    const startIndex = (quakePage - 1) * quakePageSize;
    return earthquakes.slice(startIndex, startIndex + quakePageSize);
  }, [earthquakes, quakePage]);
  const quakePaginationRange = React.useMemo(
    () => getPaginationRange(totalQuakePages, quakePage),
    [quakePage, totalQuakePages]
  );

  React.useEffect(() => {
    setQuakePage(1);
  }, [earthquakes]);

  React.useEffect(() => {
    if (isMobile) return;
    setActiveMobileDrawer(null);
  }, [isMobile]);

  const activateDrawer = React.useCallback((drawer: "menu" | "quakes" | "weather" | "global") => {
    setActiveMobileDrawer(drawer);
  }, []);

  const closeDrawer = React.useCallback(() => {
    setActiveMobileDrawer(null);
  }, []);

  const handleQuakeClick = (eq: ProcessedEarthquake) => {
    closeDrawer();
    onEarthquakeSelect(eq);
  };

  const handlePreviousQuakePage = () => {
    setQuakePage((page) => Math.max(1, page - 1));
  };

  const handleNextQuakePage = () => {
    setQuakePage((page) => Math.min(totalQuakePages, page + 1));
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pointer-events-auto absolute top-[calc(env(safe-area-inset-top)+1rem)] sm:top-4 left-3 sm:left-4 z-10">
        <MapCameraDock is3DModeEnabled={isMap3DMode || isMapGlobeMode} />
      </div>

      <div className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:bottom-4 left-3 sm:left-4 z-20">
        <MapLayersControl 
          appSettings={appSettings} 
          onAppSettingsChange={onAppSettingsChange} 
          is3D={is3D} 
          toggle3D={toggle3D} 
          isGlobe={isGlobe}
          toggleGlobe={toggleGlobe}
        />
      </div>

      <div className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:bottom-4 right-3 sm:right-4 z-10">
        <CustomMapControls
          setUserLocation={setUserLocation}
          onLocateAnimation={onLocateAnimation}
          layerVisibility={layerVisibility}
          onLayerVisibilityChange={onLayerVisibilityChange}
        />
      </div>

      {appSettings.showDesktopForecastDock ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 hidden md:flex justify-center z-10">
          <div className="pointer-events-auto">
            <HourlyForecastDock
              latitude={resolvedLocation?.[1] ?? null}
              longitude={resolvedLocation?.[0] ?? null}
              temperatureUnit={appSettings.temperatureUnit}
              timeFormat={appSettings.timeFormat}
            />
          </div>
        </div>
      ) : null}

      <Drawer
        open={activeMobileDrawer !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeDrawer();
          }
        }}
      >
        <DrawerContent className="h-[88dvh] max-h-[88dvh] min-h-0 rounded-t-2xl border-t border-border/70 p-0">
          <div className="flex h-full min-h-0 flex-col">
            {activeMobileDrawer === "menu" ? (
              <>
                <MobileDrawerHeader
                  icon={SlidersHorizontal}
                  iconToneClassName="bg-slate-500"
                  title="Menu"
                  description="Settings and layer controls"
                  onClose={closeDrawer}
                />
                <div
                  data-vaul-no-drag
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3"
                >
                  <div className="rounded-md border border-border/60 bg-muted/15 p-3">
                    <HazrSettingsPanel
                      settings={appSettings}
                      onSettingsChange={onAppSettingsChange}
                      layerVisibility={layerVisibility}
                      onLayerVisibilityChange={onLayerVisibilityChange}
                      onResetDefaults={onResetDefaults}
                      showInlineReset
                    />
                  </div>
                  <div className="mt-3 rounded-md border border-border/60 bg-muted/15 p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center justify-center rounded-md bg-blue-500/15 text-white">
                        <Map className="size-5" />
                      </span>
                      <h3 className="text-sm font-semibold">About Hazr</h3>
                    </div>
                    <HazrAboutContent />
                  </div>
                </div>
              </>
            ) : null}

            {activeMobileDrawer === "quakes" ? (
              <>
                <MobileDrawerHeader
                  icon={Activity}
                  iconToneClassName="bg-red-500"
                  title="Live Earthquakes"
                  description={`${earthquakes.length} in the last 24h`}
                  onClose={closeDrawer}
                />
                <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
                  {!layerVisibility.earthquakes ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-border/60 bg-muted/15 px-3 py-6 text-center text-sm text-muted-foreground">
                      USGS earthquakes are hidden in settings.
                    </div>
                  ) : earthquakes.length === 0 ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-border/60 bg-muted/15 px-3 py-6 text-center text-sm text-muted-foreground">
                      No recent earthquakes
                    </div>
                  ) : (
                    <>
                      <div
                        data-vaul-no-drag
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md border border-border/60 bg-muted/15 p-1.5"
                      >
                        <div className="flex flex-col gap-1">
                          {paginatedEarthquakes.map((eq) => (
                            <EarthquakeItem
                              key={eq.id}
                              earthquake={eq}
                              onClick={() => handleQuakeClick(eq)}
                            />
                          ))}
                        </div>
                      </div>
                      {totalQuakePages > 1 ? (
                        <Pagination className="mt-2">
                          <PaginationContent className="hidden sm:flex">
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={handlePreviousQuakePage}
                                disabled={quakePage === 1}
                                aria-disabled={quakePage === 1}
                              />
                            </PaginationItem>
                            {quakePaginationRange.map((entry, index) => (
                              <PaginationItem key={`mobile-quake-page-${entry}-${index}`}>
                                {entry === "ellipsis" ? (
                                  <PaginationEllipsis />
                                ) : (
                                  <PaginationButton
                                    onClick={() => setQuakePage(entry)}
                                    isActive={entry === quakePage}
                                    aria-label={`Go to quake page ${entry}`}
                                  >
                                    {entry}
                                  </PaginationButton>
                                )}
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={handleNextQuakePage}
                                disabled={quakePage === totalQuakePages}
                                aria-disabled={quakePage === totalQuakePages}
                              />
                            </PaginationItem>
                          </PaginationContent>
                          <PaginationContent className="flex w-full items-center justify-between gap-2 px-1 sm:hidden">
                            <PaginationItem>
                              <PaginationButton
                                size="sm"
                                className="px-2.5"
                                onClick={handlePreviousQuakePage}
                                disabled={quakePage === 1}
                                aria-disabled={quakePage === 1}
                                aria-label="Go to previous quake page"
                              >
                                Prev
                              </PaginationButton>
                            </PaginationItem>
                            <PaginationItem className="min-w-0 flex-1 text-center">
                              <span className="text-xs text-muted-foreground">
                                {quakePage}/{totalQuakePages}
                              </span>
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationButton
                                size="sm"
                                className="px-2.5"
                                onClick={handleNextQuakePage}
                                disabled={quakePage === totalQuakePages}
                                aria-disabled={quakePage === totalQuakePages}
                                aria-label="Go to next quake page"
                              >
                                Next
                              </PaginationButton>
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      ) : null}
                    </>
                  )}
                </div>
              </>
            ) : null}

            {activeMobileDrawer === "global" ? (
              <>
                <MobileDrawerHeader
                  icon={Globe2}
                  iconToneClassName="bg-amber-500"
                  title="Global Signals"
                  description="NASA EONET, OpenAQ, and NWS Tsunami alerts"
                  onClose={closeDrawer}
                />
                <div
                  data-vaul-no-drag
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3"
                >
                  <div className="min-w-0 rounded-md border border-border/60 bg-muted/15 p-2">
                    {!layerVisibility.eonet &&
                    !layerVisibility.airQuality &&
                    !layerVisibility.tsunami ? (
                      <div className="rounded-md border border-border/60 bg-background/70 px-3 py-6 text-center text-sm text-muted-foreground">
                        Global sources are hidden in settings.
                      </div>
                    ) : (
                      <GlobalActivity
                        collapsed={false}
                        visibility={{
                          eonet: layerVisibility.eonet,
                          airQuality: layerVisibility.airQuality,
                          tsunami: layerVisibility.tsunami,
                        }}
                        eonetState={eonetState}
                        airQualityState={airQualityState}
                        tsunamiState={tsunamiState}
                        onEonetSelect={(event) => {
                          closeDrawer();
                          onEonetSelect(event);
                        }}
                        onAirQualitySelect={(site) => {
                          closeDrawer();
                          onAirQualitySelect(site);
                        }}
                        onTsunamiSelect={(alert) => {
                          closeDrawer();
                          onTsunamiSelect(alert);
                        }}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {activeMobileDrawer === "weather" ? (
              <>
                <MobileDrawerHeader
                  icon={Cloud}
                  iconToneClassName="bg-sky-500"
                  title="Weather"
                  description="Local conditions and hourly outlook"
                  onClose={closeDrawer}
                />
                <div
                  data-vaul-no-drag
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3"
                >
                  <div className="min-w-0 space-y-3 rounded-md border border-border/60 bg-muted/15 p-2">
                  <WeatherDock
                    latitude={resolvedLocation?.[1] ?? null}
                    longitude={resolvedLocation?.[0] ?? null}
                    temperatureUnit={appSettings.temperatureUnit}
                    timeFormat={appSettings.timeFormat}
                    unstyled
                  />
                  <HourlyForecastDock
                    latitude={resolvedLocation?.[1] ?? null}
                    longitude={resolvedLocation?.[0] ?? null}
                    temperatureUnit={appSettings.temperatureUnit}
                    timeFormat={appSettings.timeFormat}
                    className="md:hidden"
                    compact
                  />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>

      <div className="absolute inset-x-0 bottom-0 pointer-events-none z-50 flex flex-col justify-end pb-safe">
        <MobileBottomNav
          items={[
            {
              icon: Activity,
              label: "Quakes",
              active: activeMobileDrawer === "quakes",
              onClick: () => activateDrawer("quakes"),
            },
            {
              icon: Cloud,
              label: "Weather",
              active: activeMobileDrawer === "weather",
              onClick: () => activateDrawer("weather"),
            },
            {
              icon: Globe2,
              label: "Global Meteo",
              active: activeMobileDrawer === "global",
              onClick: () => activateDrawer("global"),
            },
            {
              icon: Menu,
              label: "Menu",
              active: activeMobileDrawer === "menu",
              onClick: () => activateDrawer("menu"),
            },
          ]}
        />
      </div>
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
  const [waitingForLocation, setWaitingForLocation] = React.useState(false);
  const [locationFeedbackMessage, setLocationFeedbackMessage] = React.useState<string | null>(null);
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

  const handleLocate = async () => {
    if (waitingForLocation) return;
    if (!map) return;

    setWaitingForLocation(true);
    setLocationFeedbackMessage(null);

    try {
      const position = await requestCurrentCoordinates();
      const coords: [number, number] = [position.longitude, position.latitude];
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
    } catch (error) {
      const message = getLocationErrorMessage(error);
      setLocationFeedbackMessage(message);
      if (typeof window !== "undefined") {
        toast.error(message, { duration: 6000 });
      }
    } finally {
      setWaitingForLocation(false);
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
                onPointerDown={() => handleLocate()}
                onTouchStart={() => handleLocate()}
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
            <TooltipContent side="left" sideOffset={8}>
              {locationFeedbackMessage ?? "Your location"}
            </TooltipContent>
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

