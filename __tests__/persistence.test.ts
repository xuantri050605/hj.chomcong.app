import { saveAttendance, loadAttendance, saveConfig, loadConfig, savePayroll, loadPayroll } from '../src/utils/persistence';
import { DEFAULT_CONFIG } from '../src/engine/payrollCalculator';

test('persistence save/load attendance', async () => {
  const month = '2026-09';
  const rows = [{ date: '2026-09-01', dayOfWeek: 2, dayType: 'NORMAL', shift: { start: '08:00', end: '16:00' }, leaveType: null }];
  await saveAttendance(month, rows as any);
  const loaded = await loadAttendance(month);
  expect(loaded.length).toBe(1);
  expect(loaded[0].date).toBe(rows[0].date);
});

test('persistence save/load config', async () => {
  await saveConfig(DEFAULT_CONFIG as any);
  const cfg = await loadConfig();
  expect(cfg).not.toBeNull();
  expect((cfg as any).basicSalary).toBe(DEFAULT_CONFIG.basicSalary);
});

test('persistence save/load payroll', async () => {
  const month = '2026-09';
  const payroll = { gross: 1000, deductions: 0, net: 1000 } as any;
  await savePayroll(month, payroll);
  const p = await loadPayroll(month);
  expect(p).not.toBeNull();
  expect(p!.gross).toBe(1000);
});
