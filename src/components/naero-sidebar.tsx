"use client"

import { Map as MapIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { NaeroMenuPanel } from "@/components/naero-menu-panel"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

function NaeroSidebar() {
  const { isOpen } = useSidebar()

  return (
    <Sidebar widthClassName="w-80" collapsedWidthClassName="w-16">
      <SidebarHeader className="relative">
        <div className="flex min-w-0 flex-1 items-center gap-3 group-data-[state=collapsed]/sidebar:justify-center">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground",
              "group-data-[state=collapsed]/sidebar:size-10"
            )}
          >
            <MapIcon className="size-5" />
          </div>

          <div className="min-w-0 group-data-[state=collapsed]/sidebar:hidden">
            <p className="text-sm font-semibold leading-none tracking-tight">
              Naero Maps
            </p>
            <p className="text-xs text-muted-foreground">Explore • Save • Plan</p>
          </div>
        </div>

        <SidebarTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-xl text-muted-foreground hover:bg-muted/70",
              "group-data-[state=collapsed]/sidebar:top-auto group-data-[state=collapsed]/sidebar:bottom-2 group-data-[state=collapsed]/sidebar:right-1/2 group-data-[state=collapsed]/sidebar:translate-x-1/2 group-data-[state=collapsed]/sidebar:translate-y-0"
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
      </SidebarHeader>

      <SidebarContent className="py-2">
        <NaeroMenuPanel collapsed={!isOpen} />
      </SidebarContent>
    </Sidebar>
  )
}

export { NaeroSidebar }
