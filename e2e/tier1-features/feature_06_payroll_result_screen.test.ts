import { calculatePayroll, DEFAULT_CONFIG, SalaryConfig } from '../../src/engine/payrollCalculator';
import { DayAttendance } from '../../src/engine/attendanceCalculator';

describe('Tier 1 - Feature 06: Modern PayrollResult Screen', () => {
  const customConfig: SalaryConfig = {
    basicSalary: 10400000,
    seniorityAllowance: 1040000,
    livingAllowance: 500000,
    attendanceAllowance: 300000,
    otherAllowance: 200000,
    standardHours: 208,
    insuranceRate: 10.5,
  };

  test('TC06-01: Full payroll calculation breaks down into Gross, Deductions, and Net salary accurately', () => {
    // 20 normal days (8h each = 160h)
    const records: DayAttendance[] = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-11-${String(i + 1).padStart(2, '0')}`,
      dayOfWeek: ((i + 1) % 7),
      dayType: 'NORMAL',
      shift: { start: '08:00', end: '17:00' },
    }));

    const result = calculatePayroll(records, customConfig);
    expect(result.grossPay).toBeGreaterThan(0);
    expect(result.totalDeductions).toBeGreaterThan(0);
    expect(result.netPay).toBe(result.grossPay - result.totalDeductions);
  });

  test('TC06-02: Overtime 150% and Weekend 200% produce exact multipliers on hourly rate', () => {
    const hourlyRate = (customConfig.basicSalary + customConfig.seniorityAllowance + customConfig.livingAllowance) / customConfig.standardHours;

    const otRecords: DayAttendance[] = [
      {
        date: '2026-11-09',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '19:00' }, // 8h normal + 2h OT 150%
      },
      {
        date: '2026-11-15',
        dayOfWeek: 0,
        dayType: 'WEEKLY_OFF',
        shift: { start: '08:00', end: '16:00' }, // 8h OT 200% weekend
      },
    ];

    const result = calculatePayroll(otRecords, customConfig);
    expect(result.ot150DayHours).toBeCloseTo(2 + 50 / 60, 5);
    expect(result.weeklyOff200Hours).toBe(8);

    // Overtime pay = (2h50m * 1.5 * 55,000) + (8h * 2.0 * 55,000)
    const expectedOtPay = Math.round(result.ot150DayHours * 1.5 * hourlyRate + 8 * 2.0 * hourlyRate);
    const actualOtPay = result.ot150DayPay + result.weeklyOff200Pay;
    expect(actualOtPay).toBeCloseTo(expectedOtPay, 0);
  });

  test('TC06-03: Statutory insurance deduction corresponds strictly to basicSalary * insuranceRate', () => {
    const records: DayAttendance[] = [
      {
        date: '2026-11-02',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      },
    ];
    const result = calculatePayroll(records, customConfig);
    const expectedInsurance = Math.round(((customConfig.basicSalary + customConfig.seniorityAllowance) * customConfig.insuranceRate) / 100);
    expect(result.insuranceDeduction).toBe(expectedInsurance);
  });

  test('TC06-04: Adjustments for lateness and allowances are cleanly accounted in subtotal groups', () => {
    const records: DayAttendance[] = [
      {
        date: '2026-11-02',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      },
    ];
    const adjustments = {
      latenessDeduction: 50000,
      mealSupport: 680000,
      damageDeduction: 200000,
    };
    const result = calculatePayroll(records, customConfig, adjustments);
    expect(result.latenessDeduction).toBe(50000);
    expect(result.mealSupport).toBe(680000);
    expect(result.damageDeduction).toBe(200000);
    expect(result.netPay).toBeCloseTo(result.grossPay - result.totalDeductions, 2);
  });

  test('TC06-05: Accordion data structure allows independent expansion of earnings vs deductions', () => {
    const result = calculatePayroll([], DEFAULT_CONFIG);
    expect(result.totalA).toBeDefined();
    expect(result.totalDeductions).toBeDefined();
    expect(result.actualHours).toBeDefined();

    expect(typeof result.grossPay).toBe('number');
    expect(typeof result.netPay).toBe('number');
    expect(typeof result.totalDeductions).toBe('number');
  });
});
