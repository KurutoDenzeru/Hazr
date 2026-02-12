export type BrowserLocationErrorCode =
  | "unsupported"
  | "insecure-context"
  | "denied"
  | "timeout"
  | "unavailable"
  | "unknown";

export class BrowserLocationError extends Error {
  code: BrowserLocationErrorCode;

  constructor(code: BrowserLocationErrorCode, message: string) {
    super(message);
    this.name = "BrowserLocationError";
    this.code = code;
  }
}

export type Coordinates = {
  longitude: number;
  latitude: number;
};

const mapGeolocationError = (error: GeolocationPositionError): BrowserLocationError => {
  if (error.code === error.PERMISSION_DENIED) {
    return new BrowserLocationError("denied", "Location access was denied.");
  }

  if (error.code === error.TIMEOUT) {
    return new BrowserLocationError("timeout", "Location request timed out.");
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return new BrowserLocationError("unavailable", "Location is currently unavailable.");
  }

  return new BrowserLocationError("unknown", error.message || "Unable to get location.");
};

const getPermissionState = async (): Promise<PermissionState | "unsupported"> => {
  if (!("permissions" in navigator)) return "unsupported";

  try {
    const permissionStatus = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    return permissionStatus.state;
  } catch {
    return "unsupported";
  }
};

export const requestCurrentCoordinates = async (): Promise<Coordinates> => {
  if (typeof window === "undefined") {
    throw new BrowserLocationError("unknown", "Location can only be requested in a browser.");
  }

  if (!("geolocation" in navigator)) {
    throw new BrowserLocationError(
      "unsupported",
      "This browser does not support geolocation.",
    );
  }

  if (!window.isSecureContext) {
    throw new BrowserLocationError(
      "insecure-context",
      "Location requires HTTPS (or localhost during development).",
    );
  }

  const permissionState = await getPermissionState();
  if (permissionState === "denied") {
    throw new BrowserLocationError(
      "denied",
      "Location access is blocked. Enable it in browser settings and try again.",
    );
  }

  return await new Promise<Coordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
        });
      },
      (error) => {
        reject(mapGeolocationError(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  });
};

export const getLocationErrorMessage = (error: unknown): string => {
  if (error instanceof BrowserLocationError) {
    if (error.code === "insecure-context") {
      return "Location needs HTTPS on mobile browsers. Open the HTTPS version of this site and try again.";
    }

    if (error.code === "denied") {
      return "Location permission is blocked. Please allow location access in your browser settings.";
    }

    if (error.code === "timeout") {
      return "Location request timed out. Try again with better signal or GPS enabled.";
    }

    if (error.code === "unavailable") {
      return "Your location is currently unavailable. Check GPS/network and try again.";
    }

    if (error.code === "unsupported") {
      return "This browser does not support geolocation.";
    }
  }

  return "Unable to retrieve your location right now. Please try again.";
};
