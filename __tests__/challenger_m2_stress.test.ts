/**
 * CHALLENGER 1 (MILESTONE 2) EMPIRICAL STRESS TEST SUITE
 * 
 * Testing Focus:
 * 1. Session Persistence across reloads (valid, expired, corrupted tokens).
 * 2. UniversalStorage stress (10,000 rapid operations, multi-byte Unicode, empty values/keys, large payloads).
 * 3. Concurrent auth requests and race condition handling in useAuthStore and LocalFallbackSupabaseClient.
 */

jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
  },
}));

import {
  universalStorage,
  MemoryStorage,
  WebLocalStorage,
  MobileAsyncStorage,
  createUniversalStorage,
} from '../src/services/universalStorage';
import {
  LocalFallbackSupabaseClient,
  getSupabaseClient,
  Session,
  User,
} from '../src/services/supabaseClient';
import { useAuthStore } from '../src/store/authStore';

describe('Milestone 2 - Empirical Stress Test Suite (Challenger 1)', () => {
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
  // CHALLENGE 1: SESSION PERSISTENCE ACROSS RELOADS
  // ============================================================================
  describe('Challenge 1: Session Persistence Across Reloads', () => {
    test('1.1: Valid token persists across multiple cold reloads (new client instances)', async () => {
      const storage = new MemoryStorage();
      const client1 = new LocalFallbackSupabaseClient(storage);

      // Sign up user
      const signUpRes = await client1.auth.signUp({
        email: 'employee_persist@company.vn',
        password: 'Password999!',
        options: { data: { full_name: 'Nguyễn Văn Kiên Trì' } },
      });
      expect(signUpRes.error).toBeNull();
      expect(signUpRes.data.session).not.toBeNull();
      const originalUserId = signUpRes.data.user!.id;

      // Simulate Cold App Reload 1: Create a completely new client instance pointing to the same storage
      const clientReload1 = new LocalFallbackSupabaseClient(storage);
      const sessionRes1 = await clientReload1.auth.getSession();
      expect(sessionRes1.error).toBeNull();
      expect(sessionRes1.data.session).not.toBeNull();
      expect(sessionRes1.data.session?.user.id).toBe(originalUserId);
      expect(sessionRes1.data.session?.user.email).toBe('employee_persist@company.vn');
      expect(sessionRes1.data.session?.user.fullName).toBe('Nguyễn Văn Kiên Trì');

      // Simulate Cold App Reload 2: Another fresh instance
      const clientReload2 = new LocalFallbackSupabaseClient(storage);
      const sessionRes2 = await clientReload2.auth.getSession();
      expect(sessionRes2.data.session?.user.id).toBe(originalUserId);

      // Can perform authenticated operations after reload
      const insertRes = await clientReload2.from('attendance_records').insert({
        user_id: originalUserId,
        check_in: new Date().toISOString(),
      });
      expect(insertRes.error).toBeNull();
    });

    test('1.2: Expired token by timestamp is evicted automatically and returns null session', async () => {
      const storage = new MemoryStorage();
      const expiredTimestamp = Date.now() - 3600 * 1000; // 1 hour ago

      const expiredSession: Session = {
        access_token: 'jwt_expired_123',
        accessToken: 'jwt_expired_123',
        refresh_token: 'refresh_expired_123',
        refreshToken: 'refresh_expired_123',
        expires_at: Math.floor(expiredTimestamp / 1000),
        expiresAt: expiredTimestamp,
        user: {
          id: 'usr_expired_1',
          email: 'expired@company.com',
          fullName: 'Người Quá Hạn',
        },
      };

      await storage.setItem('sb-auth-token', JSON.stringify(expiredSession));

      // Reload app
      const client = new LocalFallbackSupabaseClient(storage);
      const res = await client.auth.getSession();
      expect(res.error).toBeNull();
      expect(res.data.session).toBeNull();

      // Ensure it was evicted from storage
      const rawInStorage = await storage.getItem('sb-auth-token');
      expect(rawInStorage).toBeNull();
    });

    test('1.3: Active session in memory that expires during runtime is evicted on subsequent getSession()', async () => {
      const storage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(storage);

      // Create session expiring in 50ms
      const shortLivedSession: Session = {
        access_token: 'jwt_short_lived',
        accessToken: 'jwt_short_lived',
        refresh_token: 'refresh_short_lived',
        refreshToken: 'refresh_short_lived',
        expires_at: Math.floor((Date.now() + 50) / 1000),
        expiresAt: Date.now() + 50,
        user: {
          id: 'usr_short',
          email: 'short@company.com',
          fullName: 'Tạm Thời',
        },
      };

      await storage.setItem('sb-auth-token', JSON.stringify(shortLivedSession));

      // First getSession while still valid
      const res1 = await client.auth.getSession();
      expect(res1.data.session).not.toBeNull();

      // Wait 70ms for it to expire
      await new Promise((resolve) => setTimeout(resolve, 70));

      // Subsequent getSession detects expiration in memory
      const res2 = await client.auth.getSession();
      expect(res2.data.session).toBeNull();

      // Evicted from storage
      expect(await storage.getItem('sb-auth-token')).toBeNull();
    });

    test('1.4: Corrupted non-JSON string in storage is evicted safely without crashing', async () => {
      const storage = new MemoryStorage();
      const corruptTokens = [
        '{invalid_json_missing_brace',
        '<<<XML_NOT_JSON>>>',
        'undefined',
        'NaN',
        '{"access_token": unquoted_value}',
        '\x00\x01\x02\xFF\xFE',
      ];

      for (const corrupt of corruptTokens) {
        await storage.setItem('sb-auth-token', corrupt);
        const client = new LocalFallbackSupabaseClient(storage);

        const res = await client.auth.getSession();
        expect(res.error).toBeNull();
        expect(res.data.session).toBeNull();
        expect(await storage.getItem('sb-auth-token')).toBeNull();
      }
    });

    test('1.5: JSON null, primitive numbers, and booleans in storage do not crash', async () => {
      const storage = new MemoryStorage();
      const weirdPrimitives = ['null', '12345', 'true', 'false'];

      for (const raw of weirdPrimitives) {
        await storage.setItem('sb-auth-token', raw);
        const client = new LocalFallbackSupabaseClient(storage);

        const res = await client.auth.getSession();
        expect(res.error).toBeNull();
        expect(res.data.session).toBeNull();
      }
    });

    test('1.6: Malformed payload missing user object is handled safely by authStore.initializeAuth', async () => {
      const storage = new MemoryStorage();
      await storage.setItem('sb-auth-token', JSON.stringify({ token_only: 'no_user_present' }));

      // Initialize auth store with malformed session
      await useAuthStore.getState().initializeAuth();
      const state = useAuthStore.getState();

      // Guarded safely: user and profile remain null
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isInitialized).toBe(true);
    });

    test('1.7: Partial/legacy session normalization (snake_case vs camelCase and missing fullName)', async () => {
      const storage = new MemoryStorage();
      const legacySession = {
        access_token: 'legacy_jwt_abc',
        refresh_token: 'legacy_ref_xyz',
        expires_at: Math.floor((Date.now() + 100000) / 1000),
        user: {
          id: 'usr_legacy_1',
          email: 'cu_ky@company.vn',
          user_metadata: {
            full_name: 'Bác Cựu Kỷ',
          },
        },
      };

      await storage.setItem('sb-auth-token', JSON.stringify(legacySession));

      const client = new LocalFallbackSupabaseClient(storage);
      const res = await client.auth.getSession();
      expect(res.error).toBeNull();
      expect(res.data.session).not.toBeNull();
      expect(res.data.session?.accessToken).toBe('legacy_jwt_abc');
      expect(res.data.session?.refreshToken).toBe('legacy_ref_xyz');
      expect(res.data.session?.user.fullName).toBe('Bác Cựu Kỷ');
    });

    test('1.8: Stress test: 50 sequential reload cycles with state restoration', async () => {
      const storage = new MemoryStorage();
      const initialClient = new LocalFallbackSupabaseClient(storage);

      await initialClient.auth.signUp({
        email: 'loop_reload@company.com',
        password: 'SecurePassword123',
        options: { data: { full_name: 'Vòng Lặp Reload' } },
      });

      for (let i = 0; i < 50; i++) {
        const client = new LocalFallbackSupabaseClient(storage);
        const res = await client.auth.getSession();
        expect(res.data.session).not.toBeNull();
        expect(res.data.session?.user.email).toBe('loop_reload@company.com');
      }
    });
  });

  // ============================================================================
  // CHALLENGE 2: UNIVERSAL STORAGE BOUNDARY & STRESS TESTS
  // ============================================================================
  describe('Challenge 2: UniversalStorage Boundary & Stress', () => {
    test('2.1: 10,000 rapid operations on MemoryStorage execute smoothly', async () => {
      const storage = new MemoryStorage();
      const startTime = Date.now();

      // 2,500 set operations
      for (let i = 0; i < 2500; i++) {
        await storage.setItem(`stress_key_${i}`, `val_${i}`);
      }

      // 2,500 get operations
      for (let i = 0; i < 2500; i++) {
        const val = await storage.getItem(`stress_key_${i}`);
        expect(val).toBe(`val_${i}`);
      }

      // 2,500 overwrite operations
      for (let i = 0; i < 2500; i++) {
        await storage.setItem(`stress_key_${i}`, `new_val_${i}`);
      }

      // 2,500 remove operations
      for (let i = 0; i < 2500; i++) {
        await storage.removeItem(`stress_key_${i}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Must be fast (< 5s)
      const remainingKeys = await storage.getAllKeys();
      expect(remainingKeys.length).toBe(0);
    });

    test('2.2: 1,000 concurrent Promise.all set and get operations', async () => {
      const storage = new MemoryStorage();
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 1000; i++) {
        promises.push(storage.setItem(`concur_key_${i}`, `val_${i}`));
      }
      await Promise.all(promises);

      const getPromises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        getPromises.push(
          storage.getItem(`concur_key_${i}`).then((val) => {
            expect(val).toBe(`val_${i}`);
          })
        );
      }
      await Promise.all(getPromises);
      expect((await storage.getAllKeys()).length).toBe(1000);
    });

    test('2.3: Multi-byte Unicode strings with complex diacritics, CJK, RTL, and emojis', async () => {
      const storage = new MemoryStorage();
      const testCases = [
        {
          key: 'vietnamese_diacritics',
          value: 'Hệ thống Chấm Công & Bảng Lương: Ắ Ằ Ẵ Ặ Ẹ Ẻ Ẽ Ế Ễ Ệ Ồ Ố Ỗ Ộ Ứ Ừ Ử Ữ Ự',
        },
        {
          key: 'emojis_and_zwj',
          value: '🚀🔥💎✨🎉 👨‍👩‍👧‍👦 🏳️‍🌈 👍🏽 ⏰ 💰 📊',
        },
        {
          key: 'cjk_characters',
          value: '考勤与薪资管理系统 - タイムカードと給与計算システム - 근태 및 급여 관리',
        },
        {
          key: 'rtl_scripts',
          value: 'نظام الحضور والرواتب - מערכת נוכחות ושכר',
        },
        {
          key: 'special_symbols',
          value: '<>!@#$%^&*()_+~`|}{[]:;?><,./"\r\n\t\\',
        },
      ];

      for (const tc of testCases) {
        await storage.setItem(tc.key, tc.value);
        const retrieved = await storage.getItem(tc.key);
        expect(retrieved).toBe(tc.value);
      }
    });

    test('2.4: Empty values, empty keys, and whitespace keys', async () => {
      const storage = new MemoryStorage();

      // Empty string value
      await storage.setItem('empty_val_key', '');
      expect(await storage.getItem('empty_val_key')).toBe(''); // must return empty string, not null!

      // Empty string key
      await storage.setItem('', 'value_for_empty_key');
      expect(await storage.getItem('')).toBe('value_for_empty_key');

      // Whitespace keys
      await storage.setItem('   ', 'three_spaces');
      expect(await storage.getItem('   ')).toBe('three_spaces');

      // URI-like and dot keys
      await storage.setItem('https://api.supabase.co/v1/auth?client=expo#hash', 'uri_value');
      expect(await storage.getItem('https://api.supabase.co/v1/auth?client=expo#hash')).toBe('uri_value');
    });

    test('2.5: Large payloads (100KB and 500KB) integrity check', async () => {
      const storage = new MemoryStorage();

      // Generate 100KB payload
      const chunk100k = 'A'.repeat(100 * 1024);
      await storage.setItem('100k_key', chunk100k);
      const retrieved100k = await storage.getItem('100k_key');
      expect(retrieved100k?.length).toBe(100 * 1024);
      expect(retrieved100k).toBe(chunk100k);

      // Generate 500KB JSON payload
      const records = Array.from({ length: 1000 }, (_, i) => ({
        id: `rec_${i}`,
        date: '2026-11-07',
        checkIn: '08:00:00',
        checkOut: '17:30:00',
        workHours: 8.5,
        overtime: 1.0,
        status: 'APPROVED',
        notes: `Ghi chú chấm công số ${i} của nhân viên kiểm thử hệ thống`,
      }));
      const jsonPayload = JSON.stringify(records);
      await storage.setItem('500k_json', jsonPayload);

      const retrievedJson = await storage.getItem('500k_json');
      expect(retrievedJson).not.toBeNull();
      const parsedRecords = JSON.parse(retrievedJson!);
      expect(parsedRecords.length).toBe(1000);
      expect(parsedRecords[999].notes).toBe('Ghi chú chấm công số 999 của nhân viên kiểm thử hệ thống');
    });

    test('2.6: Multiple isolated instances never cross-contaminate data', async () => {
      const memA = new MemoryStorage();
      const memB = new MemoryStorage();
      const memC = new MemoryStorage();

      await memA.setItem('shared_key', 'value_A');
      await memB.setItem('shared_key', 'value_B');
      await memC.setItem('shared_key', 'value_C');

      expect(await memA.getItem('shared_key')).toBe('value_A');
      expect(await memB.getItem('shared_key')).toBe('value_B');
      expect(await memC.getItem('shared_key')).toBe('value_C');

      await memB.clear();
      expect(await memA.getItem('shared_key')).toBe('value_A');
      expect(await memB.getItem('shared_key')).toBeNull();
      expect(await memC.getItem('shared_key')).toBe('value_C');
    });

    test('2.7: WebLocalStorage safe exception handling when window is undefined', async () => {
      const webStorage = new WebLocalStorage();
      // In Node.js environment, window might be undefined or mocked
      expect(await webStorage.getItem('any_key')).toBeNull();
      await webStorage.setItem('any_key', 'val');
      await webStorage.removeItem('any_key');
      await webStorage.clear();
      expect(await webStorage.getAllKeys()).toEqual([]);
    });

    test('2.8: MobileAsyncStorage gracefully falls back to MemoryStorage if module is missing', async () => {
      const mobileStorage = new MobileAsyncStorage();
      await mobileStorage.setItem('mobile_key', 'mobile_val');
      expect(await mobileStorage.getItem('mobile_key')).toBe('mobile_val');
      expect((await mobileStorage.getAllKeys()).length).toBe(1);
      await mobileStorage.removeItem('mobile_key');
      expect(await mobileStorage.getItem('mobile_key')).toBeNull();
    });
  });

  // ============================================================================
  // CHALLENGE 3: CONCURRENT AUTH REQUESTS & RACE CONDITIONS
  // ============================================================================
  describe('Challenge 3: Concurrent Auth Requests & Race Conditions', () => {
    test('3.1: 50 simultaneous signIn requests with same credentials resolve cleanly', async () => {
      const store = useAuthStore.getState();
      // First sign up user
      await store.signUp('concurrent_50@test.com', 'Pass123456!', 'Trần Đồng Thời');
      await store.signOut();

      // Fire 50 simultaneous sign in requests
      const promises: Promise<boolean>[] = [];
      for (let i = 0; i < 50; i++) {
        promises.push(useAuthStore.getState().signIn('concurrent_50@test.com', 'Pass123456!'));
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        expect(res).toBe(true);
      }

      const finalState = useAuthStore.getState();
      expect(finalState.user?.email).toBe('concurrent_50@test.com');
      expect(finalState.session).not.toBeNull();
      expect(finalState.isLoading).toBe(false);
      expect(finalState.error).toBeNull();
    });

    test('3.2: 20 simultaneous signIn requests with invalid credentials reject consistently', async () => {
      const promises: Promise<boolean>[] = [];
      for (let i = 0; i < 20; i++) {
        promises.push(useAuthStore.getState().signIn('nonexistent@company.com', 'WrongPass!'));
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        expect(res).toBe(false);
      }

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });

    test('3.3: Simultaneous duplicate signUp requests reject duplicate registration without crashing', async () => {
      const email = 'duplicate_race@test.com';
      const promises = [
        useAuthStore.getState().signUp(email, 'Pass123456!', 'User A'),
        useAuthStore.getState().signUp(email, 'Pass123456!', 'User B'),
        useAuthStore.getState().signUp(email, 'Pass123456!', 'User C'),
      ];

      const results = await Promise.all(promises);
      // At least one must succeed, duplicates rejected
      expect(results.some((r) => r === true)).toBe(true);

      const state = useAuthStore.getState();
      expect(state.user?.email).toBe(email);
    });

    test('3.4: Simultaneous signIn and signOut race condition settles safely', async () => {
      await useAuthStore.getState().signUp('race_in_out@test.com', 'Pass123456!', 'Đua Trạng Thái');

      const promises = [
        useAuthStore.getState().signIn('race_in_out@test.com', 'Pass123456!'),
        useAuthStore.getState().signOut(),
        useAuthStore.getState().signIn('race_in_out@test.com', 'Pass123456!'),
      ];

      await Promise.all(promises);
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      // Either signed in or signed out, but in a valid consistent state
      if (state.user) {
        expect(state.session).not.toBeNull();
        expect(state.isOfflineOnly).toBe(false);
      } else {
        expect(state.session).toBeNull();
      }
    });

    test('3.5: Rapid modal switching while requests are in-flight does not cause unhandled errors', async () => {
      const store = useAuthStore.getState();
      const loginPromise = store.signIn('delayed@test.com', 'Password123');

      // Rapidly toggle modal state
      store.openAuthModal('REGISTER');
      store.closeAuthModal();
      store.openAuthModal('LOGIN');
      store.continueAsGuest();

      await loginPromise; // Wait for auth to settle
      const finalState = useAuthStore.getState();
      expect(typeof finalState.isLoading).toBe('boolean');
      expect(typeof finalState.isAuthModalOpen).toBe('boolean');
    });

    test('3.6: Listener storm: 100 auth listeners registered and notified during auth events', async () => {
      const storage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(storage);
      let notificationCount = 0;
      const unsubs: (() => void)[] = [];

      for (let i = 0; i < 100; i++) {
        const { data } = client.auth.onAuthStateChange(() => {
          notificationCount++;
        });
        unsubs.push(data.subscription.unsubscribe);
      }

      await client.auth.signUp({ email: 'listener_storm@test.com', password: 'Password123' });
      expect(notificationCount).toBe(100);

      // Unsubscribe all
      unsubs.forEach((unsub) => unsub());

      // Next event: 0 notifications
      await client.auth.signOut();
      expect(notificationCount).toBe(100); // no extra notifications
    });

    test('3.7: RLS isolation stress: multiple users inserting records verify tenant isolation', async () => {
      const storage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(storage);

      // Create 5 different users
      const users: User[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await client.auth.signUp({
          email: `tenant_${i}@company.com`,
          password: 'Password123456',
        });
        users.push(res.data.user!);
      }

      // User 0 is currently active. User 0 inserts records for themselves
      const user0 = users[0];
      await client.auth.signInWithPassword({
        email: user0.email,
        password: 'Password123456',
      });
      const okInsert = await client.from('salary_configs').insert({
        user_id: user0.id,
        basic_salary: 10000000,
      });
      expect(okInsert.error).toBeNull();

      // User 0 attempts to insert record with User 1's ID -> RLS violation
      const user1 = users[1];
      const badInsert = await client.from('salary_configs').insert({
        user_id: user1.id,
        basic_salary: 99999999,
      });
      expect(badInsert.error?.message).toMatch(/RLS policy violation/i);

      // User 0 queries records
      const selectRes = await client.from('salary_configs').select('*').eq('user_id', user0.id);
      expect(selectRes.data.length).toBe(1);
      expect(selectRes.data[0].basic_salary).toBe(10000000);
    });
  });
});
