/**
 * Production Security & Input Validation Module
 * Enforces OWASP Input Validation & Data Integrity standards:
 * - Strict type checking & boundaries
 * - Prevention of NaN, Infinity, -Infinity
 * - Prevention of negative values where illegal
 * - Protection against Prototype Pollution
 * - Calendar date & time validity (RFC 3339 / ISO subset)
 * - Safe length & numerical constraints
 */

import type { DayAttendance } from '../engine/attendanceCalculator';
import type { SalaryConfig } from '../engine/payrollCalculator';
import { normalizeTimeInput } from '../engine/timeCalculator';
import type { CompanyLocationConfig, PendingAttendanceEvent } from '../types/geofence';
import { DEFAULT_COMPANY_LOCATION } from '../types/geofence';

export const MAX_SAFE_CURRENCY = 1_000_000_000_000; // 1,000 billion VND
export const MAX_STANDARD_HOURS_PER_MONTH = 744; // 31 days * 24 hours
export const MAX_INPUT_STRING_LENGTH = 255;

/**
 * Validates whether an object key is safe from prototype pollution.
 */
export function isSafePropertyKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

/**
 * Validates and sanitizes a non-negative currency amount.
 * Returns 0 if invalid or out of bounds.
 */
export function sanitizeCurrency(val: unknown, fallback = 0): number {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed.toLowerCase() === 'nan' || trimmed.toLowerCase() === 'infinity') {
      return fallback;
    }
    const cleanStr = trimmed.replace(/[^0-9.-]/g, '');
    if (!cleanStr || cleanStr === '-' || cleanStr === '.') {
      return fallback;
    }
    const num = Number(cleanStr);
    if (!Number.isFinite(num) || isNaN(num) || num < 0 || num > MAX_SAFE_CURRENCY) {
      return fallback;
    }
    return Math.floor(num);
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || isNaN(val) || val < 0 || val > MAX_SAFE_CURRENCY) {
      return fallback;
    }
    return Math.floor(val);
  }
  return fallback;
}

/**
 * Validates and sanitizes standard hours (0 to 744, standard 208).
 */
export function sanitizeStandardHours(val: unknown, fallback = 208): number {
  const num = typeof val === 'string' ? Number(val.replace(/[^0-9.]/g, '')) : Number(val);
  if (!Number.isFinite(num) || isNaN(num) || num <= 0 || num > MAX_STANDARD_HOURS_PER_MONTH) {
    return fallback;
  }
  return Math.round(num * 10) / 10;
}

/**
 * Validates and sanitizes an insurance rate percentage (0% to 100%).
 */
export function sanitizePercentage(val: unknown, fallback = 10.5): number {
  const num = typeof val === 'string' ? Number(val.replace(/[^0-9.]/g, '')) : Number(val);
  if (!Number.isFinite(num) || isNaN(num) || num < 0 || num > 100) {
    return fallback;
  }
  return Math.round(num * 100) / 100;
}

/**
 * Strict regex validation for YYYY-MM
 */
export function isValidMonth(month: unknown): boolean {
  if (typeof month !== 'string' || month.length !== 7) return false;
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  return year >= 2000 && year <= 2100;
}

/**
 * Strict calendar date validation for YYYY-MM-DD
 */
export function isValidDate(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string' || dateStr.length !== 10) return false;
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(dateStr);
  if (!match) return false;

  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);

  if (y < 2000 || y > 2100) return false;

  // Verify real days in month (handling leap years)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d >= 1 && d <= daysInMonth;
}

/**
 * Strict time validation for HH:mm or H:mm
 */
