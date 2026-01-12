"use client"

import * as React from "react"
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
  Loader2
} from "lucide-react"

import { Map as MapComponent, useMap, MapMarker, MarkerContent } from "@/components/ui/map"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useTheme } from "next-themes"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { NaeroMenuPanel } from "@/components/naero-menu-panel"
import { NaeroSidebar } from "@/components/naero-sidebar"

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
]

type MapViewState = {
  center: [number, number]
  zoom: number
}

export default function GoogleMapsClone() {
  const [searchValue, setSearchValue] = React.useState("")
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = React.useState(true)

  const [viewState, setViewState] = React.useState<MapViewState>(() => {
    if (typeof window === "undefined") return { center: [-122.4194, 37.7749], zoom: 12 };
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
    <SidebarProvider open={isDesktopSidebarOpen} onOpenChange={setIsDesktopSidebarOpen}>
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
                  <MapMarker longitude={userLocation[0]} latitude={userLocation[1]}>
                    <MarkerContent>
                      <div className="relative flex items-center justify-center pointer-events-none">
                        <span className="absolute size-10 rounded-full bg-blue-500/30 animate-ping shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                        <span className="absolute size-6 rounded-full bg-blue-500/20" />
                        <div className="relative size-4 rounded-full bg-blue-600 border-2 border-white shadow-lg" />
                      </div>
                    </MarkerContent>
                  </MapMarker>
                )}

                <MapOverlayUI
                  searchValue={searchValue}
                  setSearchValue={setSearchValue}
                  setUserLocation={setUserLocation}
                />
              </MapComponent>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

function MapStateSync({ setViewState }: { setViewState: (s: MapViewState) => void }) {
  const { map } = useMap()

  React.useEffect(() => {
    if (!map) return

    const handleMoveEnd = () => {
      const newState = {
        center: [map.getCenter().lng, map.getCenter().lat] as [number, number],
        zoom: map.getZoom()
      }
      setViewState(newState)
      localStorage.setItem("map-view-state", JSON.stringify(newState))
    }

    map.on("moveend", handleMoveEnd)
    return () => {
      map.off("moveend", handleMoveEnd)
    }
  }, [map, setViewState])

  return null
}

function MapOverlayUI({
  searchValue,
  setSearchValue,
  setUserLocation,
}: {
  searchValue: string,
  setSearchValue: (v: string) => void,
  setUserLocation: (l: [number, number]) => void
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const handleCloseMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
      {/* Top Section: Search & Filters */}
      <div className="flex flex-col gap-3 p-2 md:p-4 pointer-events-auto z-20 [padding-top:calc(env(safe-area-inset-top)+0.5rem)]">
        {/* Floating Search */}
        <div className="w-full md:max-w-xl">
          <InputGroup className="h-12 rounded-2xl border-border/60 bg-background/85 shadow-xl shadow-black/5 supports-backdrop-filter:bg-background/75 supports-backdrop-filter:backdrop-blur-xl">
            <InputGroupAddon align="inline-start" className="gap-1.5 pl-1.5">
              {/* Desktop: toggle icon-rail sidebar */}
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:inline-flex size-10 rounded-xl text-muted-foreground hover:bg-muted"
                        aria-label="Toggle sidebar"
                      >
                        <Menu className="size-5" />
                      </Button>
                    </SidebarTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Menu</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Mobile: open drawer menu */}
              <Drawer direction="left" open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <DrawerTrigger asChild>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="md:hidden size-10 rounded-xl text-muted-foreground hover:bg-muted"
                          aria-label="Open menu"
                        >
                          <Menu className="size-5" />
                        </Button>
                      </TooltipTrigger>
                    </DrawerTrigger>
                    <TooltipContent side="bottom">Menu</TooltipContent>
                    <DrawerContent className="h-full w-[18.5rem] rounded-none rounded-r-2xl border-y-0 border-l-0">
                      <DrawerHeader className="border-b">
                        <DrawerTitle className="flex items-center gap-2">
                          <MapIcon className="size-5 text-primary" />
                          Naero Maps
                        </DrawerTitle>
                      </DrawerHeader>
                      <NaeroMenuPanel onSelect={handleCloseMobileMenu} />
                    </DrawerContent>
                  </Tooltip>
                </TooltipProvider>
              </Drawer>

              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
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
                  setSearchValue("")
                  return
                }

                if (event.key === "Enter") {
                  event.currentTarget.blur()
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
                  className="rounded-xl text-muted-foreground hover:bg-muted"
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
                      className="rounded-xl text-muted-foreground hover:bg-muted"
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
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide w-screen -mx-2 px-2 md:w-auto md:mx-0 md:px-0">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.label}
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full border-border/60 bg-background/80 shadow-sm shadow-black/5 hover:bg-muted/70 supports-backdrop-filter:bg-background/70 supports-backdrop-filter:backdrop-blur-xl"
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
          <CustomMapControls setUserLocation={setUserLocation} />
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
  )
}

function BottomNavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
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
          : "text-muted-foreground hover:text-foreground"
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
  )
}

function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-md border border-border bg-background shadow-sm overflow-hidden [&>button:not(:last-child)]:border-b [&>button:not(:last-child)]:border-border">
      {children}
    </div>
  )
}

function ControlButton({
  onClick,
  label,
  children,
  disabled = false,
  active = false
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      type="button"
      className={cn(
        "flex items-center justify-center size-8 transition-colors",
        active ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent hover:text-accent-foreground text-foreground",
        disabled && "opacity-50 pointer-events-none cursor-not-allowed"
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function CustomMapControls({
  setUserLocation
}: {
  setUserLocation: (l: [number, number]) => void
}) {
  const { map } = useMap()
  const { resolvedTheme, setTheme } = useTheme()
  const [is3D, setIs3D] = React.useState(false)
  const [waitingForLocation, setWaitingForLocation] = React.useState(false)
  const compassRef = React.useRef<SVGSVGElement>(null)

  // Sync compass rotation
  React.useEffect(() => {
    if (!map) return

    const updateRotation = () => {
      if (!compassRef.current) return
      const bearing = map.getBearing()
      const pitch = map.getPitch()
      compassRef.current.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`
    }

    map.on("rotate", updateRotation)
    map.on("pitch", updateRotation)
    updateRotation()
    return () => {
      map.off("rotate", updateRotation)
      map.off("pitch", updateRotation)
    }
  }, [map])

  const handleZoomIn = () => map?.zoomTo(map.getZoom() + 1, { duration: 300 })
  const handleZoomOut = () => map?.zoomTo(map.getZoom() - 1, { duration: 300 })

  const handleLocate = () => {
    if (navigator.geolocation && map) {
      setWaitingForLocation(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude]
          setUserLocation(coords)
          map.flyTo({
            center: coords,
            zoom: 14,
            duration: 1500
          });
          setWaitingForLocation(false)
        },
        () => setWaitingForLocation(false)
      );
    }
  }

  const handleResetBearing = () => map?.resetNorthPitch({ duration: 300 })
  const handleFullscreen = () => {
    const container = map?.getContainer()
    if (!container) return
    if (document.fullscreenElement) document.exitFullscreen()
    else container.requestFullscreen()
  }

  const toggle3D = () => {
    const new3D = !is3D
    setIs3D(new3D)
    map?.easeTo({ pitch: new3D ? 60 : 0, duration: 300 })
  }

  const toggleTheme = () => {
    const current = resolvedTheme ?? "light"
    setTheme(current === "dark" ? "light" : "dark")
  }

  return (
    <div className="flex flex-col gap-2 items-end">

      {/* Utility Controls (Theme, 3D, Fullscreen) */}
      <ControlGroup>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={toggleTheme} label="Toggle theme">
                {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left">Theme</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={toggle3D} label="Toggle 3D" active={is3D}>
                <Box className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left">Toggle 3D</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleFullscreen} label="Fullscreen">
                <Maximize className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left">Fullscreen</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ControlGroup>

      {/* Compass/Locate */}
      <ControlGroup>
        <TooltipProvider delayDuration={0}>
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
                  <path d="M12 22L16 12H12V22Z" className="fill-muted-foreground/60" />
                  <path d="M12 22L8 12H12V22Z" className="fill-muted-foreground/30" />
                </svg>
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left">Reset North</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleLocate} label="Find my location" disabled={waitingForLocation}>
                {waitingForLocation ? <Loader2 className="size-4 animate-spin" /> : <Locate className="size-4" />}
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left">Your location</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ControlGroup>

      {/* Zoom Controls Group */}
      <ControlGroup>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleZoomIn} label="Zoom In">
                <Plus className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom In</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <ControlButton onClick={handleZoomOut} label="Zoom Out">
                <Minus className="size-4" />
              </ControlButton>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom Out</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ControlGroup>
    </div>
  )
}
