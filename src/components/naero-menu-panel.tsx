"use client"

import * as React from "react"
import { Clock, Navigation, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type NaeroMenuItem = {
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

const NAERO_MENU_PRIMARY_ITEMS: NaeroMenuItem[] = [
  { label: "Your places", icon: Star },
  { label: "Your timeline", icon: Clock },
  { label: "Your contributions", icon: Navigation },
]

const NAERO_MENU_SECONDARY_ITEMS: NaeroMenuItem[] = [
  { label: "Settings" },
  { label: "Help & Feedback" },
]

function NaeroMenuPanel({ onSelect }: { onSelect?: () => void }) {
  const handleItemClick = () => onSelect?.()

  return (
    <div className="p-4 flex flex-col gap-2">
      {NAERO_MENU_PRIMARY_ITEMS.map(({ label, icon: Icon }) => (
        <Button
          key={label}
          variant="ghost"
          className="justify-start gap-3 rounded-xl"
          onClick={handleItemClick}
        >
          {Icon ? <Icon className="size-4" /> : null}
          {label}
        </Button>
      ))}

      <Separator className="my-2" />

      {NAERO_MENU_SECONDARY_ITEMS.map(({ label }) => (
        <Button
          key={label}
          variant="ghost"
          className="justify-start rounded-xl"
          onClick={handleItemClick}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}

export { NaeroMenuPanel }

