"use client"

import { PanelLeftClose, PanelLeftOpen, Activity } from "lucide-react"

import { HazrMenuPanel } from "@/components/hazr-menu-panel"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ProcessedEarthquake } from "@/types/api"

type HazrSidebarProps = {
  userLocation?: [number, number] | null
  onEarthquakeSelect?: (earthquake: ProcessedEarthquake) => void
}

function HazrSidebar({ userLocation, onEarthquakeSelect }: HazrSidebarProps) {
  const { isOpen } = useSidebar()

  return (
    <Sidebar widthClassName="w-80" collapsedWidthClassName="w-16">
      <SidebarHeader className="relative group-data-[state=collapsed]/sidebar:pb-14">
        <TooltipProvider delayDuration={0}>
          {isOpen ? (
            <div className="flex min-w-0 flex-1 items-center gap-3 group-data-[state=collapsed]/sidebar:justify-center">
              <div
                className={cn(
                  "mt-0.5 flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20",
                  "group-data-[state=collapsed]/sidebar:size-10"
                )}
              >
                <Activity className="size-5" />
              </div>

              <div className="min-w-0 group-data-[state=collapsed]/sidebar:hidden">
                <p className="text-sm font-semibold leading-none tracking-tight">
                  Hazr
                </p>
                <p className="text-xs text-muted-foreground">
                  Live Quakes & Weather
                </p>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex min-w-0 flex-1 items-center gap-3 group-data-[state=collapsed]/sidebar:justify-center">
                  <div
                    className={cn(
                      "mt-0.5 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20",
                      "group-data-[state=collapsed]/sidebar:size-10"
                    )}
                  >
                    <Activity className="size-5" />
                  </div>

                  <div className="min-w-0 group-data-[state=collapsed]/sidebar:hidden">
                    <p className="text-sm font-semibold leading-none tracking-tight">
                      Hazr
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Live Quakes & Weather
                    </p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Hazr - Live Quakes & Weather</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "absolute right-2 top-2 rounded-xl text-muted-foreground hover:bg-muted/70",
                    "group-data-[state=collapsed]/sidebar:top-auto group-data-[state=collapsed]/sidebar:bottom-2 group-data-[state=collapsed]/sidebar:right-1/2 group-data-[state=collapsed]/sidebar:translate-x-1/2"
                  )}
                  aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {isOpen ? (
                    <PanelLeftClose className="size-4" />
                  ) : (
                    <PanelLeftOpen className="size-4" />
                  )}
                </Button>
              </SidebarTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isOpen ? "Collapse" : "Expand"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SidebarHeader>

      <SidebarContent className="py-2 overflow-y-auto scrollbar-hide">
        <HazrMenuPanel
          collapsed={!isOpen}
          userLocation={userLocation}
          onEarthquakeSelect={onEarthquakeSelect}
        />
      </SidebarContent>
    </Sidebar>
  )
}

export { HazrSidebar }
