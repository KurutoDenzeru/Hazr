"use client"

import { Map as MapIcon } from "lucide-react"

import { NaeroMenuPanel } from "@/components/naero-menu-panel"
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar"

function NaeroSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="size-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
          <MapIcon className="size-5" />
        </div>
        <span className="font-semibold text-lg tracking-tight">Naero Maps</span>
      </SidebarHeader>

      <SidebarContent>
        <NaeroMenuPanel />
      </SidebarContent>
    </Sidebar>
  )
}

export { NaeroSidebar }

