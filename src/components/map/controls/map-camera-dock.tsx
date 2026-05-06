import * as React from "react";
import { useMap } from "@/components/ui/map";

const formatNormalizedDegrees = (value: number) => {
  const normalized = ((value % 360) + 360) % 360;
  return `${Math.round(normalized)}°`;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const getHaversineDistanceMeters = (
  start: { lng: number; lat: number },
  end: { lng: number; lat: number },
) => {
  const earthRadius = 6371008.8;
  const latDelta = toRadians(end.lat - start.lat);
  const lngDelta = toRadians(end.lng - start.lng);
  const startLat = toRadians(start.lat);
  const endLat = toRadians(end.lat);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};



const formatScaleLabel = (value: number, unit: "km" | "mi") => {
  if (!Number.isFinite(value) || value <= 0) return unit === "km" ? "0 km" : "0 mi";
  if (unit === "km") {
    if (value >= 1) return `${Math.round(value)} km`;
    if (value >= 0.1) return `${Math.round(value * 10) / 10} km`;
    return `${Math.round(value * 1000)} m`;
  }
  // miles
  if (value >= 1) return `${Math.round(value)} mi`;
  if (value >= 0.1) return `${Math.round(value * 10) / 10} mi`;
  return `${Math.round(value * 5280)} ft`;
};

export function MapCameraDock({ is3DModeEnabled }: { is3DModeEnabled: boolean }) {
  const { map } = useMap();
  const [camera, setCamera] = React.useState({
    pitch: 0,
    bearing: 0,
    scaleKilometers: 0,
    scaleMiles: 0,
  });

  React.useEffect(() => {
    if (!map) return;

    const syncCamera = () => {
      const viewportWidth = map.getContainer().clientWidth;
      const viewportHeight = map.getContainer().clientHeight;
      // choose a representative sample length based on the smaller viewport side
      const baseLength = Math.min(viewportWidth, viewportHeight);
      const targetPixels = Math.max(64, Math.min(220, Math.floor(baseLength * 0.18)));
      const centerX = viewportWidth / 2;
      const centerY = viewportHeight / 2;
      const startLngLat = map.unproject([centerX - targetPixels / 2, centerY]);
      const endLngLat = map.unproject([centerX + targetPixels / 2, centerY]);
      const sampledMeters = getHaversineDistanceMeters(startLngLat, endLngLat);
      const sampledKilometers = sampledMeters / 1000;
      const sampledMiles = sampledMeters / 1609.344;

      setCamera({
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        // store raw measurements (not snapped) so formatting can be device/zoom-aware
        scaleKilometers: sampledKilometers,
        scaleMiles: sampledMiles,
      });
    };

    syncCamera();
    map.on("zoom", syncCamera);
    map.on("rotate", syncCamera);
    map.on("pitch", syncCamera);

    return () => {
      map.off("zoom", syncCamera);
      map.off("rotate", syncCamera);
      map.off("pitch", syncCamera);
    };
  }, [map]);

  const metrics: string[] = [
    formatScaleLabel(camera.scaleKilometers, "km"),
    formatScaleLabel(camera.scaleMiles, "mi"),
  ];

  if (is3DModeEnabled) {
    metrics.push(`Pitch ${Math.round(Math.max(0, camera.pitch))}°`);
    metrics.push(`Bearing ${formatNormalizedDegrees(camera.bearing)}`);
  }

  return (
    <div className="pointer-events-auto">
      <div className="rounded-xl border border-white/20 bg-background/45 px-3 py-2 backdrop-blur-xl supports-backdrop-filter:bg-background/35">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex size-6 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10">
            <span className="absolute size-4 rounded-full bg-emerald-300/20 animate-ping" />
            <span className="relative size-2 rounded-full bg-emerald-300" />
          </span>
          <p className="text-sm font-semibold leading-none">
            {metrics.join(" • ")}
          </p>
        </div>
      </div>
    </div>
  );
}


