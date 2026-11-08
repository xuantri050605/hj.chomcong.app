jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
  },
  Alert: {
    alert: jest.fn(),
  },
}));

import { useAuthStore } from '../src/store/authStore';
import { useAttendanceStore } from '../src/store/attendanceStore';
import { useSalaryStore } from '../src/store/salaryStore';
import { universalStorage } from '../src/services/universalStorage';

describe('Phase 2 & Phase 3: Multi-Account Authentication & Data Isolation', () => {
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
      isMigrationModalOpen: false,
      legacySummary: null,
    });
    useAttendanceStore.setState({ items: [] });
  });

  test('1. User registration creates private workspace and session', async () => {
    const emailA = 'account_a@hojeong.vn';
    const pass = 'password123';
    const nameA = 'Nhân viên A';

    const success = await useAuthStore.getState().signUp(emailA, pass, nameA);
    expect(success).toBe(true);

    const currentUser = useAuthStore.getState().user;
    expect(currentUser).not.toBeNull();
    expect(currentUser?.email).toBe(emailA);
    expect(currentUser?.fullName).toBe(nameA);
  });

  test('2. Logout clears in-memory stores and prevents data leakage across accounts', async () => {
    // 1. Account A logs in and has attendance in memory
    const emailA = 'alice@hojeong.vn';
    await useAuthStore.getState().signUp(emailA, 'passAlice123', 'Alice Nguyen');

    useAttendanceStore.setState({
      items: [
        {
          date: '2026-11-05',
          dayOfWeek: 4,
          dayType: 'NORMAL',
          shift: { start: '08:00', end: '17:00' },
        },
      ],
    });

    expect(useAttendanceStore.getState().items.length).toBe(1);

    // 2. Account A signs out
    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
    // Verify store isolation: items must be cleared
    expect(useAttendanceStore.getState().items.length).toBe(0);

    // 3. Account B logs in
    const emailB = 'bob@hojeong.vn';
    await useAuthStore.getState().signUp(emailB, 'passBob12345', 'Bob Tran');

    expect(useAuthStore.getState().user?.email).toBe(emailB);
    // Bob must start with clean isolated store, not Alice's items
    expect(useAttendanceStore.getState().items.length).toBe(0);
  });

  test('3. Password reset request succeeds for registered email', async () => {
    const email = 'user_reset@hojeong.vn';
    await useAuthStore.getState().signUp(email, 'secret123', 'User Reset');

    const resetSuccess = await useAuthStore.getState().resetPassword(email);
    expect(resetSuccess).toBe(true);
  });
});
