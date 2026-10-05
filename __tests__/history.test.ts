import { savePayroll, loadPayroll, deletePayroll } from '../src/utils/persistence';

test('save load delete payroll', async () => {
  const month = '2026-09';
  const payroll = { gross: 12345, deductions: 0, net: 12345 } as any;
  await savePayroll(month, payroll);
  const p = await loadPayroll(month);
  expect(p).not.toBeNull();
  expect(p!.gross).toBe(12345);
  await deletePayroll(month);
  const p2 = await loadPayroll(month);
  expect(p2).toBeNull();
});
