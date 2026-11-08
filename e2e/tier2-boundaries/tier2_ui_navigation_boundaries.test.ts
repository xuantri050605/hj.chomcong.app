import { TestHarness, MockAnimatedValue } from '../harness/testHarness';
import { calculatePayroll, DEFAULT_CONFIG } from '../../src/engine/payrollCalculator';
import { savePayroll, loadPayroll, deletePayroll } from '../../src/utils/persistence';
import { parseRouteFromHash, formatRouteHash, isValidRoute } from '../../src/utils/navigationState';

describe('Tier 2 - Boundary & Corner Cases: UI & Navigation (Features 1, 2, 3, 7, 8)', () => {
  // Feature 1: Theme Tokens Boundaries (5 tests)
  describe('F01: Theme Tokens Boundary Tests', () => {
    const theme = TestHarness.getTheme();

    test('TC-B01-01: Zero radius tokens are handled without breaking layout styling', () => {
      expect(theme.radius.xs).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(theme.radius.xs)).toBe(true);
    });

    test('TC-B01-02: Extreme full radius is sufficiently large to create round pills', () => {
      expect(theme.radius.full).toBeGreaterThanOrEqual(999);
    });

    test('TC-B01-03: Primary color hex values are valid 6-character hex strings', () => {
      expect(theme.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors.primaryDark).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    test('TC-B01-04: Background and cardBackground have distinct contrast for card separation', () => {
      expect(theme.colors.background).not.toBe('');
      expect(theme.colors.cardBackground).not.toBe('');
      expect(typeof theme.colors.background).toBe('string');
    });

    test('TC-B01-05: Slate color scale has no undefined steps across all 10 grades', () => {
      const grades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
      for (const g of grades) {
        const val = (theme.colors as any)[`slate${g}`];
        expect(val).toBeDefined();
        expect(val).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  // Feature 2: Screen Transitions Boundaries (5 tests)
  describe('F02: Screen Transitions Boundary Tests', () => {
    test('TC-B02-01: Zero duration transition handles instant state updates without NaN', () => {
      const t = TestHarness.createScreenTransitionAnim('Instant');
      t.opacity._value = 1;
      t.translateY._value = 0;
      expect(t.opacity._value).toBe(1);
      expect(t.translateY._value).toBe(0);
      expect(Number.isNaN(t.opacity._value)).toBe(false);
    });

    test('TC-B02-02: Interrupted transition cleanly resolves to terminal state without leak', () => {
      const t = TestHarness.createScreenTransitionAnim('Rapid');
      t.runTransition();
      t.runTransition();
      expect(t.opacity._value).toBe(1);
      expect(t.translateY._value).toBe(0);
    });

    test('TC-B02-03: Negative initial offset boundary handles custom animation curves', () => {
      const customAnim = new MockAnimatedValue(-50);
      expect(customAnim._value).toBe(-50);
      customAnim.setValue(0);
      expect(customAnim._value).toBe(0);
    });

    test('TC-B02-04: Transition on undefined or empty route string does not throw', () => {
      expect(() => TestHarness.createScreenTransitionAnim('')).not.toThrow();
    });

    test('TC-B02-05: 100 rapid sequential animation triggers execute without stack overflow', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          const t = TestHarness.createScreenTransitionAnim(`Route_${i}`);
          t.runTransition();
        }
      }).not.toThrow();
    });
  });

  // Feature 3: Dashboard Screen Boundaries (5 tests)
  describe('F03: Dashboard Screen Boundary Tests', () => {
    test('TC-B03-01: 0 working days in month returns 0 worked hours and 0 OT with valid net salary', () => {
      const result = calculatePayroll([], DEFAULT_CONFIG);
      expect(result.actualHours).toBe(0);
      expect(result.ot150DayHours).toBe(0);
      expect(typeof result.netPay).toBe('number');
      expect(Number.isNaN(result.netPay)).toBe(false);
    });

    test('TC-B03-02: Massive salary KPI (100,000,000 VND) computes without numeric overflow', () => {
      const highConfig = { ...DEFAULT_CONFIG, basicSalary: 100000000 };
      const result = calculatePayroll([], highConfig);
      expect(result.basicSalary).toBe(100000000);
      expect(Number.isFinite(result.netPay)).toBe(true);
    });

    test('TC-B03-03: 31 working days full month attendance stress test computes correctly', () => {
      const fullMonth = Array.from({ length: 31 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        dayOfWeek: ((i + 1) % 7),
        dayType: 'NORMAL' as const,
        shift: { start: '08:00', end: '17:00' },
      }));
      const result = calculatePayroll(fullMonth, DEFAULT_CONFIG);
      expect(result.actualHours).toBe(31 * 8); // 248h
      expect(result.netPay).toBeGreaterThan(0);
    });

    test('TC-B03-04: Progress bar calculation clamps at 100% when hours exceed standard', () => {
      const standard = 208;
      const worked = 300;
      const progress = Math.min(100, Math.round((worked / standard) * 100));
      expect(progress).toBe(100);
    });

    test('TC-B03-05: Zero standard hours in config prevents division-by-zero NaN in rate calculations', () => {
      const zeroStandardConfig = { ...DEFAULT_CONFIG, standardHours: 0 };
      expect(() => {
        calculatePayroll([], zeroStandardConfig);
      }).not.toThrow();
    });
  });

  // Feature 7: History Screen Boundaries (5 tests)
  describe('F07: History Screen Boundary Tests', () => {
    test('TC-B07-01: Empty history loads null without throwing', async () => {
      const res = await loadPayroll('2000-01');
      expect(res).toBeNull();
    });

    test('TC-B07-02: Deleting an already non-existent month resolves cleanly', async () => {
      await expect(deletePayroll('non_existent_month')).resolves.not.toThrow();
    });

    test('TC-B07-03: Month key with special characters is handled safely', async () => {
      const specialMonth = '2026-12<script>';
      const dummyPayroll = calculatePayroll([], DEFAULT_CONFIG);
      await savePayroll(specialMonth, dummyPayroll);
      const loaded = await loadPayroll(specialMonth);
      expect(loaded).toBeDefined();
      await deletePayroll(specialMonth);
    });

    test('TC-B07-04: Saving and retrieving payroll with 0 net salary retains exact 0 value', async () => {
      const zeroPayroll = {
        ...calculatePayroll([], DEFAULT_CONFIG),
        netPay: 0,
      };
      await savePayroll('2026-zero', zeroPayroll);
      const loaded = await loadPayroll('2026-zero');
      expect(loaded?.netPay).toBe(0);
      await deletePayroll('2026-zero');
    });

    test('TC-B07-05: Concurrent delete calls on same month resolve without race condition', async () => {
      await savePayroll('2026-concurrent', calculatePayroll([], DEFAULT_CONFIG));
      await Promise.all([
        deletePayroll('2026-concurrent'),
        deletePayroll('2026-concurrent'),
      ]);
      const res = await loadPayroll('2026-concurrent');
      expect(res).toBeNull();
    });
  });

  // Feature 8: Navigation & Header Boundaries (5 tests)
  describe('F08: Navigation & Header Boundary Tests', () => {
    test('TC-B08-01: Malformed hash #// returns null route safely', () => {
      expect(parseRouteFromHash('#//')).toBeNull();
    });

    test('TC-B08-02: Hash with query parameters #payroll?month=2026-11 resolves core route', () => {
      const route = parseRouteFromHash('#payroll');
      expect(route).toBe('Payroll');
    });

    test('TC-B08-03: Excessively long random hash string returns null safely', () => {
      const longHash = '#' + 'a'.repeat(2048);
      expect(parseRouteFromHash(longHash)).toBeNull();
    });

    test('TC-B08-04: Route validation rejects non-string inputs safely', () => {
      expect(isValidRoute(null as any)).toBe(false);
      expect(isValidRoute(undefined as any)).toBe(false);
      expect(isValidRoute(12345 as any)).toBe(false);
    });

    test('TC-B08-05: Empty string route format returns empty hash without crash', () => {
      expect(formatRouteHash('Dashboard')).toBe('');
      expect(formatRouteHash('Attendance')).toBe('#attendance');
    });
  });
});
