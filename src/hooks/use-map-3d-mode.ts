import * as React from "react";
import { useMap } from "@/components/ui/map";
import type { Map as MapLibreMap } from "maplibre-gl";

type GlobeCapableMap = MapLibreMap & {
  setProjection: (projection: { type: "globe" | "mercator" }) => void;
  setFog?: (fog?: {
    color?: string;
    "high-color"?: string;
    "horizon-blend"?: number;
    range?: [number, number];
  }) => void;
};

export function useMap3DMode(
  on3DModeChange?: (enabled: boolean) => void,
  onGlobeModeChange?: (enabled: boolean) => void
) {
  const { map } = useMap();
  const [is3D, setIs3D] = React.useState(false);
  const [isGlobe, setIsGlobe] = React.useState(false);
  
  const is3DEnabledRef = React.useRef(false);
  const isGlobeEnabledRef = React.useRef(false);
  const sync3DBuildingsRef = React.useRef<(() => void) | null>(null);
  const syncGlobeRef = React.useRef<(() => void) | null>(null);
  const buildingLayerVisibilityRef = React.useRef<Record<string, "visible" | "none" | undefined>>({});

  React.useEffect(() => {
    is3DEnabledRef.current = is3D;
    on3DModeChange?.(is3D);
  }, [is3D, on3DModeChange]);

  React.useEffect(() => {
    isGlobeEnabledRef.current = isGlobe;
    onGlobeModeChange?.(isGlobe);
  }, [isGlobe, onGlobeModeChange]);

  React.useEffect(() => {
    if (!map) return;

    const globeMap = map as GlobeCapableMap;
    const layerId = "3d-buildings";
    type StyleLayerLike = {
      id: string;
      type?: string;
      source?: string;
      "source-layer"?: string;
      layout?: {
        visibility?: "visible" | "none";
      };
      minzoom?: number;
    };

    const setLayerVisibilitySafe = (targetLayerId: string, visibility: "visible" | "none") => {
      try {
        globeMap.setLayoutProperty(targetLayerId, "visibility", visibility);
      } catch {
      }
    };

    const isBuildingSourceLayer = (sourceLayerName?: string) => {
      return typeof sourceLayerName === "string" && sourceLayerName.toLowerCase().includes("building");
    };

    const getBuildingFillLayers = () => {
      const styleLayers = (globeMap.getStyle()?.layers ?? []) as StyleLayerLike[];
      return styleLayers.filter((layer) => {
        if (layer.type !== "fill") return false;
        if (typeof layer.source !== "string") return false;
        return isBuildingSourceLayer(layer["source-layer"]);
      });
    };

    const getBuildingExtrusionLayers = () => {
      const styleLayers = (globeMap.getStyle()?.layers ?? []) as StyleLayerLike[];
      return styleLayers.filter((layer) => {
        if (layer.type !== "fill-extrusion") return false;
        if (typeof layer.source !== "string") return false;
        if (isBuildingSourceLayer(layer["source-layer"])) return true;
        return layer.id.toLowerCase().includes("building");
      });
    };

    const hideBuildingFillLayers = () => {
      const buildingFillLayers = getBuildingFillLayers();
      for (const layer of buildingFillLayers) {
        if (!(layer.id in buildingLayerVisibilityRef.current)) {
          buildingLayerVisibilityRef.current[layer.id] = layer.layout?.visibility;
        }
        setLayerVisibilitySafe(layer.id, "none");
      }
    };

    const restoreBuildingFillLayers = () => {
      const originalVisibility = buildingLayerVisibilityRef.current;
      const layerIds = Object.keys(originalVisibility);
      for (const layerIdToRestore of layerIds) {
        setLayerVisibilitySafe(layerIdToRestore, originalVisibility[layerIdToRestore] ?? "visible");
      }
      buildingLayerVisibilityRef.current = {};
    };

    const hideBuildingExtrusions = () => {
      const buildingExtrusionLayers = getBuildingExtrusionLayers();
      for (const layer of buildingExtrusionLayers) {
        if (layer.id === layerId) continue;
        setLayerVisibilitySafe(layer.id, "none");
      }
    };

    const handleGlobe = () => {
      if (!globeMap.getStyle()) return;
      const isGlobeEnabled = isGlobeEnabledRef.current;
      try {
        globeMap.setProjection({ type: isGlobeEnabled ? "globe" : "mercator" });
      } catch {
        // ignore
      }
      
      if (isGlobeEnabled) {
        globeMap.setFog?.({
          color: "#dbeafe",
          "high-color": "#0b172a",
          "horizon-blend": 0.15,
          range: [0.6, 10],
        });
      } else {
        globeMap.setFog?.(undefined);
      }
    };

    const handle3DBuildings = () => {
      if (!globeMap.getStyle()) return;

      const is3DEnabled = is3DEnabledRef.current;

      if (is3DEnabled) {
        hideBuildingFillLayers();
        hideBuildingExtrusions();

        const baseBuildingLayer = getBuildingFillLayers()[0] ?? getBuildingExtrusionLayers()[0];
        if (!baseBuildingLayer?.source || !baseBuildingLayer["source-layer"]) return;

        const styleLayers = globeMap.getStyle().layers ?? [];
        const beforeLayerId = styleLayers.find((layer) => layer.type === "symbol")?.id;
        const minZoom = baseBuildingLayer.minzoom ?? 14.5;

        if (!globeMap.getLayer(layerId)) {
          try {
            globeMap.addLayer(
              {
                id: layerId,
                source: baseBuildingLayer.source,
                "source-layer": baseBuildingLayer["source-layer"],
                type: "fill-extrusion",
                minzoom: minZoom,
                paint: {
                  "fill-extrusion-color": [
                    "interpolate",
                    ["linear"],
                    ["coalesce", ["get", "render_height"], ["get", "height"], 0],
                    0,
                    "#a3a3a3",
                    180,
                    "#737373",
                  ],
                  "fill-extrusion-height": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    minZoom,
                    0,
                    minZoom + 0.1,
                    ["coalesce", ["get", "render_height"], ["get", "height"], 0],
                  ],
                  "fill-extrusion-base": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    minZoom,
                    0,
                    minZoom + 0.1,
                    ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
                  ],
                  "fill-extrusion-opacity": 0.9,
                },
              },
              beforeLayerId,
            );
          } catch {
          }
          return;
        }

        setLayerVisibilitySafe(layerId, "visible");
        return;
      }

      restoreBuildingFillLayers();
      hideBuildingExtrusions();
      if (globeMap.getLayer(layerId)) {
        setLayerVisibilitySafe(layerId, "none");
      }
    };

    const handleStyleLoad = () => {
      buildingLayerVisibilityRef.current = {}; // Clear old visibility state for the new style
      handleGlobe();
      handle3DBuildings();
    };

    const handleStyleData = () => {
      if (!globeMap.getStyle()) return;
      handleGlobe();
      handle3DBuildings();
    };
    
    const handleIdle = () => {
      if (!globeMap.getStyle()) return;
      handleGlobe();
      handle3DBuildings();
    };

    sync3DBuildingsRef.current = handle3DBuildings;
    syncGlobeRef.current = handleGlobe;
    globeMap.on("style.load", handleStyleLoad);
    globeMap.on("styledata", handleStyleData);
    globeMap.on("idle", handleIdle);
    
    if (globeMap.isStyleLoaded()) {
      handleGlobe();
      handle3DBuildings();
    }

    return () => {
      globeMap.off("style.load", handleStyleLoad);
      globeMap.off("styledata", handleStyleData);
      globeMap.off("idle", handleIdle);
      if (sync3DBuildingsRef.current === handle3DBuildings) {
        sync3DBuildingsRef.current = null;
      }
      if (syncGlobeRef.current === handleGlobe) {
        syncGlobeRef.current = null;
      }
    };
  }, [map]);

  React.useEffect(() => {
    if (!map) return;
    if (!map.isStyleLoaded()) return;
    syncGlobeRef.current?.();
  }, [map, isGlobe]);

  React.useEffect(() => {
    if (!map) return;
    if (!map.isStyleLoaded()) return;
    sync3DBuildingsRef.current?.();
  }, [map, is3D]);

  const toggleGlobe = React.useCallback(() => {
    const newGlobe = !isGlobe;
    isGlobeEnabledRef.current = newGlobe;
    setIsGlobe(newGlobe);
    onGlobeModeChange?.(newGlobe);
    
    if (newGlobe && is3D) {
      is3DEnabledRef.current = false;
      setIs3D(false);
      on3DModeChange?.(false);
      sync3DBuildingsRef.current?.();
    }
    
    if (!map) return;

    if (newGlobe) {
      map.easeTo({
        pitch: 0,
        center: [0, 0], // Center the globe!
        zoom: 1, // Zoom out to show the globe
        duration: 1000,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        essential: true,
      });
    }

    syncGlobeRef.current?.();
  }, [isGlobe, is3D, map, onGlobeModeChange, on3DModeChange]);

  const toggle3D = React.useCallback(() => {
    const new3D = !is3D;
    is3DEnabledRef.current = new3D;
    setIs3D(new3D);
    on3DModeChange?.(new3D);
    
    if (new3D && isGlobe) {
      isGlobeEnabledRef.current = false;
      setIsGlobe(false);
      onGlobeModeChange?.(false);
      syncGlobeRef.current?.();
    }
    
    if (!map) return;

    if (new3D) {
      if (!isGlobeEnabledRef.current && map.getZoom() >= 10) {
        map.easeTo({
          pitch: 55,
          duration: 800,
          easing: (t) => 1 - Math.pow(1 - t, 3),
          essential: true,
        });
      }
    } else {
      if (!isGlobeEnabledRef.current && map.getZoom() >= 10) {
        map.easeTo({ pitch: 0, duration: 600, easing: (t) => 1 - Math.pow(1 - t, 3), essential: true });
      }
    }

    sync3DBuildingsRef.current?.();
  }, [is3D, isGlobe, map, on3DModeChange, onGlobeModeChange]);

  return { is3D, toggle3D, isGlobe, toggleGlobe };
}
