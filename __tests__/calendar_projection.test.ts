import { buildCalendarDays } from '../src/engine/calendarProjection';
import { calculatePayroll, DEFAULT_CONFIG } from '../src/engine/payrollCalculator';

const find = (days: ReturnType<typeof buildCalendarDays>, date: string) => days.find(day => day.date === date)!;

test('calendar projects all dates and preserves leave/off/work states', () => {
  const days = buildCalendarDays('2026-09', [
    { date:'2026-09-10', dayOfWeek:4, dayType:'NORMAL', leaveType:'PN', shift:null },
    { date:'2026-09-13', dayOfWeek:0, dayType:'WEEKLY_OFF', shift:{ start:'08:00', end:'12:00' } },
    { date:'2026-09-21', dayOfWeek:1, dayType:'HOLIDAY', shift:null },
    { date:'2026-08-30', dayOfWeek:0, dayType:'WEEKLY_OFF', shift:null },
  ] as any);
  expect(days).toHaveLength(30);
  expect(find(days, '2026-09-06').dayType).toBe('WEEKLY_OFF'); // no attendance record
  expect(find(days, '2026-09-10').leaveType).toBe('PN');
  expect(find(days, '2026-09-13')).toMatchObject({ dayType:'WEEKLY_OFF', worked:true, hasOvertime:true });
  expect(find(days, '2026-09-21').dayType).toBe('HOLIDAY');
  expect(days.some(day => day.date === '2026-08-30')).toBe(false);
});

test('calendar month lengths and period boundaries are complete', () => {
  expect(buildCalendarDays('2026-02', [])).toHaveLength(28);
  expect(buildCalendarDays('2028-02', [])).toHaveLength(29);
  expect(buildCalendarDays('2026-04', [])).toHaveLength(30);
  expect(buildCalendarDays('2026-10', [])).toHaveLength(31);
  const december = buildCalendarDays('2025-12', []);
  expect(december[december.length - 1].date).toBe('2025-12-31');
  expect(buildCalendarDays('2026-01', [])[0].date).toBe('2026-01-01');
});

test('PN remains paid at eight normal hours', () => {
  const payroll = calculatePayroll([{ date:'2026-09-10', dayOfWeek:4, dayType:'NORMAL', leaveType:'PN', shift:null }], DEFAULT_CONFIG);
  expect(payroll.normalHours).toBe(8);
});

test('overnight start-date record does not change the next month calendar', () => {
  const september = buildCalendarDays('2026-09', [{ date:'2026-09-30', dayOfWeek:3, dayType:'NORMAL', shift:{ start:'20:00', end:'05:00' } }] as any);
  const october = buildCalendarDays('2026-10', [{ date:'2026-09-30', dayOfWeek:3, dayType:'NORMAL', shift:{ start:'20:00', end:'05:00' } }] as any);
  expect(find(september, '2026-09-30').worked).toBe(true);
  expect(october.some(day => day.attendance)).toBe(false);
});
