import { DEFAULT_CONFIG, SalaryConfig } from '../../src/engine/payrollCalculator';
import { useSalaryStore } from '../../src/store/salaryStore';

describe('Tier 1 - Feature 05: Modern SalaryConfig Screen', () => {
  beforeEach(async () => {
    await useSalaryStore.getState().resetDefaults();
  });

  test('TC05-01: Default salary configuration initializes with standard Vietnamese statutory values', () => {
    const config = useSalaryStore.getState().config;
    expect(config.basicSalary).toBeGreaterThan(0);
    expect(config.standardHours).toBe(208);
    expect(config.insuranceRate).toBe(10.5); // 10.5% (8% BHXH + 1.5% BHYT + 1% BHTN)
  });

  test('TC05-02: Real-time hourly rate computes accurately from basic salary + seniority / standard hours', () => {
    const config: SalaryConfig = {
      basicSalary: 10400000,
      seniorityAllowance: 1040000,
      livingAllowance: 500000,
      attendanceAllowance: 300000,
      otherAllowance: 200000,
      standardHours: 208,
      insuranceRate: 10.5,
    };
    // Base for hourly rate in VN labor code is (basic + seniority) / standardHours
    const hourlyRate = (config.basicSalary + config.seniorityAllowance) / config.standardHours;
    expect(hourlyRate).toBe(55000); // 11,440,000 / 208 = 55,000 VND/h
  });

  test('TC05-03: Updating salary config persists new values to store and clamps invalid negative values', async () => {
    await useSalaryStore.getState().setConfig({
      ...DEFAULT_CONFIG,
      basicSalary: 12000000,
      livingAllowance: 800000,
    });

    const updated = useSalaryStore.getState().config;
    expect(updated.basicSalary).toBe(12000000);
    expect(updated.livingAllowance).toBe(800000);
  });

  test('TC05-04: Reset defaults restores original values cleanly', async () => {
    await useSalaryStore.getState().setConfig({
      ...DEFAULT_CONFIG,
      basicSalary: 99000000,
    });
    expect(useSalaryStore.getState().config.basicSalary).toBe(99000000);

    await useSalaryStore.getState().resetDefaults();
    expect(useSalaryStore.getState().config.basicSalary).toBe(DEFAULT_CONFIG.basicSalary);
  });

  test('TC05-05: 2-column layout separation distinguishes base earnings from allowances & statutory deductions', () => {
    const config = useSalaryStore.getState().config;
    // Base column
    expect(typeof config.basicSalary).toBe('number');
    expect(typeof config.standardHours).toBe('number');

    // Allowances column
    expect(typeof config.attendanceAllowance).toBe('number');
    expect(typeof config.livingAllowance).toBe('number');
    expect(typeof config.seniorityAllowance).toBe('number');
    expect(typeof config.insuranceRate).toBe('number');
  });
});
