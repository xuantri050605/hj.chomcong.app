import { normalizeTimeInput, paidHoursBetween } from '../src/engine/timeCalculator';
import { calculatePayroll, DEFAULT_CONFIG } from '../src/engine/payrollCalculator';

test('fast time input normalizes and rejects invalid values', () => {
  expect(normalizeTimeInput('8')).toBe('08:00');
  expect(normalizeTimeInput('8,30')).toBe('08:30');
  expect(normalizeTimeInput('17')).toBe('17:00');
  expect(normalizeTimeInput('17,30')).toBe('17:30');
  expect(normalizeTimeInput('8:30')).toBe('08:30');
  expect(normalizeTimeInput('8,60')).toBeNull();
  expect(normalizeTimeInput('25')).toBeNull();
  expect(paidHoursBetween('20', '5')).toBe(9);
  expect(paidHoursBetween('08:00', '17:00')).toBe(8);
});

test('normal and premium bases are separate and insurance is config driven', () => {
  const normal = calculatePayroll([{ date:'2026-09-01', dayOfWeek:1, dayType:'NORMAL', shift:{start:'08:00',end:'16:00'} }] as any, DEFAULT_CONFIG);
  const ot = calculatePayroll([{ date:'2026-09-01', dayOfWeek:1, dayType:'NORMAL', shift:{start:'08:00',end:'20:00'} }] as any, DEFAULT_CONFIG);
  const normalBase = (DEFAULT_CONFIG.basicSalary + DEFAULT_CONFIG.seniorityAllowance) / DEFAULT_CONFIG.standardHours;
  const premiumBase = (DEFAULT_CONFIG.basicSalary + DEFAULT_CONFIG.seniorityAllowance + DEFAULT_CONFIG.livingAllowance) / DEFAULT_CONFIG.standardHours;
  expect(normal.normalPay).toBe(+(8 * normalBase).toFixed(2));
  expect(ot.ot150Pay).toBeCloseTo((3 + 50 / 60) * premiumBase * 1.5, 2);
  expect(normal.insuranceDeduction).toBe(638137.5);
  expect(calculatePayroll([], { ...DEFAULT_CONFIG, insuranceRate:10 }).insuranceDeduction).toBe(607750);
  expect(calculatePayroll([], { ...DEFAULT_CONFIG, insuranceRate:8 }).insuranceDeduction).toBe(486200);
});

test('attendance allowance is never fully paid for a partial month', () => {
  const rows = Array.from({ length:26 }, (_, index) => ({ date:`2026-09-${String(index + 1).padStart(2,'0')}`, dayOfWeek:1, dayType:'NORMAL', shift:{start:'08:00',end:'16:00'} }));
  expect(calculatePayroll(rows as any).attendanceBonus).toBe(DEFAULT_CONFIG.attendanceAllowance);
  expect(calculatePayroll(rows.slice(0,25) as any).attendanceBonus).toBeCloseTo((DEFAULT_CONFIG.attendanceAllowance / 26) * 25, 2);
  expect(calculatePayroll(rows.slice(0,24) as any).attendanceBonus).toBeCloseTo((DEFAULT_CONFIG.attendanceAllowance / 26) * 24, 2);
});
