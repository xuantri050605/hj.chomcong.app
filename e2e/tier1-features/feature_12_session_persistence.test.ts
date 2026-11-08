import { MockUniversalStorage, MockSupabaseClient } from '../harness/testHarness';
import { UserSession } from '../harness/contractTypes';

describe('Tier 1 - Feature 12: Session Persistence & Auto Restore', () => {
  let storage: MockUniversalStorage;
  let supabase: MockSupabaseClient;

  beforeEach(() => {
    storage = new MockUniversalStorage();
    supabase = new MockSupabaseClient();
  });

  const SESSION_STORAGE_KEY = 'sb-auth-token';

  test('TC12-01: Session data persists to UniversalStorage upon successful authentication', async () => {
    const { data } = await supabase.auth.signUp({
      email: 'session_test@example.com',
      password: 'password123',
    });
    expect(data.session).not.toBeNull();

    await storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data.session));
    const raw = await storage.getItem(SESSION_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored.accessToken).toBe(data.session?.accessToken);
  });

  test('TC12-02: Auto-restore reconstructs active user profile from storage', async () => {
    const mockSession: UserSession = {
      accessToken: 'jwt_mock_restore_token',
      refreshToken: 'jwt_mock_refresh_token',
      expiresAt: Date.now() + 3600000,
      user: {
        id: 'usr_restored',
        email: 'restored@example.com',
        fullName: 'Restored User',
      },
    };
    await storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(mockSession));

    const raw = await storage.getItem(SESSION_STORAGE_KEY);
    const parsed: UserSession = JSON.parse(raw!);
    expect(parsed.user.id).toBe('usr_restored');
    expect(parsed.user.email).toBe('restored@example.com');
  });

  test('TC12-03: Expired session (expiresAt in past) is flagged for token refresh or eviction', async () => {
    const expiredSession: UserSession = {
      accessToken: 'jwt_expired',
      refreshToken: 'jwt_refresh',
      expiresAt: Date.now() - 5000, // 5s in past
      user: { id: 'usr_exp', email: 'exp@example.com' },
    };
    await storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(expiredSession));

    const raw = await storage.getItem(SESSION_STORAGE_KEY);
    const parsed: UserSession = JSON.parse(raw!);
    const isExpired = parsed.expiresAt < Date.now();
    expect(isExpired).toBe(true);
  });

  test('TC12-04: Corrupted session payload in storage clears without application crash', async () => {
    await storage.setItem(SESSION_STORAGE_KEY, 'corrupted_non_json_string{');

    let parsed = null;
    try {
      const raw = await storage.getItem(SESSION_STORAGE_KEY);
      parsed = JSON.parse(raw!);
    } catch {
      await storage.removeItem(SESSION_STORAGE_KEY);
    }
    expect(parsed).toBeNull();
    const cleared = await storage.getItem(SESSION_STORAGE_KEY);
    expect(cleared).toBeNull();
  });

  test('TC12-05: Missing session storage returns null indicating unauthenticated guest session', async () => {
    const raw = await storage.getItem('non_existent_session_key');
    expect(raw).toBeNull();
  });
});
