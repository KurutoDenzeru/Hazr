"use client";

import React from "react";
import { ChevronRight, History, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  pageSize?: number;
};

const handleOpen = (url?: string) => {
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
};

const getPaginationRange = (totalPages: number, currentPage: number) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages] as const;
};

const SignalHistoryList = ({
  items,
  defaultItemIcon: DefaultItemIcon,
  defaultItemToneClassName,
  className,
  heightClassName = "h-[30rem]",
  pageSize = 7,
}: SignalHistoryListProps) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPageItems = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [currentPage, items, pageSize]);
  const paginationRange = React.useMemo(
    () => getPaginationRange(totalPages, currentPage),
    [currentPage, totalPages],
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [items]);

  const handlePreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  return (
    <div className={cn("pb-1", className)}>
      <p className="my-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">
        <History className="size-3.5 text-muted-foreground/90" />
        History
      </p>
      <ScrollArea
        className={cn(
          heightClassName,
          "rounded-md border border-border/60 bg-muted/15 pr-2",
        )}
      >
        <div className="flex flex-col gap-1.5 p-1">
          {currentPageItems.map((item) => {
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
                className="group flex w-full flex-col gap-2 overflow-hidden rounded-md border border-border/60 bg-background/35 px-2.5 py-2.5 text-left transition-all hover:bg-muted/40 dark:bg-background/20 dark:hover:bg-muted/20"
                aria-label={item.title}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-md border border-white/15 transition-transform group-hover:scale-105",
                      itemToneClass,
                    )}
                  >
                    <ItemIconComponent className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    {item.subtitle ? (
                      <span className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        {item.subtitle}
                      </span>
                    ) : null}
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {item.badges.map((badge, index) => (
                        <span
                          key={`${item.id}-${badge.label}-${index}`}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1 text-xs font-semibold",
                            badge.className,
                          )}
                        >
                          <badge.icon className="size-3" />
                          <span>{badge.label}</span>
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
      {totalPages > 1 ? (
        <Pagination className="mt-3">
          <PaginationContent className="hidden sm:flex">
            <PaginationItem>
              <PaginationPrevious
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                aria-disabled={currentPage === 1}
              />
            </PaginationItem>
            {paginationRange.map((entry, index) => (
              <PaginationItem key={`page-${entry}-${index}`}>
                {entry === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationButton
                    onClick={() => setCurrentPage(entry)}
                    isActive={entry === currentPage}
                    aria-label={`Go to page ${entry}`}
                  >
                    {entry}
                  </PaginationButton>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                aria-disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
          <PaginationContent className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-1 sm:hidden">
            <PaginationItem>
              <PaginationButton
                size="sm"
                className="h-8 px-2 text-xs whitespace-nowrap"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                aria-disabled={currentPage === 1}
                aria-label="Go to previous page"
              >
                Prev
              </PaginationButton>
            </PaginationItem>
            <PaginationItem className="min-w-0 px-1 text-center">
              <span className="block truncate text-xs text-muted-foreground">
                <span className="sr-only">Page </span>
                {currentPage}/{totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationButton
                size="sm"
                className="h-8 px-2 text-xs whitespace-nowrap"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                aria-disabled={currentPage === totalPages}
                aria-label="Go to next page"
              >
                Next
              </PaginationButton>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
};

export { SignalHistoryList };
