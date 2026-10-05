import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { DayAttendance } from '../engine/attendanceCalculator';
import {
  determineGeofenceTransition,
  haversineDistance,
  isMockLocation,
  isValidGpsAccuracy,
} from '../engine/geoCalculator';
import type { CompanyLocationConfig, PendingAttendanceEvent } from '../types/geofence';
import { localDateKey, localTimeKey } from '../utils/monthUtils';

export const GEOFENCE_TASK_NAME = 'GEOFENCE_BACKGROUND_TASK';
export const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  mocked?: boolean;
  isFromMockProvider?: boolean;
}

/**
 * Checks if a CHECK_IN event can be created.
 * Disallowed if today already has an open shift (shift.start exists but no shift.end).
 */
export function canCreateCheckIn(todayRecord?: DayAttendance | null): boolean {
  if (!todayRecord || !todayRecord.shift) return true;
  if (todayRecord.shift.start && (!todayRecord.shift.end || todayRecord.shift.end.trim() === '')) {
    return false; // Already checked in and shift is open
  }
  return true;
}

/**
 * Checks if a CHECK_OUT event can be created.
 * Requires an active open shift either today or yesterday (for overnight shifts).
 */
export function canCreateCheckOut(
  todayRecord?: DayAttendance | null,
  yesterdayRecord?: DayAttendance | null
): { allowed: boolean; targetDate: string } {
  // First check if today has an open shift
  if (
    todayRecord?.shift?.start &&
    (!todayRecord.shift.end || todayRecord.shift.end.trim() === '')
  ) {
    return { allowed: true, targetDate: todayRecord.date };
  }

  // Check if yesterday has an open overnight shift
  if (
    yesterdayRecord?.shift?.start &&
    (!yesterdayRecord.shift.end || yesterdayRecord.shift.end.trim() === '')
  ) {
    return { allowed: true, targetDate: yesterdayRecord.date };
  }

  return { allowed: false, targetDate: '' };
}

export interface GeofenceTriggerParams {
  coords: LocationCoordinates;
  config: CompanyLocationConfig;
  wasInside: boolean | null;
  lastEventTime?: number | null;
  todayRecord?: DayAttendance | null;
  yesterdayRecord?: DayAttendance | null;
  now?: Date;
  cooldownMs?: number;
}

/**
 * Pure evaluation function for geofence transitions and event creation.
 * Returns a PendingAttendanceEvent if a valid, non-cooldown, state-permitted transition occurred.
 */
