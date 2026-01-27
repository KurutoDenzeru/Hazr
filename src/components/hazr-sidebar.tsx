"use client"

import React from "react"

const Image: React.FC<
  React.ImgHTMLAttributes<HTMLImageElement> & { src: string; width?: number; height?: number; alt: string }
> = ({ src, alt, width, height, className, ...rest }) => (
  <img src={src} alt={alt} width={width} height={height} className={className} {...rest} />
)

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

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
  isLocating?: boolean
  onEarthquakeSelect?: (earthquake: ProcessedEarthquake) => void
}

function HazrSidebar({ userLocation, isLocating, onEarthquakeSelect }: HazrSidebarProps) {
  const { isOpen } = useSidebar()

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
                <TooltipContent side="right">Hazr - Live Quakes & Weather</TooltipContent>
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
                        <PanelLeftClose className="size-" />
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
          userLocation={userLocation}
          isLocating={isLocating}
          onEarthquakeSelect={onEarthquakeSelect}
        />
      </SidebarContent>
    </Sidebar>
  )
}

export { HazrSidebar }
