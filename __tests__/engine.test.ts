import { hoursBetween, splitNightDayHours } from '../src/engine/timeCalculator';
import { DayAttendance } from '../src/engine/attendanceCalculator';
import { calculatePayroll, DEFAULT_CONFIG } from '../src/engine/payrollCalculator';

test('hours between simple', () => {
  expect(hoursBetween('08:00','16:00')).toBeCloseTo(8);
});

test('hours between cross midnight', () => {
  expect(hoursBetween('22:00','06:00')).toBeCloseTo(8);
});

test('split night/day hours', () => {
  const res = splitNightDayHours('20:00', '02:00');
  // 20:00-22:00 = 2 day, 22:00-24:00 =2 night, 0-2 =2 night => night 4, day 2
  expect(res.dayHours).toBeCloseTo(2);
  expect(res.nightHours).toBeCloseTo(4);
});

test('payroll normal day 8h', () => {
  const a: DayAttendance = { date: '2026-09-01', dayOfWeek: 2, dayType: 'NORMAL', shift: { start: '08:00', end: '16:00' }, leaveType: null };
  const res = calculatePayroll([a], DEFAULT_CONFIG);
  // normal pay should be 8 * hourlyRate
  const hourly = (DEFAULT_CONFIG.basicSalary + DEFAULT_CONFIG.seniorityAllowance + DEFAULT_CONFIG.livingAllowance) / DEFAULT_CONFIG.standardHours;
  expect(res.normalHours).toBeCloseTo(8);
  expect(res.normalPay).toBeCloseTo(+ (8 * hourly).toFixed(2));
});

test('PN leave pays 8 hours', () => {
  const a: DayAttendance = { date: '2026-09-02', dayOfWeek: 3, dayType: 'NORMAL', shift: null, leaveType: 'PN' };
  const res = calculatePayroll([a], DEFAULT_CONFIG);
  const hourly = (DEFAULT_CONFIG.basicSalary + DEFAULT_CONFIG.seniorityAllowance + DEFAULT_CONFIG.livingAllowance) / DEFAULT_CONFIG.standardHours;
  expect(res.normalHours).toBeCloseTo(8);
  expect(res.normalPay).toBeCloseTo(+ (8 * hourly).toFixed(2));
});

test('night shift crossing midnight counts night hours and allowance', () => {
  const a: DayAttendance = { date: '2026-09-03', dayOfWeek: 4, dayType: 'NORMAL', shift: { start: '21:00', end: '05:00' }, leaveType: null };
  const res = calculatePayroll([a], DEFAULT_CONFIG);
  // total worked 8h, night hours from 22:00-05:00 = 7h
  expect(res.normalHours + res.ot150Hours + res.nightHours).toBeCloseTo(8);
  expect(res.nightHours).toBeCloseTo(7);
  expect(res.nightAllowance).toBeGreaterThan(0);
});

test('weekly off paid at 200%', () => {
  const a: DayAttendance = { date: '2026-09-05', dayOfWeek: 0, dayType: 'WEEKLY_OFF', shift: { start: '08:00', end: '12:00' }, leaveType: null };
  const res = calculatePayroll([a], DEFAULT_CONFIG);
  const hourly = (DEFAULT_CONFIG.basicSalary + DEFAULT_CONFIG.seniorityAllowance + DEFAULT_CONFIG.livingAllowance) / DEFAULT_CONFIG.standardHours;
  // 4 hours * 2.0
  expect(res.weeklyOffPay).toBeCloseTo(4 * hourly * 2.0);
});

test('attendance bonus 26/25/24', () => {
  const hourly = (DEFAULT_CONFIG.basicSalary + DEFAULT_CONFIG.seniorityAllowance + DEFAULT_CONFIG.livingAllowance) / DEFAULT_CONFIG.standardHours;
  // 26 worked days
  const days26: DayAttendance[] = Array.from({ length: 26 }, (_, i) => ({ date: `2026-09-${i+1}`, dayOfWeek: 1, dayType: 'NORMAL', shift: { start: '08:00', end: '16:00' }, leaveType: null }));
  const res26 = calculatePayroll(days26, DEFAULT_CONFIG);
  expect(res26.attendanceBonus).toBeCloseTo(DEFAULT_CONFIG.attendanceBonus100);

  // 25 worked days
  const days25 = days26.slice(0,25);
  const res25 = calculatePayroll(days25, DEFAULT_CONFIG);
  expect(res25.attendanceBonus).toBeCloseTo(Math.round(DEFAULT_CONFIG.attendanceBonus100 * DEFAULT_CONFIG.attendanceBonusPartialPercentFor25));

  // 24 worked days -> 0
  const days24 = days26.slice(0,24);
  const res24 = calculatePayroll(days24, DEFAULT_CONFIG);
  expect(res24.attendanceBonus).toBeCloseTo(0);
});
