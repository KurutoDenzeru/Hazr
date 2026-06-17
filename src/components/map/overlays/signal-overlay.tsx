import * as React from "react";
import { createPortal } from "react-dom";
import {
  CloudLightning,
  Flame,
  Waves,
  AlertTriangle,
  Snowflake,
  Sun,
  Wind,
  Globe2,
  MapPin,
  Signal,
  Users,
  Gauge,
  CircleDot,
  Radio,
  Clock,
  MapPinned,
  CalendarClock,
  ExternalLink,
  X, ScanLine, Building2, Ruler, FlaskConical,
} from "lucide-react";
import { useMap } from "@/components/ui/map";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ProcessedAirQualitySite,
  ProcessedEarthquake,
  ProcessedEonetEvent,
  ProcessedTsunamiAlert,
} from "@/types/api";
import { getMagnitudeLabel, getMagnitudeColor } from "@/types/api";

const getEventIcon = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes("storm")) return CloudLightning;
  if (normalized.includes("wildfire") || normalized.includes("fire")) return Flame;
  if (normalized.includes("flood")) return Waves;
  if (normalized.includes("volcano")) return AlertTriangle;
  if (normalized.includes("ice")) return Snowflake;
  if (normalized.includes("drought")) return Sun;
  if (normalized.includes("dust")) return Wind;
  return Globe2;
};

const getEventCategoryLabel = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes("storm")) return "Storm";
  if (normalized.includes("wildfire") || normalized.includes("fire")) return "Wildfire";
  if (normalized.includes("flood")) return "Flood";
  if (normalized.includes("drought")) return "Drought";
  if (normalized.includes("ice")) return "Iceberg";
  if (normalized.includes("dust")) return "Dust";
  if (normalized.includes("volcano")) return "Volcano";
  return category;
};

const formatAirQualityParameterLabel = (parameter: string) => {
  const normalized = parameter.trim().toLowerCase();
  if (normalized === "pm2.5") return "Fine particles (PM2.5)";
  if (normalized === "pm10") return "Coarse particles (PM10)";
  if (normalized === "no2") return "Nitrogen dioxide (NO₂)";
  if (normalized === "o3") return "Ozone (O₃)";
  return parameter.toUpperCase();
};

const formatAirQualityConcentration = (value: number, unit: string) => {
  return `${value.toFixed(1)} ${unit}`;
};


type EventToneKey =
  | "wildfire"
  | "storm"
  | "flood"
  | "volcano"
  | "ice"
  | "drought"
  | "dust"
  | "default";

const getEventToneKey = (category: string): EventToneKey => {
  const normalized = category.toLowerCase();
  if (normalized.includes("wildfire") || normalized.includes("fire")) return "wildfire";
  if (normalized.includes("storm")) return "storm";
  if (normalized.includes("flood") || normalized.includes("tsunami")) return "flood";
  if (normalized.includes("volcano")) return "volcano";
  if (normalized.includes("ice")) return "ice";
  if (normalized.includes("drought")) return "drought";
  if (normalized.includes("dust")) return "dust";
  return "default";
};

type OverlayBadge = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
};

type OverlayDetailItem = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  cardClassName?: string;
  labelClassName?: string;
};

type OverlayAction = {
  label: string;
  url: string;
  ariaLabel: string;
};

const isDefined = <T,>(value: T | null | undefined): value is T => value !== null && value !== undefined;

const OverlayDetailGrid = ({
  details,
  className,
}: {
  details: OverlayDetailItem[];
  className?: string;
}) => {
  if (details.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}>
      {details.map((detail) => (
        <div
          key={detail.label}
          className={cn("rounded-lg bg-muted/40 px-3 py-2 dark:bg-muted/20", detail.cardClassName)}
        >
          <div
            className={cn(
              "flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground",
              detail.labelClassName,
            )}
          >
            {detail.icon ? <detail.icon className="size-3" /> : null}
            <span>{detail.label}</span>
          </div>
          <p className="text-sm font-medium text-foreground">{detail.value}</p>
        </div>
      ))}
    </div>
  );
};

