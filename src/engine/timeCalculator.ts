// Engine: timeCalculator
// Provides utilities to parse and compute time intervals and night-hours.

export type TimePoint = { hours: number; minutes: number };

export function hhmmToDecimal(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

export function decimalToHHMM(dec: number): string {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Compute hours between two times, supporting crossing midnight
export function hoursBetween(startHHMM: string, endHHMM: string): number {
  const s = hhmmToDecimal(startHHMM);
  const e = hhmmToDecimal(endHHMM);
  if (e >= s) return +(e - s).toFixed(6);
  // crosses midnight
  return +(24 - s + e).toFixed(6);
}

// Split an interval into night and day hours. Night defined as 22:00-06:00.
export function splitNightDayHours(startHHMM: string, endHHMM: string): { dayHours: number; nightHours: number } {
  const NIGHT_START = hhmmToDecimal('22:00');
  const NIGHT_END = hhmmToDecimal('06:00');

  // normalize to minutes scale as decimal hours
  const s = hhmmToDecimal(startHHMM);
  const e = hhmmToDecimal(endHHMM);

  // build intervals in absolute timeline (0..24) possibly split across midnight
  const intervals: Array<{ a: number; b: number }> = [];
  if (e >= s) intervals.push({ a: s, b: e });
  else {
    intervals.push({ a: s, b: 24 });
    intervals.push({ a: 0, b: e });
  }

  let night = 0;
  for (const seg of intervals) {
    // night segment 1: 22:00 - 24:00
    const ns1 = Math.max(seg.a, NIGHT_START);
    const ne1 = Math.min(seg.b, 24);
    if (ne1 > ns1) night += ne1 - ns1;
    // night segment 2: 0:00 - 06:00
    const ns2 = Math.max(seg.a, 0);
    const ne2 = Math.min(seg.b, NIGHT_END);
    if (ne2 > ns2) night += ne2 - ns2;
  }

  const total = +(intervals.reduce((acc, cur) => acc + (cur.b - cur.a), 0)).toFixed(6);
  const nightFixed = +night.toFixed(6);
  const day = +(total - nightFixed).toFixed(6);
  return { dayHours: day, nightHours: nightFixed };
}
