"use client";

import * as React from "react";
import {
  Menu,
  Search,
  X,
  Plus,
  Minus,
  Locate,
  Map as MapIcon,
  Navigation,
  Utensils,
  Fuel,
  Hotel,
  Coffee,
  ShoppingBag,
  MoreHorizontal,
  Star,
  Clock,
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
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
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { NaeroMenuPanel } from "@/components/naero-menu-panel";
import { NaeroSidebar } from "@/components/naero-sidebar";

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

const CATEGORIES = [
  { label: "Restaurants", icon: Utensils },
  { label: "Gas", icon: Fuel },
  { label: "Coffee", icon: Coffee },
  { label: "Hotels", icon: Hotel },
  { label: "Shopping", icon: ShoppingBag },
  { label: "Groceries", icon: ShoppingBag },
  { label: "More", icon: MoreHorizontal },
];

const HIDDEN_SCROLLBAR_CLASS =
  "scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const BAR_SURFACE_CLASS =
  "rounded-2xl border border-border/60 bg-background/80 shadow-xl shadow-black/5 supports-backdrop-filter:bg-background/60 supports-backdrop-filter:backdrop-blur-xl";

const MOBILE_BAR_SURFACE_CLASS = cn(BAR_SURFACE_CLASS, "p-2");

type MapViewState = {
  center: [number, number];
  zoom: number;
};

export default function GoogleMapsClone() {
  const [searchValue, setSearchValue] = React.useState("");
  const [userLocation, setUserLocation] = React.useState<
    [number, number] | null
  >(null);
  const [isLocateAnimating, setIsLocateAnimating] = React.useState(false);
  const locateAnimationTimeoutRef = React.useRef<number | null>(null);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = React.useState(true);

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
        <NaeroSidebar />

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

                <MapOverlayUI
                  searchValue={searchValue}
                  setSearchValue={setSearchValue}
                  setUserLocation={setUserLocation}
                  onLocateAnimation={handleTriggerLocateAnimation}
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

function MapOverlayUI({
  searchValue,
  setSearchValue,
  setUserLocation,
  onLocateAnimation,
}: {
  searchValue: string;
  setSearchValue: (v: string) => void;
  setUserLocation: (l: [number, number]) => void;
  onLocateAnimation: () => void;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
  const mobileSearchInputRef = React.useRef<HTMLInputElement | null>(null);
  const handleCloseMobileMenu = () => setIsMobileMenuOpen(false);

  React.useEffect(() => {
    if (!isMobileSearchOpen) return;
    const id = window.setTimeout(() => {
      mobileSearchInputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(id);
  }, [isMobileSearchOpen]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
      {/* Top Section: Search & Filters */}
      <div className="flex flex-col gap-3 p-2 md:p-4 pointer-events-auto z-20 [padding-top:calc(env(safe-area-inset-top)+0.5rem)]">
        {/* Floating Search (Desktop) */}
        <div className="hidden md:block w-full md:max-w-xl">
          <InputGroup className={cn("h-12", BAR_SURFACE_CLASS)}>
            <InputGroupAddon align="inline-start" className="gap-1.5 pl-1.5">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:inline-flex size-10 rounded-2xl text-muted-foreground hover:bg-muted/70"
                        aria-label="Toggle sidebar"
                      >
                        <Menu className="size-5" />
                      </Button>
                    </SidebarTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Menu</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </InputGroupAddon>

            <InputGroupInput
              placeholder="Search Naero Maps"
              aria-label="Search Naero Maps"
              value={searchValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setSearchValue(event.target.value)
              }
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Escape") {
                  setSearchValue("");
                  return;
                }

                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              className="h-12 text-base"
            />

            <InputGroupAddon align="inline-end" className="gap-1 pr-1.5">
              {searchValue ? (
                <InputGroupButton
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Clear search"
                  onClick={() => setSearchValue("")}
                  className="rounded-2xl text-muted-foreground hover:bg-muted/70"
                >
                  <X className="size-4" />
                </InputGroupButton>
              ) : null}

              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InputGroupButton
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Search"
                      className="rounded-2xl text-muted-foreground hover:bg-muted/70"
                    >
                      <Search className="size-4" />
                    </InputGroupButton>
                  </TooltipTrigger>
                  <TooltipContent>Search</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* Filter Pills */}
        <div
          className={cn(
            "hidden md:flex w-full md:max-w-xl items-center gap-1.5 overflow-x-auto p-2",
            BAR_SURFACE_CLASS,
            HIDDEN_SCROLLBAR_CLASS,
          )}
        >
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.label}
              variant="ghost"
              size="sm"
              className="shrink-0 rounded-2xl px-3 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            >
              <cat.icon className="mr-2 size-4" />
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Bottom Section: Controls & Info */}
      <div className="pointer-events-auto p-4 flex flex-col gap-4 items-end sm:flex-row sm:justify-end sm:items-end w-full mt-auto">
        {/* Bottom Right: Map Controls */}
        <div className="flex flex-col gap-4 items-end w-full sm:w-auto">
          <CustomMapControls
            setUserLocation={setUserLocation}
            onLocateAnimation={onLocateAnimation}
          />
        </div>
      </div>

      {/* Mobile Filter Pills + Floating Search */}
      <div className="md:hidden pointer-events-auto mx-2 mb-2 flex flex-col gap-2">
        <div
          className={cn(
            MOBILE_BAR_SURFACE_CLASS,
            "flex overflow-x-auto px-2 py-1.5",
            HIDDEN_SCROLLBAR_CLASS,
          )}
        >
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.label}
              variant="ghost"
              size="sm"
              className="shrink-0 rounded-2xl px-3 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            >
              <cat.icon className="mr-2 size-4" />
              {cat.label}
            </Button>
          ))}
        </div>

        <div
          className={cn(MOBILE_BAR_SURFACE_CLASS, "flex items-center gap-2")}
        >
          <Drawer
            direction="left"
            open={isMobileMenuOpen}
            onOpenChange={setIsMobileMenuOpen}
          >
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-10 rounded-2xl text-muted-foreground hover:bg-muted/70"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </DrawerTrigger>

            <DrawerContent className="h-full w-[18.5rem] rounded-none rounded-r-2xl border-y-0 border-l-0 bg-sidebar text-sidebar-foreground supports-backdrop-filter:bg-sidebar/85 supports-backdrop-filter:backdrop-blur-xl">
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 border-b px-3 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                      <MapIcon className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none tracking-tight">
                        Naero Maps
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Explore • Save • Plan
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
                  <NaeroMenuPanel onSelect={handleCloseMobileMenu} />
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          <Drawer
            direction="bottom"
            open={isMobileSearchOpen}
            onOpenChange={setIsMobileSearchOpen}
          >
            <DrawerTrigger asChild>
              <button
                type="button"
                aria-label="Open search"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Search className="size-4 shrink-0" />
                <span className="truncate">
                  {searchValue ? searchValue : "Search Naero Maps"}
                </span>
              </button>
            </DrawerTrigger>

            {searchValue ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Clear search"
                className="rounded-2xl text-muted-foreground hover:bg-muted/70"
                onClick={() => setSearchValue("")}
              >
                <X className="size-4" />
              </Button>
            ) : null}

            <DrawerContent className="px-2 pb-2">
              <DrawerHeader className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <DrawerTitle>Search</DrawerTitle>
                  <DrawerClose asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-xl text-muted-foreground hover:bg-muted/70"
                      aria-label="Close search"
                    >
                      <X className="size-4" />
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>

              <div className="px-4 pb-4 [padding-bottom:calc(env(safe-area-inset-bottom)+1rem)]">
                <InputGroup className={cn("h-12", BAR_SURFACE_CLASS)}>
                  <InputGroupAddon
                    align="inline-start"
                    className="gap-1.5 pl-1.5"
                  >
                    <InputGroupButton
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Search"
                      className="rounded-2xl text-muted-foreground hover:bg-muted/70"
                    >
                      <Search className="size-4" />
                    </InputGroupButton>
                  </InputGroupAddon>

                  <InputGroupInput
                    ref={mobileSearchInputRef}
                    placeholder="Search Naero Maps"
                    aria-label="Search Naero Maps"
                    value={searchValue}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchValue(event.target.value)
                    }
                    onKeyDown={(
                      event: React.KeyboardEvent<HTMLInputElement>,
                    ) => {
                      if (event.key === "Escape") {
                        setIsMobileSearchOpen(false);
                        return;
                      }

                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                    className="h-12 text-base"
                  />

                  <InputGroupAddon align="inline-end" className="gap-1 pr-1.5">
                    {searchValue ? (
                      <InputGroupButton
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Clear search"
                        onClick={() => setSearchValue("")}
                        className="rounded-2xl text-muted-foreground hover:bg-muted/70"
                      >
                        <X className="size-4" />
                      </InputGroupButton>
                    ) : null}
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden pointer-events-auto mx-2 mb-2 grid grid-cols-5 gap-1 rounded-2xl border border-border/60 bg-background/80 p-2 shadow-xl shadow-black/5 supports-backdrop-filter:bg-background/60 supports-backdrop-filter:backdrop-blur-xl [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)]">
        <BottomNavItem icon={MapIcon} label="Explore" active />
        <BottomNavItem icon={Star} label="Saved" />
        <BottomNavItem icon={Navigation} label="Go" />
        <BottomNavItem icon={Plus} label="Contribute" />
        <BottomNavItem icon={Clock} label="Updates" />
      </div>
    </div>
  );
}

function BottomNavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
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

const ControlButton = React.forwardRef<
  HTMLButtonElement,
  {
    onClick: () => void;
    label: string;
    children: React.ReactNode;
    disabled?: boolean;
    active?: boolean;
  }
>(function ControlButton(
  { onClick, label, children, disabled = false, active = false },
  ref,
) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={label}
      type="button"
      className={cn(
        "flex items-center justify-center size-8 transition-colors",
        active
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "hover:bg-accent hover:text-accent-foreground text-foreground",
        disabled && "opacity-50 pointer-events-none cursor-not-allowed",
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
});

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
            zoom: 15,
            duration: 1800,
            curve: 1.6,
            speed: 1.25,
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
            <TooltipContent side="left">Theme</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={toggle3D} label="Toggle 3D" active={is3D}>
                <Box className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left">Toggle 3D</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleFullscreen} label="Fullscreen">
                <Maximize className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left">Fullscreen</TooltipContent>
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
            <TooltipContent side="left">Reset North</TooltipContent>
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
            <TooltipContent side="left">Your location</TooltipContent>
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
            <TooltipContent side="left">Zoom In</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleZoomOut} label="Zoom Out">
                <Minus className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom Out</TooltipContent>
          </Tooltip>
        </ControlGroup>
      </div>
    </TooltipProvider>
  );
}
