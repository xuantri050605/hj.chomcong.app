jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
  },
}));

import { universalStorage, MemoryStorage, createUniversalStorage } from '../src/services/universalStorage';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  LocalFallbackSupabaseClient,
} from '../src/services/supabaseClient';
import { useAuthStore } from '../src/store/authStore';

describe('Milestone 2 - Supabase Auth & Session Management Test Suite', () => {
  beforeEach(async () => {
    await universalStorage.clear();
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      isInitialized: false,
      isOfflineOnly: false,
      error: null,
      isAuthModalOpen: false,
      authModalMode: 'LOGIN',
    });
  });

  // ============================================================================
  // 1. UNIVERSAL STORAGE TESTS
  // ============================================================================
  describe('1. Universal Storage Adapter', () => {
    test('1.1: setItem, getItem, and removeItem perform accurately', async () => {
      await universalStorage.setItem('key_alpha', 'value_alpha');
      expect(await universalStorage.getItem('key_alpha')).toBe('value_alpha');

      await universalStorage.removeItem('key_alpha');
      expect(await universalStorage.getItem('key_alpha')).toBeNull();
    });

    test('1.2: Non-existent key returns null without exceptions', async () => {
      expect(await universalStorage.getItem('ghost_key')).toBeNull();
    });

    test('1.3: clear removes all keys and getAllKeys reflects emptiness', async () => {
      await universalStorage.setItem('k1', 'v1');
      await universalStorage.setItem('k2', 'v2');
      await universalStorage.setItem('k3', 'v3');
      expect((await universalStorage.getAllKeys()).length).toBe(3);

      await universalStorage.clear();
      expect((await universalStorage.getAllKeys()).length).toBe(0);
    });

    test('1.4: JSON serialization and deserialization retains data integrity', async () => {
      const complexPayload = {
        token: 'jwt_mock_token_123',
        user: { id: 'usr_xyz', email: 'test@chamcong.vn', roles: ['admin', 'employee'] },
        metadata: { loggedInAt: 1731000000000, theme: 'dark' },
      };

      await universalStorage.setItem('payload_key', JSON.stringify(complexPayload));
      const raw = await universalStorage.getItem('payload_key');
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(parsed.token).toBe(complexPayload.token);
      expect(parsed.user.email).toBe(complexPayload.user.email);
      expect(parsed.user.roles).toEqual(complexPayload.user.roles);
      expect(parsed.metadata.theme).toBe('dark');
    });

    test('1.5: Isolated MemoryStorage instance operates independently', async () => {
      const mem1 = new MemoryStorage();
      const mem2 = new MemoryStorage();

      await mem1.setItem('item', 'mem1_value');
      expect(await mem1.getItem('item')).toBe('mem1_value');
      expect(await mem2.getItem('item')).toBeNull();
    });

    test('1.6: createUniversalStorage returns a valid adapter in Jest environment', () => {
      const instance = createUniversalStorage();
      expect(instance).toBeDefined();
      expect(typeof instance.getItem).toBe('function');
      expect(typeof instance.setItem).toBe('function');
      expect(typeof instance.removeItem).toBe('function');
      expect(typeof instance.clear).toBe('function');
    });
  });

  // ============================================================================
  // 2. SUPABASE CLIENT & LOCAL FALLBACK TESTS
  // ============================================================================
  describe('2. Supabase Client & Local Fallback Engine', () => {
    test('2.1: getSupabaseClient returns configured or fallback client', () => {
      const client = getSupabaseClient();
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(typeof client.auth.signUp).toBe('function');
      expect(typeof client.auth.signInWithPassword).toBe('function');
      expect(typeof client.auth.signOut).toBe('function');
      expect(typeof client.auth.getSession).toBe('function');
      expect(typeof client.from).toBe('function');
    });

    test('2.2: isSupabaseConfigured returns boolean flag accurately', () => {
      expect(typeof isSupabaseConfigured).toBe('boolean');
    });

    test('2.3: signUp rejects invalid emails and weak passwords with clear errors', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      const res1 = await client.auth.signUp({ email: 'bad-email', password: '123' });
      expect(res1.error).not.toBeNull();
      expect(res1.data.user).toBeNull();

      const res2 = await client.auth.signUp({ email: 'valid@test.com', password: '123' });
      expect(res2.error?.message).toMatch(/at least 6 characters/i);

      const res3 = await client.auth.signUp({ email: '', password: 'ValidPass123' });
      expect(res3.error?.message).toMatch(/format/i);
    });

    test('2.4: signUp creates user, session, and prevents duplicate registration', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      const res = await client.auth.signUp({
        email: 'nhanvien1@example.com',
        password: 'Password123!',
        options: { data: { full_name: 'Nguyễn Văn Một' } },
      });

      expect(res.error).toBeNull();
      expect(res.data.user).not.toBeNull();
      expect(res.data.user?.email).toBe('nhanvien1@example.com');
      expect(res.data.user?.fullName).toBe('Nguyễn Văn Một');
      expect(res.data.session).not.toBeNull();
      expect(res.data.session?.accessToken).toBeDefined();

      // Duplicate registration attempt
      const dupRes = await client.auth.signUp({
        email: 'nhanvien1@example.com',
        password: 'AnotherPassword456',
      });
      expect(dupRes.error?.message).toMatch(/already registered/i);
      expect(dupRes.data.user).toBeNull();
    });

    test('2.5: signInWithPassword verifies credentials and returns session', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      await client.auth.signUp({
        email: 'ketoan@company.com',
        password: 'CorrectPassword123',
        options: { data: { full_name: 'Trần Kế Toán' } },
      });

      // Wrong password
      const failRes = await client.auth.signInWithPassword({
        email: 'ketoan@company.com',
        password: 'WrongPassword',
      });
      expect(failRes.error?.message).toMatch(/Invalid login credentials/i);
      expect(failRes.data.session).toBeNull();

      // Unknown user
      const unkRes = await client.auth.signInWithPassword({
        email: 'unknown@company.com',
        password: 'AnyPassword',
      });
      expect(unkRes.error?.message).toMatch(/Invalid login credentials/i);

      // Correct credentials
      const okRes = await client.auth.signInWithPassword({
        email: 'ketoan@company.com',
        password: 'CorrectPassword123',
      });
      expect(okRes.error).toBeNull();
      expect(okRes.data.user?.email).toBe('ketoan@company.com');
      expect(okRes.data.session?.accessToken).toBeDefined();
    });

    test('2.6: signOut clears session token from storage', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      await client.auth.signUp({
        email: 'logout_user@test.com',
        password: 'Password123',
      });

      const sessionBefore = await client.auth.getSession();
      expect(sessionBefore.data.session).not.toBeNull();

      await client.auth.signOut();
      const sessionAfter = await client.auth.getSession();
      expect(sessionAfter.data.session).toBeNull();
    });

    test('2.7: onAuthStateChange triggers listeners on SIGNED_IN and SIGNED_OUT', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);
      const events: string[] = [];

      const { data } = client.auth.onAuthStateChange((event, session) => {
        events.push(event);
      });

      await client.auth.signUp({ email: 'events@test.com', password: 'Password123' });
      expect(events).toContain('SIGNED_IN');

      await client.auth.signOut();
      expect(events).toContain('SIGNED_OUT');

      data.subscription.unsubscribe();
      await client.auth.signInWithPassword({ email: 'events@test.com', password: 'Password123' });
      expect(events.filter((e) => e === 'SIGNED_IN').length).toBe(1); // Unsubscribed
    });

    test('2.8: from(tableName) simulates basic tables and RLS checks', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      // Sign up user A
      const userA = await client.auth.signUp({ email: 'usera@test.com', password: 'Password123' });
      const userIdA = userA.data.user!.id;

      // Insert record for user A
      const insertRes = await client.from('salary_configs').insert({
        user_id: userIdA,
        basic_salary: 6000000,
      });
      expect(insertRes.error).toBeNull();

      // Query records
      const selectRes = await client.from('salary_configs').select('*').eq('user_id', userIdA);
      expect(selectRes.data.length).toBe(1);
      expect(selectRes.data[0].basic_salary).toBe(6000000);

      // Delete record
      const delRes = await client.from('salary_configs').delete().eq('user_id', userIdA);
      expect(delRes.data.count).toBe(1);
    });
  });

  // ============================================================================
  // 3. USEAUTHSTORE (ZUSTAND) TESTS
  // ============================================================================
  describe('3. useAuthStore State & Actions', () => {
    test('3.1: Initial store state is pristine', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isAuthModalOpen).toBe(false);
    });

    test('3.2: signUp action sets user, session, profile, and returns true', async () => {
      const success = await useAuthStore
        .getState()
        .signUp('store_user@company.com', 'Pass123456', 'Nguyễn Store');

      expect(success).toBe(true);
      const state = useAuthStore.getState();
      expect(state.user).not.toBeNull();
      expect(state.user?.email).toBe('store_user@company.com');
      expect(state.user?.fullName).toBe('Nguyễn Store');
      expect(state.session).not.toBeNull();
      expect(state.profile?.fullName).toBe('Nguyễn Store');
      expect(state.error).toBeNull();
    });

    test('3.3: signIn action authenticates previously registered user', async () => {
      await useAuthStore.getState().signUp('login_test@company.com', 'Pass123456', 'Trần Thử');
      await useAuthStore.getState().signOut();
      expect(useAuthStore.getState().user).toBeNull();

      const signedIn = await useAuthStore
        .getState()
        .signIn('login_test@company.com', 'Pass123456');
      expect(signedIn).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe('login_test@company.com');
      expect(useAuthStore.getState().profile?.fullName).toBe('Trần Thử');
    });

    test('3.4: signIn with invalid credentials sets error and returns false', async () => {
      const signedIn = await useAuthStore
        .getState()
        .signIn('nobody@company.com', 'WrongPass');
      expect(signedIn).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().error).toBeTruthy();
    });

    test('3.5: clearError resets error state to null', async () => {
      await useAuthStore.getState().signIn('bad@company.com', 'Wrong');
      expect(useAuthStore.getState().error).not.toBeNull();

      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });

    test('3.6: signOut clears user, session, profile, and sets isOfflineOnly', async () => {
      await useAuthStore.getState().signUp('signout_user@test.com', 'Pass123456');
      expect(useAuthStore.getState().user).not.toBeNull();

      await useAuthStore.getState().signOut();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isOfflineOnly).toBe(true);
    });

    test('3.7: continueAsGuest marks offline mode and dismisses modal', () => {
      useAuthStore.getState().openAuthModal('LOGIN');
      expect(useAuthStore.getState().isAuthModalOpen).toBe(true);

      useAuthStore.getState().continueAsGuest();
      const state = useAuthStore.getState();
      expect(state.isOfflineOnly).toBe(true);
      expect(state.isAuthModalOpen).toBe(false);
    });

    test('3.8: openAuthModal and closeAuthModal control modal state', () => {
      useAuthStore.getState().openAuthModal('REGISTER');
      expect(useAuthStore.getState().isAuthModalOpen).toBe(true);
      expect(useAuthStore.getState().authModalMode).toBe('REGISTER');

      useAuthStore.getState().closeAuthModal();
      expect(useAuthStore.getState().isAuthModalOpen).toBe(false);
    });

    test('3.9: initializeAuth restores persisted session across reload simulation', async () => {
      // 1. User signs up
      await useAuthStore.getState().signUp('reload_user@test.com', 'Pass123456', 'Reload Test');
      expect(useAuthStore.getState().user).not.toBeNull();

      // 2. Simulate page reload by resetting store state while storage persists
      useAuthStore.setState({
        user: null,
        session: null,
        profile: null,
        isInitialized: false,
      });
      expect(useAuthStore.getState().user).toBeNull();

      // 3. Call initializeAuth to auto-restore
      await useAuthStore.getState().initializeAuth();
      const state = useAuthStore.getState();
      expect(state.user).not.toBeNull();
      expect(state.user?.email).toBe('reload_user@test.com');
      expect(state.profile?.fullName).toBe('Reload Test');
      expect(state.isInitialized).toBe(true);
    });

    test('3.10: Corrupted session in storage clears gracefully without crash', async () => {
      await universalStorage.setItem('sb-auth-token', '{corrupted_json_syntax');
      await useAuthStore.getState().initializeAuth();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });
  });
});
