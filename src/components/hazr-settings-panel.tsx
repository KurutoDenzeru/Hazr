"use client";

import * as React from "react";
import {
  Activity,
  Layers3,
  SlidersHorizontal,
  Sparkles,
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { EarthquakeMagnitude } from "@/types/api";
import type {
  AppSettings,
  DataLayerVisibility,
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
    <div className={cn("space-y-4", className)}>
      <Tabs defaultValue="display" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="display">
            <Sparkles className="size-4" />
            Display
          </TabsTrigger>
          <TabsTrigger value="data">
            <Activity className="size-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="layers">
            <Layers3 className="size-4" />
            Layers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display" className="space-y-3 pt-2">
          <div className="grid gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${settingsId}-temperature-unit`}>Temperature Unit</Label>
              <Select
                value={settings.temperatureUnit}
                onValueChange={(value: TemperatureUnit) =>
                  updateSettings({ temperatureUnit: value as TemperatureUnit })
                }
              >
                <SelectTrigger id={`${settingsId}-temperature-unit`} className="w-36">
                  <SelectValue placeholder="Temperature unit" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="celsius">Celsius (°C)</SelectItem>
                  <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                  <SelectItem value="kelvin">Kelvin (K)</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`${settingsId}-cluster-radius`}>Global Cluster Radius</Label>
                <span className="text-xs text-muted-foreground">
                  {settings.globalClusterRadius}px
                </span>
              </div>
              <Slider
                id={`${settingsId}-cluster-radius`}
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
                <Label htmlFor={`${settingsId}-cluster-max-zoom`}>
                  Cluster Max Zoom
                </Label>
                <span className="text-xs text-muted-foreground">
                  Z{settings.globalClusterMaxZoom}
                </span>
              </div>
              <Slider
                id={`${settingsId}-cluster-max-zoom`}
                min={4}
                max={9}
                step={1}
                value={[settings.globalClusterMaxZoom]}
                onValueChange={(value) =>
                  updateSettings({
                    globalClusterMaxZoom: clampToStep(value[0] ?? 6, 4, 9, 1),
                  })
                }
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-3 pt-2">
          <div className="grid gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`${settingsId}-openaq-limit`}>OpenAQ Site Limit</Label>
                <span className="text-xs text-muted-foreground">
                  {settings.openAqLimit}
                </span>
              </div>
              <Slider
                id={`${settingsId}-openaq-limit`}
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
                <Label htmlFor={`${settingsId}-eonet-limit`}>NASA EONET Event Limit</Label>
                <span className="text-xs text-muted-foreground">{settings.eonetLimit}</span>
              </div>
              <Slider
                id={`${settingsId}-eonet-limit`}
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
        </TabsContent>

        <TabsContent value="layers" className="space-y-2 pt-2">
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
        </TabsContent>
      </Tabs>
      {showInlineReset && onResetDefaults ? (
        <div className="pt-2">
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
            Configure weather units, source visibility, marker clustering, and
            dataset depth across desktop and mobile.
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
