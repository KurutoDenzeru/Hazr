"use client";

import React from "react";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Clock3,
  Globe2,
  Gauge,
  Loader2,
  MapPin,
  RefreshCw,
  Waves,
  Wind,
} from "lucide-react";
import type {
  ProcessedAirQualitySite,
  ProcessedEonetEvent,
  ProcessedTsunamiAlert,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type GlobalActivityProps = {
  collapsed: boolean;
  focusTarget?: "global-live-events" | "global-openaq" | "global-tsunami" | null;
  onFocusTargetHandled?: () => void;
  onOpenSection?: (
    target: "global-live-events" | "global-openaq" | "global-tsunami",
  ) => void;
  eonetState: {
    events: ProcessedEonetEvent[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: Date | null;
    refetch: () => Promise<void>;
  };
  airQualityState: {
    sites: ProcessedAirQualitySite[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: Date | null;
    refetch: () => Promise<void>;
  };
  tsunamiState: {
    alerts: ProcessedTsunamiAlert[];
    isLoading: boolean;
    error: Error | null;
    lastUpdated: Date | null;
    refetch: () => Promise<void>;
  };
  onEonetSelect?: (event: ProcessedEonetEvent) => void;
};

type SignalBadge = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
};

type SignalItem = {
  id: string;
  title: string;
  subtitle: string;
  badges: SignalBadge[];
  url?: string;
  onClick?: () => void;
};

const handleOpen = (url?: string) => {
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
};

const formatEonetCategory = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes("storm")) return "Storms";
  if (normalized.includes("wildfire")) return "Fires";
  if (normalized.includes("flood")) return "Floods";
  if (normalized.includes("drought")) return "Drought";
  if (normalized.includes("ice")) return "Ice";
  if (normalized.includes("dust")) return "Dust";
  if (normalized.includes("volcano")) return "Volcanoes";
  return category;
};

const formatEonetTitle = (title: string) => {
  let cleaned = title;
  cleaned = cleaned.replace(/\bRX\b/gi, "Controlled");
  cleaned = cleaned.replace(/Prescribed Fire/gi, "Planned Burn");
  cleaned = cleaned.replace(/Tropical Cyclone/gi, "Tropical Storm");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned;
};

const getTsunamiSeverityRank = (severity: string): number => {
  const normalized = severity.toLowerCase();
  if (normalized.includes("extreme")) return 5;
  if (normalized.includes("severe")) return 4;
  if (normalized.includes("major")) return 3;
  if (normalized.includes("moderate")) return 2;
  if (normalized.includes("minor")) return 1;
  return 0;
};

