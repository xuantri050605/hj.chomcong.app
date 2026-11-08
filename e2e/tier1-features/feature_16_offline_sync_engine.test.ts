import { MockSyncService, MockSupabaseClient } from '../harness/testHarness';

describe('Tier 1 - Feature 16: Offline-First Sync Engine', () => {
  let supabase: MockSupabaseClient;
  let syncService: MockSyncService;

  beforeEach(() => {
    supabase = new MockSupabaseClient();
    syncService = new MockSyncService(supabase);
  });

  test('TC16-01: Mutations are enqueued into sync_queue when local modifications occur', () => {
    const mutation = syncService.enqueue({
      userId: 'usr_100',
      table: 'attendance_records',
      action: 'INSERT',
      recordId: 'att_20261105',
      payload: { date: '2026-11-05', shift: { start: '08:00', end: '17:00' } },
      clientTimestamp: new Date().toISOString(),
    });

    expect(mutation.id).toBeDefined();
    expect(mutation.status).toBe('PENDING');
    expect(syncService.getQueue().length).toBe(1);
  });

  test('TC16-02: Offline operations queue mutations safely while setting status to offline', () => {
    syncService.setOnline(false);
    expect(syncService.getSyncStatus()).toBe('offline');

    syncService.enqueue({
      userId: 'usr_100',
      table: 'salary_configs',
      action: 'UPDATE',
      recordId: 'cfg_1',
      payload: { basicSalary: 15000000 },
      clientTimestamp: new Date().toISOString(),
    });

    expect(syncService.getQueue().length).toBe(1);
    expect(syncService.getSyncStatus()).toBe('offline');
  });

  test('TC16-03: pushLocalQueue pushes all pending records to Supabase when network is restored', async () => {
    syncService.setOnline(false);
    syncService.enqueue({
      userId: 'usr_100',
      table: 'attendance_records',
      action: 'INSERT',
      recordId: 'att_20261106',
      payload: { date: '2026-11-06', shift: { start: '08:00', end: '17:00' } },
      clientTimestamp: new Date().toISOString(),
    });

    // Reconnect
    syncService.setOnline(true);
    const pushedCount = await syncService.pushLocalQueue('usr_100');
    expect(pushedCount).toBe(1);
    expect(syncService.getQueue().length).toBe(0);
    expect(syncService.getSyncStatus()).toBe('synced');
  });

  test('TC16-04: Batch synchronization (syncAll) executes both push and pull in sequence', async () => {
    syncService.setOnline(true);
    syncService.enqueue({
      userId: 'usr_100',
      table: 'attendance_records',
      action: 'INSERT',
      recordId: 'att_20261107',
      payload: { date: '2026-11-07' },
      clientTimestamp: new Date().toISOString(),
    });

    const result = await syncService.syncAll('usr_100');
    expect(result.pushed).toBe(1);
    expect(result.pulled).toBeGreaterThanOrEqual(1);
    expect(result.errors.length).toBe(0);
  });

  test('TC16-05: syncAll while offline returns early with offline error message without clearing queue', async () => {
    syncService.setOnline(false);
    syncService.enqueue({
      userId: 'usr_100',
      table: 'payroll_history',
      action: 'INSERT',
      recordId: 'pay_202610',
      payload: { month: '2026-10' },
      clientTimestamp: new Date().toISOString(),
    });

    const result = await syncService.syncAll('usr_100');
    expect(result.pushed).toBe(0);
    expect(result.errors).toContain('Device offline');
    expect(syncService.getQueue().length).toBe(1);
  });
});
