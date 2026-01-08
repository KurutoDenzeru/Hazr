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

import { Map, useMap, MapMarker, MarkerContent } from "@/components/ui/map"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
import { cn } from "@/lib/utils"

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

export default function GoogleMapsClone() {
  const [searchValue, setSearchValue] = React.useState("")
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null)
  
  const [viewState, setViewState] = React.useState<{ center: [number, number]; zoom: number }>(() => {
    if (typeof window === "undefined") return { center: [-122.4194, 37.7749], zoom: 12 };
    const saved = localStorage.getItem("map-view-state");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return { center: getInitialLocation(), zoom: 12 };
  });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <Map
        center={viewState.center}
        zoom={viewState.zoom}
        scrollZoom={true} // Explicitly ensure scroll zoom is enabled
      >
        <MapStateSync setViewState={setViewState} />
        
        {userLocation && (
          <MapMarker longitude={userLocation[0]} latitude={userLocation[1]}>
            <MarkerContent>
              <div className="relative flex items-center justify-center pointer-events-none">
                {/* Outer pulsing ring */}
                <span className="absolute size-10 rounded-full bg-blue-500/30 animate-ping shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                {/* Smaller fixed pulse */}
                <span className="absolute size-6 rounded-full bg-blue-500/20" />
                {/* Inner white border */}
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
      </Map>
    </div>
  )
}

function MapStateSync({ setViewState }: { setViewState: (s: any) => void }) {
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
  setUserLocation
}: { 
  searchValue: string, 
  setSearchValue: (v: string) => void,
  setUserLocation: (l: [number, number]) => void
}) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
      {/* Top Section: Search & Filters */}
      <div className="flex flex-col gap-3 p-2 md:p-4 pointer-events-auto z-10">
        
        {/* Search Bar Container */}
        <div className="relative w-full md:w-100 flex items-center bg-background rounded-2xl shadow-md border border-border/50 transition-all focus-within:shadow-lg focus-within:ring-1 focus-within:ring-ring">
          
          <Drawer direction="left">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <DrawerTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full shrink-0 ml-1 h-10 w-10 text-muted-foreground hover:bg-muted" aria-label="Menu">
                      <Menu className="size-5" />
                    </Button>
                  </TooltipTrigger>
                </DrawerTrigger>
                <TooltipContent side="bottom">Menu</TooltipContent>
                <DrawerContent className="h-full w-75 rounded-none rounded-r-xl border-y-0 border-l-0">
                  <DrawerHeader className="border-b">
                    <DrawerTitle className="flex items-center gap-2">
                       <MapIcon className="size-5 text-primary" />
                       Naero Maps
                    </DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4 flex flex-col gap-2">
                     <Button variant="ghost" className="justify-start gap-3 rounded-xl"><Star className="size-4" /> Your places</Button>
                     <Button variant="ghost" className="justify-start gap-3 rounded-xl"><Clock className="size-4" /> Your timeline</Button>
                     <Button variant="ghost" className="justify-start gap-3 rounded-xl"><Navigation className="size-4" /> Your contributions</Button>
                     <Separator className="my-2" />
                     <Button variant="ghost" className="justify-start gap-3 rounded-xl">Settings</Button>
                     <Button variant="ghost" className="justify-start gap-3 rounded-xl">Help & Feedback</Button>
                  </div>
                </DrawerContent>
              </Tooltip>
            </TooltipProvider>
          </Drawer>

          <Input 
            className="border-0 shadow-none focus-visible:ring-0 px-2 h-12 text-base placeholder:text-muted-foreground"
            placeholder="Search Naero Maps"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />

          <div className="flex items-center gap-1 pr-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:bg-muted" aria-label="Search">
                    <Search className="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {searchValue && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSearchValue("")}
                className="rounded-full h-10 w-10 text-muted-foreground hover:bg-muted" 
                aria-label="Clear"
              >
                <X className="size-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:w-auto w-screen -mx-2 px-2 md:m-0 md:p-0">
          {CATEGORIES.map((cat) => (
            <Button 
              key={cat.label} 
              variant="secondary" 
              className="rounded-full bg-background shadow-sm border hover:bg-muted/80 shrink-0 h-8 px-4 text-sm font-normal"
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
      <div className="md:hidden bg-background border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] grid grid-cols-5 p-2 pb-6 pointer-events-auto">
         <BottomNavItem icon={MapIcon} label="Explore" active />
         <BottomNavItem icon={Star} label="Saved" />
         <BottomNavItem icon={Navigation} label="Go" />
         <BottomNavItem icon={Plus} label="Contribute" />
         <BottomNavItem icon={Clock} label="Updates" />
      </div>

    </div>
  )
}

function BottomNavItem({ icon: Icon, label, active }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 p-1 rounded-full", active ? "text-blue-600" : "text-muted-foreground")}>
      <Icon className={cn("size-6", active && "fill-current")} />
      <span className="text-[10px] font-medium">{label}</span>
    </div>
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
  const { theme, setTheme } = useTheme()
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

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  return (
    <div className="flex flex-col gap-2 items-end">
       
       {/* Utility Controls (Theme, 3D, Fullscreen) */}
       <ControlGroup>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <ControlButton onClick={toggleTheme} label="Toggle theme">
                  {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
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