const getEventTone = (category: string) => {
  const toneKey = getEventToneKey(category);
  if (toneKey === "wildfire") {
    return {
      lead: "bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-200",
      badge: "bg-orange-500/15 text-orange-700 dark:bg-orange-500/25 dark:text-orange-200",
      detailCard: "bg-orange-500/8 border border-orange-500/20 dark:bg-orange-500/12 dark:border-orange-400/20",
      detailLabel: "text-orange-700/80 dark:text-orange-200/80",
    };
  }
  if (toneKey === "storm") {
    return {
      lead: "bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200",
      badge: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200",
      detailCard: "bg-amber-500/8 border border-amber-500/20 dark:bg-amber-500/12 dark:border-amber-400/20",
      detailLabel: "text-amber-700/80 dark:text-amber-200/80",
    };
  }
  if (toneKey === "flood") {
    return {
      lead: "bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200",
      badge: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200",
      detailCard: "bg-sky-500/8 border border-sky-500/20 dark:bg-sky-500/12 dark:border-sky-400/20",
      detailLabel: "text-sky-700/80 dark:text-sky-200/80",
    };
  }
  if (toneKey === "volcano") {
    return {
      lead: "bg-pink-500/20 text-pink-700 dark:bg-pink-500/30 dark:text-pink-200",
      badge: "bg-pink-500/15 text-pink-700 dark:bg-pink-500/25 dark:text-pink-200",
      detailCard: "bg-pink-500/8 border border-pink-500/20 dark:bg-pink-500/12 dark:border-pink-400/20",
      detailLabel: "text-pink-700/80 dark:text-pink-200/80",
    };
  }
  if (toneKey === "ice") {
    return {
      lead: "bg-cyan-500/20 text-cyan-700 dark:bg-cyan-500/30 dark:text-cyan-200",
      badge: "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/25 dark:text-cyan-200",
      detailCard: "bg-cyan-500/8 border border-cyan-500/20 dark:bg-cyan-500/12 dark:border-cyan-400/20",
      detailLabel: "text-cyan-700/80 dark:text-cyan-200/80",
    };
  }
  if (toneKey === "drought") {
    return {
      lead: "bg-yellow-700/20 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-200",
      badge: "bg-yellow-700/15 text-yellow-700 dark:bg-yellow-700/25 dark:text-yellow-200",
      detailCard: "bg-yellow-700/8 border border-yellow-700/20 dark:bg-yellow-700/12 dark:border-yellow-500/20",
      detailLabel: "text-yellow-700/80 dark:text-yellow-200/80",
    };
  }
  if (toneKey === "dust") {
    return {
      lead: "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-200",
      badge: "bg-yellow-500/15 text-yellow-700 dark:bg-yellow-500/25 dark:text-yellow-200",
      detailCard: "bg-yellow-500/8 border border-yellow-500/20 dark:bg-yellow-500/12 dark:border-yellow-400/20",
      detailLabel: "text-yellow-700/80 dark:text-yellow-200/80",
    };
  }
  return {
    lead: "bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-200",
    badge: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200",
    detailCard: "bg-amber-500/8 border border-amber-500/20 dark:bg-amber-500/12 dark:border-amber-400/20",
    detailLabel: "text-amber-700/80 dark:text-amber-200/80",
  };
};

