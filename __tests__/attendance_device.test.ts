import { useAttendanceStore } from '../src/store/attendanceStore';
import { initPersistence } from '../src/utils/persistence';

// helper to reset store for tests
beforeEach(async () => {
  // ensure in-memory persistence
  await initPersistence();
  const store = useAttendanceStore.getState();
  store.items.slice().forEach(it => store.remove(it.date));
});

test('DEVICE clock-in creates timestamp', async () => {
  const store = useAttendanceStore.getState();
  // fixed date
  const now = new Date(2026, 8, 19, 8, 3, 14);
  await store.clockIn(now);
  const items = useAttendanceStore.getState().items;
  expect(items.length).toBeGreaterThan(0);
  const rec = items.find(i => i.date === '2026-09-19');
  expect(rec).toBeDefined();
  expect(rec!.timeSource).toBe('DEVICE');
  expect(rec!.shift && rec!.shift.start).toBe('08:03');
});

test('DEVICE clock-out creates timestamp', async () => {
  const store = useAttendanceStore.getState();
  const inTime = new Date(2026, 8, 19, 8, 3, 14);
  const outTime = new Date(2026, 8, 19, 17, 5, 30);
  await store.clockIn(inTime);
  await store.clockOut(outTime);
  const rec = useAttendanceStore.getState().items.find(i=>i.date==='2026-09-19');
  expect(rec).toBeDefined();
  expect(rec!.shift!.end).toBe('17:05');
});

test('Duplicate clock-in is prevented', async () => {
  const store = useAttendanceStore.getState();
  const t1 = new Date(2026, 8, 19, 8, 0);
  await store.clockIn(t1);
  const before = useAttendanceStore.getState().items.find(i=>i.date==='2026-09-19')!.shift!.start;
  await store.clockIn(new Date(2026, 8, 19, 8, 5));
  const after = useAttendanceStore.getState().items.find(i=>i.date==='2026-09-19')!.shift!.start;
  expect(after).toBe(before);
});

test('Overnight DEVICE shift accepted', async () => {
  const store = useAttendanceStore.getState();
  const inTime = new Date(2026, 8, 19, 20, 0);
  const outTime = new Date(2026, 8, 20, 5, 0);
  await store.clockIn(inTime);
  await store.clockOut(outTime);
  const rec = useAttendanceStore.getState().items.find(i=>i.date==='2026-09-19');
  expect(rec).toBeDefined();
  expect(rec!.shift!.start).toBe('20:00');
  expect(rec!.shift!.end).toBe('05:00');
});

test('MANUAL record works and preserves source', async () => {
  const store = useAttendanceStore.getState();
  const manual = { date: '2026-09-18', dayOfWeek: 5, dayType: 'NORMAL' as const, shift: { start: '09:00', end: '17:00' } };
  await store.addManual(manual as any);
  const rec = useAttendanceStore.getState().items.find(i=>i.date==='2026-09-18');
  expect(rec).toBeDefined();
  expect(rec!.timeSource).toBe('MANUAL');
  expect(rec!.shift!.start).toBe('09:00');
});

test('Editing DEVICE record becomes MANUAL and preserves originalTimeSource', async () => {
  const store = useAttendanceStore.getState();
  const inTime = new Date(2026, 8, 19, 8, 0);
  await store.clockIn(inTime);
  // edit to change start time
  await store.editAttendance('2026-09-19', { shift: { start: '07:30', end: undefined }, timeSource: 'MANUAL' });
  const rec = useAttendanceStore.getState().items.find(i=>i.date==='2026-09-19');
  expect(rec).toBeDefined();
  expect(rec!.timeSource).toBe('MANUAL');
  expect(rec!.originalTimeSource).toBe('DEVICE');
  expect(rec!.shift!.start).toBe('07:30');
});

test('Attendance persistence (in-memory) works across load/save', async () => {
  const store = useAttendanceStore.getState();
  await store.selectMonth('2026-09');
  const inTime = new Date(2026, 8, 20, 9, 0);
  await store.clockIn(inTime);
  const month = '2026-09';
  await store.saveMonth();
  // clear and reload
  useAttendanceStore.setState({ items: [] });
  await store.loadMonth(month);
  const rec = useAttendanceStore.getState().items.find(i=>i.date==='2026-09-20');
  expect(rec).toBeDefined();
  expect(rec!.timeSource).toBe('DEVICE');
});
