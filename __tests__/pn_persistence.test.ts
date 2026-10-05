import { useAttendanceStore } from '../src/store/attendanceStore';
import { calculatePayroll, DEFAULT_CONFIG } from '../src/engine/payrollCalculator';

test('PN is persisted, editable, month-isolated, and removable', async () => {
  const store = useAttendanceStore.getState();
  await store.selectMonth('2031-09');
  await store.addManual({ date:'2031-09-01', dayOfWeek:1, dayType:'NORMAL', leaveType:'PN', leaveCode:'PN', shift:null, note:'annual leave' } as any);
  await store.addManual({ date:'2031-09-02', dayOfWeek:2, dayType:'NORMAL', leaveType:'PN', leaveCode:'PN', shift:null } as any);
  await store.selectMonth('2031-08');
  expect(useAttendanceStore.getState().items.some(item => item.leaveType === 'PN')).toBe(false);
  await store.selectMonth('2031-09');
  expect(useAttendanceStore.getState().items.filter(item => item.leaveType === 'PN')).toHaveLength(2);
  expect(useAttendanceStore.getState().items.find(item => item.date === '2031-09-01')).toMatchObject({ leaveType:'PN', leaveCode:'PN', shift:null });
  await store.editAttendance('2031-09-01', { note:'edited annual leave' });
  await store.selectMonth('2031-08');
  await store.selectMonth('2031-09');
  expect(useAttendanceStore.getState().items.find(item => item.date === '2031-09-01')?.note).toBe('edited annual leave');
  await store.remove('2031-09-01');
  await store.selectMonth('2031-08');
  await store.selectMonth('2031-09');
  expect(useAttendanceStore.getState().items.some(item => item.date === '2031-09-01')).toBe(false);
});

test('PN remains eight paid normal hours through the existing payroll engine', () => {
  const payroll = calculatePayroll([{ date:'2031-09-30', dayOfWeek:2, dayType:'NORMAL', leaveType:'PN', leaveCode:'PN', shift:null }], DEFAULT_CONFIG);
  expect(payroll.normalHours).toBe(8);
});