const getTsunamiSeverityBadgeClass = (severity: string): string => {
  const normalized = severity.toLowerCase();
  if (normalized.includes("extreme") || normalized.includes("severe")) {
    return "bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-200";
  }
  if (normalized.includes("major")) {
    return "bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-200";
  }
  if (normalized.includes("moderate")) {
    return "bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200";
  }
  return "bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200";
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatRelativeTime = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const formatCoordinate = (value: number, positive: string, negative: string): string => {
  return `${Math.abs(value).toFixed(1)}°${value >= 0 ? positive : negative}`;
};

const toSignalBadges = (badges: Array<SignalBadge | null>): SignalBadge[] => {
  return badges.filter((badge): badge is SignalBadge => Boolean(badge));
};

const GlobalActivity = ({
  collapsed,
  focusTarget = null,
  onFocusTargetHandled,
  onOpenSection,
  eonetState,
  airQualityState,
  tsunamiState,
  onEonetSelect,
}: GlobalActivityProps) => {
  const liveEventsSectionRef = React.useRef<HTMLDivElement | null>(null);
  const openAqSectionRef = React.useRef<HTMLDivElement | null>(null);
  const tsunamiSectionRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (collapsed || !focusTarget) return;

    const targetElement =
      focusTarget === "global-live-events"
        ? liveEventsSectionRef.current
        : focusTarget === "global-openaq"
          ? openAqSectionRef.current
          : tsunamiSectionRef.current;

    if (!targetElement) return;

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    targetElement.focus({ preventScroll: true });
    onFocusTargetHandled?.();
  }, [collapsed, focusTarget, onFocusTargetHandled]);

  const eventItems: SignalItem[] = eonetState.events.slice(0, 7).map((event) => ({
    id: event.id,
    title: formatEonetTitle(event.title),
    subtitle: "NASA EONET live event",
    url: event.url,
    onClick: onEonetSelect ? () => onEonetSelect(event) : undefined,
    badges: toSignalBadges([
      {
        label: formatEonetCategory(event.category),
        icon: Globe2,
        className:
          "bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200",
      },
      {
        label: formatRelativeTime(event.date),
        icon: Clock3,
        className:
          "bg-indigo-500/20 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200",
      },
      {
        label: `${formatCoordinate(event.coordinates[1], "N", "S")} ${formatCoordinate(event.coordinates[0], "E", "W")}`,
        icon: MapPin,
        className:
          "bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200",
      },
    ]),
  }));

  const airItems: SignalItem[] = airQualityState.sites.slice(0, 7).map((site) => {
    const value = Number.isFinite(site.value) ? site.value.toFixed(1) : `${site.value}`;
    const locationHint = [site.city, site.country].filter(Boolean).join(", ");

    return {
      id: site.id,
      title: site.location,
      subtitle: locationHint || "OpenAQ reporting station",
      url: site.sourceUrl,
      badges: toSignalBadges([
        {
          label: `${site.parameter.toUpperCase()} ${value} ${site.unit}`,
          icon: Gauge,
          className:
            "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200",
        },
        {
          label: site.measuredAt ? formatRelativeTime(site.measuredAt) : "Time unknown",
          icon: Clock3,
          className:
            "bg-cyan-500/20 text-cyan-700 dark:bg-cyan-500/30 dark:text-cyan-200",
        },
        site.coveragePercent !== null && site.coveragePercent !== undefined
          ? {
              label: `Coverage ${site.coveragePercent.toFixed(0)}%`,
              icon: Activity,
              className:
                "bg-lime-500/20 text-lime-700 dark:bg-lime-500/30 dark:text-lime-200",
            }
          : null,
      ]),
    };
  });

  const tsunamiItems: SignalItem[] = tsunamiState.alerts.slice(0, 7).map((alert) => ({
    id: alert.id,
    title: alert.headline,
    subtitle: "NWS tsunami bulletin",
    url: alert.url,
    badges: toSignalBadges([
      {
        label: alert.severity,
        icon: AlertTriangle,
        className: getTsunamiSeverityBadgeClass(alert.severity),
      },
      {
        label: alert.sent ? formatRelativeTime(alert.sent) : "Time unknown",
        icon: Clock3,
        className:
          "bg-indigo-500/20 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200",
      },
      {
        label: "NWS source",
        icon: Waves,
        className:
          "bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200",
      },
    ]),
  }));

  const activeEventCount = eonetState.events.length;
  const activeAirSiteCount = airQualityState.sites.length;
  const activeTsunamiCount = tsunamiState.alerts.length;
  const primaryAirSite = airQualityState.sites[0] ?? null;
  const primaryAirValue = primaryAirSite
    ? `${primaryAirSite.parameter.toUpperCase()} ${
        Number.isFinite(primaryAirSite.value)
          ? primaryAirSite.value.toFixed(1)
          : `${primaryAirSite.value}`
      } ${primaryAirSite.unit}`
    : null;
  const highestTsunamiSeverity = tsunamiState.alerts.reduce<string | null>(
    (currentHighest, alert) => {
      if (!currentHighest) return alert.severity;
      return getTsunamiSeverityRank(alert.severity) >
        getTsunamiSeverityRank(currentHighest)
        ? alert.severity
        : currentHighest;
    },
    null,
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-col items-center gap-2">
          <MiniSignal
            label="NASA EONET Live Signals"
            icon={Globe2}
            toneClassName="bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200"
            onClick={() => onOpenSection?.("global-live-events")}
            isLoading={eonetState.isLoading}
            detail={
              eonetState.isLoading
                ? "Updating EONET events..."
                : activeEventCount === 0
                  ? "No active events right now."
                  : `${activeEventCount} active event${activeEventCount === 1 ? "" : "s"}`
            }
          />
          <MiniSignal
            label="OpenAQ"
            icon={Wind}
            toneClassName="bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200"
            onClick={() => onOpenSection?.("global-openaq")}
            isLoading={airQualityState.isLoading}
            detail={
              airQualityState.isLoading
                ? "Updating OpenAQ stations..."
                : activeAirSiteCount === 0
                  ? "No reporting stations right now."
                  : `${activeAirSiteCount} site${activeAirSiteCount === 1 ? "" : "s"} reporting`
            }
            subDetail={airQualityState.isLoading ? undefined : primaryAirValue ?? undefined}
          />
          <MiniSignal
            label="NWS Tsunamic Alerts"
            icon={Waves}
            toneClassName="bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200"
            onClick={() => onOpenSection?.("global-tsunami")}
            isLoading={tsunamiState.isLoading}
            detail={
              tsunamiState.isLoading
                ? "Checking NWS tsunami alerts..."
                : activeTsunamiCount === 0
                  ? "No active alerts."
                  : `${activeTsunamiCount} active alert${activeTsunamiCount === 1 ? "" : "s"}`
            }
            subDetail={
              tsunamiState.isLoading || !highestTsunamiSeverity
                ? undefined
                : `Highest severity: ${highestTsunamiSeverity}`
            }
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="overflow-hidden">
        <div className="flex flex-col gap-3">
          <div ref={liveEventsSectionRef} id="sidebar-global-live-events" tabIndex={-1}>
            <p className="px-1 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              NASA EONET Live Signals
            </p>
            <SignalSection
              title="NASA EONET Live Signals"
              description={`${activeEventCount} active signal${activeEventCount === 1 ? "" : "s"}`}
              icon={Globe2}
              itemIcon={Globe2}
              isLoading={eonetState.isLoading}
              error={eonetState.error}
              lastUpdated={eonetState.lastUpdated}
              onRefresh={eonetState.refetch}
              items={eventItems}
              toneClassName="bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200"
              itemToneClassName="bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200"
            />
          </div>
          <div ref={openAqSectionRef} id="sidebar-global-openaq" tabIndex={-1}>
            <p className="px-1 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              OpenAQ
            </p>
            <SignalSection
              title="OpenAQ"
              description={`${activeAirSiteCount} reporting site${activeAirSiteCount === 1 ? "" : "s"}`}
              icon={Wind}
              itemIcon={Wind}
              isLoading={airQualityState.isLoading}
              error={airQualityState.error}
              lastUpdated={airQualityState.lastUpdated}
              onRefresh={airQualityState.refetch}
              items={airItems}
              toneClassName="bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200"
              itemToneClassName="bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200"
            />
          </div>
          <div ref={tsunamiSectionRef} id="sidebar-global-tsunami" tabIndex={-1}>
            <p className="px-1 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              NWS Tsunamic Alerts
            </p>
            <SignalSection
              title="NWS Tsunamic Alerts"
              description={`${activeTsunamiCount} active alert${activeTsunamiCount === 1 ? "" : "s"}`}
              icon={Waves}
              itemIcon={Waves}
              isLoading={tsunamiState.isLoading}
              error={tsunamiState.error}
              lastUpdated={tsunamiState.lastUpdated}
              onRefresh={tsunamiState.refetch}
              items={tsunamiItems}
              toneClassName="bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200"
              itemToneClassName="bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200"
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

type SignalSectionProps = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  itemIcon: React.ComponentType<{ className?: string }>;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  onRefresh: () => Promise<void>;
  items: SignalItem[];
  toneClassName: string;
  itemToneClassName: string;
};

