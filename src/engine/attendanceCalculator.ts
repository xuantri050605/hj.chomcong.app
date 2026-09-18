import { hoursBetween, splitNightDayHours } from './timeCalculator';

export type Shift = {
  start: string; // HH:mm
  end: string; // HH:mm
};

export type DayAttendance = {
  date: string; // ISO date
  dayOfWeek: number; // 0 Sun - 6 Sat
  dayType: 'NORMAL' | 'WEEKLY_OFF' | 'HOLIDAY';
  shift?: Shift | null; // main shift
  leaveType?: 'PN' | 'UNPAID' | 'OTHER' | null;
  note?: string | null;
};

// Compute total worked hours for a DayAttendance. Respects crossing-midnight.
export function computeWorkedHours(a: DayAttendance): number {
  if (!a.shift) return 0;
  return hoursBetween(a.shift.start, a.shift.end);
}

export function computeDayNightBreakdown(a: DayAttendance): { dayHours: number; nightHours: number } {
  if (!a.shift) return { dayHours: 0, nightHours: 0 };
  return splitNightDayHours(a.shift.start, a.shift.end);
}