export function sanitizeTimeInput(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string') return undefined;
  if (raw.length > 10) return undefined; // reject oversized inputs

  const normalized = normalizeTimeInput(raw.trim());
  if (!normalized) return undefined;

  const parts = normalized.split(':');
  if (parts.length !== 2) return undefined;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return undefined;
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Thoroughly validates and sanitizes a SalaryConfig object.
 */
export function sanitizeSalaryConfig(raw: unknown, defaults: SalaryConfig): SalaryConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...defaults };
  }

  const obj = raw as Record<string, unknown>;

  return {
    basicSalary: sanitizeCurrency(obj.basicSalary, defaults.basicSalary),
    seniorityAllowance: sanitizeCurrency(obj.seniorityAllowance, defaults.seniorityAllowance),
    livingAllowance: sanitizeCurrency(obj.livingAllowance, defaults.livingAllowance),
    attendanceAllowance: sanitizeCurrency(obj.attendanceAllowance, defaults.attendanceAllowance),
    otherAllowance: sanitizeCurrency(obj.otherAllowance, defaults.otherAllowance),
    standardHours: sanitizeStandardHours(obj.standardHours, defaults.standardHours),
    insuranceRate: sanitizePercentage(obj.insuranceRate, defaults.insuranceRate),
  };
}

/**
 * Thoroughly validates and sanitizes a DayAttendance record.
 */
export function sanitizeDayAttendance(raw: unknown): DayAttendance | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  if (!isValidDate(obj.date)) {
    return null;
  }

  const date = String(obj.date);
  const dayOfWeek =
    typeof obj.dayOfWeek === 'number' && Number.isInteger(obj.dayOfWeek) && obj.dayOfWeek >= 0 && obj.dayOfWeek <= 6
      ? obj.dayOfWeek
      : new Date(date + 'T00:00:00Z').getUTCDay();

  // DayType validation
  const allowedDayTypes = ['NORMAL', 'WEEKLY_OFF', 'HOLIDAY'];
  const dayType = allowedDayTypes.includes(String(obj.dayType))
    ? (obj.dayType as 'NORMAL' | 'WEEKLY_OFF' | 'HOLIDAY')
    : 'NORMAL';

  // LeaveType validation
  const allowedLeaveTypes = ['PN', 'UNPAID', 'OTHER'];
  const rawLeave = obj.leaveType || obj.leaveCode;
  const leaveType = allowedLeaveTypes.includes(String(rawLeave))
    ? (String(rawLeave) as 'PN' | 'UNPAID' | 'OTHER')
    : null;

  // TimeSource validation
  const allowedTimeSources = ['DEVICE', 'MANUAL', 'GEOFENCE_CONFIRMED'];
  const timeSource = allowedTimeSources.includes(String(obj.timeSource))
    ? (obj.timeSource as 'DEVICE' | 'MANUAL' | 'GEOFENCE_CONFIRMED')
    : 'DEVICE';

  const originalTimeSource =
    obj.originalTimeSource === 'DEVICE' ||
    obj.originalTimeSource === 'MANUAL' ||
    obj.originalTimeSource === 'GEOFENCE_CONFIRMED'
      ? (obj.originalTimeSource as 'DEVICE' | 'MANUAL' | 'GEOFENCE_CONFIRMED')
      : null;

  // GPS metadata validation
  let gpsMetadata: DayAttendance['gpsMetadata'] = null;
  if (obj.gpsMetadata && typeof obj.gpsMetadata === 'object') {
    const rawGps = obj.gpsMetadata as Record<string, unknown>;
    gpsMetadata = {
      accuracy: typeof rawGps.accuracy === 'number' ? rawGps.accuracy : undefined,
      distance: typeof rawGps.distance === 'number' ? rawGps.distance : undefined,
      timestamp: typeof rawGps.timestamp === 'string' ? rawGps.timestamp.slice(0, 50) : undefined,
      latitude: typeof rawGps.latitude === 'number' ? rawGps.latitude : undefined,
      longitude: typeof rawGps.longitude === 'number' ? rawGps.longitude : undefined,
    };
  }

  // Shift validation
  let shift: { start?: string; end?: string } | null = null;
  if (!leaveType && obj.shift && typeof obj.shift === 'object' && !Array.isArray(obj.shift)) {
    const rawShift = obj.shift as Record<string, unknown>;
    const start = sanitizeTimeInput(rawShift.start);
    const end = sanitizeTimeInput(rawShift.end);
    if (start || end) {
      shift = { start, end };
    }
  }

  const note =
    typeof obj.note === 'string'
      ? obj.note.slice(0, 500)
      : obj.note === null
      ? null
      : undefined;

  const sanitized: DayAttendance = {
    date,
    dayOfWeek,
    dayType,
    leaveType,
    leaveCode: leaveType,
    shift: leaveType ? null : shift,
    note,
    timeSource,
    originalTimeSource,
    gpsMetadata,
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt.slice(0, 50) : undefined,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt.slice(0, 50) : undefined,
  };

  return sanitized;
}

