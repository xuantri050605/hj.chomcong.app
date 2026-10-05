import { DayAttendance } from './attendanceCalculator';
import { classifyShiftIntervals } from './timeCalculator';

export type OTBreakdown = {
  ot150: number;
  ot200: number;
  ot210: number;
};

// Compute overtime breakdown for a single day given attendance and interval classification rules:
export function computeOvertimeForDay(a: DayAttendance): OTBreakdown {
  if (a.leaveType === 'PN' || a.leaveType === 'UNPAID' || a.leaveType === 'OTHER') {
    return { ot150: 0, ot200: 0, ot210: 0 };
  }
  if (!a.shift || !a.shift.start || !a.shift.end) {
    return { ot150: 0, ot200: 0, ot210: 0 };
  }

  const intervals = classifyShiftIntervals(a.shift.start, a.shift.end, a.dayType);
  let ot150 = 0;
  let ot200 = 0;
  let ot210 = 0;

  for (const iv of intervals) {
    const h = iv.durationMinutes / 60;
    if (iv.category === 'OT_150_DAY' || iv.category === 'OT_150_NIGHT') {
      ot150 += h;
    } else if (iv.category === 'OT_200_NIGHT' || iv.category === 'WEEKLY_OFF_200' || iv.category === 'WEEKLY_OFF_NIGHT_200') {
      ot200 += h;
    } else if (iv.category === 'OT_210') {
      ot210 += h;
    }
  }

  return {
    ot150: +ot150.toFixed(4),
    ot200: +ot200.toFixed(4),
    ot210: +ot210.toFixed(4),
  };
}
