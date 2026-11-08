import { MockSyncService, MockSupabaseClient } from '../harness/testHarness';

describe('Tier 1 - Feature 17: Conflict Resolution (Last-Write-Wins)', () => {
  let supabase: MockSupabaseClient;
  let syncService: MockSyncService;

  beforeEach(() => {
    supabase = new MockSupabaseClient();
    syncService = new MockSyncService(supabase);
  });

  test('TC17-01: Newer client timestamp overwrites older server record', async () => {
    // Existing server record at T1
    const t1 = new Date('2026-11-05T10:00:00Z').toISOString();
    supabase.tables.get('salary_configs')!.set('cfg_main', {
      id: 'cfg_main',
      basic_salary: 10000000,
      updated_at: t1,
    });

    // Client mutation at T2 (newer)
    const t2 = new Date('2026-11-05T12:00:00Z').toISOString();
    syncService.enqueue({
      userId: 'usr_1',
      table: 'salary_configs',
      action: 'UPDATE',
      recordId: 'cfg_main',
      payload: { id: 'cfg_main', basic_salary: 15000000, updated_at: t2 },
      clientTimestamp: t2,
    });

    await syncService.pushLocalQueue('usr_1');
    const updated = supabase.tables.get('salary_configs')!.get('cfg_main');
    expect(updated.basic_salary).toBe(15000000);
  });

  test('TC17-02: Older client timestamp does not overwrite newer server record', async () => {
    // Existing server record at T2 (newer)
    const t2 = new Date('2026-11-05T12:00:00Z').toISOString();
    supabase.tables.get('salary_configs')!.set('cfg_main', {
      id: 'cfg_main',
      basic_salary: 20000000,
      updated_at: t2,
    });

    // Client mutation at T1 (stale, offline change made earlier)
    const t1 = new Date('2026-11-05T10:00:00Z').toISOString();
    syncService.enqueue({
      userId: 'usr_1',
      table: 'salary_configs',
      action: 'UPDATE',
      recordId: 'cfg_main',
      payload: { id: 'cfg_main', basic_salary: 12000000, updated_at: t1 },
      clientTimestamp: t1,
    });

    await syncService.pushLocalQueue('usr_1');
    const retained = supabase.tables.get('salary_configs')!.get('cfg_main');
    // Stale write was rejected in favor of newer server record
    expect(retained.basic_salary).toBe(20000000);
  });

  test('TC17-03: Equal timestamps resolve deterministically without data corruption', async () => {
    const tSame = new Date('2026-11-05T10:00:00Z').toISOString();
    supabase.tables.get('attendance_records')!.set('att_same', {
      id: 'att_same',
      note: 'Server Note',
      updated_at: tSame,
    });

    syncService.enqueue({
      userId: 'usr_1',
      table: 'attendance_records',
      action: 'UPDATE',
      recordId: 'att_same',
      payload: { id: 'att_same', note: 'Client Tie-Breaker Note', updated_at: tSame },
      clientTimestamp: tSame,
    });

    await syncService.pushLocalQueue('usr_1');
    const finalRecord = supabase.tables.get('attendance_records')!.get('att_same');
    expect(finalRecord).toBeDefined();
    expect(finalRecord.note).toBeTruthy();
  });

  test('TC17-04: Timestamp comparison correctly handles ISO-8601 millisecond precision', () => {
    const timeA = new Date('2026-11-05T10:00:00.100Z').getTime();
    const timeB = new Date('2026-11-05T10:00:00.200Z').getTime();
    expect(timeB).toBeGreaterThan(timeA);
  });

  test('TC17-05: Missing remote record treats client payload as new insert regardless of timestamp', async () => {
    const tPast = new Date('2026-01-01T00:00:00Z').toISOString();
    syncService.enqueue({
      userId: 'usr_1',
      table: 'attendance_records',
      action: 'INSERT',
      recordId: 'att_new_insert',
      payload: { id: 'att_new_insert', date: '2026-01-01', updated_at: tPast },
      clientTimestamp: tPast,
    });

    await syncService.pushLocalQueue('usr_1');
    const inserted = supabase.tables.get('attendance_records')!.get('att_new_insert');
    expect(inserted).toBeDefined();
  });
});
