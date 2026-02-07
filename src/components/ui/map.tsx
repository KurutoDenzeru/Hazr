"use client";

import MapLibreGL, { type PopupOptions, type MarkerOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, Locate, Maximize, Loader2, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import React from "react";

type MapContextValue = {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
};

const MapContext = createContext<MapContextValue | null>(null);

function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within a Map component");
  }
  return context;
}

const defaultStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

type MapStyleOption = string | MapLibreGL.StyleSpecification;

type MapProps = {
  children?: ReactNode;
  /** Custom map styles for light and dark themes. Overrides the default Carto styles. */
  styles?: {
    light?: MapStyleOption;
    dark?: MapStyleOption;
  };
  /** Prefer high-performance GPU rendering context when available. */
  preferHighPerformanceGpu?: boolean;
  /** Optional fallback UI when WebGL is unavailable. */
  unsupportedFallback?: ReactNode;
  /** Callback fired when WebGL is unavailable on the device/browser. */
  onWebGLUnsupported?: () => void;
} & Omit<MapLibreGL.MapOptions, "container" | "style">;

type MapRef = MapLibreGL.Map;

const DefaultLoader = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="flex gap-1">
      <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
      <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
    </div>
  </div>
);

const DEFAULT_UNSUPPORTED_FALLBACK = (
  <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-4">
    <div className="max-w-md rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-amber-500" aria-hidden="true" />
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">WebGL is unavailable</p>
          <p className="text-sm text-muted-foreground">
            Hardware-accelerated map rendering is disabled in this browser or device.
            Enable graphics acceleration or switch to a WebGL-capable browser.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const isWebGLAvailable = () => {
  if (typeof window === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    if (!canvas) return false;

    const contextOptions: WebGLContextAttributes = {
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
    };

    const webgl2Context = canvas.getContext("webgl2", contextOptions);
    if (webgl2Context) return true;

    const webglContext = canvas.getContext("webgl", contextOptions);
    return Boolean(webglContext);
  } catch {
    return false;
  }
};

const Map = forwardRef<MapRef, MapProps>(function Map(
  {
    children,
    styles,
    preferHighPerformanceGpu = true,
    unsupportedFallback,
    onWebGLUnsupported,
    ...props
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [isWebGLUnsupported, setIsWebGLUnsupported] = useState(false);
  const [hasCheckedWebGL, setHasCheckedWebGL] = useState(false);
  const { resolvedTheme } = useTheme();
  const currentStyleRef = useRef<MapStyleOption | null>(null);

  const mapStyles = useMemo(
    () => ({
      dark: styles?.dark ?? defaultStyles.dark,
      light: styles?.light ?? defaultStyles.light,
    }),
    [styles]
  );

  useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [mapInstance]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!isWebGLAvailable()) {
      setHasCheckedWebGL(true);
      setIsWebGLUnsupported(true);
      onWebGLUnsupported?.();
      return;
    }

    const initialStyle =
      resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;
    currentStyleRef.current = initialStyle;

    const canvasContextAttributes: MapLibreGL.WebGLContextAttributesWithType = {
      ...((preferHighPerformanceGpu
        ? {
            antialias: false,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
            desynchronized: true,
          }
        : {}) as MapLibreGL.WebGLContextAttributesWithType),
      ...(props.canvasContextAttributes ?? {}),
    };

    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: initialStyle,
      renderWorldCopies: true,
      attributionControl: false,
      refreshExpiredTiles: props.refreshExpiredTiles ?? false,
      maxTileCacheSize: props.maxTileCacheSize ?? 512,
      cancelPendingTileRequestsWhileZooming:
        props.cancelPendingTileRequestsWhileZooming ?? true,
      ...props,
      canvasContextAttributes,
    });

    const styleDataHandler = () => setIsStyleLoaded(true);
    const loadHandler = () => setIsLoaded(true);

    map.on("load", loadHandler);
    map.on("styledata", styleDataHandler);
    setMapInstance(map);
    setHasCheckedWebGL(true);
    setIsWebGLUnsupported(false);

    return () => {
      map.off("load", loadHandler);
      map.off("styledata", styleDataHandler);
      map.remove();
      setIsLoaded(false);
      setIsStyleLoaded(false);
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstance || !resolvedTheme) return;

    const newStyle =
      resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;

    if (currentStyleRef.current === newStyle) return;

    currentStyleRef.current = newStyle;
    setIsStyleLoaded(false);

    const frameId = requestAnimationFrame(() => {
      mapInstance.setStyle(newStyle, { diff: true });
    });

    return () => cancelAnimationFrame(frameId);
  }, [mapInstance, resolvedTheme, mapStyles]);

  const isLoading = !isLoaded || !isStyleLoaded;

  const contextValue = useMemo(
    () => ({
      map: mapInstance,
      isLoaded: isLoaded && isStyleLoaded,
    }),
    [mapInstance, isLoaded, isStyleLoaded]
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative w-full h-full">
        {!hasCheckedWebGL && <DefaultLoader />}
        {hasCheckedWebGL && isWebGLUnsupported && (unsupportedFallback ?? DEFAULT_UNSUPPORTED_FALLBACK)}
        {!isWebGLUnsupported && isLoading && <DefaultLoader />}
        {/* SSR-safe: children render only when map is loaded on client */}
        {!isWebGLUnsupported && mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

type MarkerContextValue = {
  marker: MapLibreGL.Marker;
  map: MapLibreGL.Map | null;
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

function useMarkerContext() {
  const context = useContext(MarkerContext);
  if (!context) {
    throw new Error("Marker components must be used within MapMarker");
  }
  return context;
}

type MapMarkerProps = {
  /** Longitude coordinate for marker position */
  longitude: number;
  /** Latitude coordinate for marker position */
  latitude: number;
  /** Marker subcomponents (MarkerContent, MarkerPopup, MarkerTooltip, MarkerLabel) */
  children: ReactNode;
  /** Callback when marker is clicked */
  onClick?: (e: MouseEvent) => void;
  /** Callback when mouse enters marker */
  onMouseEnter?: (e: MouseEvent) => void;
  /** Callback when mouse leaves marker */
  onMouseLeave?: (e: MouseEvent) => void;
  /** Callback when marker drag starts (requires draggable: true) */
  onDragStart?: (lngLat: { lng: number; lat: number }) => void;
  /** Callback during marker drag (requires draggable: true) */
  onDrag?: (lngLat: { lng: number; lat: number }) => void;
  /** Callback when marker drag ends (requires draggable: true) */
  onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
} & Omit<MarkerOptions, "element">;

function MapMarker({
  longitude,
  latitude,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDrag,
  onDragEnd,
  draggable = false,
  ...markerOptions
}: MapMarkerProps) {
  const { map } = useMap();

  const marker = useMemo(() => {
    const markerInstance = new MapLibreGL.Marker({
      ...markerOptions,
      element: document.createElement("div"),
      draggable,
    }).setLngLat([longitude, latitude]);

    const handleClick = (e: MouseEvent) => onClick?.(e);
    const handleMouseEnter = (e: MouseEvent) => onMouseEnter?.(e);
    const handleMouseLeave = (e: MouseEvent) => onMouseLeave?.(e);

    markerInstance.getElement()?.addEventListener("click", handleClick);
    markerInstance
      .getElement()
      ?.addEventListener("mouseenter", handleMouseEnter);
    markerInstance
      .getElement()
      ?.addEventListener("mouseleave", handleMouseLeave);

    const handleDragStart = () => {
      const lngLat = markerInstance.getLngLat();
      onDragStart?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDrag = () => {
      const lngLat = markerInstance.getLngLat();
      onDrag?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDragEnd = () => {
      const lngLat = markerInstance.getLngLat();
      onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
    };

    markerInstance.on("dragstart", handleDragStart);
    markerInstance.on("drag", handleDrag);
    markerInstance.on("dragend", handleDragEnd);

    return markerInstance;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;

    marker.addTo(map);

    return () => {
      marker.remove();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (
    marker.getLngLat().lng !== longitude ||
    marker.getLngLat().lat !== latitude
  ) {
    marker.setLngLat([longitude, latitude]);
  }
  if (marker.isDraggable() !== draggable) {
    marker.setDraggable(draggable);
  }

  const currentOffset = marker.getOffset();
  const newOffset = markerOptions.offset ?? [0, 0];
  const [newOffsetX, newOffsetY] = Array.isArray(newOffset)
    ? newOffset
    : [newOffset.x, newOffset.y];
  if (currentOffset.x !== newOffsetX || currentOffset.y !== newOffsetY) {
    marker.setOffset(newOffset);
  }

  if (marker.getRotation() !== markerOptions.rotation) {
    marker.setRotation(markerOptions.rotation ?? 0);
  }
  if (marker.getRotationAlignment() !== markerOptions.rotationAlignment) {
    marker.setRotationAlignment(markerOptions.rotationAlignment ?? "auto");
  }
  if (marker.getPitchAlignment() !== markerOptions.pitchAlignment) {
    marker.setPitchAlignment(markerOptions.pitchAlignment ?? "auto");
  }

  return (
    <MarkerContext.Provider value={{ marker, map }}>
      {children}
    </MarkerContext.Provider>
  );
}

type MarkerContentProps = {
  /** Custom marker content. Defaults to a blue dot if not provided */
  children?: ReactNode;
  /** Additional CSS classes for the marker container */
  className?: string;
};

function MarkerContent({ children, className }: MarkerContentProps) {
  const { marker } = useMarkerContext();

  return createPortal(
    <div className={cn("relative cursor-pointer", className)}>
      {children || <DefaultMarkerIcon />}
    </div>,
    marker.getElement()
  );
}

function DefaultMarkerIcon() {
  return (
    <div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
  );
}

type MarkerPopupProps = {
  /** Popup content */
  children: ReactNode;
  /** Additional CSS classes for the popup container */
  className?: string;
  /** Show a close button in the popup (default: false) */
  closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

function MarkerPopup({
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MarkerPopupProps) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const prevPopupOptions = useRef(popupOptions);

  const popup = useMemo(() => {
    const popupInstance = new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    })
      .setMaxWidth("none")
      .setDOMContent(container);

    return popupInstance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;

    popup.setDOMContent(container);
    marker.setPopup(popup);

    return () => {
      marker.setPopup(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (popup.isOpen()) {
    const prev = prevPopupOptions.current;

    if (prev.offset !== popupOptions.offset) {
      popup.setOffset(popupOptions.offset ?? 16);
    }
    if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
      popup.setMaxWidth(popupOptions.maxWidth ?? "none");
    }

    prevPopupOptions.current = popupOptions;
  }

  const handleClose = () => popup.remove();

  return createPortal(
    <div
      className={cn(
        "relative rounded-md border bg-popover p-3 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {closeButton && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-1 right-1 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>,
    container
  );
}

type MarkerTooltipProps = {
  /** Tooltip content */
  children: ReactNode;
  /** Additional CSS classes for the tooltip container */
  className?: string;
} & Omit<PopupOptions, "className" | "closeButton" | "closeOnClick">;

function MarkerTooltip({
  children,
  className,
  ...popupOptions
}: MarkerTooltipProps) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const prevTooltipOptions = useRef(popupOptions);

  const tooltip = useMemo(() => {
    const tooltipInstance = new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeOnClick: true,
      closeButton: false,
    }).setMaxWidth("none");

    return tooltipInstance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;

    tooltip.setDOMContent(container);

    const handleMouseEnter = () => {
      tooltip.setLngLat(marker.getLngLat()).addTo(map);
    };
    const handleMouseLeave = () => tooltip.remove();

    marker.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    marker.getElement()?.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      marker.getElement()?.removeEventListener("mouseenter", handleMouseEnter);
      marker.getElement()?.removeEventListener("mouseleave", handleMouseLeave);
      tooltip.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (tooltip.isOpen()) {
    const prev = prevTooltipOptions.current;

    if (prev.offset !== popupOptions.offset) {
      tooltip.setOffset(popupOptions.offset ?? 16);
    }
    if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
      tooltip.setMaxWidth(popupOptions.maxWidth ?? "none");
    }

    prevTooltipOptions.current = popupOptions;
  }

  return createPortal(
    <div
      className={cn(
        "rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {children}
    </div>,
    container
  );
}

type MarkerLabelProps = {
  /** Label text content */
  children: ReactNode;
  /** Additional CSS classes for the label */
  className?: string;
  /** Position of the label relative to the marker (default: "top") */
  position?: "top" | "bottom";
};

function MarkerLabel({
  children,
  className,
  position = "top",
}: MarkerLabelProps) {
  const positionClasses = {
    top: "bottom-full mb-1",
    bottom: "top-full mt-1",
  };

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 whitespace-nowrap",
        "text-[10px] font-medium text-foreground",
        positionClasses[position],
        className
      )}
    >
      {children}
    </div>
  );
}

type MapControlsProps = {
  /** Position of the controls on the map (default: "bottom-right") */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Show zoom in/out buttons (default: true) */
  showZoom?: boolean;
  /** Show compass button to reset bearing (default: false) */
  showCompass?: boolean;
  /** Show locate button to find user's location (default: false) */
  showLocate?: boolean;
  /** Show fullscreen toggle button (default: false) */
  showFullscreen?: boolean;
  /** Additional CSS classes for the controls container */
  className?: string;
  /** Callback with user coordinates when located */
  onLocate?: (coords: { longitude: number; latitude: number }) => void;
};

const positionClasses = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-10 right-2",
};

function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-md border border-border bg-background shadow-sm overflow-hidden [&>button:not(:last-child)]:border-b [&>button:not(:last-child)]:border-border">
      {children}
    </div>
  );
}

type ControlButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "children" | "aria-label"
> & {
  label: string;
  children: React.ReactNode;
};

const ControlButton = forwardRef<HTMLButtonElement, ControlButtonProps>(
  function ControlButton(
    { label, children, className, type, disabled, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        aria-label={label}
        className={cn(
          "flex items-center justify-center size-8 hover:bg-accent dark:hover:bg-accent/40 transition-colors",
          disabled && "opacity-50 pointer-events-none cursor-not-allowed",
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

function MapControls({
  position = "bottom-right",
  showZoom = true,
  showCompass = false,
  showLocate = false,
  showFullscreen = false,
  className,
  onLocate,
}: MapControlsProps) {
  const { map, isLoaded } = useMap();
  const [waitingForLocation, setWaitingForLocation] = useState(false);

  const handleZoomIn = useCallback(() => {
    map?.zoomTo(map.getZoom() + 1, { duration: 300 });
  }, [map]);

  const handleZoomOut = useCallback(() => {
    map?.zoomTo(map.getZoom() - 1, { duration: 300 });
  }, [map]);

  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  const handleResetBearing = useCallback(() => {
    map?.easeTo({ bearing: 0, pitch: 0, duration: 900, easing: ease, essential: true });
  }, [map]);

  const handleLocate = useCallback(() => {
    setWaitingForLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
          };
          map?.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: 17,
            duration: 2500,
            curve: 1.42,
            speed: 0.6,
            essential: true,
            easing: (t) => 1 - Math.pow(1 - t, 3),
          });
          onLocate?.(coords);
          setWaitingForLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setWaitingForLocation(false);
        }
      );
    }
  }, [map, onLocate]);

  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, [map]);

  if (!isLoaded) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "absolute z-10 flex flex-col gap-1.5",
          positionClasses[position],
          className
        )}
      >
        {showZoom && (
          <ControlGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <ControlButton onClick={handleZoomIn} label="Zoom in">
                  <Plus className="size-4" />
                </ControlButton>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>Zoom in</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <ControlButton onClick={handleZoomOut} label="Zoom out">
                  <Minus className="size-4" />
                </ControlButton>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>Zoom out</TooltipContent>
            </Tooltip>
          </ControlGroup>
        )}

        {showCompass && (
          <ControlGroup>
            <CompassButton onClick={handleResetBearing} />
          </ControlGroup>
        )}

        {showLocate && (
          <ControlGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <ControlButton
                  onClick={handleLocate}
                  label="Find my location"
                  disabled={waitingForLocation}
                >
                  {waitingForLocation ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Locate className="size-4" />
                  )}
                </ControlButton>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>Your location</TooltipContent>
            </Tooltip>
          </ControlGroup>
        )}

        {showFullscreen && (
          <ControlGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <ControlButton onClick={handleFullscreen} label="Toggle fullscreen">
                  <Maximize className="size-4" />
                </ControlButton>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8}>Fullscreen</TooltipContent>
            </Tooltip>
          </ControlGroup>
        )}
      </div>
    </TooltipProvider>
  );
}

