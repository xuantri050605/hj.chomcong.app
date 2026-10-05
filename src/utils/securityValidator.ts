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
  const allowedTimeSources = ['DEVICE', 'MANUAL'];
  const timeSource = allowedTimeSources.includes(String(obj.timeSource))
    ? (obj.timeSource as 'DEVICE' | 'MANUAL')
    : 'DEVICE';

  const originalTimeSource =
    obj.originalTimeSource === 'DEVICE' || obj.originalTimeSource === 'MANUAL'
      ? (obj.originalTimeSource as 'DEVICE' | 'MANUAL')
      : null;

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
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt.slice(0, 50) : undefined,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt.slice(0, 50) : undefined,
  };

  return sanitized;
}
