/**
 * GPS and Geofencing calculations engine.
 * Computes distances using Haversine formula, determines geofence boundary states,
 * and validates GPS accuracy & anti-spoofing flags.
 */

const EARTH_RADIUS_METERS = 6371000; // Earth mean radius in meters

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two geographic coordinates in meters
 * using the Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return NaN;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Returns true if the current coordinates are within the radius of company coordinates.
 */
export function isInsideGeofence(
  currentLat: number,
  currentLon: number,
  companyLat: number,
  companyLon: number,
  radiusMeters: number
): boolean {
  if (radiusMeters <= 0) return false;
  const dist = haversineDistance(currentLat, currentLon, companyLat, companyLon);
  if (Number.isNaN(dist)) return false;
  return dist <= radiusMeters;
}

/**
 * Validates GPS accuracy against a maximum threshold (default: 50 meters, or radius).
 * Rejects undefined, null, non-positive, NaN, or excessively imprecise coordinates.
 */
export function isValidGpsAccuracy(
  accuracy?: number | null,
  maxAllowedMeters = 50
): boolean {
  if (accuracy === undefined || accuracy === null) return false;
  if (!Number.isFinite(accuracy)) return false;
  if (accuracy <= 0) return false;
  return accuracy <= maxAllowedMeters;
}

/**
 * Checks if the location was reported by a mock provider (spoofed GPS).
 */
export function isMockLocation(coords?: {
  mocked?: boolean;
  isFromMockProvider?: boolean;
} | null): boolean {
  if (!coords) return false;
  return Boolean(coords.mocked || coords.isFromMockProvider);
}

/**
 * Determines transition type between previous state and current state.
 */
export function determineGeofenceTransition(
  wasInside: boolean | null,
  isInside: boolean
): 'ENTER' | 'EXIT' | null {
  if (wasInside === false && isInside === true) {
    return 'ENTER';
  }
  if (wasInside === true && isInside === false) {
    return 'EXIT';
  }
  return null;
}
