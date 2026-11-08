import { TestHarness, MockSupabaseClient, MockSyncService } from '../harness/testHarness';
import { useAttendanceStore, DayAttendance } from '../../src/store/attendanceStore';
import { useSalaryStore } from '../../src/store/salaryStore';
import { calculatePayroll, SalaryConfig } from '../../src/engine/payrollCalculator';
import { savePayroll, loadPayroll, deletePayroll } from '../../src/utils/persistence';
import { sanitizeDayAttendance, sanitizeSalaryConfig } from '../../src/utils/securityValidator';

describe('Tier 4 - Real-World Scenarios (End-to-End Application Workflows)', () => {
  let supabase: MockSupabaseClient;
  let syncService: MockSyncService;

  beforeEach(async () => {
    TestHarness.reset();
    supabase = new MockSupabaseClient();
    syncService = new MockSyncService(supabase);
    useAttendanceStore.setState({ month: '2026-11', items: [] });
    await useSalaryStore.getState().resetDefaults();
  });

  // ============================================================================
  // Scenario 1: Complete New Employee Monthly Onboarding & Payroll Cycle
  // ============================================================================
  test('Scenario 1: Complete New Employee Monthly Onboarding & Payroll Cycle', async () => {
    // Step 1: Employee registers account
    const authStore = TestHarness.getAuthStore();
    const registered = await authStore.signUp(
      'nguyen.van.an@company.com',
      'AnSecurePass2026!',
      'Nguyễn Văn An'
    );
    expect(registered).toBe(true);
    expect(authStore.user?.fullName).toBe('Nguyễn Văn An');
    const userId = authStore.user!.id;

    // Step 2: HR sets up custom salary package
    const customConfig: SalaryConfig = {
      basicSalary: 11440000, // 11,440,000 VND
      seniorityAllowance: 1000000,
      livingAllowance: 600000,
      attendanceAllowance: 400000,
      otherAllowance: 200000,
      standardHours: 208,
      insuranceRate: 10.5, // 10.5%
    };
    await useSalaryStore.getState().setConfig(customConfig);
    expect(useSalaryStore.getState().config.basicSalary).toBe(11440000);

    // Step 3: Log monthly attendance
    // 22 standard work days (8h each = 176h)
    const attendanceRecords: DayAttendance[] = [];
    for (let day = 1; day <= 22; day++) {
      attendanceRecords.push({
        date: `2026-11-${String(day).padStart(2, '0')}`,
        dayOfWeek: ((day % 7) || 7) as any,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' }, // 8h net
        timeSource: 'DEVICE',
      });
    }
    // Plus 2 weekend overtime days (8h each at 200% = 16h)
    attendanceRecords.push({
      date: '2026-11-28',
      dayOfWeek: 6,
      dayType: 'WEEKLY_OFF',
      shift: { start: '08:00', end: '16:00' },
      timeSource: 'DEVICE',
    });
    attendanceRecords.push({
      date: '2026-11-29',
      dayOfWeek: 0,
      dayType: 'WEEKLY_OFF',
      shift: { start: '08:00', end: '16:00' },
      timeSource: 'DEVICE',
    });

    useAttendanceStore.setState({ month: '2026-11', items: attendanceRecords });
    expect(useAttendanceStore.getState().items.length).toBe(24);

    // Step 4: Verify Dashboard Aggregation
    const payroll = calculatePayroll(
      useAttendanceStore.getState().items,
      useSalaryStore.getState().config
    );
    expect(payroll.actualHours).toBe(22 * 8 + 16); // 192 hours
    expect(payroll.weeklyOff200Hours).toBe(16);

    // Step 5: Verify Payroll Breakdown figures
    expect(payroll.grossPay).toBeGreaterThan(12000000);
    // Social insurance base = basicSalary (11,440,000) + seniority (1,000,000) = 12,440,000 * 10.5% = 1,306,200 VND
    expect(payroll.insuranceDeduction).toBe(Math.round(((11440000 + 1000000) * 10.5) / 100));
    // Net salary = Gross - Total Deductions
    expect(payroll.netPay).toBe(payroll.grossPay - payroll.totalDeductions);

    // Step 6: Finalize and archive to History
    await savePayroll('2026-11', payroll);
    const archived = await loadPayroll('2026-11');
    expect(archived).not.toBeNull();
    expect(archived?.netPay).toBe(payroll.netPay);

    // Step 7: Clean up history
    await deletePayroll('2026-11');
  });

  // ============================================================================
  // Scenario 2: Offline Field Worker Multi-Day Attendance & Cloud Synchronization
  // ============================================================================
  test('Scenario 2: Offline Field Worker Multi-Day Attendance & Cloud Synchronization', async () => {
    // Step 1: Device loses cellular connectivity in the field
    syncService.setOnline(false);
    expect(syncService.getSyncStatus()).toBe('offline');

    // Step 2: Worker checks in and out for 5 days offline with GPS metadata
    const fieldRecords: DayAttendance[] = [
      {
        date: '2026-11-02',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '07:30', end: '16:30' },
        timeSource: 'GEOFENCE_CONFIRMED',
        gpsMetadata: { latitude: 21.0285, longitude: 105.8048, accuracy: 12 },
      },
      {
        date: '2026-11-03',
        dayOfWeek: 2,
        dayType: 'NORMAL',
        shift: { start: '07:45', end: '17:00' },
        timeSource: 'GEOFENCE_CONFIRMED',
        gpsMetadata: { latitude: 21.0286, longitude: 105.8049, accuracy: 14 },
      },
      {
        date: '2026-11-04',
        dayOfWeek: 3,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
        timeSource: 'GEOFENCE_CONFIRMED',
      },
      {
        date: '2026-11-05',
        dayOfWeek: 4,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:30' },
        timeSource: 'GEOFENCE_CONFIRMED',
      },
      {
        date: '2026-11-06',
        dayOfWeek: 5,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '16:00' },
        timeSource: 'MANUAL',
        note: 'Về sớm 1h có phép',
      },
    ];

    // Each offline record is enqueued in sync_queue
    for (const record of fieldRecords) {
      useAttendanceStore.getState().addOrUpdate(record);
      syncService.enqueue({
        userId: 'worker_field_01',
        table: 'attendance_records',
        action: 'INSERT',
        recordId: `att_${record.date}`,
        payload: record,
        clientTimestamp: new Date().toISOString(),
      });
    }

    // Verify local queue has all 5 mutations and state is offline
    expect(useAttendanceStore.getState().items.length).toBe(5);
    expect(syncService.getQueue().length).toBe(5);
    expect(syncService.getSyncStatus()).toBe('offline');

    // Step 3: Worker returns to base office and regains WiFi connectivity
    syncService.setOnline(true);
    expect(['syncing', 'synced']).toContain(syncService.getSyncStatus());

    // Step 4: Sync engine drains queue to Supabase
    const syncResult = await syncService.syncAll('worker_field_01');
    expect(syncResult.pushed).toBe(5);
    expect(syncResult.errors.length).toBe(0);
    expect(syncService.getQueue().length).toBe(0);
    expect(syncService.getSyncStatus()).toBe('synced');

    // Step 5: Verify cloud database received the attendance rows
    for (const record of fieldRecords) {
      const cloudRecord = supabase.tables.get('attendance_records')!.get(`att_${record.date}`);
      expect(cloudRecord).toBeDefined();
      expect(cloudRecord.date).toBe(record.date);
    }
  });

  // ============================================================================
  // Scenario 3: Complex Vietnamese Enterprise Payroll with Statutory Deductions
  // ============================================================================
  test('Scenario 3: Complex Vietnamese Enterprise Payroll with Statutory Deductions & Overtime', () => {
    const enterpriseConfig: SalaryConfig = {
      basicSalary: 12000000,
      seniorityAllowance: 1200000,
      livingAllowance: 800000,
      attendanceAllowance: 500000,
      otherAllowance: 300000,
      standardHours: 208,
      insuranceRate: 10.5,
    };

    // Premium hourly rate for OT per Excel formula includes basicSalary + seniority + livingAllowance
    const hourlyRate =
      (enterpriseConfig.basicSalary + enterpriseConfig.seniorityAllowance + enterpriseConfig.livingAllowance) /
      enterpriseConfig.standardHours;

    // Work attendance: 20 standard days (160h) + 10h OT 150% + 8h Sunday OT 200%
    const records: DayAttendance[] = [];
    for (let i = 1; i <= 20; i++) {
      records.push({
        date: `2026-11-${String(i).padStart(2, '0')}`,
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      });
    }
    // 10h weekday OT (5 days with 2h OT each)
    for (let i = 1; i <= 5; i++) {
      records.push({
        date: `2026-11-${String(20 + i).padStart(2, '0')}`,
        dayOfWeek: 2,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '19:00' }, // 8h normal + 2h OT 150%
      });
    }
    // 8h Sunday OT 200%
    records.push({
      date: '2026-11-29',
      dayOfWeek: 0,
      dayType: 'WEEKLY_OFF',
      shift: { start: '08:00', end: '16:00' },
    });

    const adjustments = {
      mealSupport: 730000,
      pitRefund: 250000,
      latenessDeduction: 100000,
      damageDeduction: 150000,
      unionDeduction: 120000,
    };

    const result = calculatePayroll(records, enterpriseConfig, adjustments);

    // Overtime pay assertions
    expect(result.ot150DayHours).toBeCloseTo(30 + 50 / 60, 4);
    expect(result.weeklyOff200Hours).toBe(8);

    const expectedOt150 = Math.round(result.ot150DayHours * 1.5 * hourlyRate);
    const expectedOt200 = Math.round(8 * 2.0 * hourlyRate);
    expect(result.ot150DayPay).toBeCloseTo(expectedOt150, 0);
    expect(result.weeklyOff200Pay).toBeCloseTo(expectedOt200, 0);

    // Adjustments verification
    expect(result.mealSupport).toBe(730000);
    expect(result.pitRefund).toBe(250000);
    expect(result.latenessDeduction).toBe(100000);
    expect(result.damageDeduction).toBe(150000);
    expect(result.unionDeduction).toBe(120000);

    // Social insurance base: (12,000,000 + 1,200,000) * 0.105 = 1,386,000
    expect(result.insuranceDeduction).toBe(1386000);

    // Invariant: Net = Gross - Total Deductions
    expect(result.netPay).toBeCloseTo(result.grossPay - result.totalDeductions, 2);
    expect(result.netPay).toBeGreaterThan(0);
  });

  // ============================================================================
  // Scenario 4: Cross-Device Multi-Session Concurrency & LWW Reconciliation
  // ============================================================================
  test('Scenario 4: Cross-Device Multi-Session Concurrency & LWW Reconciliation', async () => {
    const userId = 'usr_cross_device';

    // Device A edits salary configuration at T1
    const t1 = new Date('2026-11-05T09:00:00Z').toISOString();
    syncService.enqueue({
      userId,
      table: 'salary_configs',
      action: 'UPDATE',
      recordId: 'cfg_cross',
      payload: { id: 'cfg_cross', basic_salary: 13500000, updated_at: t1 },
      clientTimestamp: t1,
    });
    await syncService.pushLocalQueue(userId);

    // Device B concurrently updates attendance record at T2
    const t2 = new Date('2026-11-05T10:00:00Z').toISOString();
    supabase.tables.get('attendance_records')!.set('att_shared', {
      id: 'att_shared',
      user_id: userId,
      note: 'Device B initial note',
      updated_at: t2,
    });

    // Device A (which was offline) later updates the same attendance record at T3 (newer)
    const t3 = new Date('2026-11-05T11:00:00Z').toISOString();
    syncService.enqueue({
      userId,
      table: 'attendance_records',
      action: 'UPDATE',
      recordId: 'att_shared',
      payload: {
        id: 'att_shared',
        user_id: userId,
        note: 'Device A final approved note',
        updated_at: t3,
      },
      clientTimestamp: t3,
    });

    // Device A comes back online and synchronizes
    await syncService.pushLocalQueue(userId);

    // Verification:
    // 1. Device A's salary config update from T1 is preserved
    const cfg = supabase.tables.get('salary_configs')!.get('cfg_cross');
    expect(cfg.basic_salary).toBe(13500000);

    // 2. Attendance record reflects Device A's T3 update because T3 > T2 (LWW resolution)
    const att = supabase.tables.get('attendance_records')!.get('att_shared');
    expect(att.note).toBe('Device A final approved note');
  });

  // ============================================================================
  // Scenario 5: Security, Tamper Resistance & Session Expiry Lifecycle
  // ============================================================================
  test('Scenario 5: Security, Tamper Resistance & Session Expiry Lifecycle', async () => {
    const authStore = TestHarness.getAuthStore();
    await authStore.signUp('security_test@example.com', 'StrongPass123!');
    expect(authStore.user).not.toBeNull();

    // Adversarial input injection attempt in attendance record
    const maliciousAttendance: DayAttendance = {
      date: '2026-11-09',
      dayOfWeek: 1,
      dayType: 'NORMAL',
      shift: { start: '08:00', end: '17:00' },
      note: "'; DROP TABLE attendance_records; -- <script>alert(1)</script>",
    };
    const sanitizedRecord = sanitizeDayAttendance(maliciousAttendance);
    expect(sanitizedRecord).not.toBeNull();
    // Injected SQL does not crash data validator
    expect(typeof sanitizedRecord?.note).toBe('string');

    // Adversarial salary config injection attempt (NaN values and negative salary)
    const maliciousSalaryConfig: any = {
      basicSalary: -1000000,
      seniorityAllowance: NaN,
      standardHours: -50,
    };
    const sanitizedConfig = sanitizeSalaryConfig(maliciousSalaryConfig, useSalaryStore.getState().config);
    expect(sanitizedConfig.basicSalary).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(sanitizedConfig.seniorityAllowance)).toBe(false);
    expect(sanitizedConfig.standardHours).toBeGreaterThan(0);

    // Session Expiry Simulation
    authStore.session = null;
    (authStore as any).user = null;

    // When session is expired, guest offline mode operates safely
    const guestBreakdown = calculatePayroll([sanitizedRecord!], sanitizedConfig);
    expect(typeof guestBreakdown.netPay).toBe('number');
    expect(Number.isNaN(guestBreakdown.netPay)).toBe(false);

    // User re-authenticates
    await authStore.signIn('security_test@example.com', 'StrongPass123!');
    expect((authStore.user as any)?.email).toBe('security_test@example.com');
  });
});
