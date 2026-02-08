"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type SignalBadge = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
};

export type SignalHistoryItem = {
  id: string;
  title: string;
  subtitle?: string;
  badges: SignalBadge[];
  itemIcon?: React.ComponentType<{ className?: string }>;
  itemToneClassName?: string;
  url?: string;
  onClick?: () => void;
};

type SignalHistoryListProps = {
  items: SignalHistoryItem[];
  defaultItemIcon: React.ComponentType<{ className?: string }>;
  defaultItemToneClassName: string;
  className?: string;
  heightClassName?: string;
};

const handleOpen = (url?: string) => {
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
};

const SignalHistoryList = ({
  items,
  defaultItemIcon: DefaultItemIcon,
  defaultItemToneClassName,
  className,
  heightClassName = "h-[30rem]",
}: SignalHistoryListProps) => {
  return (
    <div className={cn("pb-1", className)}>
      <p className="px-1 my-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
        History
      </p>
      <ScrollArea className={cn(heightClassName, "rounded-md bg-muted/30 dark:bg-muted/15 pr-3")}>
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            const ItemIconComponent = item.itemIcon ?? DefaultItemIcon;
            const itemToneClass = item.itemToneClassName ?? defaultItemToneClassName;

            const handleItemClick = () => {
              if (item.onClick) {
                item.onClick();
                return;
              }
              handleOpen(item.url);
            };

            return (
              <button
                key={item.id}
                type="button"
                onClick={handleItemClick}
                className="group flex w-full flex-col gap-2 rounded-md bg-muted/30 px-2 py-2 text-left transition-all hover:bg-muted/60 dark:bg-muted/10 dark:hover:bg-muted/30"
                aria-label={item.title}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-105",
                      itemToneClass,
                    )}
                  >
                    <ItemIconComponent className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    {item.subtitle ? (
                      <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                        {item.subtitle}
                      </span>
                    ) : null}
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {item.badges.map((badge, index) => (
                        <Badge
                          key={`${item.id}-${badge.label}-${index}`}
                          variant="secondary"
                          className={cn(
                            "h-auto border-none rounded-md px-2 py-1 text-[10px] font-medium",
                            badge.className,
                          )}
                        >
                          <badge.icon className="size-3" />
                          <span>{badge.label}</span>
                        </Badge>
                      ))}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export { SignalHistoryList };
