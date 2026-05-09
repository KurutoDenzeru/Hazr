import * as React from "react";
import { useMap } from "@/components/ui/map";
import type {
  ProcessedAirQualitySite,
  ProcessedEarthquake,
  ProcessedEonetEvent,
  ProcessedTsunamiAlert,
} from "@/types/api";
import type { MapViewState } from "@/components/map/openstreet-map-helpers";


export function MapStateSync({
  setViewState,
  onUserInteract,
  viewStateKey,
  viewStateSourceKey,
}: {
  setViewState: (s: MapViewState) => void;
  onUserInteract?: () => void;
  viewStateKey: string;
  viewStateSourceKey: string;
}) {
  const { map } = useMap();
  const hasUserInteractedRef = React.useRef(false);

  React.useEffect(() => {
    if (!map) return;

    const markUserInteraction = () => {
      hasUserInteractedRef.current = true;
      onUserInteract?.();
    };

    const handleMoveEnd = () => {
      if (!hasUserInteractedRef.current) return;
      const newState = {
        center: [map.getCenter().lng, map.getCenter().lat] as [number, number],
        zoom: map.getZoom(),
      };
      setViewState(newState);
      try {
        localStorage.setItem(viewStateKey, JSON.stringify(newState));
        localStorage.setItem(viewStateSourceKey, "user");
      } catch {
        // ignore storage errors
      }
    };

    map.on("dragstart", markUserInteraction);
    map.on("zoomstart", markUserInteraction);
    map.on("rotatestart", markUserInteraction);
    map.on("pitchstart", markUserInteraction);
    map.on("moveend", handleMoveEnd);
    return () => {
      map.off("dragstart", markUserInteraction);
      map.off("zoomstart", markUserInteraction);
      map.off("rotatestart", markUserInteraction);
      map.off("pitchstart", markUserInteraction);
      map.off("moveend", handleMoveEnd);
    };
  }, [map, setViewState, onUserInteract, viewStateKey, viewStateSourceKey]);

  return null;
}

export function MapViewController({
  viewState,
  shouldAutoCenter,
}: {
  viewState: MapViewState;
  shouldAutoCenter: boolean;
}) {
  const { map, isLoaded } = useMap();
  const lastAppliedRef = React.useRef<MapViewState | null>(null);

  React.useEffect(() => {
    if (!map || !isLoaded || !shouldAutoCenter) return;

    const lastApplied = lastAppliedRef.current;
    if (
      lastApplied &&
      lastApplied.center[0] === viewState.center[0] &&
      lastApplied.center[1] === viewState.center[1] &&
      lastApplied.zoom === viewState.zoom
    ) {
      return;
    }

    map.easeTo({
      center: viewState.center,
      zoom: viewState.zoom,
      duration: 900,
      essential: true,
    });
    lastAppliedRef.current = viewState;
  }, [map, isLoaded, shouldAutoCenter, viewState]);

  return null;
}

export function EarthquakeFlyTo({
  earthquake,
}: {
  earthquake: ProcessedEarthquake | null;
}) {
  const { map } = useMap();
  const prevEarthquakeId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!map || !earthquake) return;

    if (prevEarthquakeId.current === earthquake.id) return;
    prevEarthquakeId.current = earthquake.id;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    map.stop();
    map.easeTo({
      center: [earthquake.coordinates[0], earthquake.coordinates[1]],
      zoom: Math.max(map.getZoom(), 8),
      duration: 900,
      easing: easeOut,
      essential: true,
    });
  }, [map, earthquake]);

  return null;
}

export function EonetFlyTo({
  event,
}: {
  event: ProcessedEonetEvent | null;
}) {
  const { map } = useMap();

  React.useEffect(() => {
    if (!map || !event) return;

    map.stop();
    map.easeTo({
      center: event.coordinates,
      zoom: Math.max(map.getZoom(), 5.8),
      duration: 900,
      essential: true,
    });
  }, [map, event]);

  return null;
}

export function TsunamiFlyTo({
  alert,
}: {
  alert: ProcessedTsunamiAlert | null;
}) {
  const { map } = useMap();

  React.useEffect(() => {
    if (!map || !alert) return;

    map.stop();
    map.easeTo({
      center: alert.coordinates,
      zoom: Math.max(map.getZoom(), 5.8),
      duration: 900,
      essential: true,
    });
  }, [map, alert]);

  return null;
}

export function AirQualityFlyTo({
  site,
}: {
  site: ProcessedAirQualitySite | null;
}) {
  const { map } = useMap();

  React.useEffect(() => {
    if (!map || !site) return;

    map.stop();
    map.easeTo({
      center: site.coordinates,
      zoom: Math.max(map.getZoom(), 6),
      duration: 900,
      essential: true,
    });
  }, [map, site]);

  return null;
}

