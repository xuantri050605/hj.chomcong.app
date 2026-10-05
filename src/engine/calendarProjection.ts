import { DayAttendance, computeWorkedHours } from './attendanceCalculator';
import { computeOvertimeForDay } from './overtimeCalculator';
import { dateInMonth, getMonthEnd, getMonthStart, localDateKey, weekdayForDateKey } from '../utils/monthUtils';

export type CalendarDay = {
  date: string;
  dayType: DayAttendance['dayType'];
  leaveType: DayAttendance['leaveType'];
  attendance?: DayAttendance;
  worked: boolean;
  hasOvertime: boolean;
};

/**
 * Domain projection for the calendar. It deliberately produces every local
 * calendar day between the selected month's start and end. Attendance records
 * override the date-derived default; a record is never reduced to EMPTY just
 * because it has no shift (PN is the important example).
 *
 * The existing default weekly-rest rule is Sunday (dayOfWeek === 0). Holidays
 * and non-default weekly-off days are persisted as DayAttendance.dayType.
 */
export function buildCalendarDays(selectedMonth: string, records: DayAttendance[]): CalendarDay[] {
  const monthRecords = new Map(records.filter((record) => dateInMonth(record.date, selectedMonth)).map(record => [record.date, record]));
  const endKey = localDateKey(getMonthEnd(selectedMonth));
  const cursor = getMonthStart(selectedMonth);
  const result: CalendarDay[] = [];
  while (localDateKey(cursor) <= endKey) {
    const date = localDateKey(cursor);
    const attendance = monthRecords.get(date);
    const dayType = attendance?.dayType ?? (weekdayForDateKey(date) === 0 ? 'WEEKLY_OFF' : 'NORMAL');
    const leaveType = attendance?.leaveType ?? null;
    const worked = Boolean(attendance?.shift?.start);
    const overtime = attendance ? computeOvertimeForDay(attendance) : { ot150: 0, ot200: 0, ot210: 0 };
    // Rest/holiday work is paid by its special payroll category; it is still
    // shown as work rather than inventing an OT amount in the UI.
    const hasOvertime = overtime.ot150 + overtime.ot200 + overtime.ot210 > 0 || (worked && dayType !== 'NORMAL' && computeWorkedHours(attendance! ) > 0);
    result.push({ date, dayType, leaveType, attendance, worked, hasOvertime });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
