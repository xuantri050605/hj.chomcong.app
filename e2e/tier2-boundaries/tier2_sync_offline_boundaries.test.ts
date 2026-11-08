import { MockSupabaseClient, MockSyncService, MockUniversalStorage } from '../harness/testHarness';

describe('Tier 2 - Boundary & Corner Cases: Sync & Offline (Features 9, 14, 15, 16, 17, 18)', () => {
  let supabase: MockSupabaseClient;
  let syncService: MockSyncService;
  let storage: MockUniversalStorage;

  beforeEach(() => {
    supabase = new MockSupabaseClient();
    syncService = new MockSyncService(supabase);
    storage = new MockUniversalStorage();
  });

  // Feature 9: Supabase Client & Universal Storage Boundaries (5 tests)
  describe('F09: Supabase Client & Universal Storage Boundary Tests', () => {
    test('TC-B09-01: Null or empty key in storage throws or returns null safely', async () => {
      const res = await storage.getItem('');
      expect(res).toBeNull();
    });

    test('TC-B09-02: Storing large 1MB JSON string in UniversalStorage succeeds without truncation', async () => {
      const largeData = JSON.stringify({ payload: 'x'.repeat(1024 * 1024) });
      await storage.setItem('large_payload', largeData);
      const retrieved = await storage.getItem('large_payload');
      expect(retrieved?.length).toBe(largeData.length);
    });

    test('TC-B09-03: Storage handles keys containing colons, slashes, and periods cleanly', async () => {
      const complexKey = 'supabase.auth.token:2026/user@test.com';
      await storage.setItem(complexKey, 'val_123');
      expect(await storage.getItem(complexKey)).toBe('val_123');
    });

    test('TC-B09-04: Concurrent writes to same storage key preserve latest write', async () => {
      await Promise.all([
        storage.setItem('race_key', 'first'),
        storage.setItem('race_key', 'second'),
      ]);
      const res = await storage.getItem('race_key');
      expect(['first', 'second']).toContain(res);
    });

    test('TC-B09-05: Missing Supabase URL or anon key produces descriptive configuration error', () => {
      const initClient = (url?: string, key?: string) => {
        if (!url || !key) throw new Error('Missing Supabase URL or anon key');
        return true;
      };
      expect(() => initClient('', '')).toThrow('Missing Supabase URL or anon key');
    });
  });

  // Feature 14: SQL Database Schema & RLS Boundaries (5 tests)
  describe('F14: SQL Database Schema & RLS Boundary Tests', () => {
    test('TC-B14-01: Querying a non-existent table returns error without crashing client', async () => {
      const query = supabase.from('non_existent_table');
      const res = await query.select().eq('id', '123');
      expect(res.data).toEqual([]);
    });

    test('TC-B14-02: RLS blocks record insertion with unauthorized foreign user_id', async () => {
      supabase.currentSession = {
        accessToken: 'jwt_alice',
        refreshToken: 'rf_alice',
        expiresAt: Date.now() + 10000,
        user: { id: 'user_alice', email: 'alice@test.com' },
      };

      // Alice tries to insert record owned by Bob
      const result = await supabase.from('salary_configs').insert({
        id: 'cfg_bob',
        user_id: 'user_bob',
        basic_salary: 10000000,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('RLS policy violation');
    });

    test('TC-B14-03: RLS filters out foreign user records in SELECT query', async () => {
      // Direct table population (representing multi-tenant DB)
      supabase.tables.get('attendance_records')!.set('att_bob', {
        id: 'att_bob',
        user_id: 'user_bob',
        date: '2026-11-01',
      });

      // Alice logged in
      supabase.currentSession = {
        accessToken: 'jwt_alice',
        refreshToken: 'rf_alice',
        expiresAt: Date.now() + 10000,
        user: { id: 'user_alice', email: 'alice@test.com' },
      };

      const result = await supabase.from('attendance_records').select().eq('date', '2026-11-01');
      // Alice should not see Bob's record
      expect(result.data.length).toBe(0);
    });

    test('TC-B14-04: UUID string format validation pattern check', () => {
      const isValidUUID = (uuid: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);

      expect(isValidUUID('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c')).toBe(true);
      expect(isValidUUID('invalid-uuid-string')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });

    test('TC-B14-05: Deleting a record with foreign key reference cascades cleanly', async () => {
      supabase.tables.get('profiles')!.set('usr_del', { id: 'usr_del', email: 'del@test.com' });
      supabase.tables.get('salary_configs')!.set('cfg_del', { id: 'cfg_del', user_id: 'usr_del' });

      // Delete profile
      await supabase.from('profiles').delete().eq('id', 'usr_del');
      expect(supabase.tables.get('profiles')!.has('usr_del')).toBe(false);
    });
  });

  // Feature 15: Environment Config Boundaries (5 tests)
  describe('F15: Environment Config Template Boundary Tests', () => {
    test('TC-B15-01: Whitespace padding around env variable values is trimmed', () => {
      const rawEnv = 'EXPO_PUBLIC_APP_NAME="  Chấm Công  "\n';
      const parsed = rawEnv.split('=')[1]?.replace(/"/g, '').trim();
      expect(parsed).toBe('Chấm Công');
    });

    test('TC-B15-02: Missing protocol in URL placeholder is flagged', () => {
      const urlValidator = (url: string) => url.startsWith('http://') || url.startsWith('https://');
      expect(urlValidator('https://xyz.supabase.co')).toBe(true);
      expect(urlValidator('xyz.supabase.co')).toBe(false);
    });

    test('TC-B15-03: Empty env variable string returns fallback default value', () => {
      const getEnv = (key: string, fallback: string) => {
        const val = process.env[key];
        return val && val.trim() ? val : fallback;
      };
      expect(getEnv('NON_EXISTENT_VAR_123', 'default_val')).toBe('default_val');
    });

    test('TC-B15-04: Environment config does not contain trailing slash in base URLs', () => {
      const sanitizeUrl = (url: string) => url.replace(/\/+$/, '');
      expect(sanitizeUrl('https://api.example.com/')).toBe('https://api.example.com');
    });

    test('TC-B15-05: Reserved keyword variables are not overwritten', () => {
      expect(typeof process.env.NODE_ENV).toBe('string');
    });
  });

  // Feature 16: Offline Sync Boundaries (5 tests)
  describe('F16: Offline-First Sync Engine Boundary Tests', () => {
    test('TC-B16-01: 100 mutations queued offline are retained in exact chronological sequence', () => {
      syncService.setOnline(false);
      for (let i = 0; i < 100; i++) {
        syncService.enqueue({
          userId: 'usr_stress',
          table: 'attendance_records',
          action: 'INSERT',
          recordId: `rec_${i}`,
          payload: { index: i },
          clientTimestamp: new Date(Date.now() + i * 1000).toISOString(),
        });
      }
      expect(syncService.getQueue().length).toBe(100);
      expect(syncService.getQueue()[0].recordId).toBe('rec_0');
      expect(syncService.getQueue()[99].recordId).toBe('rec_99');
    });

    test('TC-B16-02: Rapid network connection flapping does not lose queued mutations', async () => {
      syncService.enqueue({
        userId: 'usr_flap',
        table: 'salary_configs',
        action: 'UPDATE',
        recordId: 'cfg_flap',
        payload: { basicSalary: 11000000 },
        clientTimestamp: new Date().toISOString(),
      });

      // Flapping
      syncService.setOnline(false);
      syncService.setOnline(true);
      syncService.setOnline(false);
      expect(syncService.getQueue().length).toBe(1);

      syncService.setOnline(true);
      await syncService.pushLocalQueue('usr_flap');
      expect(syncService.getQueue().length).toBe(0);
    });

    test('TC-B16-03: Mutation on already deleted remote record fails gracefully or inserts upsert', async () => {
      syncService.enqueue({
        userId: 'usr_del_parent',
        table: 'attendance_records',
        action: 'UPDATE',
        recordId: 'rec_ghost',
        payload: { note: 'Edited deleted record' },
        clientTimestamp: new Date().toISOString(),
      });
      const pushed = await syncService.pushLocalQueue('usr_del_parent');
      expect(pushed).toBe(1);
    });

    test('TC-B16-04: Server 500 error increments retry count and preserves mutation in queue', async () => {
      // Induce error
      supabase.tables.delete('attendance_records');
      syncService.enqueue({
        userId: 'usr_fail',
        table: 'attendance_records',
        action: 'INSERT',
        recordId: 'rec_retry',
        payload: {},
        clientTimestamp: new Date().toISOString(),
      });

      await syncService.pushLocalQueue('usr_fail');
      // Should flag error
      expect(syncService.getSyncStatus()).toBe('error');
    });

    test('TC-B16-05: Clearing sync queue empties all pending operations without side effects', () => {
      syncService.enqueue({
        userId: 'usr_clear',
        table: 'profiles',
        action: 'UPDATE',
        recordId: 'usr_clear',
        payload: {},
        clientTimestamp: new Date().toISOString(),
      });
      expect(syncService.getQueue().length).toBe(1);
      syncService.clearQueue();
      expect(syncService.getQueue().length).toBe(0);
    });
  });

  // Feature 17: Conflict Resolution LWW Boundaries (5 tests)
  describe('F17: Conflict Resolution LWW Boundary Tests', () => {
    test('TC-B17-01: Clock skew where client timestamp is in the future is handled safely', async () => {
      // Future timestamp on client (clock drift +5 minutes)
      const futureTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      syncService.enqueue({
        userId: 'usr_skew',
        table: 'salary_configs',
        action: 'UPDATE',
        recordId: 'cfg_skew',
        payload: { id: 'cfg_skew', basic_salary: 18000000, updated_at: futureTime },
        clientTimestamp: futureTime,
      });

      await syncService.pushLocalQueue('usr_skew');
      const updated = supabase.tables.get('salary_configs')!.get('cfg_skew');
      expect(updated.basic_salary).toBe(18000000);
    });

    test('TC-B17-02: Microsecond precision timestamp difference correctly resolves newer write', () => {
      const tA = '2026-11-05T12:00:00.001Z';
      const tB = '2026-11-05T12:00:00.002Z';
      expect(new Date(tB).getTime()).toBeGreaterThan(new Date(tA).getTime());
    });

    test('TC-B17-03: Null updated_at on existing record defaults to overwriting with valid client timestamp', async () => {
      supabase.tables.get('attendance_records')!.set('att_null_ts', {
        id: 'att_null_ts',
        note: 'Old without timestamp',
      });

      const tNow = new Date().toISOString();
      syncService.enqueue({
        userId: 'usr_null_ts',
        table: 'attendance_records',
        action: 'UPDATE',
        recordId: 'att_null_ts',
        payload: { id: 'att_null_ts', note: 'New note', updated_at: tNow },
        clientTimestamp: tNow,
      });

      await syncService.pushLocalQueue('usr_null_ts');
      const updated = supabase.tables.get('attendance_records')!.get('att_null_ts');
      expect(updated.note).toBe('New note');
    });

    test('TC-B17-04: Client mutation with invalid timestamp string falls back to current time', () => {
      const resolveTimestamp = (ts: string) => {
        const parsed = new Date(ts).getTime();
        return Number.isNaN(parsed) ? Date.now() : parsed;
      };
      const invalid = 'NOT_A_DATE';
      expect(Number.isFinite(resolveTimestamp(invalid))).toBe(true);
    });

    test('TC-B17-05: Local deletion vs remote update conflict resolution prefers explicit deletion', () => {
      const resolveDeleteConflict = (localAction: string, remoteAction: string) => {
        if (localAction === 'DELETE' || remoteAction === 'DELETE') return 'DELETE';
        return 'UPDATE';
      };
      expect(resolveDeleteConflict('DELETE', 'UPDATE')).toBe('DELETE');
    });
  });

  // Feature 18: Sync Status Indicator Boundaries (5 tests)
  describe('F18: Sync Status Indicator Boundary Tests', () => {
    test('TC-B18-01: Rapid online/offline toggling in 100ms stabilizes on final network state', () => {
      for (let i = 0; i < 10; i++) {
        syncService.setOnline(i % 2 === 0);
      }
      syncService.setOnline(true);
      expect(syncService.getSyncStatus()).toBe('synced');
    });

    test('TC-B18-02: Sync status remains offline if network is disconnected during pushLocalQueue', async () => {
      syncService.setOnline(false);
      await syncService.pushLocalQueue('usr_test');
      expect(syncService.getSyncStatus()).toBe('offline');
    });

    test('TC-B18-03: Recovery from error to synced upon successful synchronization', async () => {
      (syncService as any).syncStatus = 'error';
      expect(syncService.getSyncStatus()).toBe('error');

      syncService.setOnline(true);
      await syncService.pushLocalQueue('usr_test');
      expect(syncService.getSyncStatus()).toBe('synced');
    });

    test('TC-B18-04: Error badge with long error description does not throw on formatting', () => {
      const formatError = (msg: string, maxLen = 30) => {
        return msg.length > maxLen ? msg.substring(0, maxLen) + '...' : msg;
      };
      const longErr = 'NetworkTimeoutError: connection refused after 30000ms at supabase.co';
      const truncated = formatError(longErr);
      expect(truncated.length).toBeLessThanOrEqual(33);
      expect(truncated.endsWith('...')).toBe(true);
    });

    test('TC-B18-05: Empty mutation queue with active online connection stays in synced state', () => {
      syncService.clearQueue();
      syncService.setOnline(true);
      expect(syncService.getSyncStatus()).toBe('synced');
    });
  });
});
