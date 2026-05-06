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
import { toast } from "sonner";
import {
  getLocationErrorMessage,
  requestCurrentCoordinates,
} from "@/lib/browser-geolocation";
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
  const [locationFeedbackMessage, setLocationFeedbackMessage] = useState<string | null>(null);

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

  const handleLocate = useCallback(async () => {
    if (waitingForLocation) return;

    setWaitingForLocation(true);
    setLocationFeedbackMessage(null);

    try {
      const coords = await requestCurrentCoordinates();
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
    } catch (error) {
      const message = getLocationErrorMessage(error);
      setLocationFeedbackMessage(message);
      if (typeof window !== "undefined") {
        toast.error(message, { duration: 6000 });
      }
      console.error("Error getting location:", error);
    } finally {
      setWaitingForLocation(false);
    }
  }, [map, onLocate, waitingForLocation]);

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
                  onPointerDown={() => handleLocate()}
                  onTouchStart={() => handleLocate()}
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
              <TooltipContent side="left" sideOffset={8}>
                {locationFeedbackMessage ?? "Your location"}
              </TooltipContent>
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
  data: string | GeoJSON.FeatureCollection<GeoJSON.Point, P>;
  visible?: boolean;
  labelPrefix?: string;
  clusterLabel?: string;
  clusterIcon?: React.ComponentType<{ className?: string }>;
  pointLabelField?: string;
  pointLabelColor?: string;
  pointLabelOffset?: [number, number];
  pointLabelSize?: number;
  pointLabelHaloColor?: string;
  pointLabelHaloWidth?: number;
  pointLabelVisible?: boolean;
  heatmapColors?: [string, string, string, string, string];
  clusterMaxZoom?: number;
  clusterRadius?: number;
  clusterColors?: [string, string, string];
  clusterThresholds?: [number, number];
  compactAtOrBelowZoom?: number;
  pointColor?: string;
  onPointClick?: (
    feature: GeoJSON.Feature<GeoJSON.Point, P>,
    coordinates: [number, number]
  ) => void;
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
  pointLabelColor,
  pointLabelOffset,
  pointLabelSize,
  pointLabelHaloColor,
  pointLabelHaloWidth,
  pointLabelVisible = true,
  heatmapColors = [
    "#fff7bc",
    "#fee391",
    "#fec44f",
    "#fe9929",
    "#d7301f",
  ],
  clusterMaxZoom,
  clusterRadius,
  clusterColors = ["#51bbd6", "#f1f075", "#f28cb1"],
  clusterThresholds = [100, 750],
  compactAtOrBelowZoom,
  pointColor = "#3b82f6",
  onPointClick,
  onClusterClick,
}: MapClusterLayerProps<P>) {
  const { map, isLoaded } = useMap();
  const id = useId();
  const sourceId = `density-source-${id}`;
  const clusterSourceId = `density-cluster-source-${id}`;
  const heatmapLayerId = `density-heatmap-layer-${id}`;
  const clusterCircleLayerId = `density-cluster-circle-layer-${id}`;
  const clusterCountLayerId = `density-cluster-count-layer-${id}`;
  const pointLayerId = `density-point-layer-${id}`;
  const pointLabelLayerId = `density-point-label-layer-${id}`;

  const sourceFeatureCount = useMemo(() => {
    if (typeof data === "string") return 0;
    return data.features.length;
  }, [data]);

  const resolvedClusterMaxZoom = useMemo(() => {
    if (typeof clusterMaxZoom === "number") return clusterMaxZoom;
    if (sourceFeatureCount >= 1000) return 13;
    if (sourceFeatureCount >= 250) return 12;
    return 11;
  }, [clusterMaxZoom, sourceFeatureCount]);

  const resolvedClusterRadius = useMemo(() => {
    if (typeof clusterRadius === "number") return clusterRadius;
    if (sourceFeatureCount >= 1000) return 60;
    if (sourceFeatureCount >= 250) return 54;
    return 48;
  }, [clusterRadius, sourceFeatureCount]);

  const heatmapFadeStartZoom = useMemo(() => {
    if (typeof compactAtOrBelowZoom === "number") {
      return Math.max(4.2, compactAtOrBelowZoom);
    }
    return 4.5;
  }, [compactAtOrBelowZoom]);

  const resolvedHeatmapMaxZoom = useMemo(() => {
    return Math.min(6.4, heatmapFadeStartZoom + 1.9);
  }, [heatmapFadeStartZoom]);

  const clusterRevealZoom = useMemo(() => {
    return Math.max(7.05, resolvedHeatmapMaxZoom + 0.95);
  }, [resolvedHeatmapMaxZoom]);

  const pointRevealZoom = useMemo(() => {
    return Math.max(8.35, clusterRevealZoom + 1.3);
  }, [clusterRevealZoom]);

  const labelText = clusterLabel ?? labelPrefix ?? "Cluster";
  const pointLabelExpression = useMemo(() => {
    if (!pointLabelVisible) return null;
    return labelPrefix ?? labelText;
  }, [labelPrefix, labelText, pointLabelVisible]);

  const removeLayerSafe = useCallback(
    (layerId: string) => {
      if (!map?.getLayer(layerId)) return;
      map.removeLayer(layerId);
    },
    [map]
  );

  const removeSourceSafe = useCallback(
    (source: string) => {
      if (!map?.getSource(source)) return;
      map.removeSource(source);
    },
    [map]
  );

  const syncVisibility = useCallback(() => {
    const layerIds = [
      heatmapLayerId,
      clusterCircleLayerId,
      clusterCountLayerId,
      pointLayerId,
      pointLabelLayerId,
    ];

    for (const layerId of layerIds) {
      if (!map?.getLayer(layerId)) continue;
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  }, [
    clusterCircleLayerId,
    clusterCountLayerId,
    heatmapLayerId,
    map,
    pointLabelLayerId,
    pointLayerId,
    visible,
  ]);

  const syncLayerPaint = useCallback(() => {
    if (!map) return;

    if (map.getLayer(heatmapLayerId)) {
      map.setPaintProperty(heatmapLayerId, "heatmap-color", [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(0, 0, 0, 0)",
        0.15,
        heatmapColors[0],
        0.35,
        heatmapColors[1],
        0.55,
        heatmapColors[2],
        0.75,
        heatmapColors[3],
        1,
        heatmapColors[4],
      ]);
      map.setPaintProperty(heatmapLayerId, "heatmap-intensity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.55,
        resolvedHeatmapMaxZoom,
        1.25,
      ]);
      map.setPaintProperty(heatmapLayerId, "heatmap-radius", [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        Math.max(8, resolvedClusterRadius * 0.16),
        resolvedHeatmapMaxZoom,
        Math.max(28, resolvedClusterRadius * 0.45),
      ]);
      map.setPaintProperty(heatmapLayerId, "heatmap-opacity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        heatmapFadeStartZoom,
        0.78,
        resolvedHeatmapMaxZoom + 0.2,
        0.78,
        clusterRevealZoom + 0.2,
        0.08,
      ]);
    }

    if (map.getLayer(clusterCircleLayerId)) {
      map.setPaintProperty(clusterCircleLayerId, "circle-color", [
        "case",
        ["<", ["get", "point_count"], clusterThresholds[0]],
        clusterColors[0],
        ["<", ["get", "point_count"], clusterThresholds[1]],
        clusterColors[1],
        clusterColors[2],
      ]);
      map.setPaintProperty(clusterCircleLayerId, "circle-radius", [
        "interpolate",
        ["linear"],
        ["zoom"],
        clusterRevealZoom,
        [
          "interpolate",
          ["linear"],
          ["get", "point_count"],
          2,
          Math.max(7, resolvedClusterRadius * 0.18),
          10,
          Math.max(9, resolvedClusterRadius * 0.24),
          50,
          Math.max(11, resolvedClusterRadius * 0.3),
          100,
          Math.max(13, resolvedClusterRadius * 0.34),
        ],
        resolvedClusterMaxZoom,
        [
          "interpolate",
          ["linear"],
          ["get", "point_count"],
          2,
          Math.max(9, resolvedClusterRadius * 0.24),
          10,
          Math.max(11, resolvedClusterRadius * 0.3),
          50,
          Math.max(13, resolvedClusterRadius * 0.36),
          100,
          Math.max(15, resolvedClusterRadius * 0.42),
        ],
      ]);
      map.setPaintProperty(clusterCircleLayerId, "circle-opacity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        clusterRevealZoom,
        0,
        clusterRevealZoom + 0.55,
        0.28,
        clusterRevealZoom + 1.1,
        0.9,
      ]);
      map.setPaintProperty(clusterCircleLayerId, "circle-stroke-width", 1.75);
      map.setPaintProperty(clusterCircleLayerId, "circle-stroke-color", "rgba(255, 255, 255, 0.94)");
      map.setPaintProperty(clusterCircleLayerId, "circle-blur", 0.18);
    }

    if (map.getLayer(clusterCountLayerId)) {
      map.setPaintProperty(clusterCountLayerId, "text-color", "white");
    }

    if (map.getLayer(pointLayerId)) {
      map.setPaintProperty(pointLayerId, "circle-color", pointColor);
      map.setPaintProperty(pointLayerId, "circle-radius", [
        "interpolate",
        ["linear"],
        ["zoom"],
        pointRevealZoom,
        Math.max(3.5, resolvedClusterRadius * 0.12),
        pointRevealZoom + 1.4,
        Math.max(6, resolvedClusterRadius * 0.22),
      ]);
      map.setPaintProperty(pointLayerId, "circle-opacity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        pointRevealZoom,
        0,
        pointRevealZoom + 0.9,
        0.82,
      ]);
    }

    if (map.getLayer(pointLabelLayerId) && pointLabelExpression) {
      map.setLayoutProperty(pointLabelLayerId, "text-field", pointLabelExpression);
      map.setPaintProperty(pointLabelLayerId, "text-color", pointLabelColor ?? "white");
      map.setPaintProperty(
        pointLabelLayerId,
        "text-halo-color",
        pointLabelHaloColor ?? "rgba(0, 0, 0, 0.7)"
      );
      map.setPaintProperty(
        pointLabelLayerId,
        "text-halo-width",
        pointLabelHaloWidth ?? 1.25
      );
      if (typeof pointLabelSize === "number") {
        map.setLayoutProperty(pointLabelLayerId, "text-size", pointLabelSize);
      }
    }
  }, [
    clusterCircleLayerId,
    clusterColors,
    clusterCountLayerId,
    clusterThresholds,
    heatmapColors,
    heatmapLayerId,
    map,
    pointColor,
    pointLabelExpression,
    pointLabelHaloColor,
    pointLabelHaloWidth,
    pointLabelLayerId,
    pointLabelSize,
    pointLabelColor,
    pointLayerId,
    pointRevealZoom,
    resolvedClusterRadius,
    resolvedClusterMaxZoom,
    resolvedHeatmapMaxZoom,
    clusterRevealZoom,
    heatmapFadeStartZoom,
  ]);

  const ensureLayers = useCallback(() => {
    if (!map || !isLoaded) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data });
    }
    if (!map.getSource(clusterSourceId)) {
      map.addSource(clusterSourceId, {
        type: "geojson",
        data,
        cluster: true,
        clusterMaxZoom: resolvedClusterMaxZoom,
        clusterRadius: resolvedClusterRadius,
      });
    }

    if (!map.getLayer(heatmapLayerId)) {
      map.addLayer({
        id: heatmapLayerId,
        type: "heatmap",
        source: sourceId,
        maxzoom: clusterRevealZoom + 0.25,
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": 0.55,
          "heatmap-radius": Math.max(8, resolvedClusterRadius * 0.16),
          "heatmap-opacity": 0.78,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0, 0, 0, 0)",
            0.15,
            heatmapColors[0],
            0.35,
            heatmapColors[1],
            0.55,
            heatmapColors[2],
            0.75,
            heatmapColors[3],
            1,
            heatmapColors[4],
          ],
        },
      });
    }

    if (!map.getLayer(clusterCircleLayerId)) {
      map.addLayer({
        id: clusterCircleLayerId,
        type: "circle",
        source: clusterSourceId,
        filter: ["has", "point_count"],
        minzoom: clusterRevealZoom,
        paint: {
          "circle-color": clusterColors[1],
          "circle-radius": 18,
          "circle-stroke-width": 1.75,
          "circle-stroke-color": "rgba(255, 255, 255, 0.94)",
          "circle-opacity": 0,
          "circle-blur": 0.18,
        },
      });
    }

    if (!map.getLayer(clusterCountLayerId)) {
      map.addLayer({
        id: clusterCountLayerId,
        type: "symbol",
        source: clusterSourceId,
        filter: ["has", "point_count"],
        minzoom: clusterRevealZoom + 0.35,
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "white",
          "text-halo-color": "rgba(0, 0, 0, 0.55)",
          "text-halo-width": 1.2,
        },
      });
    }

    if (!map.getLayer(pointLayerId)) {
      map.addLayer({
        id: pointLayerId,
        type: "circle",
        source: clusterSourceId,
        filter: ["!", ["has", "point_count"]],
        minzoom: pointRevealZoom,
        paint: {
          "circle-color": pointColor,
          "circle-radius": Math.max(3.5, resolvedClusterRadius * 0.12),
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255, 255, 255, 0.88)",
          "circle-opacity": 0,
        },
      });
    }

    if (pointLabelVisible && !map.getLayer(pointLabelLayerId) && pointLabelExpression) {
      map.addLayer({
        id: pointLabelLayerId,
        type: "symbol",
        source: clusterSourceId,
        filter: ["!", ["has", "point_count"]],
        minzoom: pointRevealZoom + 0.35,
        layout: {
          "text-field": pointLabelExpression,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": pointLabelSize ?? 11,
          "text-offset": pointLabelOffset ?? [0, 1.15],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": pointLabelColor ?? "white",
          "text-halo-color": pointLabelHaloColor ?? "rgba(0, 0, 0, 0.7)",
          "text-halo-width": pointLabelHaloWidth ?? 1.25,
        },
      });
    }

    syncLayerPaint();
    syncVisibility();
  }, [
    clusterCircleLayerId,
    clusterColors,
    clusterCountLayerId,
    clusterSourceId,
    data,
    heatmapColors,
    heatmapLayerId,
    isLoaded,
    map,
    pointColor,
    pointLabelExpression,
    pointLabelHaloColor,
    pointLabelHaloWidth,
    pointLabelLayerId,
    pointLabelOffset,
    pointLabelSize,
    pointLabelColor,
    pointLabelVisible,
    pointLayerId,
    pointRevealZoom,
    resolvedClusterMaxZoom,
    resolvedClusterRadius,
    resolvedHeatmapMaxZoom,
    clusterRevealZoom,
    sourceId,
    syncLayerPaint,
    syncVisibility,
  ]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    ensureLayers();

    const handleStyleData = () => {
      ensureLayers();
    };

    map.on("styledata", handleStyleData);

    return () => {
      map.off("styledata", handleStyleData);
      removeLayerSafe(pointLabelLayerId);
      removeLayerSafe(pointLayerId);
      removeLayerSafe(clusterCountLayerId);
      removeLayerSafe(clusterCircleLayerId);
      removeLayerSafe(heatmapLayerId);
      removeSourceSafe(clusterSourceId);
      removeSourceSafe(sourceId);
    };
  }, [
    clusterCircleLayerId,
    clusterCountLayerId,
    clusterSourceId,
    ensureLayers,
    heatmapLayerId,
    isLoaded,
    map,
    pointLabelLayerId,
    pointLayerId,
    removeLayerSafe,
    removeSourceSafe,
    sourceId,
  ]);

  useEffect(() => {
    if (!isLoaded || !map || typeof data === "string") return;

    const rawSource = map.getSource(sourceId) as MapLibreGL.GeoJSONSource | undefined;
    const clusterSource = map.getSource(clusterSourceId) as
      | MapLibreGL.GeoJSONSource
      | undefined;

    rawSource?.setData(data);
    clusterSource?.setData(data);
  }, [clusterSourceId, data, isLoaded, map, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) return;

    syncVisibility();
  }, [isLoaded, map, syncVisibility, visible]);

  useEffect(() => {
    if (!isLoaded || !map) return;

    syncLayerPaint();
  }, [isLoaded, map, syncLayerPaint]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    if (!map.getLayer(clusterCircleLayerId) && !map.getLayer(pointLayerId)) return;

    const setPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = () => {
      map.getCanvas().style.cursor = "";
    };
    const handleClusterClick = async (event: MapLibreGL.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;

      const clusterId = feature.properties?.cluster_id as number | undefined;
      const pointCount = feature.properties?.point_count as number | undefined;
      const coordinates =
        feature.geometry?.type === "Point"
          ? (feature.geometry.coordinates as [number, number])
          : null;

      if (typeof clusterId !== "number" || typeof pointCount !== "number" || !coordinates) {
        return;
      }

      if (onClusterClick) {
        onClusterClick(clusterId, coordinates, pointCount);
        return;
      }

      const source = map.getSource(clusterSourceId) as MapLibreGL.GeoJSONSource | undefined;
      if (!source) return;

      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({ center: coordinates, zoom });
    };
    const handlePointClick = (event: MapLibreGL.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || !onPointClick) return;

      const coordinates =
        feature.geometry?.type === "Point"
          ? (feature.geometry.coordinates as [number, number])
          : null;
      if (!coordinates) return;

      onPointClick(feature as unknown as GeoJSON.Feature<GeoJSON.Point, P>, coordinates);
    };

    map.on("click", clusterCircleLayerId, handleClusterClick);
    map.on("mouseenter", clusterCircleLayerId, setPointer);
    map.on("mouseleave", clusterCircleLayerId, clearPointer);
    map.on("click", pointLayerId, handlePointClick);
    map.on("mouseenter", pointLayerId, setPointer);
    map.on("mouseleave", pointLayerId, clearPointer);

    return () => {
      map.off("click", clusterCircleLayerId, handleClusterClick);
      map.off("mouseenter", clusterCircleLayerId, setPointer);
      map.off("mouseleave", clusterCircleLayerId, clearPointer);
      map.off("click", pointLayerId, handlePointClick);
      map.off("mouseenter", pointLayerId, setPointer);
      map.off("mouseleave", pointLayerId, clearPointer);
    };
  }, [clusterCircleLayerId, clusterSourceId, isLoaded, map, onClusterClick, onPointClick, pointLayerId]);

  return null;
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
