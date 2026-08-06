"use client";

import { Info, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type HazrSidebarFooterProps = {
  collapsed?: boolean;
  onSettingsSelect?: () => void;
  onAboutSelect?: () => void;
};

function HazrSidebarFooter({
  collapsed = false,
  onSettingsSelect,
  onAboutSelect,
}: HazrSidebarFooterProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex flex-col gap-1", collapsed && "items-center")}>
        {/* Settings */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-12 justify-center rounded-md px-0 text-muted-foreground hover:bg-muted/70"
                onClick={() => onSettingsSelect?.()}
                aria-label="Settings"
              >
                <Settings2 className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="default"
            className="w-full justify-start gap-3 rounded-md text-foreground/90 hover:bg-muted/70 hover:text-foreground"
            onClick={() => onSettingsSelect?.()}
            aria-label="Settings"
          >
            <Settings2 className="size-4" />
            <span className="truncate">Settings</span>
          </Button>
        )}

        {/* About */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-12 justify-center rounded-md px-0 text-muted-foreground hover:bg-muted/70"
                onClick={() => onAboutSelect?.()}
                aria-label="About Hazr"
              >
                <Info className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">About Hazr</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="default"
            className="w-full justify-start gap-3 rounded-md text-foreground/90 hover:bg-muted/70 hover:text-foreground"
            onClick={() => onAboutSelect?.()}
            aria-label="About Hazr"
          >
            <Info className="size-4" />
            <span className="truncate">About</span>
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

export { HazrSidebarFooter };
