/**
 * Canonical month representation: YYYY-MM
 * Example: "2026-09"
 *
 * This module provides deterministic, timezone-safe month manipulation.
 * All functions work with local calendar dates, not UTC.
 */

/**
 * Convert a Date to a month key (YYYY-MM).
 * Uses local date only, ignoring time and timezone.
 */
export function monthKey(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Parse a month key string (YYYY-MM) into year and month numbers.
 */
export function parseMonthKey(key: string): { year: number; month: number } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw new Error(`Invalid month key: ${key}`);
  const [y, m] = key.split('-');
  return { year: Number(y), month: Number(m) };
}

/**
 * Get the previous month in YYYY-MM format.
 * Example: "2026-09" → "2026-08"
 *          "2026-01" → "2025-12"
 */
export function getPreviousMonth(monthKeyStr: string): string {
  const { year, month } = parseMonthKey(monthKeyStr);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Get the next month in YYYY-MM format.
 * Example: "2026-09" → "2026-10"
 *          "2026-12" → "2027-01"
 */
export function getNextMonth(monthKeyStr: string): string {
  const { year, month } = parseMonthKey(monthKeyStr);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Get the first day of the month as a Date (local midnight).
 */
export function getMonthStart(monthKeyStr: string): Date {
  const { year, month } = parseMonthKey(monthKeyStr);
  // Create date in local timezone: first day of the month
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/**
 * Get the last day of the month as a Date (local midnight).
 */
export function getMonthEnd(monthKeyStr: string): Date {
  const { year, month } = parseMonthKey(monthKeyStr);
  // Create date for the first day of NEXT month, then subtract 1 second
  const nextMonth = new Date(year, month, 1, 0, 0, 0, 0);
  // Subtract 1 millisecond to get last moment of the current month
  return new Date(nextMonth.getTime() - 1);
}

/**
 * Get the number of days in a month.
 * Example: "2026-09" → 30
 *          "2026-02" → 28
 *          "2028-02" → 29 (leap year)
 */
export function daysInMonth(monthKeyStr: string): number {
  const { year, month } = parseMonthKey(monthKeyStr);
  // Create date for the first day of NEXT month, then get the day
  return new Date(year, month, 0).getDate();
}

/**
 * Check if a year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get the current month in YYYY-MM format (local date).
 */
export function getCurrentMonth(): string {
  return monthKey(new Date());
}

/**
 * Format a month key for display.
 * Example: "2026-09" → "Tháng 09/2026"
 */
export function formatMonthDisplay(monthKeyStr: string): string {
  const { year, month } = parseMonthKey(monthKeyStr);
  return `Tháng ${String(month).padStart(2, '0')}/${year}`;
}

/**
 * Check if a given ISO date string (YYYY-MM-DD) belongs to a month.
 * Uses local date only.
 */
export function dateInMonth(dateStr: string, monthKeyStr: string): boolean {
  const { year, month } = parseMonthKey(monthKeyStr);
  const [dateYear, dateMonth] = dateStr.split('-').map(Number);
  return dateYear === year && dateMonth === month;
}

/**
 * Get all dates in a month as ISO date strings (YYYY-MM-DD).
 */
export function getDatesInMonth(monthKeyStr: string): string[] {
  const { year, month } = parseMonthKey(monthKeyStr);
  const days = daysInMonth(monthKeyStr);
  const dates: string[] = [];
  for (let day = 1; day <= days; day++) {
    // Date keys are calendar values, never UTC timestamps. This keeps dates stable
    // in timezones east/west of UTC.
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return dates;
}

/** Local calendar date key; intentionally avoids toISOString(). */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Local clock value, independent of UTC serialization. */
export function localTimeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function weekdayForDateKey(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

/**
 * Navigate by a number of months (positive or negative).
 * Example: navigateMonths("2026-09", 1) → "2026-10"
 *          navigateMonths("2026-09", -2) → "2026-07"
 */
export function navigateMonths(monthKeyStr: string, offset: number): string {
  let result = monthKeyStr;
  if (offset > 0) {
    for (let i = 0; i < offset; i++) {
      result = getNextMonth(result);
    }
  } else if (offset < 0) {
    for (let i = 0; i < -offset; i++) {
      result = getPreviousMonth(result);
    }
  }
  return result;
}
