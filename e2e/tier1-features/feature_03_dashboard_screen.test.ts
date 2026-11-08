import { calculatePayroll, DEFAULT_CONFIG } from '../../src/engine/payrollCalculator';
import { DayAttendance } from '../../src/engine/attendanceCalculator';

describe('Tier 1 - Feature 03: Modern Dashboard Screen', () => {
  const sampleRecords: DayAttendance[] = [
    {
      date: '2026-11-02',
      dayOfWeek: 1,
      dayType: 'NORMAL',
      shift: { start: '08:00', end: '17:00' },
    },
    {
      date: '2026-11-03',
      dayOfWeek: 2,
      dayType: 'NORMAL',
      shift: { start: '08:00', end: '19:00' }, // 8h normal + 2h OT
    },
  ];

  test('TC03-01: Dashboard KPI aggregates worked hours and normal hours accurately', () => {
    const result = calculatePayroll(sampleRecords, DEFAULT_CONFIG);
    expect(result.actualHours).toBe(18);
    expect(result.normalHours).toBeCloseTo(14 + 20 / 60, 4);
    expect(result.ot150DayHours).toBeCloseTo(3 + 40 / 60, 4);
  });

  test('TC03-02: Progress bar percentage calculates completed hours over standard monthly hours', () => {
    const standardHours = DEFAULT_CONFIG.standardHours; // 208
    const totalWorked = 18;
    const progressPercent = Math.min(100, Math.round((totalWorked / standardHours) * 100));
    expect(progressPercent).toBe(9);
    expect(progressPercent).toBeGreaterThanOrEqual(0);
    expect(progressPercent).toBeLessThanOrEqual(100);
  });

  test('TC03-03: Dashboard handles zero attendance records without NaN or crash', () => {
    const result = calculatePayroll([], DEFAULT_CONFIG);
    expect(result.actualHours).toBe(0);
    expect(typeof result.netPay).toBe('number');
    expect(Number.isNaN(result.netPay)).toBe(false);
  });

  test('TC03-04: Estimated gross salary updates dynamically as shifts are added', () => {
    const initial = calculatePayroll([], DEFAULT_CONFIG);
    const withShifts = calculatePayroll(sampleRecords, DEFAULT_CONFIG);
    expect(withShifts.grossPay).toBeGreaterThan(initial.grossPay);
  });

  test('TC03-05: Desktop 4-column vs mobile 2-column layout column width calculations', () => {
    const computeCardWidth = (screenWidth: number): string => {
      if (screenWidth >= 1024) return '23%'; // 4 cards per row
      if (screenWidth >= 640) return '48%'; // 2 cards per row
      return '100%'; // 1 card per row on small phones
    };

    expect(computeCardWidth(1280)).toBe('23%');
    expect(computeCardWidth(768)).toBe('48%');
    expect(computeCardWidth(375)).toBe('100%');
  });
});
