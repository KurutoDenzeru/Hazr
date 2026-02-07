"use client"

import React from "react"

const Image: React.FC<
  React.ImgHTMLAttributes<HTMLImageElement> & { src: string; width?: number; height?: number; alt: string }
> = ({ src, alt, width, height, className, ...rest }) => (
  <img src={src} alt={alt} width={width} height={height} className={className} {...rest} />
)

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import {
  HazrMenuPanel,
  type HazrMenuFocusTarget,
} from "@/components/hazr-menu-panel"
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
import type {
  ProcessedAirQualitySite,
  ProcessedEarthquake,
  ProcessedEonetEvent,
  ProcessedTsunamiAlert,
} from "@/types/api"

type HazrSidebarProps = {
  userLocation?: [number, number] | null
  isLocating?: boolean
  onEarthquakeSelect?: (earthquake: ProcessedEarthquake) => void
  onEonetSelect?: (event: ProcessedEonetEvent) => void
  eonetState?: {
    events: ProcessedEonetEvent[]
    isLoading: boolean
    error: Error | null
    lastUpdated: Date | null
    refetch: () => Promise<void>
  }
  airQualityState?: {
    sites: ProcessedAirQualitySite[]
    isLoading: boolean
    error: Error | null
    lastUpdated: Date | null
    refetch: () => Promise<void>
  }
  tsunamiState?: {
    alerts: ProcessedTsunamiAlert[]
    isLoading: boolean
    error: Error | null
    lastUpdated: Date | null
    refetch: () => Promise<void>
  }
}

function HazrSidebar({
  userLocation,
  isLocating,
  onEarthquakeSelect,
  onEonetSelect,
  eonetState,
  airQualityState,
  tsunamiState,
}: HazrSidebarProps) {
  const { isOpen, setIsOpen } = useSidebar()
  const [focusTarget, setFocusTarget] = React.useState<HazrMenuFocusTarget | null>(
    null
  )

  const handleRequestExpandAndFocus = React.useCallback(
    (target: HazrMenuFocusTarget) => {
      setFocusTarget(target)
      if (!isOpen) {
        setIsOpen(true)
      }
    },
    [isOpen, setIsOpen]
  )

  const handleFocusTargetHandled = React.useCallback(() => {
    setFocusTarget(null)
  }, [])

  return (
    <Sidebar widthClassName="w-auto" collapsedWidthClassName="w-16" resizable>
      <SidebarHeader className="group-data-[state=collapsed]/sidebar:pb-2">
        <TooltipProvider delayDuration={0}>
          <div
            className={cn(
              "flex w-full items-center",
              isOpen ? "gap-3" : "flex-col gap-2"
            )}
          >
            {isOpen ? (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-md">
                  <Image
                    src="/brand.webp"
                    alt="Hazr Logo"
                    width={25}
                    height={25}
                    className="size-12 object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-md font-semibold leading-none tracking-tight">
                    Hazr
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Weather, quakes, air quality & global alerts
                  </p>
                </div>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex min-w-0 items-center justify-center">
                    <div className="flex size-12 items-center justify-center rounded-md">
                      <Image
                        src="/brand.webp"
                        alt="Hazr Logo"
                        width={25}
                        height={25}
                        className="size-12 object-contain"
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">Hazr - Weather, Quakes & Global Alerts</TooltipContent>
              </Tooltip>
            )}

            <div className={cn(isOpen ? "ml-auto" : "flex justify-center")}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      className="size-12 rounded-md text-muted-foreground hover:bg-muted/70"
                      aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                      {isOpen ? (
                        <PanelLeftClose className="size-5" />
                      ) : (
                        <PanelLeftOpen className="size-5" />
                      )}
                    </Button>
                  </SidebarTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isOpen ? "Collapse" : "Expand"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto scrollbar-hide">
        <HazrMenuPanel
          collapsed={!isOpen}
          focusTarget={focusTarget}
          onFocusTargetHandled={handleFocusTargetHandled}
          onRequestExpandAndFocus={handleRequestExpandAndFocus}
          userLocation={userLocation}
          isLocating={isLocating}
          onEarthquakeSelect={onEarthquakeSelect}
          onEonetSelect={onEonetSelect}
          eonetState={eonetState}
          airQualityState={airQualityState}
          tsunamiState={tsunamiState}
        />
      </SidebarContent>
    </Sidebar>
  )
}

export { HazrSidebar }