function CompassButton({ onClick }: { onClick: () => void }) {
  const { isLoaded, map } = useMap();
  const compassRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!isLoaded || !map || !compassRef.current) return;

    const compass = compassRef.current;

    const updateRotation = () => {
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      compass.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`;
    };

    map.on("rotate", updateRotation);
    map.on("pitch", updateRotation);
    updateRotation();

    return () => {
      map.off("rotate", updateRotation);
      map.off("pitch", updateRotation);
    };
  }, [isLoaded, map]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ControlButton onClick={onClick} label="Reset bearing to north">
          <svg
            ref={compassRef}
            viewBox="0 0 24 24"
            className="size-5 transition-transform duration-200"
            style={{ transformStyle: "preserve-3d" }}
          >
            <path d="M12 2L16 12H12V2Z" className="fill-red-500" />
            <path d="M12 2L8 12H12V2Z" className="fill-red-300" />
            <path
              d="M12 22L16 12H12V22Z"
              className="fill-muted-foreground/60"
            />
            <path
              d="M12 22L8 12H12V22Z"
              className="fill-muted-foreground/30"
            />
          </svg>
        </ControlButton>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={8}>Reset north</TooltipContent>
    </Tooltip>
  );
}

type MapPopupProps = {
  /** Longitude coordinate for popup position */
  longitude: number;
  /** Latitude coordinate for popup position */
  latitude: number;
  /** Callback when popup is closed */
  onClose?: () => void;
  /** Popup content */
  children: ReactNode;
  /** Additional CSS classes for the popup container */
  className?: string;
  /** Show a close button in the popup (default: false) */
  closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

function MapPopup({
  longitude,
  latitude,
  onClose,
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MapPopupProps) {
  const { map } = useMap();
  const popupOptionsRef = useRef(popupOptions);
  const container = useMemo(() => document.createElement("div"), []);

  const popup = useMemo(() => {
    const popupInstance = new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    })
      .setMaxWidth("none")
      .setLngLat([longitude, latitude]);

    return popupInstance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;

    const onCloseProp = () => onClose?.();
    popup.on("close", onCloseProp);

    popup.setDOMContent(container);
    popup.addTo(map);

    return () => {
      popup.off("close", onCloseProp);
      if (popup.isOpen()) {
        popup.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (popup.isOpen()) {
    const prev = popupOptionsRef.current;

    if (
      popup.getLngLat().lng !== longitude ||
      popup.getLngLat().lat !== latitude
    ) {
      popup.setLngLat([longitude, latitude]);
    }

    if (prev.offset !== popupOptions.offset) {
      popup.setOffset(popupOptions.offset ?? 16);
    }
    if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
      popup.setMaxWidth(popupOptions.maxWidth ?? "none");
    }
    popupOptionsRef.current = popupOptions;
  }

  const handleClose = () => {
    popup.remove();
    onClose?.();
  };

  return createPortal(
    <div
      className={cn(
        "relative rounded-md border bg-popover p-3 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {closeButton && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-1 right-1 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>,
    container
  );
}

type MapRouteProps = {
  /** Optional unique identifier for the route layer */
  id?: string;
  /** Array of [longitude, latitude] coordinate pairs defining the route */
  coordinates: [number, number][];
  /** Line color as CSS color value (default: "#4285F4") */
  color?: string;
  /** Line width in pixels (default: 3) */
  width?: number;
  /** Line opacity from 0 to 1 (default: 0.8) */
  opacity?: number;
  /** Dash pattern [dash length, gap length] for dashed lines */
  dashArray?: [number, number];
  /** Callback when the route line is clicked */
  onClick?: () => void;
  /** Callback when mouse enters the route line */
  onMouseEnter?: () => void;
  /** Callback when mouse leaves the route line */
  onMouseLeave?: () => void;
  /** Whether the route is interactive - shows pointer cursor on hover (default: true) */
  interactive?: boolean;
};

function MapRoute({
  id: propId,
  coordinates,
  color = "#4285F4",
  width = 3,
  opacity = 0.8,
  dashArray,
  onClick,
  onMouseEnter,
  onMouseLeave,
  interactive = true,
}: MapRouteProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  // Add source and layer on mount
  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": width,
        "line-opacity": opacity,
        ...(dashArray && { "line-dasharray": dashArray }),
      },
    });

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  // When coordinates change, update the source data
  useEffect(() => {
    if (!isLoaded || !map || coordinates.length < 2) return;

    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      });
    }
  }, [isLoaded, map, coordinates, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;

    map.setPaintProperty(layerId, "line-color", color);
    map.setPaintProperty(layerId, "line-width", width);
    map.setPaintProperty(layerId, "line-opacity", opacity);
    if (dashArray) {
      map.setPaintProperty(layerId, "line-dasharray", dashArray);
    }
  }, [isLoaded, map, layerId, color, width, opacity, dashArray]);

  // Handle click and hover events
  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;

    const handleClick = () => {
      onClick?.();
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
      onMouseEnter?.();
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      onMouseLeave?.();
    };

    map.on("click", layerId, handleClick);
    map.on("mouseenter", layerId, handleMouseEnter);
    map.on("mouseleave", layerId, handleMouseLeave);

    return () => {
      map.off("click", layerId, handleClick);
      map.off("mouseenter", layerId, handleMouseEnter);
      map.off("mouseleave", layerId, handleMouseLeave);
    };
  }, [
    isLoaded,
    map,
    layerId,
    onClick,
    onMouseEnter,
    onMouseLeave,
    interactive,
  ]);

  return null;
}

type MapClusterLayerProps<
  P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties
> = {
  /** GeoJSON FeatureCollection data or URL to fetch GeoJSON from */
  data: string | GeoJSON.FeatureCollection<GeoJSON.Point, P>;
  /** Whether the cluster layer is visible (default: true) */
  visible?: boolean;
  /** Optional text prefix for cluster count labels */
  labelPrefix?: string;
  /** Optional label for cluster pills */
  clusterLabel?: string;
  /** Optional icon for cluster pills */
  clusterIcon?: React.ComponentType<{ className?: string }>;
  /** Optional property name for unclustered point labels */
  pointLabelField?: string;
  /** Color for unclustered point labels */
  pointLabelColor?: string;
  /** Optional label offset for unclustered point labels */
  pointLabelOffset?: [number, number];
  /** Optional label size for unclustered point labels */
  pointLabelSize?: number;
  /** Optional label halo color for unclustered point labels */
  pointLabelHaloColor?: string;
  /** Optional label halo width for unclustered point labels */
  pointLabelHaloWidth?: number;
  /** Whether unclustered labels are visible (default: true) */
  pointLabelVisible?: boolean;
  /** Maximum zoom level to cluster points on (default: 14) */
  clusterMaxZoom?: number;
  /** Radius of each cluster when clustering points in pixels (default: 50) */
  clusterRadius?: number;
  /** Colors for cluster circles: [small, medium, large] based on point count (default: ["#51bbd6", "#f1f075", "#f28cb1"]) */
  clusterColors?: [string, string, string];
  /** Point count thresholds for color/size steps: [medium, large] (default: [100, 750]) */
  clusterThresholds?: [number, number];
  /** Color for unclustered individual points (default: "#3b82f6") */
  pointColor?: string;
  /** Callback when an unclustered point is clicked */
  onPointClick?: (
    feature: GeoJSON.Feature<GeoJSON.Point, P>,
    coordinates: [number, number]
  ) => void;
  /** Callback when a cluster is clicked. If not provided, zooms into the cluster */
  onClusterClick?: (
    clusterId: number,
    coordinates: [number, number],
    pointCount: number
  ) => void;
};

function MapClusterLayer<
  P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties
>({
  data,
  visible = true,
  labelPrefix,
  clusterLabel,
  clusterIcon: ClusterIcon,
  clusterMaxZoom = 14,
  clusterRadius = 50,
  clusterColors = ["#51bbd6", "#f1f075", "#f28cb1"],
  clusterThresholds = [100, 750],
  onClusterClick,
}: MapClusterLayerProps<P>) {
  const { map, isLoaded } = useMap();
  const id = useId();
  const sourceId = `cluster-source-${id}`;
  const rafRef = useRef<number | null>(null);
  const isMovingRef = useRef(false);
  const lastSignatureRef = useRef("");
  const [clusters, setClusters] = useState<
    GeoJSON.Feature<GeoJSON.Point, P>[]
  >([]);

  const getClusterTone = useCallback(
    (pointCount: number) => {
      if (pointCount < clusterThresholds[0]) return clusterColors[0];
      if (pointCount < clusterThresholds[1]) return clusterColors[1];
      return clusterColors[2];
    },
    [clusterColors, clusterThresholds]
  );

  const formatCount = useCallback((count: number) => {
    try {
      return new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(count);
    } catch {
      return `${count}`;
    }
  }, []);

  // Add source on mount
  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "geojson",
      data,
      cluster: true,
      clusterMaxZoom,
      clusterRadius,
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [isLoaded, map, data, clusterMaxZoom, clusterRadius, sourceId]);

  // Update source data when data prop changes (only for non-URL data)
  useEffect(() => {
    if (!isLoaded || !map || typeof data === "string") return;

    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    if (source) {
      source.setData(data);
    }
  }, [isLoaded, map, data, sourceId]);

  const refreshClusters = useCallback(() => {
    if (!map || !isLoaded || !visible || isMovingRef.current) {
      if (lastSignatureRef.current !== "") {
        lastSignatureRef.current = "";
        setClusters([]);
      }
      return;
    }
    if (!map.getSource(sourceId)) return;

    const features = map.querySourceFeatures(sourceId, {
      filter: ["has", "point_count"],
    }) as unknown as GeoJSON.Feature<GeoJSON.Point, P>[];

    const unique = new globalThis.Map<number, GeoJSON.Feature<GeoJSON.Point, P>>();
    for (const feature of features) {
      const clusterId = feature.properties?.cluster_id as number | undefined;
      if (typeof clusterId === "number" && !unique.has(clusterId)) {
        unique.set(clusterId, feature);
      }
    }

    const nextClusters = Array.from(unique.values());
    const signature = nextClusters
      .map((feature) => {
        const clusterId = feature.properties?.cluster_id as number | undefined;
        const pointCount = feature.properties?.point_count as number | undefined;
        if (typeof clusterId !== "number" || typeof pointCount !== "number") {
          return "";
        }
        return `${clusterId}:${pointCount}`;
      })
      .sort()
      .join("|");

    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;
    setClusters(nextClusters);
  }, [isLoaded, map, sourceId, visible]);

  const scheduleRefresh = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      refreshClusters();
    });
  }, [refreshClusters]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMoveStart = () => {
      isMovingRef.current = true;
    };
    const handleMoveSettled = () => {
      isMovingRef.current = false;
      scheduleRefresh();
    };

    scheduleRefresh();
    map.on("movestart", handleMoveStart);
    map.on("zoomstart", handleMoveStart);
    map.on("moveend", handleMoveSettled);
    map.on("zoomend", handleMoveSettled);
    map.on("idle", scheduleRefresh);

    return () => {
      map.off("movestart", handleMoveStart);
      map.off("zoomstart", handleMoveStart);
      map.off("moveend", handleMoveSettled);
      map.off("zoomend", handleMoveSettled);
      map.off("idle", scheduleRefresh);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isLoaded, map, scheduleRefresh]);

  if (!visible) return null;

  const labelText = clusterLabel ?? labelPrefix ?? "Cluster";

  return (
    <>
      {clusters.map((feature) => {
        const clusterId = feature.properties?.cluster_id as number | undefined;
        if (typeof clusterId !== "number") return null;
        const pointCount = feature.properties?.point_count as number | undefined;
        if (typeof pointCount !== "number") return null;
        const coordinates =
          feature.geometry?.type === "Point"
            ? (feature.geometry.coordinates as [number, number])
            : null;
        if (!coordinates) return null;
        const tone = getClusterTone(pointCount);
        const countLabel = formatCount(pointCount);

        const handleClusterClick = async () => {
          if (!map) return;
          if (onClusterClick) {
            onClusterClick(clusterId, coordinates, pointCount);
            return;
          }
          const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: coordinates, zoom });
        };

        return (
          <MapMarker
            key={`cluster-${clusterId}`}
            longitude={coordinates[0]}
            latitude={coordinates[1]}
          >
            <MarkerContent>
              <button
                type="button"
                onClick={handleClusterClick}
                aria-label={`${labelText} cluster: ${pointCount}`}
                className={cn(
                  "group relative flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                  "hover:scale-105"
                )}
                style={{
                  backgroundColor: tone,
                }}
              >
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-white/90">
                  {ClusterIcon ? (
                    <ClusterIcon className="size-3.5" />
                  ) : (
                    <span className="text-[10px] font-bold" style={{ color: tone }}>
                      {labelPrefix ?? "C"}
                    </span>
                  )}
                </span>
                <span className="truncate max-w-27.5">
                  {labelText} {countLabel}
                </span>
              </button>
            </MarkerContent>
          </MapMarker>
        );
      })}
    </>
  );
}

export {
  Map,
  useMap,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MarkerLabel,
  MapPopup,
  MapControls,
  MapRoute,
  MapClusterLayer,
};

export type { MapRef };
