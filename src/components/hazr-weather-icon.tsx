"use client";

import * as React from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from "lucide-react";
import type { WeatherCode } from "@/types/api";
import { getWeatherIcon } from "@/hooks/use-weather";

interface WeatherIconProps {
  code: WeatherCode;
  isDay: boolean;
  className?: string;
}

const WeatherIcon = ({ code, isDay, className }: WeatherIconProps) => {
  const iconName = getWeatherIcon(code, isDay);

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    sun: Sun,
    moon: Moon,
    "cloud-sun": CloudSun,
    "cloud-moon": CloudMoon,
    cloud: Cloud,
    "cloud-fog": CloudFog,
    "cloud-drizzle": CloudDrizzle,
    "cloud-rain": CloudRain,
    "cloud-snow": CloudSnow,
    "cloud-lightning": CloudLightning,
  };

  const Icon = iconMap[iconName] || Cloud;
  return <Icon className={className} />;
};

export { WeatherIcon };
