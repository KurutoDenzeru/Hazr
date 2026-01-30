type GeoPoint = [number, number];

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toPoint = (coords: unknown): GeoPoint | null => {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (!isNumber(lng) || !isNumber(lat)) return null;
  return [lng, lat];
};

const centroidFromRing = (ring: GeoPoint[]): GeoPoint | null => {
  if (ring.length === 0) return null;
  let totalLng = 0;
  let totalLat = 0;
  for (const [lng, lat] of ring) {
    totalLng += lng;
    totalLat += lat;
  }
  return [totalLng / ring.length, totalLat / ring.length];
};

const normalizeRing = (coords: unknown): GeoPoint[] => {
  if (!Array.isArray(coords)) return [];
  return coords
    .map((point) => toPoint(point))
    .filter((point): point is GeoPoint => Boolean(point));
};

const centroidFromPolygon = (polygon: unknown): GeoPoint | null => {
  if (!Array.isArray(polygon) || polygon.length === 0) return null;
  const ring = normalizeRing(polygon[0]);
  if (ring.length === 0) return null;
  return centroidFromRing(ring);
};

const centroidFromMultiPolygon = (multiPolygon: unknown): GeoPoint | null => {
  if (!Array.isArray(multiPolygon) || multiPolygon.length === 0) return null;
  for (const polygon of multiPolygon) {
    const centroid = centroidFromPolygon(polygon);
    if (centroid) return centroid;
  }
  return null;
};

type GeometryLike = {
  type?: string;
  coordinates?: unknown;
} | null;

const toPointFromGeometry = (geometry: GeometryLike): GeoPoint | null => {
  if (!geometry || !geometry.type) return null;
  if (geometry.type === "Point") {
    return toPoint(geometry.coordinates);
  }
  if (geometry.type === "Polygon") {
    return centroidFromPolygon(geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return centroidFromMultiPolygon(geometry.coordinates);
  }
  return null;
};

export { toPointFromGeometry };
