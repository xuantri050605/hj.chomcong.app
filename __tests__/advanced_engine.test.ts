import { DEFAULT_CONFIG, calculatePayroll } from '../src/engine/payrollCalculator';
import { DayAttendance } from '../src/engine/attendanceCalculator';

function hourly(cfg = DEFAULT_CONFIG) {
  return (cfg.basicSalary + cfg.seniorityAllowance + cfg.livingAllowance) / cfg.standardHours;
}
function normalHourly(cfg = DEFAULT_CONFIG) { return (cfg.basicSalary + cfg.seniorityAllowance) / cfg.standardHours; }

test('OT150 daytime overtime', () => {
  const a: DayAttendance = { date: '2026-09-10', dayOfWeek: 4, dayType: 'NORMAL', shift: { start: '08:00', end: '18:00' }, leaveType: null };
  const res = calculatePayroll([a]);
  const h = hourly();
  // 08:00–18:00 has lunch break; OT starts at 16:10 => normal = 7h10, OT150 = 1h50 (1.833h)
  expect(res.normalHours).toBeCloseTo(7 + 10 / 60, 4);
  expect(res.ot150Hours).toBeCloseTo(1 + 50 / 60, 4);
  expect(res.ot150Pay).toBeCloseTo((1 + 50 / 60) * h * 1.5, 0);
});

test('OT200 night overtime', () => {
  const a: DayAttendance = { date: '2026-09-11', dayOfWeek: 5, dayType: 'NORMAL', shift: { start: '20:00', end: '06:00' }, leaveType: null };
  const res = calculatePayroll([a]);
  const h = hourly();
  // worked 10h: day 2h (20-22), night 8h (22-06)
  expect(res.ot200Hours).toBeCloseTo(2);
  expect(res.ot200Pay).toBeCloseTo(2 * h * 2.0, 2);
});

test('Daytime shift spanning to night: 08:00 -> 22:00', () => {
  const a: DayAttendance = { date: '2026-09-12', dayOfWeek: 1, dayType: 'NORMAL', shift: { start: '08:00', end: '22:00' }, leaveType: null };
  const res = calculatePayroll([a]);
  const h = hourly();
  // 08:00–16:10 normal = 7h10, 16:10–22:00 OT150 = 5h50 (5.833h)
  expect(res.normalHours).toBeCloseTo(7 + 10 / 60, 4);
  expect(res.ot150Hours).toBeCloseTo(5 + 50 / 60, 4);
  expect(res.night100Hours).toBe(0);
  expect(res.ot150Pay).toBeCloseTo((5 + 50 / 60) * h * 1.5, 0);
});

test('Weekly off and weekly off night rates', () => {
  const a: DayAttendance = { date: '2026-09-13', dayOfWeek: 0, dayType: 'WEEKLY_OFF', shift: { start: '20:00', end: '04:00' }, leaveType: null };
  const res = calculatePayroll([a]);
  const h = hourly();
  // worked 8h, split: day=2h, night=6h
  // day portion: 2h * 2.0 base
  // night portion: 6h * 2.7 (which is 2.0 base + 0.7 extra)
  // total = 2*h*2.0 + 6*h*2.7
  // Or equivalent: day total + night total
  const expectedTotal = 2 * h * 2.0 + 6 * h * 2.7;
  expect(res.weeklyOffPay + res.weeklyOffNightPay).toBeCloseTo(expectedTotal, 1);
});

test('Holiday night rates', () => {
  const a: DayAttendance = { date: '2026-09-14', dayOfWeek: 2, dayType: 'HOLIDAY', shift: { start: '21:00', end: '05:00' }, leaveType: null };
  const res = calculatePayroll([a]);
  const h = hourly();
  // worked 8h, split: day=1h (21-22), night=7h (22-05)
  // day portion: 1h * 3.0 base
  // night portion: 7h * 3.9 (which is 3.0 base + 0.9 extra)
  // total = 1*h*3.0 + 7*h*3.9
  const expectedTotal = 1 * h * 3.0 + 7 * h * 3.9;
  expect(res.holidayPay + res.holidayNightPay).toBeCloseTo(expectedTotal, 1);
});

test('PN pays 8 hours and unpaid pays 0', () => {
  const a1: DayAttendance = { date: '2026-09-15', dayOfWeek: 3, dayType: 'NORMAL', shift: null, leaveType: 'PN' };
  const a2: DayAttendance = { date: '2026-09-16', dayOfWeek: 4, dayType: 'NORMAL', shift: null, leaveType: 'UNPAID' };
  const r1 = calculatePayroll([a1]);
  const r2 = calculatePayroll([a2]);
  const h = hourly();
  expect(r1.normalHours).toBeCloseTo(8);
  expect(r1.normalPay).toBeCloseTo(8 * normalHourly());
  expect(r2.normalHours).toBeCloseTo(0);
});

test('overnight shift no double counting', () => {
  const a: DayAttendance = { date: '2026-09-17', dayOfWeek: 5, dayType: 'NORMAL', shift: { start: '22:00', end: '06:00' }, leaveType: null };
  const res = calculatePayroll([a]);
  // worked 8h; all 8h are night hours
  expect(res.normalHours + res.ot150Hours + (res.ot200Hours||0) + (res.ot210Hours||0) + (res.ot130NightHours||0)).toBeCloseTo(8);
  // nightHours130 is the total night hours (22:00-06:00)
  expect(res.nightHours130).toBeCloseTo(8);
});

