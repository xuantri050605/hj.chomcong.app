import { daysInMonth, getNextMonth, getPreviousMonth, getDatesInMonth, localDateKey } from '../src/utils/monthUtils';
import { useAttendanceStore } from '../src/store/attendanceStore';

test('month navigation is key based across year boundaries', () => {
  expect(getPreviousMonth('2026-09')).toBe('2026-08');
  expect(getNextMonth('2026-09')).toBe('2026-10');
  expect(getPreviousMonth('2026-01')).toBe('2025-12');
  expect(getNextMonth('2026-12')).toBe('2027-01');
});

test('month lengths and local date keys are deterministic', () => {
  expect(daysInMonth('2026-02')).toBe(28);
  expect(daysInMonth('2028-02')).toBe(29);
  expect(daysInMonth('2026-04')).toBe(30);
  expect(daysInMonth('2026-09')).toBe(30);
  expect(daysInMonth('2026-10')).toBe(31);
  expect(getDatesInMonth('2026-09')[0]).toBe('2026-09-01');
  expect(getDatesInMonth('2026-09')[29]).toBe('2026-09-30');
  expect(localDateKey(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
});

test('attendance is isolated by selected month and overnight start date is not duplicated', async () => {
  const store = useAttendanceStore.getState();
  await store.selectMonth('2026-08');
  await store.addManual({ date:'2026-08-31', dayOfWeek:1, dayType:'NORMAL', shift:{start:'20:00',end:'05:00'} } as any);
  await store.selectMonth('2026-09');
  await store.addManual({ date:'2026-09-10', dayOfWeek:4, dayType:'NORMAL', shift:{start:'08:00',end:'16:00'} } as any);
  await store.selectMonth('2026-08');
  expect(useAttendanceStore.getState().items.map(item => item.date)).toEqual(['2026-08-31']);
  await store.selectMonth('2026-09');
  expect(useAttendanceStore.getState().items.map(item => item.date)).toEqual(['2026-09-10']);
});

test('device clock-out at a month boundary completes the start-month shift once', async () => {
  const store = useAttendanceStore.getState();
  await store.selectMonth('2026-09');
  await store.clockIn(new Date(2026, 8, 30, 20, 0));
  await store.selectMonth('2026-10');
  await store.clockOut(new Date(2026, 9, 1, 5, 0));
  expect(useAttendanceStore.getState().items.find(item => item.date === '2026-10-01')).toBeUndefined();
  await store.selectMonth('2026-09');
  const shift = useAttendanceStore.getState().items.find(item => item.date === '2026-09-30')?.shift;
  expect(shift).toMatchObject({ start:'20:00', end:'05:00' });
});