export function evaluateGeofenceEvent(
  params: GeofenceTriggerParams
): {
  event: PendingAttendanceEvent | null;
  isInside: boolean;
  distance: number;
  transition: 'ENTER' | 'EXIT' | null;
  rejectionReason?: string;
} {
  const {
    coords,
    config,
    wasInside,
    lastEventTime = null,
    todayRecord = null,
    yesterdayRecord = null,
    now = new Date(),
    cooldownMs = DEFAULT_COOLDOWN_MS,
  } = params;

  if (!config.enabled) {
    return {
      event: null,
      isInside: false,
      distance: NaN,
      transition: null,
      rejectionReason: 'GEOFENCE_DISABLED',
    };
  }

  if (isMockLocation(coords)) {
    return {
      event: null,
      isInside: false,
      distance: NaN,
      transition: null,
      rejectionReason: 'MOCK_LOCATION_DETECTED',
    };
  }

  // Validate accuracy (must be <= 50m and <= config.radius)
  const maxAllowedAccuracy = Math.min(50, Math.max(config.radius, 20));
  if (!isValidGpsAccuracy(coords.accuracy, maxAllowedAccuracy)) {
    return {
      event: null,
      isInside: false,
      distance: NaN,
      transition: null,
      rejectionReason: 'INACCURATE_GPS',
    };
  }

  const distance = haversineDistance(
    coords.latitude,
    coords.longitude,
    config.latitude,
    config.longitude
  );

  if (Number.isNaN(distance)) {
    return {
      event: null,
      isInside: false,
      distance: NaN,
      transition: null,
      rejectionReason: 'INVALID_COORDINATES',
    };
  }

  const isInside = distance <= config.radius;
  const transition = determineGeofenceTransition(wasInside, isInside);

  if (!transition) {
    return {
      event: null,
      isInside,
      distance,
      transition: null,
    };
  }

  // Check cooldown debounce
  const currentTime = now.getTime();
  if (lastEventTime && currentTime - lastEventTime < cooldownMs) {
    return {
      event: null,
      isInside,
      distance,
      transition,
      rejectionReason: 'COOLDOWN_ACTIVE',
    };
  }

  const shiftDate = localDateKey(now);
  const timeString = localTimeKey(now);

  if (transition === 'ENTER') {
    if (!canCreateCheckIn(todayRecord)) {
      return {
        event: null,
        isInside,
        distance,
        transition,
        rejectionReason: 'ALREADY_CLOCKED_IN',
      };
    }

    const event: PendingAttendanceEvent = {
      id: `geo_in_${currentTime}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'CHECK_IN',
      detectedAt: now.toISOString(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: Math.round((coords.accuracy || 0) * 10) / 10,
      distanceFromCompany: Math.round(distance * 10) / 10,
      source: 'GEOFENCE',
      status: 'PENDING',
      shiftDate,
      timeString,
    };

    return { event, isInside, distance, transition };
  }

  if (transition === 'EXIT') {
    const { allowed, targetDate } = canCreateCheckOut(todayRecord, yesterdayRecord);
    if (!allowed) {
      return {
        event: null,
        isInside,
        distance,
        transition,
        rejectionReason: 'NO_OPEN_SHIFT',
      };
    }

    const event: PendingAttendanceEvent = {
      id: `geo_out_${currentTime}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'CHECK_OUT',
      detectedAt: now.toISOString(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: Math.round((coords.accuracy || 0) * 10) / 10,
      distanceFromCompany: Math.round(distance * 10) / 10,
      source: 'GEOFENCE',
      status: 'PENDING',
      shiftDate: targetDate,
      timeString,
    };

    return { event, isInside, distance, transition };
  }

  return { event: null, isInside, distance, transition };
}

/**
 * Requests location permissions (foreground & background).
 */
export async function requestLocationPermissions(): Promise<{
  foreground: 'granted' | 'denied' | 'undetermined';
  background: 'granted' | 'denied' | 'undetermined';
}> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      return { foreground: 'granted', background: 'undetermined' };
    }
    return { foreground: 'denied', background: 'denied' };
  }

  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    let bgStatus: 'granted' | 'denied' | 'undetermined' = 'undetermined';

    if (fgStatus === 'granted') {
      try {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        bgStatus = status;
      } catch {
        bgStatus = 'undetermined';
      }
    }

    return {
      foreground: fgStatus,
      background: bgStatus,
    };
  } catch (error) {
    console.warn('Location permission request failed:', error);
    return { foreground: 'denied', background: 'denied' };
  }
}

/**
 * Fetches current device GPS location with high accuracy.
 */
export async function getCurrentDeviceLocation(): Promise<LocationCoordinates | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return resolve(null);
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            mocked: false,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }

  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? undefined,
      mocked: (loc as any).mocked,
    };
  } catch (error) {
    console.warn('Failed to get current GPS location:', error);
    return null;
  }
}

/**
 * Starts background geofence task on native devices.
 */
export async function startBackgroundGeofenceTracking(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(GEOFENCE_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 25, // 25 meters
        foregroundService: {
          notificationTitle: 'Chấm công Hojeong',
          notificationBody: 'Đang theo dõi vị trí công ty để tạo thông báo chấm công.',
          notificationColor: '#1e3a8a',
        },
      });
    }
    return true;
  } catch (err) {
    console.warn('Failed to start background location tracking:', err);
    return false;
  }
}

/**
 * Stops background geofence tracking.
 */
export async function stopBackgroundGeofenceTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(GEOFENCE_TASK_NAME);
    }
  } catch (err) {
    console.warn('Failed to stop background location tracking:', err);
  }
}
