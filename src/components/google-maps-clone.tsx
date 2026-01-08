"use client"

import * as React from "react"
import { 
  Menu, 
  Search, 
  Mic, 
  X, 
  Plus, 
  Minus, 
  Locate, 
  Layers, 
  Map as MapIcon, 
  Navigation,
  Utensils,
  Fuel,
  Hotel,
  Coffee,
  ShoppingBag,
  MoreHorizontal,
  Star,
  Clock
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
import { cn } from "@/lib/utils"

// Filter categories for the top bar
const CATEGORIES = [
  { label: "Restaurants", icon: Utensils },
  { label: "Gas", icon: Fuel },
  { label: "Coffee", icon: Coffee },
  { label: "Hotels", icon: Hotel },
  { label: "Shopping", icon: ShoppingBag },
  { label: "Groceries", icon: ShoppingBag }, // Reusing icon for simplicity
  { label: "More", icon: MoreHorizontal },
]

export default function GoogleMapsClone() {
  const [searchValue, setSearchValue] = React.useState("")

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Map Component as Background */}
      <Map
        center={[-122.4, 37.8]}
        zoom={12}
      >
        <MapOverlayUI 
          searchValue={searchValue} 
          setSearchValue={setSearchValue} 
        />
      </Map>
    </div>
  )
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
        <div className="relative w-full md:w-[400px] flex items-center bg-background rounded-2xl shadow-md border border-border/50 transition-all focus-within:shadow-lg focus-within:ring-1 focus-within:ring-ring">
          
          <Button variant="ghost" size="icon" className="rounded-full shrink-0 ml-1 h-10 w-10 text-muted-foreground hover:bg-muted" aria-label="Menu">
            <Menu className="size-5" />
          </Button>

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
            
            <Separator orientation="vertical" className="h-6 mx-1" />

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-blue-600 hover:bg-blue-50" aria-label="Voice Search">
                    <Mic className="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Voice Search</TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
      <div className="pointer-events-auto p-4 flex flex-col gap-4 items-end sm:flex-row sm:justify-between sm:items-end w-full mt-auto">
        
        {/* Bottom Left: Layers (Desktop) / Info */}
        <div className="hidden sm:flex pb-2 pl-2">
          {/* Often Google Maps puts a "Layers" widget here or bottom left */}
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group relative size-16 bg-background rounded-xl shadow-md border overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all">
                  <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
                    <Layers className="size-6 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="absolute bottom-1 w-full text-center text-[10px] font-medium bg-background/80 backdrop-blur-sm">Layers</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Layers</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Bottom Right: Map Controls */}
        <div className="flex flex-col gap-4 items-end w-full sm:w-auto">
          
          {/* In mobile, layers is often top right or floating. For Design consistency, let's keep controls grouped bottom right for desktop */}
          
          <div className="flex flex-col gap-2">
            <CustomMapControls />
          </div>

        </div>
      </div>
      
      {/* Mobile Bottom Bar (Optional, Google Maps often has Explore, Go, Saved, Contribute, Updates) */}
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
    map?.zoomIn()
  }

  const handleZoomOut = () => {
    map?.zoomOut()
  }

  const handleLocate = () => {
    // Mock location functionality or request browser permission
    if (navigator.geolocation && map) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                map.flyTo({
                    center: [position.coords.longitude, position.coords.latitude],
                    zoom: 14
                });
            }
        );
    }
  }

  return (
    <div className="flex flex-col gap-4 items-end">
        {/* Floating Action Buttons */}
       <div className="flex flex-col gap-2">
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
      <div className="flex flex-col bg-background rounded-full shadow-md border overflow-hidden">
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
