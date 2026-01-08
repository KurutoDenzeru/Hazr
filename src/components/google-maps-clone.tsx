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
  Compass,
  Maximize
} from "lucide-react"

import { Map, useMap } from "@/components/ui/map"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
      >
        <MapStateSync setViewState={setViewState} />
        <MapOverlayUI 
          searchValue={searchValue} 
          setSearchValue={setSearchValue} 
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
  setSearchValue 
}: { 
  searchValue: string, 
  setSearchValue: (v: string) => void 
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
            placeholder="Search Google Maps"
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
          <CustomMapControls />
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

function CustomMapControls() {
  const { map } = useMap()

  const handleZoomIn = () => {
    map?.zoomIn({ duration: 300 })
  }

  const handleZoomOut = () => {
    map?.zoomOut({ duration: 300 })
  }

  const handleLocate = () => {
    if (navigator.geolocation && map) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                map.flyTo({
                    center: [position.coords.longitude, position.coords.latitude],
                    zoom: 14,
                    duration: 1500
                });
            }
        );
    }
  }

  const handleResetBearing = () => {
    map?.resetNorthPitch({ duration: 300 })
  }

  const handleFullscreen = () => {
    const container = map?.getContainer()
    if (!container) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }

  return (
    <div className="flex flex-col gap-3 items-end">
       
       <div className="flex flex-col gap-2">
            {/* Fullscreen Tooltip */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        onClick={handleFullscreen}
                        variant="secondary" 
                        size="icon" 
                        className="size-10 rounded-full bg-background shadow-md hover:bg-muted text-foreground border"
                        aria-label="Fullscreen"
                    >
                    <Maximize className="size-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Toggle Fullscreen</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Compass (Reset Bearing) Tooltip */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        onClick={handleResetBearing}
                        variant="secondary" 
                        size="icon" 
                        className="size-10 rounded-full bg-background shadow-md hover:bg-muted text-foreground border"
                        aria-label="Reset North"
                    >
                    <Compass className="size-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Reset North</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Locate Tooltip */}
            <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        disabled={!map}
                        onClick={handleLocate}
                        variant="secondary" 
                        size="icon" 
                        className="size-10 rounded-full bg-background shadow-md hover:bg-muted text-foreground border"
                        aria-label="Show Your Location"
                    >
                    <Locate className="size-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Show Your Location</TooltipContent>
            </Tooltip>
            </TooltipProvider>
       </div>
       
      {/* Zoom Controls Group */}
      <div className="flex flex-col bg-background rounded-2xl shadow-md border overflow-hidden">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={handleZoomIn}
                variant="ghost" 
                size="icon" 
                className="size-10 rounded-none hover:bg-muted border-b"
                aria-label="Zoom In"
              >
                <Plus className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom In</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={handleZoomOut}
                variant="ghost" 
                size="icon" 
                className="size-10 rounded-none hover:bg-muted"
                aria-label="Zoom Out"
              >
                <Minus className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom Out</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

