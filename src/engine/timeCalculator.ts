export type TimePoint = { hours: number; minutes: number };

export type IntervalCategory =
  | 'NORMAL_100'
  | 'NIGHT_100'
  | 'OT_150_DAY'
  | 'OT_130_NIGHT'
  | 'OT_200_NIGHT'
  | 'OT_150_NIGHT'
  | 'OT_210'
  | 'WEEKLY_OFF_200'
  | 'WEEKLY_OFF_NIGHT_200'
  | 'WEEKLY_OFF_NIGHT_270'
  | 'HOLIDAY_300'
  | 'HOLIDAY_NIGHT_300'
  | 'HOLIDAY_NIGHT_390'
  | 'UNPAID_BREAK';

export type ClassifiedInterval = {
  start: string; // HH:mm
  end: string; // HH:mm
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  category: IntervalCategory;
  coefficient: number;
};

/** Accepts fast Vietnamese entry: 8, 8,30, 8:30. Returns canonical HH:mm. */
export function normalizeTimeInput(input: string): string | null {
  const value = input.trim();
  const match = /^(\d{1,2})(?:[,:](\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const normalized = normalizeTimeInput(hhmm);
  if (!normalized) throw new Error(`Invalid time: ${hhmm}`);
  return Number(normalized.slice(0, 2)) * 60 + Number(normalized.slice(3, 5));
}

export function hhmmToDecimal(hhmm: string): number {
  return hhmmToMinutes(hhmm) / 60;
}

export function decimalToHHMM(decimal: number): string {
  const minutes = Math.round(decimal * 60);
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function minutesToHHMM(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hoursBetween(start: string, end: string): number {
  const a = hhmmToMinutes(start);
  const b = hhmmToMinutes(end);
  return +(((b >= a ? b - a : 1440 - a + b) / 60).toFixed(6));
}

function absoluteSegments(start: string, end: string): Array<[number, number]> {
  const a = hhmmToMinutes(start);
  const b = hhmmToMinutes(end);
  return b >= a ? [[a, b]] : [[a, 1440], [0, b]];
}

function overlap(a: number, b: number, c: number, d: number) {
  return Math.max(0, Math.min(b, d) - Math.max(a, c));
}

/** Paid time excludes the existing one-hour meal break when a daytime shift crosses 12:00–13:00. */
export function paidHoursBetween(start: string, end: string): number {
  const segments = absoluteSegments(start, end);
  const elapsed = segments.reduce((total, [a, b]) => total + b - a, 0);
  // A standard/full-day shift (9h+) spanning lunch has its one-hour unpaid break.
  const breakMinutes = elapsed >= 540 ? segments.reduce((total, [a, b]) => total + overlap(a, b, 720, 780), 0) : 0;
  const minutes = elapsed - breakMinutes;
  return +(minutes / 60).toFixed(6);
}

/** Splits paid minutes into day/night; meal break is removed before payroll allocation. */
export function splitNightDayHours(start: string, end: string): { dayHours: number; nightHours: number } {
  let nightMinutes = 0;
  let totalMinutes = 0;
  const segments = absoluteSegments(start, end);
  const elapsed = segments.reduce((total, [a, b]) => total + b - a, 0);
  const deductBreak = elapsed >= 540;
  for (const [a, b] of segments) {
    const paid = (b - a) - (deductBreak ? overlap(a, b, 720, 780) : 0);
    totalMinutes += paid;
    nightMinutes += overlap(a, b, 0, 360) + overlap(a, b, 1320, 1440);
  }
  const nightHours = +(nightMinutes / 60).toFixed(6);
  return { nightHours, dayHours: +((totalMinutes / 60) - nightHours).toFixed(6) };
}

/**
 * Classifies a shift [start, end] into disjoint intervals conforming strictly
 * to the locked Excel & schedule rules.
 *
 * Invariant: SUM(interval.durationMinutes) === totalShiftMinutes (clockOut - clockIn).
 * No interval overlaps. Each minute belongs to exactly one category.
 */
export function classifyShiftIntervals(
  startStr: string,
  endStr: string,
  dayType: 'NORMAL' | 'WEEKLY_OFF' | 'HOLIDAY' = 'NORMAL'
): ClassifiedInterval[] {
  const normStart = normalizeTimeInput(startStr);
  const normEnd = normalizeTimeInput(endStr);
  if (!normStart || !normEnd) return [];

  const s = hhmmToMinutes(normStart);
  let e = hhmmToMinutes(normEnd);
  if (e <= s) {
    e += 1440; // overnight crossing
  }

  const totalShiftMinutes = e - s;
  if (totalShiftMinutes <= 0) return [];

  // 1. Check for unpaid lunch break (12:00 -> 13:00 = [720, 780])
  // Break applies to full-day daytime shifts (>= 9h elapsed) that span 12:00 to 13:00.
  const hasLunchBreak = totalShiftMinutes >= 540 && s < 780 && e > 720 && s < 720;
  const breakStart = 720;
  const breakEnd = 780;

  // Split into raw spans (working vs break)
  type Span = { start: number; end: number; isBreak?: boolean };
  const spans: Span[] = [];
  if (hasLunchBreak) {
    if (s < breakStart) spans.push({ start: s, end: Math.min(breakStart, e) });
    spans.push({ start: Math.max(s, breakStart), end: Math.min(breakEnd, e), isBreak: true });
    if (e > breakEnd) spans.push({ start: Math.max(breakEnd, s), end: e });
  } else {
    spans.push({ start: s, end: e });
  }

  const rawIntervals: ClassifiedInterval[] = [];

  // Helper to add interval
  const addInt = (iStart: number, iEnd: number, category: IntervalCategory, coefficient: number) => {
    if (iEnd <= iStart) return;
    rawIntervals.push({
      start: minutesToHHMM(iStart),
      end: minutesToHHMM(iEnd),
      startMinute: iStart,
      endMinute: iEnd,
      durationMinutes: iEnd - iStart,
      category,
      coefficient,
    });
  };

  // 2. Classify each working span
  if (dayType === 'WEEKLY_OFF') {
    // Sunday rules:
    // 22:00 -> 06:00 = 270% (weeklyOffNight270)
    // 20:00 -> 22:00 = 200% (weeklyOffNight200)
    // All other times (06:00 -> 20:00) = 200% (weeklyOff200)
    // Cut boundaries in 24h & 48h timeline:
    // 0..360 (00-06): 270%
    // 360..1200 (06-20): 200%
    // 1200..1320 (20-22): 200%
    // 1320..1800 (22-06 next day): 270%
    // 1800..2640 (06-20 next day): 200%
    // 2640..2760 (20-22 next day): 200%
    // 2760..3240 (22-06 next day): 270%
    for (const span of spans) {
      if (span.isBreak) {
        addInt(span.start, span.end, 'UNPAID_BREAK', 0);
        continue;
      }
      const boundaries = [0, 360, 1200, 1320, 1800, 2640, 2760, 3240];
      let curr = span.start;
      while (curr < span.end) {
        const nextB = boundaries.find((b) => b > curr) ?? span.end;
        const sliceEnd = Math.min(nextB, span.end);
        const modStart = curr % 1440;
        let category: IntervalCategory;
        let coeff = 2.0;

        if (modStart >= 1320 || modStart < 360) {
          category = 'WEEKLY_OFF_NIGHT_270';
          coeff = 2.7;
        } else if (modStart >= 1200 && modStart < 1320) {
          category = 'WEEKLY_OFF_NIGHT_200';
          coeff = 2.0;
        } else {
          category = 'WEEKLY_OFF_200';
          coeff = 2.0;
        }

        addInt(curr, sliceEnd, category, coeff);
        curr = sliceEnd;
      }
    }
  } else if (dayType === 'HOLIDAY') {
    // Holiday rules:
    // 22:00 -> 06:00 = 390% (holidayNight390)
    // 20:00 -> 22:00 = 300% (holidayNight300)
    // All other times (06:00 -> 20:00) = 300% (holiday300)
    for (const span of spans) {
      if (span.isBreak) {
        addInt(span.start, span.end, 'UNPAID_BREAK', 0);
        continue;
      }
      const boundaries = [0, 360, 1200, 1320, 1800, 2640, 2760, 3240];
      let curr = span.start;
      while (curr < span.end) {
        const nextB = boundaries.find((b) => b > curr) ?? span.end;
        const sliceEnd = Math.min(nextB, span.end);
        const modStart = curr % 1440;
        let category: IntervalCategory;
        let coeff = 3.0;

        if (modStart >= 1320 || modStart < 360) {
          category = 'HOLIDAY_NIGHT_390';
          coeff = 3.9;
        } else if (modStart >= 1200 && modStart < 1320) {
          category = 'HOLIDAY_NIGHT_300';
          coeff = 3.0;
        } else {
          category = 'HOLIDAY_300';
          coeff = 3.0;
        }

        addInt(curr, sliceEnd, category, coeff);
        curr = sliceEnd;
      }
    }
  } else {
    // NORMAL DAY
    // Special standalone early overtime shift after night shift: 06:00 -> 10:00
    const isEarlyMorningOt = s >= 360 && e <= 600 && s < 420;

    if (isEarlyMorningOt) {
      addInt(s, e, 'OT_150_NIGHT', 1.5);
    } else {
      // General normal day intervals:
      // - Ca ngày / ca chiều (start < 20:00):
      //     + Spans before 16:10 (970 min): NORMAL_100 (100%)
      //     + 16:10 -> 22:00 (970 -> 1320): OT_150_DAY (150%)
      // - Ca đêm (start >= 20:00):
      //     + 20:00 -> 22:00 (1200 -> 1320): NIGHT_100 (100%)
      // - Đêm chung:
      //     + 22:00 -> 04:00 (1320 -> 1680): OT_130_NIGHT (130%)
      //     + 04:00 -> 06:00 (1680 -> 1800): OT_200_NIGHT (200%)
      //     + 06:00 -> 10:00 (1800 -> 2040): OT_150_NIGHT (150%)
      //     + 2040+ (After 10:00 next day): OT_150_DAY (150%)
      const isNightShiftStart = s >= 1200;
      const boundaries = isNightShiftStart
        ? [1200, 1320, 1680, 1800, 2040, 2880]
        : [970, 1320, 1680, 1800, 2040, 2880];

      for (const span of spans) {
        if (span.isBreak) {
          addInt(span.start, span.end, 'UNPAID_BREAK', 0);
          continue;
        }

        let curr = span.start;
        while (curr < span.end) {
          const nextB = boundaries.find((b) => b > curr) ?? span.end;
          const sliceEnd = Math.min(nextB, span.end);

          let category: IntervalCategory;
          let coeff = 1.0;

          if (isNightShiftStart && curr >= 1200 && curr < 1320) {
            category = 'NIGHT_100';
            coeff = 1.0;
          } else if (curr < 970) {
            category = 'NORMAL_100';
            coeff = 1.0;
          } else if (curr >= 970 && curr < 1320) {
            category = 'OT_150_DAY';
            coeff = 1.5;
          } else if (curr >= 1320 && curr < 1680) {
            category = 'OT_130_NIGHT';
            coeff = 1.3;
          } else if (curr >= 1680 && curr < 1800) {
            category = 'OT_200_NIGHT';
            coeff = 2.0;
          } else if (curr >= 1800 && curr < 2040) {
            category = 'OT_150_NIGHT';
            coeff = 1.5;
          } else {
            category = 'OT_150_DAY';
            coeff = 1.5;
          }

          addInt(curr, sliceEnd, category, coeff);
          curr = sliceEnd;
        }
      }
    }
  }

  return rawIntervals;
}