/**
 * Validates and sanitizes company location configuration.
 */
export function sanitizeCompanyLocationConfig(
  input: unknown,
  fallback = DEFAULT_COMPANY_LOCATION
): CompanyLocationConfig {
  if (!input || typeof input !== 'object') return { ...fallback };
  const obj = input as Record<string, unknown>;

  const lat = typeof obj.latitude === 'number' && Number.isFinite(obj.latitude) && obj.latitude >= -90 && obj.latitude <= 90
    ? obj.latitude
    : fallback.latitude;

  const lon = typeof obj.longitude === 'number' && Number.isFinite(obj.longitude) && obj.longitude >= -180 && obj.longitude <= 180
    ? obj.longitude
    : fallback.longitude;

  let radius = typeof obj.radius === 'number' && Number.isFinite(obj.radius)
    ? Math.round(obj.radius)
    : fallback.radius;
  if (radius < 100) radius = 100;
  if (radius > 500) radius = 500;

  const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : fallback.enabled;
  const updatedAt = typeof obj.updatedAt === 'string' ? obj.updatedAt.slice(0, 50) : undefined;

  return {
    latitude: lat,
    longitude: lon,
    radius,
    enabled,
    updatedAt,
  };
}

/**
 * Validates and sanitizes a pending attendance event.
 */
export function sanitizePendingAttendanceEvent(input: unknown): PendingAttendanceEvent | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;

  if (typeof obj.id !== 'string' || !obj.id.trim()) return null;
  const id = obj.id.trim().slice(0, 100);

  if (obj.type !== 'CHECK_IN' && obj.type !== 'CHECK_OUT') return null;
  const type = obj.type;

  if (typeof obj.detectedAt !== 'string') return null;
  const detectedAt = obj.detectedAt.slice(0, 50);

  if (typeof obj.latitude !== 'number' || !Number.isFinite(obj.latitude) || obj.latitude < -90 || obj.latitude > 90) return null;
  const latitude = obj.latitude;

  if (typeof obj.longitude !== 'number' || !Number.isFinite(obj.longitude) || obj.longitude < -180 || obj.longitude > 180) return null;
  const longitude = obj.longitude;

  if (typeof obj.accuracy !== 'number' || !Number.isFinite(obj.accuracy) || obj.accuracy < 0) return null;
  const accuracy = Math.round(obj.accuracy * 10) / 10;

  if (typeof obj.distanceFromCompany !== 'number' || !Number.isFinite(obj.distanceFromCompany) || obj.distanceFromCompany < 0) return null;
  const distanceFromCompany = Math.round(obj.distanceFromCompany * 10) / 10;

  const status = obj.status === 'CONFIRMED' || obj.status === 'DISMISSED' || obj.status === 'PENDING'
    ? obj.status
    : 'PENDING';

  if (typeof obj.shiftDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.shiftDate)) return null;
  const shiftDate = obj.shiftDate;

  if (typeof obj.timeString !== 'string' || !/^\d{2}:\d{2}$/.test(obj.timeString)) return null;
  const timeString = obj.timeString;

  return {
    id,
    type,
    detectedAt,
    latitude,
    longitude,
    accuracy,
    distanceFromCompany,
    source: 'GEOFENCE',
    status,
    shiftDate,
    timeString,
  };
}

