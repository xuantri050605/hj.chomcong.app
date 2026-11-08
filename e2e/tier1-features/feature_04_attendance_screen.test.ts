import { DayAttendance, computeWorkedHours, computeDayNightBreakdown } from '../../src/engine/attendanceCalculator';
import { useAttendanceStore } from '../../src/store/attendanceStore';

describe('Tier 1 - Feature 04: Modern Attendance Screen', () => {
  beforeEach(async () => {
    // Reset attendance store
    useAttendanceStore.setState({ month: '2026-11', items: [] });
  });

  test('TC04-01: Clock-in creates an open shift record with accurate start time', async () => {
    const fixedTime = new Date('2026-11-05T08:30:00Z');
    await useAttendanceStore.getState().clockIn(fixedTime, 'DEVICE');

    const items = useAttendanceStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0].shift?.start).toBeDefined();
    expect(items[0].shift?.end).toBeFalsy();
    expect(items[0].timeSource).toBe('DEVICE');
  });

  test('TC04-02: Clock-out completes an existing open shift and computes worked hours', async () => {
    const inTime = new Date('2026-11-05T08:00:00Z');
    const outTime = new Date('2026-11-05T17:00:00Z');

    await useAttendanceStore.getState().clockIn(inTime, 'DEVICE');
    await useAttendanceStore.getState().clockOut(outTime, 'DEVICE');

    const items = useAttendanceStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0].shift?.start).toBeDefined();
    expect(items[0].shift?.end).toBeDefined();

    const hours = computeWorkedHours(items[0]);
    expect(hours).toBeGreaterThanOrEqual(8);
  });

  test('TC04-03: Night shift breakdown separates day hours and night hours (22:00 - 06:00)', () => {
    const nightRecord: DayAttendance = {
      date: '2026-11-06',
      dayOfWeek: 5,
      dayType: 'NORMAL',
      shift: { start: '18:00', end: '02:00' }, // 8h total: 18-22 (4h day) + 22-02 (4h night)
    };
    const breakdown = computeDayNightBreakdown(nightRecord);
    expect(breakdown.dayHours).toBe(4);
    expect(breakdown.nightHours).toBe(4);
  });

  test('TC04-04: Manual entry modal adds attendance record with MANUAL tag', async () => {
    const manualItem: DayAttendance = {
      date: '2026-11-07',
      dayOfWeek: 6,
      dayType: 'WEEKLY_OFF',
      shift: { start: '08:00', end: '12:00' },
      timeSource: 'MANUAL',
      note: 'Cuối tuần tăng ca bù',
    };
    await useAttendanceStore.getState().addManual(manualItem);

    const items = useAttendanceStore.getState().items;
    const found = items.find((i) => i.date === '2026-11-07');
    expect(found).toBeDefined();
    expect(found?.timeSource).toBe('MANUAL');
    expect(found?.note).toBe('Cuối tuần tăng ca bù');
  });

  test('TC04-05: Editing an existing record preserves audit trail (originalTimeSource)', async () => {
    const initialItem: DayAttendance = {
      date: '2026-11-08',
      dayOfWeek: 0,
      dayType: 'WEEKLY_OFF',
      shift: { start: '08:00', end: '16:00' },
      timeSource: 'DEVICE',
    };
    await useAttendanceStore.getState().addManual(initialItem);

    await useAttendanceStore.getState().editAttendance('2026-11-08', {
      shift: { start: '08:00', end: '17:00' },
    });

    const updated = useAttendanceStore.getState().items.find((i) => i.date === '2026-11-08');
    expect(updated?.shift?.end).toBe('17:00');
    expect(updated?.originalTimeSource).toBe('DEVICE');
    expect(updated?.timeSource).toBe('MANUAL');
  });
});
