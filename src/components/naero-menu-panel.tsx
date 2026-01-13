"use client"

import * as React from "react"
import { Clock, LifeBuoy, Navigation, Settings2, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type NaeroMenuItem = {
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAERO_MENU_PRIMARY_ITEMS: NaeroMenuItem[] = [
  { label: "Your places", icon: Star },
  { label: "Your timeline", icon: Clock },
  { label: "Your contributions", icon: Navigation },
]

const NAERO_MENU_SECONDARY_ITEMS: NaeroMenuItem[] = [
  { label: "Settings", icon: Settings2 },
  { label: "Help & Feedback", icon: LifeBuoy },
]

function NaeroMenuPanel({
  onSelect,
  collapsed = false,
}: {
  onSelect?: () => void
  collapsed?: boolean
}) {
  const handleItemClick = () => onSelect?.()

  const renderMenuItem = (item: NaeroMenuItem) => {
    const Icon = item.icon

    const button = (
      <Button
        key={item.label}
        variant="ghost"
        size={collapsed ? "icon-lg" : "default"}
        className={cn(
          "w-full justify-start gap-3 rounded-xl text-foreground/90 hover:text-foreground",
          "hover:bg-muted/70",
          collapsed && "justify-center px-0"
        )}
        onClick={handleItemClick}
        aria-label={item.label}
      >
        <Icon className={cn("size-4", collapsed && "size-5")} />
        <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
      </Button>
    )

    if (!collapsed) return button

    return (
      <Tooltip key={item.label}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex flex-col", collapsed ? "p-2" : "p-4")}>
        {!collapsed ? (
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
            Library
          </p>
        ) : null}

        <div className={cn("flex flex-col", collapsed ? "gap-1" : "gap-2")}>
          {NAERO_MENU_PRIMARY_ITEMS.map(renderMenuItem)}
        </div>

        <Separator className={cn(collapsed ? "my-2" : "my-3")} />

        {!collapsed ? (
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
            More
          </p>
        ) : null}

        <div className={cn("flex flex-col", collapsed ? "gap-1" : "gap-2")}>
          {NAERO_MENU_SECONDARY_ITEMS.map(renderMenuItem)}
        </div>
      </div>
    </TooltipProvider>
  )
}

export { NaeroMenuPanel }