const SignalSection = ({
  title,
  description,
  icon: Icon,
  itemIcon: ItemIcon,
  isLoading,
  error,
  lastUpdated,
  onRefresh,
  items,
  toneClassName,
  itemToneClassName,
}: SignalSectionProps) => {
  const handleRefresh = () => {
    void onRefresh();
  };

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between px-0 my-2">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-md p-2.5", toneClassName)}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-md text-muted-foreground hover:bg-muted/80 dark:hover:bg-muted/40"
              type="button"
              onClick={handleRefresh}
              aria-label={`Refresh ${title}`}
            >
              <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLoading
              ? "Refreshing..."
              : lastUpdated
                ? `Updated ${formatTime(lastUpdated)}`
                : `Refresh ${title}`}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="pb-1">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <AlertTriangle className="size-6 text-amber-500" />
            <p className="text-sm text-muted-foreground">Failed to load data</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No active signals</p>
          </div>
        ) : (
          <>
            <p className="px-1 my-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              History
            </p>
            <ScrollArea className="h-[30rem] rounded-md bg-muted/30 dark:bg-muted/15 pr-3">
              <div className="flex flex-col gap-1">
                {items.map((item) => {
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
                            "flex size-10 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-105",
                            itemToneClassName,
                          )}
                        >
                          <ItemIcon className="size-4" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {item.title}
                            </p>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5" />
                          </div>
                          <p className="mt-1 truncate text-[10px] text-muted-foreground">
                            {item.subtitle}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
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
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
};

type MiniSignalProps = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  toneClassName: string;
  onClick: () => void;
  isLoading: boolean;
  detail?: string;
  subDetail?: string;
};

const MiniSignal = ({
  label,
  icon: Icon,
  toneClassName,
  onClick,
  isLoading,
  detail,
  subDetail,
}: MiniSignalProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onClick}
        className="flex size-12 items-center justify-center rounded-md transition-colors hover:bg-muted/80 dark:hover:bg-muted/40"
        aria-label={label}
      >
        <div className={cn("relative flex size-9 items-center justify-center rounded-md", toneClassName)}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
        </div>
      </button>
    </TooltipTrigger>
    <TooltipContent side="right" className="max-w-60">
      <p className="font-medium">{label}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      {subDetail ? <p className="text-xs text-muted-foreground">{subDetail}</p> : null}
    </TooltipContent>
  </Tooltip>
);

export { GlobalActivity };
