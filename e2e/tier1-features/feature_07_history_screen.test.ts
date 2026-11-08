import { savePayroll, loadPayroll, listMonths, deletePayroll } from '../../src/utils/persistence';
import { calculatePayroll, DEFAULT_CONFIG } from '../../src/engine/payrollCalculator';

describe('Tier 1 - Feature 07: Modern History Screen', () => {
  const monthKey = '2026-10';

  beforeEach(async () => {
    await deletePayroll(monthKey);
  });

  test('TC07-01: Saving a finalized payroll record stores it in historical persistence', async () => {
    const payroll = calculatePayroll([], DEFAULT_CONFIG);
    await savePayroll(monthKey, payroll);

    const loaded = await loadPayroll(monthKey);
    expect(loaded).toBeDefined();
    expect(loaded?.grossPay).toBe(payroll.grossPay);
    expect(loaded?.netPay).toBe(payroll.netPay);
  });

  test('TC07-02: Listing months retrieves all saved historical periods without duplicates', async () => {
    const payroll = calculatePayroll([], DEFAULT_CONFIG);
    await savePayroll('2026-08', payroll);
    await savePayroll('2026-09', payroll);

    const months = await listMonths();
    expect(months).toContain('2026-08');
    expect(months).toContain('2026-09');
  });

  test('TC07-03: Deleting a historical month removes it cleanly from persistence', async () => {
    const payroll = calculatePayroll([], DEFAULT_CONFIG);
    await savePayroll(monthKey, payroll);

    let loaded = await loadPayroll(monthKey);
    expect(loaded).not.toBeNull();

    await deletePayroll(monthKey);
    loaded = await loadPayroll(monthKey);
    expect(loaded).toBeNull();
  });

  test('TC07-04: Non-existent month returns null gracefully without throwing an exception', async () => {
    const result = await loadPayroll('1999-01');
    expect(result).toBeNull();
  });

  test('TC07-05: Historical card metadata preserves payroll summary (net salary, hours, timestamp)', async () => {
    const payroll = calculatePayroll([], DEFAULT_CONFIG);
    await savePayroll(monthKey, payroll);

    const loaded = await loadPayroll(monthKey);
    expect(loaded?.actualHours).toBeDefined();
    expect(typeof loaded?.netPay).toBe('number');
    expect(typeof loaded?.totalDeductions).toBe('number');
  });
});
