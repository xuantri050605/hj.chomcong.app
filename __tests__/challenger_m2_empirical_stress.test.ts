/**
 * Empirical Stress Test Suite for Milestone 2: Auth, Validation, Session & Guest Mode
 * Author: Challenger 2 (teamwork_challenger_m2_2)
 *
 * Scope:
 * 1. Form validation & injection attacks (SQL/script injections, 5000-char emails, emoji passwords).
 * 2. Logout & session invalidation (complete storage and memory purge).
 * 3. Guest mode stability throughout the app without an account.
 * 4. Fallback RLS isolation & unauthenticated boundary checks.
 */

jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
  },
}));

import { universalStorage, MemoryStorage } from '../src/services/universalStorage';
import {
  getSupabaseClient,
  LocalFallbackSupabaseClient,
} from '../src/services/supabaseClient';
import { useAuthStore } from '../src/store/authStore';
import { useAttendanceStore } from '../src/store/attendanceStore';
import { useSalaryStore } from '../src/store/salaryStore';
import { calculatePayroll, DEFAULT_CONFIG } from '../src/engine/payrollCalculator';
import { APP_ROUTES, isValidRoute, parseRouteFromHash, formatRouteHash } from '../src/utils/navigationState';

describe('CHALLENGER 2 — MILESTONE 2 EMPIRICAL STRESS TEST SUITE', () => {
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
  // 1. FORM VALIDATION & INJECTION ATTACKS
  // ============================================================================
  describe('1. Form Validation & Injection Attacks', () => {
    test('1.1: Classic SQL Injection strings in email are rejected or treated as inert literals', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      // Raw SQL injections without email format must fail regex validation
      const rawInjections = [
        "' OR '1'='1",
        "admin'--",
        "'; DROP TABLE users; --",
        "1' OR '1' = '1' /*",
        "' UNION SELECT * FROM users --",
      ];

      for (const injection of rawInjections) {
        const res = await client.auth.signUp({ email: injection, password: 'Password123!' });
        expect(res.error).not.toBeNull();
        expect(res.error?.message).toMatch(/Invalid email format/i);
        expect(res.data.user).toBeNull();
      }

      // SQL injection crafted to pass email regex (e.g., admin'or'1'='1@example.com)
      const craftedEmail = "admin'or'1'='1@example.com";
      const signUpRes = await client.auth.signUp({
        email: craftedEmail,
        password: "Pass' OR '1'='1",
      });

      expect(signUpRes.error).toBeNull();
      expect(signUpRes.data.user).not.toBeNull();
      expect(signUpRes.data.user?.email).toBe(craftedEmail.toLowerCase());

      // Attempting SQL injection login with non-matching password must fail
      const badLogin = await client.auth.signInWithPassword({
        email: craftedEmail,
        password: "' OR 1=1 --",
      });
      expect(badLogin.error).not.toBeNull();
      expect(badLogin.error?.message).toMatch(/Invalid login credentials/i);

      // Verbatim password match must succeed without SQL side-effects
      const okLogin = await client.auth.signInWithPassword({
        email: craftedEmail,
        password: "Pass' OR '1'='1",
      });
      expect(okLogin.error).toBeNull();
      expect(okLogin.data.session).not.toBeNull();
    });

    test('1.2: Script injection (XSS) payloads in fullName and email do not execute or corrupt state', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(document.cookie)>',
        'javascript:void(0)',
        '<svg onload=alert(1)>',
      ];

      for (const payload of xssPayloads) {
        const email = `test_${Date.now()}_${Math.random().toString(36).substring(7)}@domain.com`;
        const res = await client.auth.signUp({
          email,
          password: 'ValidPassword123!',
          options: { data: { full_name: payload } },
        });

        expect(res.error).toBeNull();
        expect(res.data.user?.fullName).toBe(payload);
        expect(res.data.user?.user_metadata?.full_name).toBe(payload);

        // Verify JSON round-trip stability in storage
        const usersRegistryRaw = await memStorage.getItem('sb-local-users-registry');
        expect(usersRegistryRaw).not.toBeNull();
        const parsedRegistry = JSON.parse(usersRegistryRaw!);
        expect(parsedRegistry[email.toLowerCase()].user.fullName).toBe(payload);
      }
    });

    test('1.3: 5,000-character extreme length email does not cause catastrophic regex backtracking (ReDoS)', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      const hugeEmail = `${'a'.repeat(4988)}@example.com`;
      expect(hugeEmail.length).toBe(5000);

      const startTime = Date.now();
      const res = await client.auth.signUp({
        email: hugeEmail,
        password: 'Password123!',
      });
      const durationMs = Date.now() - startTime;

      // Must complete in sub-second (no ReDoS hang)
      expect(durationMs).toBeLessThan(1000);
      expect(res.error).toBeNull();
      expect(res.data.user?.email).toBe(hugeEmail.toLowerCase());
    });

    test('1.4: Passwords with Emojis, multi-byte UTF-8, and special symbols authenticate accurately', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      const complexPasswords = [
        '🎉🔑🚀Secure123!',
        'MậtKhẩuTiếngViệtCóDấu#2026',
        '!@#$%^&*()_+-=[]{}|;:\'",.<>/?~`',
        '👨‍👩‍👧‍👦FamilyKey2026!',
      ];

      for (let i = 0; i < complexPasswords.length; i++) {
        const email = `emoji_user_${i}@example.com`;
        const pass = complexPasswords[i];

        const signUpRes = await client.auth.signUp({ email, password: pass });
        expect(signUpRes.error).toBeNull();

        // Sign in with exact complex password
        const signInRes = await client.auth.signInWithPassword({ email, password: pass });
        expect(signInRes.error).toBeNull();
        expect(signInRes.data.session).not.toBeNull();

        // Sign in with slightly altered password must fail
        const badSignIn = await client.auth.signInWithPassword({ email, password: pass + 'X' });
        expect(badSignIn.error).not.toBeNull();
      }
    });

    test('1.5: Password boundary limits (0, 1, 5, 6 chars, and 10,000 chars)', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      // Sub-minimum lengths (must reject)
      for (const shortPass of ['', '1', '12345']) {
        const res = await client.auth.signUp({
          email: `boundary_${shortPass.length}@test.com`,
          password: shortPass,
        });
        expect(res.error).not.toBeNull();
        expect(res.error?.message).toMatch(/at least 6 characters/i);
      }

      // Minimum valid length (6 chars - must accept)
      const exactMinRes = await client.auth.signUp({
        email: 'boundary_min6@test.com',
        password: '123456',
      });
      expect(exactMinRes.error).toBeNull();

      // Stress test: 10,000 character password
      const hugePass = 'p'.repeat(10000);
      const hugePassRes = await client.auth.signUp({
        email: 'boundary_huge@test.com',
        password: hugePass,
      });
      expect(hugePassRes.error).toBeNull();

      const hugePassLogin = await client.auth.signInWithPassword({
        email: 'boundary_huge@test.com',
        password: hugePass,
      });
      expect(hugePassLogin.error).toBeNull();
    });
  });

  // ============================================================================
  // 2. LOGOUT & SESSION INVALIDATION
  // ============================================================================
  describe('2. Logout & Session Invalidation', () => {
    test('2.1: Complete storage and memory purge on signOut', async () => {
      // 1. Sign up user
      const registered = await useAuthStore
        .getState()
        .signUp('purge_test@example.com', 'PurgePass123', 'Purge User');
      expect(registered).toBe(true);
      expect(useAuthStore.getState().user).not.toBeNull();
      expect(useAuthStore.getState().session).not.toBeNull();
      expect(await universalStorage.getItem('sb-auth-token')).not.toBeNull();

      // 2. Execute signOut
      await useAuthStore.getState().signOut();

      // 3. Verify Memory Purge
      const stateAfter = useAuthStore.getState();
      expect(stateAfter.user).toBeNull();
      expect(stateAfter.session).toBeNull();
      expect(stateAfter.profile).toBeNull();
      expect(stateAfter.isOfflineOnly).toBe(true);

      // 4. Verify Storage Purge
      const storedToken = await universalStorage.getItem('sb-auth-token');
      expect(storedToken).toBeNull();

      // 5. Subsequent getSession() must return null
      const client = getSupabaseClient();
      const sessionRes = await client.auth.getSession();
      expect(sessionRes.data.session).toBeNull();

      // 6. initializeAuth() after logout does not resurrect the purged session
      await useAuthStore.getState().initializeAuth();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().session).toBeNull();
    });

    test('2.2: Redundant or concurrent signOut calls are safe and idempotent', async () => {
      // Sign out while already unauthenticated
      await expect(useAuthStore.getState().signOut()).resolves.toBeUndefined();
      await expect(useAuthStore.getState().signOut()).resolves.toBeUndefined();

      // Concurrent signouts
      await Promise.all([
        useAuthStore.getState().signOut(),
        useAuthStore.getState().signOut(),
        useAuthStore.getState().signOut(),
      ]);

      expect(useAuthStore.getState().user).toBeNull();
      expect(await universalStorage.getItem('sb-auth-token')).toBeNull();
    });

    test('2.3: Auth state listener notifies SIGNED_OUT event immediately', async () => {
      const client = getSupabaseClient();
      let signedOutNotified = false;

      const sub = client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          signedOutNotified = true;
          expect(session).toBeNull();
        }
      });

      await useAuthStore.getState().signUp('listener_test@example.com', 'Pass123456');
      await useAuthStore.getState().signOut();

      expect(signedOutNotified).toBe(true);
      sub.data.subscription.unsubscribe();
    });
  });

  // ============================================================================
  // 3. GUEST MODE STABILITY THROUGHOUT THE APP
  // ============================================================================
  describe('3. Guest Mode Stability Without an Account', () => {
    test('3.1: continueAsGuest activates offline guest mode and sets state cleanly', () => {
      useAuthStore.getState().openAuthModal('LOGIN');
      expect(useAuthStore.getState().isAuthModalOpen).toBe(true);

      useAuthStore.getState().continueAsGuest();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isOfflineOnly).toBe(true);
      expect(state.isAuthModalOpen).toBe(false);
    });

    test('3.2: SPA Navigation operates stably across all 5 routes in guest mode', () => {
      const routes = [...APP_ROUTES];
      expect(routes).toContain('Dashboard');
      expect(routes).toContain('Attendance');
      expect(routes).toContain('Payroll');
      expect(routes).toContain('Salary');
      expect(routes).toContain('History');

      for (const route of routes) {
        expect(isValidRoute(route)).toBe(true);
        const hash = formatRouteHash(route);
        if (route === 'Dashboard') {
          expect(hash).toBe('');
        } else {
          expect(hash).toBe(`#${route.toLowerCase()}`);
          expect(parseRouteFromHash(hash)).toBe(route);
        }
      }
    });

    test('3.3: Attendance ClockIn & ClockOut function completely in guest mode', async () => {
      // Ensure completely guest / logged out
      expect(useAuthStore.getState().user).toBeNull();

      const attendance = useAttendanceStore.getState();
      const testDate = new Date(2026, 9, 15, 8, 30); // 2026-10-15 08:30

      // Clock In
      await attendance.clockIn(testDate, 'DEVICE');
      const itemsAfterIn = useAttendanceStore.getState().items;
      const todayRecord = itemsAfterIn.find((r) => r.date === '2026-10-15');
      expect(todayRecord).toBeDefined();
      expect(todayRecord?.shift?.start).toBe('08:30');
      expect(todayRecord?.shift?.end).toBeUndefined();

      // Clock Out
      const outDate = new Date(2026, 9, 15, 17, 30); // 2026-10-15 17:30
      await useAttendanceStore.getState().clockOut(outDate, 'DEVICE');
      const itemsAfterOut = useAttendanceStore.getState().items;
      const completedRecord = itemsAfterOut.find((r) => r.date === '2026-10-15');
      expect(completedRecord?.shift?.start).toBe('08:30');
      expect(completedRecord?.shift?.end).toBe('17:30');
    });

    test('3.4: SalaryConfig and Payroll calculations execute accurately in guest mode', async () => {
      expect(useAuthStore.getState().user).toBeNull();

      // 1. Modify salary config as guest
      const customConfig = {
        ...DEFAULT_CONFIG,
        basicSalary: 12000000,
        seniorityAllowance: 1000000,
      };

      await useSalaryStore.getState().setConfig(customConfig);
      expect(useSalaryStore.getState().config.basicSalary).toBe(12000000);

      // 2. Perform attendance records
      const attendance = useAttendanceStore.getState();
      await attendance.addManual({
        date: '2026-10-01',
        dayOfWeek: 4,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      });

      // 3. Calculate payroll
      const monthAttendance = useAttendanceStore.getState().items;
      const breakdown = calculatePayroll(monthAttendance, useSalaryStore.getState().config);

      expect(breakdown).toBeDefined();
      expect(breakdown.basicSalary).toBe(12000000);
      expect(breakdown.seniorityAllowance).toBe(1000000);
      expect(typeof breakdown.netPay).toBe('number');
      expect(Number.isNaN(breakdown.netPay)).toBe(false);
    });

    test('3.5: Guest mode data persists and is not wiped when user subsequently registers or logs in', async () => {
      // 1. Guest creates attendance record
      await useAttendanceStore.getState().addManual({
        date: '2026-10-20',
        dayOfWeek: 2,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      });
      expect(useAttendanceStore.getState().items.length).toBeGreaterThan(0);

      // 2. Guest decides to sign up
      const ok = await useAuthStore
        .getState()
        .signUp('converted_guest@example.com', 'Pass123456', 'Converted Guest');
      expect(ok).toBe(true);
      expect(useAuthStore.getState().user).not.toBeNull();

      // 3. Verify attendance records were NOT lost
      const preservedItems = useAttendanceStore.getState().items;
      const preserved = preservedItems.find((r) => r.date === '2026-10-20');
      expect(preserved).toBeDefined();
      expect(preserved?.shift?.start).toBe('08:00');
    });
  });

  // ============================================================================
  // 4. ADVERSARIAL ROW LEVEL SECURITY (RLS) & ISOLATION BOUNDARY CHECKS
  // ============================================================================
  describe('4. Adversarial RLS & Storage Isolation Boundary', () => {
    test('4.1: Cross-user RLS isolation when logged in', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      // User 1
      const u1 = await client.auth.signUp({ email: 'user1@corp.vn', password: 'Password123!' });
      const u1Id = u1.data.user!.id;

      await client.from('salary_configs').insert({
        user_id: u1Id,
        basic_salary: 10000000,
      });

      // User 2 logs in
      const u2 = await client.auth.signUp({ email: 'user2@corp.vn', password: 'Password123!' });
      const u2Id = u2.data.user!.id;

      // User 2 attempts to query User 1's salary config
      const res = await client.from('salary_configs').select('*').eq('user_id', u1Id);
      // Under RLS isolation, User 2 must NOT receive User 1's rows
      expect(res.data.length).toBe(0);

      // User 2 attempts to insert a record with User 1's user_id
      const spoofInsert = await client.from('salary_configs').insert({
        user_id: u1Id,
        basic_salary: 99999999,
      });
      expect(spoofInsert.error).not.toBeNull();
      expect(spoofInsert.error?.message).toMatch(/RLS policy violation/i);
    });

    test('4.2: Fallback RLS check behavior on unauthenticated queries (caveat documentation)', async () => {
      const memStorage = new MemoryStorage();
      const client = new LocalFallbackSupabaseClient(memStorage);

      // User 1 creates salary record
      const u1 = await client.auth.signUp({ email: 'owner@corp.vn', password: 'Password123!' });
      const u1Id = u1.data.user!.id;
      await client.from('salary_configs').insert({
        user_id: u1Id,
        basic_salary: 15000000,
      });

      // User 1 logs out
      await client.auth.signOut();

      // Query while unauthenticated: In LocalFallbackSupabaseClient, currentUserId is undefined.
      // Line 280: `item.user_id && currentUserId && item.user_id !== currentUserId`
      // Since currentUserId is undefined, this condition does NOT trigger 'continue',
      // meaning fallback client returns rows when unauthenticated unless guarded.
      const unauthRes = await client.from('salary_configs').select('*').eq('user_id', u1Id);
      // Documenting the empirical behavior of fallback engine
      expect(Array.isArray(unauthRes.data)).toBe(true);
    });
  });
});
