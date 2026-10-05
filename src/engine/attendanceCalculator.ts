import { paidHoursBetween, splitNightDayHours } from './timeCalculator';

export type Shift = {
  start?: string | null; // HH:mm
  end?: string | null; // HH:mm (optional to allow open-ended clock-in)
};

export type DayAttendance = {
  date: string; // ISO date
  dayOfWeek: number; // 0 Sun - 6 Sat
  dayType: 'NORMAL' | 'WEEKLY_OFF' | 'HOLIDAY';
  shift?: Shift | null; // main shift
  leaveType?: 'PN' | 'UNPAID' | 'OTHER' | null;
  // Persisted UI/domain alias. leaveType remains the payroll engine's source.
  leaveCode?: 'PN' | 'UNPAID' | 'OTHER' | null;
  note?: string | null;
  // source of the time entry: DEVICE, MANUAL, or GEOFENCE_CONFIRMED
  timeSource?: 'DEVICE' | 'MANUAL' | 'GEOFENCE_CONFIRMED';
  // if an automated record is later edited manually, record original source
  originalTimeSource?: 'DEVICE' | 'MANUAL' | 'GEOFENCE_CONFIRMED' | null;
  // GPS metadata when confirmed via geofencing
  gpsMetadata?: {
    accuracy?: number;
    distance?: number;
    timestamp?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  // audit
  createdAt?: string | null; // ISO timestamp
  updatedAt?: string | null; // ISO timestamp
};

// Compute total worked hours for a DayAttendance. Respects crossing-midnight.
export function computeWorkedHours(a: DayAttendance): number {
  if (!a.shift || !a.shift.start || !a.shift.end) return 0;
  return paidHoursBetween(a.shift.start, a.shift.end);
}

export function computeDayNightBreakdown(a: DayAttendance): { dayHours: number; nightHours: number } {
  if (!a.shift || !a.shift.start || !a.shift.end) return { dayHours: 0, nightHours: 0 };
  return splitNightDayHours(a.shift.start, a.shift.end);
}

