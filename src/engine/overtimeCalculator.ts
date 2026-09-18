import { DayAttendance, computeWorkedHours, computeDayNightBreakdown } from './attendanceCalculator';

export type OTBreakdown = {
  ot150: number;
  ot200: number;
  ot210: number;
};

// Compute overtime breakdown for a single day given attendance and rules:
// - Normal day: hours beyond 8 => ot150
// - Weekly off / holiday: handled in payroll categories, not as ot150 here
export function computeOvertimeForDay(a: DayAttendance): OTBreakdown {
  const worked = computeWorkedHours(a);
  if (a.leaveType === 'PN' || a.leaveType === 'UNPAID') return { ot150: 0, ot200: 0, ot210: 0 };

  if (a.dayType === 'NORMAL') {
    const ot150 = Math.max(0, +(worked - 8).toFixed(6));
    return { ot150, ot200: 0, ot210: 0 };
  }

  // For WEEKLY_OFF or HOLIDAY, overtime breakdown is not applied here; payroll uses different multipliers.
  return { ot150: 0, ot200: 0, ot210: 0 };
}
