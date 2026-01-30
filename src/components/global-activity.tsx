"use client";

import {
  AlertTriangle,
  Globe2,
  Loader2,
  RefreshCw,
  Waves,
  Wind,
} from "lucide-react";
import type {
  ProcessedAirQualitySite,
  ProcessedEonetEvent,
  ProcessedTsunamiAlert,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type GlobalActivityProps = {
  collapsed: boolean;
  eonetState: {
    events: ProcessedEonetEvent[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
  };
  airQualityState: {
    sites: ProcessedAirQualitySite[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
  };
  tsunamiState: {
    alerts: ProcessedTsunamiAlert[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
  };
};

type SignalItem = {
  id: string;
  title: string;
  subtitle: string;
  url?: string;
};

const handleOpen = (url?: string) => {
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
};

const GlobalActivity = ({
  collapsed,
  eonetState,
  airQualityState,
  tsunamiState,
}: GlobalActivityProps) => {
  const eventItems: SignalItem[] = eonetState.events.slice(0, 4).map((event) => ({
    id: event.id,
    title: event.title,
    subtitle: `${event.category} • ${event.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`,
    url: event.url,
  }));

  const airItems: SignalItem[] = airQualityState.sites.slice(0, 4).map((site) => ({
    id: site.id,
    title: site.location,
    subtitle: `${site.parameter.toUpperCase()} ${site.value} ${site.unit}`,
  }));

  const tsunamiItems: SignalItem[] = tsunamiState.alerts.slice(0, 4).map((alert) => ({
    id: alert.id,
    title: alert.headline,
    subtitle: `${alert.severity} • ${alert.sent?.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) ?? "Unknown"}`,
    url: alert.url,
  }));

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-col items-center gap-2">
          <MiniSignal
            label="EONET events"
            count={eonetState.events.length}
            icon={Globe2}
            toneClassName="bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200"
            onClick={eonetState.refetch}
            isLoading={eonetState.isLoading}
          />
          <MiniSignal
            label="Air quality"
            count={airQualityState.sites.length}
            icon={Wind}
            toneClassName="bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200"
            onClick={airQualityState.refetch}
            isLoading={airQualityState.isLoading}
          />
          <MiniSignal
            label="Tsunami alerts"
            count={tsunamiState.alerts.length}
            icon={Waves}
            toneClassName="bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200"
            onClick={tsunamiState.refetch}
            isLoading={tsunamiState.isLoading}
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="overflow-hidden">
        <div className="flex items-center justify-between px-0 my-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-sky-500/15 p-2.5 dark:bg-sky-500/25">
              <Globe2 className="size-5 text-sky-700 dark:text-sky-200" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Global Signals</h3>
              <p className="text-sm text-muted-foreground">Natural events, volcanism, air quality, tsunamis</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SignalSection
            title="NASA EONET"
            icon={Globe2}
            itemIcon={Globe2}
            count={eonetState.events.length}
            isLoading={eonetState.isLoading}
            error={eonetState.error}
            onRefresh={eonetState.refetch}
            items={eventItems}
            toneClassName="bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200"
            itemToneClassName="bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200"
          />
          <SignalSection
            title="OpenAQ"
            icon={Wind}
            itemIcon={Wind}
            count={airQualityState.sites.length}
            isLoading={airQualityState.isLoading}
            error={airQualityState.error}
            onRefresh={airQualityState.refetch}
            items={airItems}
            toneClassName="bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200"
            itemToneClassName="bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200"
          />
          <SignalSection
            title="NWS Tsunamis"
            icon={Waves}
            itemIcon={Waves}
            count={tsunamiState.alerts.length}
            isLoading={tsunamiState.isLoading}
            error={tsunamiState.error}
            onRefresh={tsunamiState.refetch}
            items={tsunamiItems}
            toneClassName="bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200"
            itemToneClassName="bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200"
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

type SignalSectionProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  itemIcon: React.ComponentType<{ className?: string }>;
  count: number;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => Promise<void>;
  items: SignalItem[];
  toneClassName: string;
  itemToneClassName: string;
};

const SignalSection = ({
  title,
  icon: Icon,
  itemIcon: ItemIcon,
  count,
  isLoading,
  error,
  onRefresh,
  items,
  toneClassName,
  itemToneClassName,
}: SignalSectionProps) => (
  <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={cn("rounded-md p-2", toneClassName)}>
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{count} active</p>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-md text-muted-foreground hover:bg-muted/80 dark:hover:bg-muted/40"
            onClick={onRefresh}
            aria-label={`Refresh ${title}`}
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
    </div>

    <div className="mt-2">
      {isLoading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="size-4 text-amber-500" />
          Failed to load
        </div>
      ) : items.length === 0 ? (
        <div className="py-2 text-xs text-muted-foreground">No active signals</div>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpen(item.url)}
              className="flex w-full items-center gap-2 rounded-md bg-background/60 px-2 py-2 text-left text-xs transition-colors hover:bg-background"
              aria-label={item.title}
            >
              <span className={cn("flex size-6 items-center justify-center rounded-md", itemToneClassName)}>
                <ItemIcon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="truncate block text-[11px] font-semibold text-foreground">
                  {item.title}
                </span>
                <span className="truncate block text-[10px] text-muted-foreground">{item.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);

type MiniSignalProps = {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  toneClassName: string;
  onClick: () => Promise<void>;
  isLoading: boolean;
};

const MiniSignal = ({
  label,
  count,
  icon: Icon,
  toneClassName,
  onClick,
  isLoading,
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
          <span className="absolute -bottom-2 -right-2 rounded-full bg-background px-1 text-[9px] font-semibold text-foreground shadow-sm">
            {count}
          </span>
        </div>
      </button>
    </TooltipTrigger>
    <TooltipContent side="right">{label}</TooltipContent>
  </Tooltip>
);

export { GlobalActivity };
