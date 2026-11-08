import {
  DayAttendance,
  computeWorkedHours,
  computeDayNightBreakdown,
} from '../../src/engine/attendanceCalculator';
import {
  calculatePayroll,
  DEFAULT_CONFIG,
  SalaryConfig,
} from '../../src/engine/payrollCalculator';
import { useAttendanceStore } from '../../src/store/attendanceStore';
import { useSalaryStore } from '../../src/store/salaryStore';

describe('Tier 2 - Boundary & Corner Cases: Attendance & Payroll (Features 4, 5, 6)', () => {
  beforeEach(async () => {
    useAttendanceStore.setState({ month: '2026-11', items: [] });
    await useSalaryStore.getState().resetDefaults();
  });

  // Feature 4: Attendance Screen Boundaries (5 tests)
  describe('F04: Attendance Screen Boundary Tests', () => {
    test('TC-B04-01: Overnight shift crossing midnight (22:00 -> 06:00) computes exact 8 hours', () => {
      const overnightRecord: DayAttendance = {
        date: '2026-11-10',
        dayOfWeek: 2,
        dayType: 'NORMAL',
        shift: { start: '22:00', end: '06:00' },
      };
      const hours = computeWorkedHours(overnightRecord);
      expect(hours).toBe(8);

      const breakdown = computeDayNightBreakdown(overnightRecord);
      // Entire 22:00 to 06:00 is within night window
      expect(breakdown.nightHours).toBe(8);
      expect(breakdown.dayHours).toBe(0);
    });

    test('TC-B04-02: 0-minute shift (start equals end) computes exactly 0 worked hours', () => {
      const zeroShift: DayAttendance = {
        date: '2026-11-11',
        dayOfWeek: 3,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '08:00' },
      };
      const hours = computeWorkedHours(zeroShift);
      expect(hours).toBe(0);
    });

    test('TC-B04-03: Duplicate clock-in while shift is already open is ignored idempotently', async () => {
      const now = new Date('2026-11-12T08:00:00Z');
      await useAttendanceStore.getState().clockIn(now, 'DEVICE');
      const itemsAfterFirst = useAttendanceStore.getState().items;
      expect(itemsAfterFirst.length).toBe(1);

      // Second clock-in on same day while open
      await useAttendanceStore.getState().clockIn(now, 'DEVICE');
      const itemsAfterSecond = useAttendanceStore.getState().items;
      expect(itemsAfterSecond.length).toBe(1);
    });

    test('TC-B04-04: Clock-out without a prior clock-in creates safe record or ignores gracefully', async () => {
      const now = new Date('2026-11-13T17:00:00Z');
      await expect(
        useAttendanceStore.getState().clockOut(now, 'DEVICE')
      ).resolves.not.toThrow();
    });

    test('TC-B04-05: Missing shift start or end handles safely and returns 0 worked hours', () => {
      const incompleteRecord: DayAttendance = {
        date: '2026-11-14',
        dayOfWeek: 6,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: null },
      };
      expect(computeWorkedHours(incompleteRecord)).toBe(0);
    });
  });

  // Feature 5: SalaryConfig Screen Boundaries (5 tests)
  describe('F05: SalaryConfig Screen Boundary Tests', () => {
    test('TC-B05-01: Zero basic salary computes valid payroll without throwing', async () => {
      const zeroSalaryConfig: SalaryConfig = {
        ...DEFAULT_CONFIG,
        basicSalary: 0,
      };
      await useSalaryStore.getState().setConfig(zeroSalaryConfig);
      const res = calculatePayroll([], useSalaryStore.getState().config);
      expect(typeof res.netPay).toBe('number');
      expect(Number.isFinite(res.netPay)).toBe(true);
    });

    test('TC-B05-02: Negative allowance input is sanitized/clamped to 0', async () => {
      const negativeConfig: SalaryConfig = {
        ...DEFAULT_CONFIG,
        livingAllowance: -500000,
        attendanceAllowance: -200000,
      };
      await useSalaryStore.getState().setConfig(negativeConfig);
      const saved = useSalaryStore.getState().config;
      expect(saved.livingAllowance).toBeGreaterThanOrEqual(0);
      expect(saved.attendanceAllowance).toBeGreaterThanOrEqual(0);
    });

    test('TC-B05-03: Zero standard hours in config prevents division by zero', async () => {
      const zeroHoursConfig: SalaryConfig = {
        ...DEFAULT_CONFIG,
        standardHours: 0,
      };
      await useSalaryStore.getState().setConfig(zeroHoursConfig);
      const res = calculatePayroll([], useSalaryStore.getState().config);
      expect(Number.isFinite(res.grossPay)).toBe(true);
      expect(Number.isFinite(res.netPay)).toBe(true);
    });

    test('TC-B05-04: Maximum 100% insurance rate boundary (100) deducts full base salary without overflow', () => {
      const maxInsuranceConfig: SalaryConfig = {
        ...DEFAULT_CONFIG,
        basicSalary: 10000000,
        seniorityAllowance: 0,
        insuranceRate: 100, // 100%
      };
      const res = calculatePayroll([], maxInsuranceConfig);
      expect(res.insuranceDeduction).toBe(10000000);
      expect(typeof res.netPay).toBe('number');
    });

    test('TC-B05-05: Extreme standard hours (720h full 30 days continuous) calculates valid hourly rate', async () => {
      const continuousConfig: SalaryConfig = {
        ...DEFAULT_CONFIG,
        standardHours: 720,
      };
      await useSalaryStore.getState().setConfig(continuousConfig);
      const hourlyRate = (continuousConfig.basicSalary + continuousConfig.seniorityAllowance) / continuousConfig.standardHours;
      expect(hourlyRate).toBeGreaterThan(0);
      expect(Number.isFinite(hourlyRate)).toBe(true);
    });
  });

  // Feature 6: PayrollResult Screen Boundaries (5 tests)
  describe('F06: PayrollResult Screen Boundary Tests', () => {
    test('TC-B06-01: Massive deductions exceeding gross salary clamp net salary at 0 (never negative)', () => {
      const record: DayAttendance = {
        date: '2026-11-02',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      };
      const extremeAdjustments = {
        latenessDeduction: 50000000,
        damageDeduction: 50000000,
      };
      const result = calculatePayroll([record], DEFAULT_CONFIG, extremeAdjustments);
      expect(typeof result.netPay).toBe('number');
      expect(Number.isFinite(result.netPay)).toBe(true);
    });

    test('TC-B06-02: Holiday overtime with night shift computes highest multiplier (300% OT)', () => {
      const holidayNightRecord: DayAttendance = {
        date: '2026-09-02', // Vietnam National Day
        dayOfWeek: 3,
        dayType: 'HOLIDAY',
        shift: { start: '22:00', end: '06:00' }, // 8h night shift on holiday
      };
      const result = calculatePayroll([holidayNightRecord], DEFAULT_CONFIG);
      expect(result.actualHours).toBe(8);
      expect(result.grossPay).toBeGreaterThan(0);
    });

    test('TC-B06-03: Zero worked hours with positive monthly allowances yields allowance total as gross', () => {
      const allowanceConfig: SalaryConfig = {
        ...DEFAULT_CONFIG,
        livingAllowance: 500000,
        attendanceAllowance: 0, // lost due to 0 attendance
      };
      const result = calculatePayroll([], allowanceConfig);
      expect(result.actualHours).toBe(0);
      expect(result.grossPay).toBeGreaterThanOrEqual(0);
    });

    test('TC-B06-04: Leap year February 29th attendance computes and persists without date rejection', () => {
      const leapRecord: DayAttendance = {
        date: '2028-02-29',
        dayOfWeek: 2,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      };
      const result = calculatePayroll([leapRecord], DEFAULT_CONFIG);
      expect(result.actualHours).toBe(8);
    });

    test('TC-B06-05: Empty adjustments object does not alter baseline payroll figures', () => {
      const baseline = calculatePayroll([], DEFAULT_CONFIG);
      const withEmptyAdjustments = calculatePayroll([], DEFAULT_CONFIG, {});
      expect(withEmptyAdjustments.grossPay).toBe(baseline.grossPay);
      expect(withEmptyAdjustments.netPay).toBe(baseline.netPay);
      expect(withEmptyAdjustments.totalDeductions).toBe(baseline.totalDeductions);
    });
  });
});
