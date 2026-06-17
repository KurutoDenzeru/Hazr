"use client";

import * as React from "react";
import {
  SlidersHorizontal,
  RotateCw,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { EarthquakeMagnitude } from "@/types/api";
import type {
  AppSettings,
  DataLayerVisibility,
  TimeFormat,
  TemperatureUnit,
} from "@/types/settings";

type HazrSettingsPanelProps = {
  settings: AppSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
  layerVisibility: DataLayerVisibility;
  onLayerVisibilityChange: React.Dispatch<
    React.SetStateAction<DataLayerVisibility>
  >;
  onResetDefaults?: () => void;
  showInlineReset?: boolean;
  className?: string;
};

type HazrSettingsDialogProps = HazrSettingsPanelProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResetDefaults: () => void;
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
  onResetDefaults,
  showInlineReset = false,
  className,
}: HazrSettingsPanelProps) {
  const settingsId = React.useId();

  const updateSettings = (patch: Partial<AppSettings>) => {
    onSettingsChange((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const updateLayerVisibility = (
    key: keyof DataLayerVisibility,
    checked: boolean,
  ) => {
    onLayerVisibilityChange((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  return (
    <div className={cn("space-y-5", className)}>
      {/* Display section */}
      <div>
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Display
        </p>
        <div className="mt-1.5 rounded-lg border border-border/60 bg-muted/15 p-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Temperature Unit</Label>
              <Tabs
                value={settings.temperatureUnit}
                onValueChange={(value) =>
                  updateSettings({ temperatureUnit: value as TemperatureUnit })
                }
              >
                <TabsList className="w-full">
                  <TabsTrigger value="celsius" className="flex-1">°C</TabsTrigger>
                  <TabsTrigger value="fahrenheit" className="flex-1">°F</TabsTrigger>
                  <TabsTrigger value="kelvin" className="flex-1">K</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-1.5">
              <Label>Time Format</Label>
              <Tabs
                value={settings.timeFormat}
                onValueChange={(value) =>
                  updateSettings({ timeFormat: value as TimeFormat })
                }
              >
                <TabsList className="w-full">
                  <TabsTrigger value="12h" className="flex-1">12-hour</TabsTrigger>
                  <TabsTrigger value="24h" className="flex-1">24-hour</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-background/70 px-3 py-2.5">
              <div className="space-y-0.5">
                <Label htmlFor={`${settingsId}-desktop-dock`} className="text-sm font-medium">
                  Desktop Forecast Dock
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show or hide the bottom hourly weather dock on desktop.
                </p>
              </div>
              <Switch
                id={`${settingsId}-desktop-dock`}
                checked={settings.showDesktopForecastDock}
                onCheckedChange={(checked) =>
                  updateSettings({ showDesktopForecastDock: checked })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data section */}
      <div>
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Data
        </p>
        <div className="mt-1.5 rounded-lg border border-border/60 bg-muted/15 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${settingsId}-usgs-magnitude`}>USGS Feed Magnitude</Label>
              <Select
                value={settings.earthquakeMagnitude}
                onValueChange={(value: EarthquakeMagnitude) =>
                  updateSettings({ earthquakeMagnitude: value })
                }
              >
                <SelectTrigger id={`${settingsId}-usgs-magnitude`} className="w-44">
                  <SelectValue placeholder="USGS magnitude" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">All Magnitudes</SelectItem>
                  <SelectItem value="1.0">M1.0+</SelectItem>
                  <SelectItem value="2.5">M2.5+</SelectItem>
                  <SelectItem value="4.5">M4.5+</SelectItem>
                  <SelectItem value="significant">Significant Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${settingsId}-openaq-limit`}>OpenAQ Site Limit</Label>
              <Select
                value={String(settings.openAqLimit)}
                onValueChange={(value) =>
                  updateSettings({ openAqLimit: Number(value) })
                }
              >
                <SelectTrigger id={`${settingsId}-openaq-limit`} className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="150">150</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="300">300</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${settingsId}-eonet-limit`}>NASA EONET Event Limit</Label>
              <Select
                value={String(settings.eonetLimit)}
                onValueChange={(value) =>
                  updateSettings({ eonetLimit: Number(value) })
                }
              >
                <SelectTrigger id={`${settingsId}-eonet-limit`} className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="150">150</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="300">300</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Sources section */}
      <div>
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Sources
        </p>
        <div className="mt-1.5 space-y-2">
          <SourceToggleRow
            id={`${settingsId}-earthquakes`}
            label="USGS Earthquakes"
            description="Toggle quake markers and earthquake feed sections."
            checked={layerVisibility.earthquakes}
            onCheckedChange={(checked) => updateLayerVisibility("earthquakes", checked)}
          />
          <SourceToggleRow
            id={`${settingsId}-eonet`}
            label="NASA EONET Live Signals"
            description="Toggle EONET markers and NASA live event cards."
            checked={layerVisibility.eonet}
            onCheckedChange={(checked) => updateLayerVisibility("eonet", checked)}
          />
          <SourceToggleRow
            id={`${settingsId}-openaq`}
            label="OpenAQ"
            description="Toggle OpenAQ markers and air quality station cards."
            checked={layerVisibility.airQuality}
            onCheckedChange={(checked) => updateLayerVisibility("airQuality", checked)}
          />
          <SourceToggleRow
            id={`${settingsId}-tsunami`}
            label="NWS Tsunami Alerts"
            description="Toggle tsunami markers and NWS alert cards."
            checked={layerVisibility.tsunami}
            onCheckedChange={(checked) => updateLayerVisibility("tsunami", checked)}
          />
        </div>
      </div>

      {showInlineReset && onResetDefaults ? (
        <div className="pt-1">
          <Button variant="outline" className="w-full" onClick={onResetDefaults}>
            Reset Defaults
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function HazrSettingsDialog({
  open,
  onOpenChange,
  onResetDefaults,
  settings,
  onSettingsChange,
  layerVisibility,
  onLayerVisibilityChange,
}: HazrSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-4 p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center">
              <SlidersHorizontal className="size-5" />
            </span>
            Hazr Settings
          </DialogTitle>
          <DialogDescription>
            Configure weather units, source visibility, and dataset depth across
            desktop and mobile.
          </DialogDescription>
        </DialogHeader>

        <HazrSettingsPanel
          settings={settings}
          onSettingsChange={onSettingsChange}
          layerVisibility={layerVisibility}
          onLayerVisibilityChange={onLayerVisibilityChange}
        />

        <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={onResetDefaults}
          >
            <RotateCw className="size-4" aria-hidden="true" />
            Reset Defaults
          </Button>
          <DialogClose asChild>
            <Button className="w-full flex items-center justify-center gap-2">
              <X className="size-4" aria-hidden="true" />
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { HazrSettingsPanel, HazrSettingsDialog };