const UnifiedSignalPopover = ({
  leading,
  title,
  titlePrefixIcon: TitlePrefixIcon,
  onClose,
  badges,
  details,
  detailsClassName,
  footerAction,
  children,
}: {
  leading: React.ReactNode;
  title: string;
  titlePrefixIcon?: React.ComponentType<{ className?: string }>;
  onClose: () => void;
  badges?: OverlayBadge[];
  details?: OverlayDetailItem[];
  detailsClassName?: string;
  footerAction?: OverlayAction | null;
  children?: React.ReactNode;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
              {TitlePrefixIcon ? <TitlePrefixIcon className="size-3.5 shrink-0" /> : null}
              <p className="line-clamp-2 text-foreground font-semibold leading-snug">{title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
              aria-label="Close popover"
            >
              <X className="size-4" />
            </button>
          </div>
          {badges && badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.label} className={badge.className}>
                  {badge.icon ? <badge.icon className="size-3" /> : null}
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {details ? <OverlayDetailGrid details={details} className={detailsClassName} /> : null}
      {children}

      {footerAction ? (
        <Button
          asChild
          className="w-full gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <a
            href={footerAction.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={footerAction.ariaLabel}
          >
            {footerAction.label}
            <ExternalLink className="size-4" />
          </a>
        </Button>
      ) : null}
    </div>
  );
};

export function SignalOverlay({
  activeType,
  earthquake,
  event,
  tsunamiAlert,
  airQualitySite,
  onCloseEarthquake,
  onCloseEvent,
}: {
  activeType: "earthquake" | "global" | null;
  earthquake: ProcessedEarthquake | null;
  event: ProcessedEonetEvent | null;
  tsunamiAlert: ProcessedTsunamiAlert | null;
  airQualitySite: ProcessedAirQualitySite | null;
  onCloseEarthquake: () => void;
  onCloseEvent: () => void;
}) {
  const { map } = useMap();
  const overlayContainer = React.useMemo(() => document.createElement("div"), []);

  React.useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    overlayContainer.className =
      "absolute left-3 right-3 top-3 z-30 pointer-events-auto sm:left-auto sm:right-4 sm:top-4";
    container.appendChild(overlayContainer);
    return () => {
      overlayContainer.remove();
    };
  }, [map, overlayContainer]);

  const activeEarthquake = activeType === "earthquake" ? earthquake : null;
  const activeEvent = activeType === "global" ? event : null;
  const activeTsunami = activeType === "global" ? tsunamiAlert : null;
  const activeAirQuality = activeType === "global" ? airQualitySite : null;

  if (!map || (!activeEarthquake && !activeEvent && !activeTsunami && !activeAirQuality)) return null;

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const detailItems: OverlayDetailItem[] = activeEarthquake
    ? (
        [
          {
            label: "Magnitude",
            value: `${activeEarthquake.magnitude.toFixed(1)} (${getMagnitudeLabel(activeEarthquake.magnitude)})`,
            icon: Gauge,
          },
          activeEarthquake.magType
            ? {
                label: "Magnitude scale",
                value: activeEarthquake.magType.toUpperCase(),
                icon: Gauge,
              }
            : null,
          { label: "Depth below ground", value: `${activeEarthquake.depth.toFixed(1)} km`, icon: MapPin },
          { label: "Impact score", value: `${activeEarthquake.sig}`, icon: Signal },
          activeEarthquake.felt !== null
            ? { label: "Felt", value: `${activeEarthquake.felt}`, icon: Users }
            : null,
          activeEarthquake.mmi !== null
            ? { label: "Intensity (MMI)", value: activeEarthquake.mmi.toFixed(1), icon: Gauge }
            : null,
          activeEarthquake.cdi !== null
            ? { label: "Community intensity", value: activeEarthquake.cdi.toFixed(1), icon: Signal }
            : null,
          activeEarthquake.gap !== null
            ? { label: "Azimuthal gap", value: `${activeEarthquake.gap.toFixed(0)}°`, icon: CircleDot }
            : null,
          activeEarthquake.dmin !== null
            ? { label: "Nearest station", value: activeEarthquake.dmin.toFixed(2), icon: MapPin }
            : null,
          activeEarthquake.rms !== null
            ? { label: "Wave residual", value: activeEarthquake.rms.toFixed(2), icon: Radio }
            : null,
          activeEarthquake.nst !== null
            ? { label: "Stations reporting", value: `${activeEarthquake.nst}`, icon: Radio }
            : null,
        ].filter(isDefined)
      )
    : [];

  const earthquakeBadges: OverlayBadge[] = activeEarthquake
    ? [
        {
          label: `Updated ${formatRelativeTime(activeEarthquake.updated)}`,
          icon: Clock,
          className: "gap-1 bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200",
        },
        activeEarthquake.alert
          ? {
              label: `Alert ${activeEarthquake.alert}`,
              icon: AlertTriangle,
              className: cn(
                "gap-1",
                activeEarthquake.alert === "yellow" &&
                  "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-200",
                activeEarthquake.alert === "orange" &&
                  "bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-200",
                activeEarthquake.alert === "red" &&
                  "bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-200",
                activeEarthquake.alert === "green" &&
                  "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200",
              ),
            }
          : null,
        activeEarthquake.tsunami
          ? {
              label: "Tsunami risk",
              icon: Waves,
              className: "gap-1 bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-200",
            }
          : null,
      ].filter(isDefined)
    : [];

  const eventDetails: OverlayDetailItem[] = activeEvent
    ? [
        {
          label: "Coordinates",
          value: `${activeEvent.coordinates[1].toFixed(4)}, ${activeEvent.coordinates[0].toFixed(4)}`,
          icon: MapPinned,
        },
        {
          label: "Reported",
          value: activeEvent.date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          icon: CalendarClock,
        },
      ]
    : [];

  const eventBadges: OverlayBadge[] = activeEvent
    ? [
        {
          label: getEventCategoryLabel(activeEvent.category),
          icon: activeEvent ? getEventIcon(activeEvent.category) : Globe2,
          className: cn("gap-1", getEventTone(activeEvent.category).badge),
        },
      ]
    : [];

  const tsunamiDetails: OverlayDetailItem[] = activeTsunami
    ? [
        {
          label: "Coordinates",
          value: `${activeTsunami.coordinates[1].toFixed(4)}, ${activeTsunami.coordinates[0].toFixed(4)}`,
          icon: MapPinned,
        },
      ]
    : [];

  const tsunamiBadges: OverlayBadge[] = activeTsunami
    ? [
        {
          label: activeTsunami.severity,
          className: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200",
        },
          activeTsunami.sent
            ? {
                label: activeTsunami.sent.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }),
                icon: CalendarClock,
                className: "bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200",
              }
            : null,
      ].filter(isDefined)
    : [];

  const airQualityBadges: OverlayBadge[] = activeAirQuality
    ? [
        {
          label: formatAirQualityParameterLabel(activeAirQuality.parameter),
          className: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200",
        },
        {
          label: `Concentration ${formatAirQualityConcentration(activeAirQuality.value, activeAirQuality.unit)}`,
          className: "bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200",
        },
      ]
    : [];

  const airQualityDetails: OverlayDetailItem[] = activeAirQuality
    ? (
        [
          {
            label: "Coordinates",
            value: `${activeAirQuality.coordinates[1].toFixed(4)}, ${activeAirQuality.coordinates[0].toFixed(4)}`,
            icon: MapPinned,
          },
          activeAirQuality.measuredAt
            ? {
                label: "Measured",
                value: activeAirQuality.measuredAt.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }),
                icon: CalendarClock,
              }
            : null,
          activeAirQuality.averagingPeriod
            ? {
                label: "Averaging period",
                value: activeAirQuality.averagingPeriod,
                icon: ScanLine,
              }
            : null,
          activeAirQuality.coveragePercent !== null && activeAirQuality.coveragePercent !== undefined
            ? {
                label: "Data coverage",
                value: `${activeAirQuality.coveragePercent.toFixed(0)}%`,
                icon: Signal,
              }
            : null,
          {
            label: "Location ID",
            value: `${activeAirQuality.locationId}`,
            icon: Building2,
          },
          {
            label: "Sensor ID",
            value: `${activeAirQuality.sensorId}`,
            icon: Radio,
          },
          activeAirQuality.city || activeAirQuality.country
            ? {
                label: "Region",
                value: [activeAirQuality.city, activeAirQuality.country].filter(Boolean).join(", "),
                icon: MapPin,
              }
            : null,
          activeAirQuality.averageValue !== null && activeAirQuality.averageValue !== undefined
            ? {
                label: "Average",
                value: formatAirQualityConcentration(activeAirQuality.averageValue, activeAirQuality.unit),
                icon: Ruler,
              }
            : null,
          activeAirQuality.minValue !== null && activeAirQuality.minValue !== undefined
            ? {
                label: "Minimum",
                value: formatAirQualityConcentration(activeAirQuality.minValue, activeAirQuality.unit),
                icon: FlaskConical,
              }
            : null,
          activeAirQuality.maxValue !== null && activeAirQuality.maxValue !== undefined
            ? {
                label: "Maximum",
                value: formatAirQualityConcentration(activeAirQuality.maxValue, activeAirQuality.unit),
                icon: FlaskConical,
              }
            : null,
        ].filter(isDefined)
      )
    : [];

  const ActiveEventIcon = activeEvent ? getEventIcon(activeEvent.category) : Globe2;
  const activeEventTone = activeEvent ? getEventTone(activeEvent.category) : getEventTone("default");

  return createPortal(
    <div className="w-full max-w-sm sm:max-w-md max-h-[75vh] overflow-y-auto rounded-lg border border-border/60 bg-background/95 p-3">
      {activeEarthquake ? (
        <UnifiedSignalPopover
          leading={(
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
              style={{
                backgroundColor: getMagnitudeColor(activeEarthquake.magnitude),
                boxShadow: `0 4px 14px ${getMagnitudeColor(activeEarthquake.magnitude)}40`,
              }}
            >
              {activeEarthquake.magnitude.toFixed(1)}
            </div>
          )}
          title={activeEarthquake.place}
          titlePrefixIcon={MapPin}
          onClose={onCloseEarthquake}
          badges={earthquakeBadges}
          details={detailItems}
          detailsClassName="grid-cols-2 sm:grid-cols-2"
          footerAction={{
            label: "View on USGS",
            url: activeEarthquake.url,
            ariaLabel: "View USGS event details",
          }}
        >
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
              <MapPin className="size-3" />
              Latitude: {activeEarthquake.coordinates[1].toFixed(4)}
            </Badge>
            <Badge className="gap-1 bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200">
              <MapPin className="size-3" />
              Longitude: {activeEarthquake.coordinates[0].toFixed(4)}
            </Badge>
          </div>
        </UnifiedSignalPopover>
      ) : null}

      {activeEvent ? (
        <UnifiedSignalPopover
          leading={(
            <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg", activeEventTone.lead)}>
              <ActiveEventIcon className="size-6" />
            </div>
          )}
          title={activeEvent.title}
          onClose={onCloseEvent}
          badges={eventBadges}
          details={eventDetails}
        />
      ) : null}

      {activeTsunami ? (
        <UnifiedSignalPopover
          leading={(
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-700 dark:bg-sky-500/30 dark:text-sky-200">
              <Waves className="size-6" />
            </div>
          )}
          title={activeTsunami.headline}
          onClose={onCloseEvent}
          badges={tsunamiBadges}
          details={tsunamiDetails}
          footerAction={activeTsunami.url ? {
            label: "View Source",
            url: activeTsunami.url,
            ariaLabel: "View NWS tsunami source",
          } : undefined}
        />
      ) : null}

      {activeAirQuality ? (
        <UnifiedSignalPopover
          leading={(
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-200">
              <Wind className="size-6" />
            </div>
          )}
          title={activeAirQuality.location}
          onClose={onCloseEvent}
          badges={airQualityBadges}
          details={airQualityDetails}
        />
      ) : null}
    </div>,
    overlayContainer
  );
}

