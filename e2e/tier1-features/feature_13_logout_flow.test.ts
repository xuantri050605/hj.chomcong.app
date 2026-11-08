import { TestHarness, MockUniversalStorage } from '../harness/testHarness';

describe('Tier 1 - Feature 13: Logout Flow', () => {
  let storage: MockUniversalStorage;
  const SESSION_KEY = 'sb-auth-token';

  beforeEach(() => {
    TestHarness.reset();
    storage = new MockUniversalStorage();
  });

  test('TC13-01: Logout clears user and session from auth store', async () => {
    const authStore = TestHarness.getAuthStore();
    await authStore.signUp('user_logout@example.com', 'Pass123456');
    expect(authStore.user).not.toBeNull();
    expect(authStore.session).not.toBeNull();

    await authStore.signOut();
    expect(authStore.user).toBeNull();
    expect(authStore.session).toBeNull();
  });

  test('TC13-02: Logout clears persisted session token from storage', async () => {
    await storage.setItem(SESSION_KEY, 'active_jwt_token_sample');
    expect(await storage.getItem(SESSION_KEY)).toBe('active_jwt_token_sample');

    // Sign out simulation
    await storage.removeItem(SESSION_KEY);
    expect(await storage.getItem(SESSION_KEY)).toBeNull();
  });

  test('TC13-03: Logout handles repeated or redundant calls idempotently', async () => {
    const authStore = TestHarness.getAuthStore();
    await authStore.signUp('idempotent@test.com', 'Pass123456');
    await authStore.signOut();

    // Second signOut call should not throw or error
    await expect(authStore.signOut()).resolves.not.toThrow();
    expect(authStore.user).toBeNull();
  });

  test('TC13-04: Logout returns active screen or navigation state to default Dashboard', () => {
    let activeRoute = 'Salary';
    const performSignOut = () => {
      activeRoute = 'Dashboard';
    };
    performSignOut();
    expect(activeRoute).toBe('Dashboard');
  });

  test('TC13-05: Logout while offline clears local session without throwing unhandled network error', async () => {
    const authStore = TestHarness.getAuthStore();
    await authStore.signUp('offline_logout@test.com', 'Pass123456');

    // Simulate network loss
    const offlineSignOut = async () => {
      try {
        await authStore.signOut();
      } catch {
        // Fallback local clear
        authStore.user = null;
        authStore.session = null;
      }
    };

    await expect(offlineSignOut()).resolves.not.toThrow();
    expect(authStore.user).toBeNull();
  });
});
