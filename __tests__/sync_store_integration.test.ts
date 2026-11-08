jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
  },
  Alert: {
    alert: jest.fn(),
  },
}));

import { useSyncStore } from '../src/store/syncStore';

describe('Option 2 (s2): Sync Store & Indicator Tests', () => {
  beforeEach(() => {
    useSyncStore.setState({
      syncStatus: 'synced',
      isOnline: true,
      isModalOpen: false,
      lastSyncedAt: null,
      errorMessage: null,
    });
  });

  test('manages sync modal open and close states', () => {
    expect(useSyncStore.getState().isModalOpen).toBe(false);

    useSyncStore.getState().openSyncModal();
    expect(useSyncStore.getState().isModalOpen).toBe(true);

    useSyncStore.getState().closeSyncModal();
    expect(useSyncStore.getState().isModalOpen).toBe(false);
  });

  test('toggles online status and reflects in sync state', () => {
    useSyncStore.getState().setOnline(false);
    expect(useSyncStore.getState().isOnline).toBe(false);
    expect(useSyncStore.getState().syncStatus).toBe('offline');

    useSyncStore.getState().setOnline(true);
    expect(useSyncStore.getState().isOnline).toBe(true);
    expect(useSyncStore.getState().syncStatus).toBe('synced');
  });

  test('executes syncNow gracefully in test/local fallback mode', async () => {
    const success = await useSyncStore.getState().syncNow();
    expect(success).toBe(true);
    expect(useSyncStore.getState().syncStatus).toBe('synced');
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
  });
});
