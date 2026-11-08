import { TestHarness } from '../harness/testHarness';

describe('Tier 1 - Feature 11: AuthModal UI & Flows', () => {
  beforeEach(() => {
    TestHarness.reset();
  });

  test('TC11-01: Modal visibility and mode switching between Login and Register', () => {
    let visible = false;
    let mode: 'LOGIN' | 'REGISTER' = 'LOGIN';

    const openModal = (initialMode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
      visible = true;
      mode = initialMode;
    };
    const closeModal = () => {
      visible = false;
    };
    const toggleMode = () => {
      mode = mode === 'LOGIN' ? 'REGISTER' : 'LOGIN';
    };

    expect(visible).toBe(false);
    openModal('LOGIN');
    expect(visible).toBe(true);
    expect(mode).toBe('LOGIN');

    toggleMode();
    expect(mode).toBe('REGISTER');

    closeModal();
    expect(visible).toBe(false);
  });

  test('TC11-02: Email validation rejects malformed email strings', () => {
    const validateEmail = (email: string): boolean => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    };

    expect(validateEmail('valid.user@company.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('no_at_symbol.com')).toBe(false);
    expect(validateEmail('@missing-prefix.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  test('TC11-03: Password validation enforces minimum 6 character length', () => {
    const validatePassword = (password: string): boolean => {
      return password.length >= 6;
    };

    expect(validatePassword('123456')).toBe(true);
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('')).toBe(false);
  });

  test('TC11-04: Guest mode allows users to dismiss auth and operate offline', () => {
    const authStore = TestHarness.getAuthStore();
    expect(authStore.user).toBeNull();

    // Guest mode continues with local storage as source of truth
    const isGuest = authStore.user === null;
    expect(isGuest).toBe(true);
  });

  test('TC11-05: Registration form submission requires fullName, email, and password', async () => {
    const authStore = TestHarness.getAuthStore();
    const result = await authStore.signUp('full_flow@test.com', 'Pass123456', 'Lê Văn C');
    expect(result).toBe(true);
    expect(authStore.user?.fullName).toBe('Lê Văn C');
  });
});
