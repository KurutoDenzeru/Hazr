"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { EarthquakeMagnitude } from "@/types/api";
import type { AppSettings, DataLayerVisibility } from "@/types/settings";
import { DEFAULT_APP_SETTINGS, DEFAULT_LAYER_VISIBILITY } from "@/types/settings";

type HazrSettingsPanelProps = {
  settings: AppSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
  layerVisibility: DataLayerVisibility;
  onLayerVisibilityChange: React.Dispatch<
    React.SetStateAction<DataLayerVisibility>
  >;
  className?: string;
};

const clampToStep = (value: number, min: number, max: number, step: number) => {
  const clamped = Math.max(min, Math.min(max, value));
  return Math.round(clamped / step) * step;
};

const SourceToggleRow = ({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-background/70 px-3 py-2.5">
    <div className="space-y-0.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

function HazrSettingsPanel({
  settings,
  onSettingsChange,
  layerVisibility,
  onLayerVisibilityChange,
  className,
}: HazrSettingsPanelProps) {
  const updateSettings = (patch: Partial<AppSettings>) => {
    onSettingsChange({
      ...settings,
      ...patch,
    });
  };

  const updateLayerVisibility = (
    key: keyof DataLayerVisibility,
    checked: boolean,
  ) => {
    onLayerVisibilityChange({
      ...layerVisibility,
      [key]: checked,
    });
  };

  const handleReset = () => {
    onSettingsChange(DEFAULT_APP_SETTINGS);
    onLayerVisibilityChange(DEFAULT_LAYER_VISIBILITY);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-md bg-muted/70">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
        </span>
        <div>
          <p className="text-sm font-semibold">Display & Data Settings</p>
          <p className="text-xs text-muted-foreground">
            Control units, source visibility, density, and feed detail.
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="temperature-unit">Temperature Unit</Label>
          <Select
            value={settings.temperatureUnit}
            onValueChange={(value: "celsius" | "fahrenheit") =>
              updateSettings({ temperatureUnit: value })
            }
          >
            <SelectTrigger id="temperature-unit" className="w-36">
              <SelectValue placeholder="Temperature unit" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="celsius">Celsius (°C)</SelectItem>
              <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="usgs-magnitude">USGS Feed Magnitude</Label>
          <Select
            value={settings.earthquakeMagnitude}
            onValueChange={(value: EarthquakeMagnitude) =>
              updateSettings({ earthquakeMagnitude: value })
            }
          >
            <SelectTrigger id="usgs-magnitude" className="w-44">
              <SelectValue placeholder="USGS magnitude" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All Magnitudes</SelectItem>
              <SelectItem value="2.5">M2.5+</SelectItem>
              <SelectItem value="4.5">M4.5+</SelectItem>
              <SelectItem value="significant">Significant Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="cluster-radius">Global Cluster Radius</Label>
            <span className="text-xs text-muted-foreground">
              {settings.globalClusterRadius}px
            </span>
          </div>
          <Slider
            id="cluster-radius"
            min={30}
            max={80}
            step={5}
            value={[settings.globalClusterRadius]}
            onValueChange={(value) =>
              updateSettings({
                globalClusterRadius: clampToStep(value[0] ?? 45, 30, 80, 5),
              })
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="openaq-limit">OpenAQ Site Limit</Label>
            <span className="text-xs text-muted-foreground">{settings.openAqLimit}</span>
          </div>
          <Slider
            id="openaq-limit"
            min={50}
            max={300}
            step={50}
            value={[settings.openAqLimit]}
            onValueChange={(value) =>
              updateSettings({
                openAqLimit: clampToStep(value[0] ?? 200, 50, 300, 50),
              })
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="eonet-limit">NASA EONET Event Limit</Label>
            <span className="text-xs text-muted-foreground">{settings.eonetLimit}</span>
          </div>
          <Slider
            id="eonet-limit"
            min={50}
            max={300}
            step={50}
            value={[settings.eonetLimit]}
            onValueChange={(value) =>
              updateSettings({
                eonetLimit: clampToStep(value[0] ?? 200, 50, 300, 50),
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Source Visibility
        </p>
        <SourceToggleRow
          id="settings-earthquakes"
          label="USGS Earthquakes"
          description="Toggle quake markers and earthquake feed sections."
          checked={layerVisibility.earthquakes}
          onCheckedChange={(checked) => updateLayerVisibility("earthquakes", checked)}
        />
        <SourceToggleRow
          id="settings-eonet"
          label="NASA EONET Live Signals"
          description="Toggle EONET markers and NASA live event cards."
          checked={layerVisibility.eonet}
          onCheckedChange={(checked) => updateLayerVisibility("eonet", checked)}
        />
        <SourceToggleRow
          id="settings-openaq"
          label="OpenAQ"
          description="Toggle OpenAQ markers and air quality station cards."
          checked={layerVisibility.airQuality}
          onCheckedChange={(checked) => updateLayerVisibility("airQuality", checked)}
        />
        <SourceToggleRow
          id="settings-tsunami"
          label="NWS Tsunami Alerts"
          description="Toggle tsunami markers and NWS alert cards."
          checked={layerVisibility.tsunami}
          onCheckedChange={(checked) => updateLayerVisibility("tsunami", checked)}
        />
      </div>

      <Separator />
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset Defaults
        </Button>
      </div>
    </div>
  );
}

export { HazrSettingsPanel };
