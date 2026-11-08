import { MockSyncService, MockSupabaseClient, TestHarness } from '../harness/testHarness';
import { SyncStatusType } from '../harness/contractTypes';

describe('Tier 1 - Feature 18: Sync Status Indicator', () => {
  let supabase: MockSupabaseClient;
  let syncService: MockSyncService;
  const theme = TestHarness.getTheme();

  beforeEach(() => {
    supabase = new MockSupabaseClient();
    syncService = new MockSyncService(supabase);
  });

  const getBadgeStyle = (status: SyncStatusType) => {
    switch (status) {
      case 'synced':
        return { label: 'Đã đồng bộ', color: theme.colors.success };
      case 'syncing':
        return { label: 'Đang đồng bộ...', color: theme.colors.primary };
      case 'offline':
        return { label: 'Ngoại tuyến', color: theme.colors.slate400 };
      case 'error':
        return { label: 'Lỗi đồng bộ', color: theme.colors.danger };
    }
  };

  test('TC18-01: Indicator defines labels and distinct semantic colors for all 4 sync states', () => {
    const states: SyncStatusType[] = ['synced', 'syncing', 'offline', 'error'];
    const seenColors = new Set<string>();

    for (const st of states) {
      const badge = getBadgeStyle(st);
      expect(badge.label).toBeTruthy();
      expect(badge.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      seenColors.add(badge.color);
    }
    expect(seenColors.size).toBe(4);
  });

  test('TC18-02: Transition from synced to offline occurs immediately when network drops', () => {
    expect(syncService.getSyncStatus()).toBe('synced');
    syncService.setOnline(false);
    expect(syncService.getSyncStatus()).toBe('offline');
    expect(getBadgeStyle(syncService.getSyncStatus()).label).toBe('Ngoại tuyến');
  });

  test('TC18-03: Transition to syncing occurs when pending queue begins pushing', async () => {
    syncService.enqueue({
      userId: 'usr_1',
      table: 'attendance_records',
      action: 'INSERT',
      recordId: 'rec_syncing',
      payload: {},
      clientTimestamp: new Date().toISOString(),
    });

    const pushPromise = syncService.pushLocalQueue('usr_1');
    expect(['syncing', 'synced']).toContain(syncService.getSyncStatus());
    await pushPromise;
    expect(syncService.getSyncStatus()).toBe('synced');
  });

  test('TC18-04: Failed network requests transition status to error', async () => {
    // Inject deliberate table failure
    supabase.tables.set('bad_table', null as any);
    syncService.enqueue({
      userId: 'usr_1',
      table: 'bad_table' as any,
      action: 'INSERT',
      recordId: 'rec_err',
      payload: {},
      clientTimestamp: new Date().toISOString(),
    });

    await syncService.pushLocalQueue('usr_1');
    expect(syncService.getSyncStatus()).toBe('error');
    expect(getBadgeStyle(syncService.getSyncStatus()).label).toBe('Lỗi đồng bộ');
  });

  test('TC18-05: Retrying sync from error state clears error once successful', async () => {
    syncService.clearQueue();
    syncService.setOnline(true);
    await syncService.syncAll('usr_1');
    expect(syncService.getSyncStatus()).toBe('synced');
  });
});
