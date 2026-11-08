import { TestHarness } from '../harness/testHarness';

describe('Tier 1 - Feature 10: Supabase Auth State (useAuthStore)', () => {
  let authStore: ReturnType<typeof TestHarness.getAuthStore>;

  beforeEach(() => {
    TestHarness.reset();
    authStore = TestHarness.getAuthStore();
  });

  test('TC10-01: Auth store initializes with null user, null session, and not loading', () => {
    expect(authStore.user).toBeNull();
    expect(authStore.session).toBeNull();
    expect(authStore.isLoading).toBe(false);
    expect(authStore.error).toBeNull();
  });

  test('TC10-02: Successful registration (signUp) populates user, session, and clears loading', async () => {
    const success = await authStore.signUp('nhanvien@example.com', 'SecurePass123!', 'Nguyễn Văn A');
    expect(success).toBe(true);
    expect(authStore.user).toBeDefined();
    expect(authStore.user?.email).toBe('nhanvien@example.com');
    expect(authStore.user?.fullName).toBe('Nguyễn Văn A');
    expect(authStore.session).toBeDefined();
    expect(authStore.session?.accessToken).toBeDefined();
    expect(authStore.error).toBeNull();
  });

  test('TC10-03: Successful sign-in authenticates previously registered user', async () => {
    await authStore.signUp('ketoan@example.com', 'PassKetoan123', 'Trần Thị B');
    await authStore.signOut();
    expect(authStore.user).toBeNull();

    const signedIn = await authStore.signIn('ketoan@example.com', 'PassKetoan123');
    expect(signedIn).toBe(true);
    expect(authStore.user?.email).toBe('ketoan@example.com');
  });

  test('TC10-04: Failed sign-in records error message and maintains null user', async () => {
    const signedIn = await authStore.signIn('unknown@example.com', 'wrongpassword');
    expect(signedIn).toBe(false);
    expect(authStore.user).toBeNull();
    expect(authStore.error).toBeTruthy();
  });

  test('TC10-05: clearError removes active error message from state', async () => {
    await authStore.signIn('invalid@test.com', 'badpass');
    expect(authStore.error).not.toBeNull();

    authStore.clearError();
    expect(authStore.error).toBeNull();
  });

  test('TC10-06: signOut purges user profile and active session', async () => {
    await authStore.signUp('logout_test@example.com', 'Pass123456');
    expect(authStore.user).not.toBeNull();

    await authStore.signOut();
    expect(authStore.user).toBeNull();
    expect(authStore.session).toBeNull();
  });
});
