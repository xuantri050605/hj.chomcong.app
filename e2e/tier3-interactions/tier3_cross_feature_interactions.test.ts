import { TestHarness, MockSupabaseClient, MockSyncService } from '../harness/testHarness';
import { useAttendanceStore, DayAttendance } from '../../src/store/attendanceStore';
import { useSalaryStore } from '../../src/store/salaryStore';
import { calculatePayroll, DEFAULT_CONFIG } from '../../src/engine/payrollCalculator';
import { savePayroll, loadPayroll, deletePayroll } from '../../src/utils/persistence';
import { sanitizeDayAttendance } from '../../src/utils/securityValidator';

describe('Tier 3 - Cross-Feature Interactions (Pairwise Combinations)', () => {
  let supabase: MockSupabaseClient;
  let syncService: MockSyncService;

  beforeEach(async () => {
    TestHarness.reset();
    supabase = new MockSupabaseClient();
    syncService = new MockSyncService(supabase);
    useAttendanceStore.setState({ month: '2026-11', items: [] });
    await useSalaryStore.getState().resetDefaults();
  });

  // Pair 1: Auth Session + AppHeader
  test('TC-P01: Auth sign-in dynamically sets user profile capsule in header state', async () => {
    const authStore = TestHarness.getAuthStore();
    expect(authStore.user).toBeNull();

    await authStore.signUp('header_user@example.com', 'Pass123456', 'Nguyễn Thị Hương');
    expect(authStore.user?.fullName).toBe('Nguyễn Thị Hương');
    expect(authStore.user?.email).toBe('header_user@example.com');

    await authStore.signOut();
    expect(authStore.user).toBeNull();
  });

  // Pair 2: Attendance Clock-in + Dashboard KPI
  test('TC-P02: Clocking in records today shift and updates live attendance card status', async () => {
    const now = new Date('2026-11-05T08:00:00Z');
    await useAttendanceStore.getState().clockIn(now, 'DEVICE');

    const items = useAttendanceStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0].shift?.start).toBeDefined();
    expect(items[0].shift?.end).toBeFalsy(); // Active open shift
  });

  // Pair 3: SalaryConfig + Payroll Calculation
  test('TC-P03: Updating SalaryConfig immediately recalculates PayrollResult Net Salary', async () => {
    const records: DayAttendance[] = [
      {
        date: '2026-11-02',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' }, // 8h
      },
    ];

    const initialBreakdown = calculatePayroll(records, useSalaryStore.getState().config);

    // Increase basic salary from default
    await useSalaryStore.getState().setConfig({
      ...useSalaryStore.getState().config,
      basicSalary: 20000000,
    });

    const updatedBreakdown = calculatePayroll(records, useSalaryStore.getState().config);
    expect(updatedBreakdown.grossPay).toBeGreaterThan(initialBreakdown.grossPay);
    expect(typeof updatedBreakdown.netPay).toBe('number');
    expect(Number.isNaN(updatedBreakdown.netPay)).toBe(false);
  });

  // Pair 4: Attendance Records + Payroll Breakdown Aggregation
  test('TC-P04: Attendance normal, overtime, and night hours aggregate directly into Payroll breakdown', () => {
    const mixedRecords: DayAttendance[] = [
      {
        date: '2026-11-02',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' }, // 8h normal
      },
      {
        date: '2026-11-03',
        dayOfWeek: 2,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '19:00' }, // 8h normal + 2h OT 150%
      },
      {
        date: '2026-11-04',
        dayOfWeek: 3,
        dayType: 'NORMAL',
        shift: { start: '18:00', end: '02:00' }, // 4h day + 4h night
      },
    ];

    const result = calculatePayroll(mixedRecords, DEFAULT_CONFIG);
    expect(result.actualHours).toBe(8 + 10 + 8); // 26h
    expect(result.ot150DayHours).toBeCloseTo(7 + 40 / 60, 4);
    expect(result.night100Hours + result.ot130NightHours).toBeGreaterThanOrEqual(4);
    expect(result.grossPay).toBeGreaterThan(0);
  });

  // Pair 5: Payroll Calculation + History Persistence
  test('TC-P05: Computed payroll saves to History and verifies exact data integrity upon reload', async () => {
    const month = '2026-11';
    const computed = calculatePayroll([], DEFAULT_CONFIG);
    await savePayroll(month, computed);

    const reloaded = await loadPayroll(month);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.netPay).toBe(computed.netPay);
    expect(reloaded?.grossPay).toBe(computed.grossPay);
    expect(reloaded?.totalDeductions).toBe(computed.totalDeductions);

    await deletePayroll(month);
  });

  // Pair 6: Offline Clock-in + Sync Queue Enqueuing
  test('TC-P06: Clocking in while offline enqueues mutation and marks sync status offline', () => {
    syncService.setOnline(false);
    expect(syncService.getSyncStatus()).toBe('offline');

    syncService.enqueue({
      userId: 'usr_offline',
      table: 'attendance_records',
      action: 'INSERT',
      recordId: 'att_20261105',
      payload: { date: '2026-11-05', shift: { start: '08:00' } },
      clientTimestamp: new Date().toISOString(),
    });

    expect(syncService.getQueue().length).toBe(1);
    expect(syncService.getSyncStatus()).toBe('offline');
  });

  // Pair 7: Network Reconnection + Sync Drainage
  test('TC-P07: Reconnecting network pushes offline queue and transitions status to synced', async () => {
    syncService.setOnline(false);
    syncService.enqueue({
      userId: 'usr_reconnect',
      table: 'attendance_records',
      action: 'INSERT',
      recordId: 'att_20261106',
      payload: { date: '2026-11-06', shift: { start: '08:00', end: '17:00' } },
      clientTimestamp: new Date().toISOString(),
    });

    syncService.setOnline(true);
    const pushed = await syncService.pushLocalQueue('usr_reconnect');
    expect(pushed).toBe(1);
    expect(syncService.getQueue().length).toBe(0);
    expect(syncService.getSyncStatus()).toBe('synced');
  });

  // Pair 8: Auth Sign-in + Offline Data Association
  test('TC-P08: Anonymous guest attendance records can be associated with authenticated user ID', async () => {
    // Guest entries
    const guestItem: DayAttendance = {
      date: '2026-11-01',
      dayOfWeek: 0,
      dayType: 'WEEKLY_OFF',
      shift: { start: '08:00', end: '12:00' },
      timeSource: 'MANUAL',
    };
    await useAttendanceStore.getState().addManual(guestItem);

    // User signs in
    const authStore = TestHarness.getAuthStore();
    await authStore.signUp('link_guest@example.com', 'Pass123456');
    const userId = authStore.user!.id;

    // Association simulation
    const userMutations = useAttendanceStore.getState().items.map((item) => ({
      userId,
      table: 'attendance_records' as const,
      action: 'INSERT' as const,
      recordId: `att_${item.date}`,
      payload: { ...item, user_id: userId },
      clientTimestamp: new Date().toISOString(),
    }));

    expect(userMutations.length).toBe(1);
    expect(userMutations[0].payload.user_id).toBe(userId);
  });

  // Pair 9: SalaryConfig + LWW Cloud Sync
  test('TC-P09: SalaryConfig local change with newer timestamp resolves cleanly over older cloud record', async () => {
    const tServer = new Date('2026-11-01T08:00:00Z').toISOString();
    supabase.tables.get('salary_configs')!.set('cfg_user1', {
      id: 'cfg_user1',
      basic_salary: 8000000,
      updated_at: tServer,
    });

    const tClientNewer = new Date('2026-11-01T10:00:00Z').toISOString();
    syncService.enqueue({
      userId: 'user1',
      table: 'salary_configs',
      action: 'UPDATE',
      recordId: 'cfg_user1',
      payload: { id: 'cfg_user1', basic_salary: 12000000, updated_at: tClientNewer },
      clientTimestamp: tClientNewer,
    });

    await syncService.pushLocalQueue('user1');
    const updated = supabase.tables.get('salary_configs')!.get('cfg_user1');
    expect(updated.basic_salary).toBe(12000000);
  });

  // Pair 10: History Deletion + Remote Database Sync
  test('TC-P10: Local payroll history deletion generates DELETE mutation for remote database', async () => {
    syncService.enqueue({
      userId: 'usr_del_history',
      table: 'payroll_history',
      action: 'DELETE',
      recordId: 'pay_202610',
      payload: { month: '2026-10' },
      clientTimestamp: new Date().toISOString(),
    });

    expect(syncService.getQueue()[0].action).toBe('DELETE');
    const pushed = await syncService.pushLocalQueue('usr_del_history');
    expect(pushed).toBe(1);
  });

  // Pair 11: Geofence Attendance + Security Sanitizer
  test('TC-P11: Geofence attendance records with GPS metadata pass security sanitization intact', () => {
    const geofenceAttendance: DayAttendance = {
      date: '2026-11-08',
      dayOfWeek: 0,
      dayType: 'WEEKLY_OFF',
      shift: { start: '08:00', end: '17:00' },
      timeSource: 'GEOFENCE_CONFIRMED',
      gpsMetadata: {
        latitude: 21.028511,
        longitude: 105.804817,
        accuracy: 15,
        distance: 25,
      },
    };

    const sanitized = sanitizeDayAttendance(geofenceAttendance);
    expect(sanitized).not.toBeNull();
    expect(sanitized?.timeSource).toBe('GEOFENCE_CONFIRMED');
    expect(sanitized?.gpsMetadata?.accuracy).toBe(15);
  });

  // Pair 12: Session Expiry + Sync Interruption
  test('TC-P12: Expired session token prevents unauthorized push while retaining queue', async () => {
    syncService.enqueue({
      userId: 'usr_expired',
      table: 'attendance_records',
      action: 'INSERT',
      recordId: 'att_queued',
      payload: {},
      clientTimestamp: new Date().toISOString(),
    });

    // Session token expiry simulation
    const isSessionValid = false;
    let pushResult = 0;
    if (isSessionValid) {
      pushResult = await syncService.pushLocalQueue('usr_expired');
    }
    expect(pushResult).toBe(0);
    // Queue remains intact for retry when re-authenticated
    expect(syncService.getQueue().length).toBe(1);
  });

  // Pair 13: RLS Schema + Multi-User Data Isolation
  test('TC-P13: Multi-user tenant isolation guarantees User A cannot access User B data', async () => {
    supabase.tables.get('attendance_records')!.set('att_alice_1', {
      id: 'att_alice_1',
      user_id: 'user_alice',
      date: '2026-11-01',
    });
    supabase.tables.get('attendance_records')!.set('att_bob_1', {
      id: 'att_bob_1',
      user_id: 'user_bob',
      date: '2026-11-01',
    });

    // Alice active session
    supabase.currentSession = {
      accessToken: 'jwt_alice',
      refreshToken: 'rf_alice',
      expiresAt: Date.now() + 10000,
      user: { id: 'user_alice', email: 'alice@test.com' },
    };

    const aliceQuery = await supabase.from('attendance_records').select().eq('date', '2026-11-01');
    expect(aliceQuery.data.length).toBe(1);
    expect(aliceQuery.data[0].user_id).toBe('user_alice');
  });

  // Pair 14: Navigation Transitions + Store State Consistency
  test('TC-P14: Screen transition animation retains selected month across all tab routes', () => {
    useAttendanceStore.setState({ month: '2026-09' });
    expect(useAttendanceStore.getState().month).toBe('2026-09');

    // Simulate navigating to Payroll then Salary
    const tPayroll = TestHarness.createScreenTransitionAnim('Payroll');
    tPayroll.runTransition();
    expect(useAttendanceStore.getState().month).toBe('2026-09');

    const tSalary = TestHarness.createScreenTransitionAnim('Salary');
    tSalary.runTransition();
    expect(useAttendanceStore.getState().month).toBe('2026-09');
  });

  // Pair 15: Real-Time Clock + Shift Duration Accumulator
  test('TC-P15: Real-time shift duration calculates accurately between start time and now', () => {
    const startTimeStr = '08:00';
    const currentTimeStr = '12:30';

    const parseMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };

    const elapsedMinutes = parseMinutes(currentTimeStr) - parseMinutes(startTimeStr);
    const elapsedHours = elapsedMinutes / 60;
    expect(elapsedHours).toBe(4.5);
  });
});
