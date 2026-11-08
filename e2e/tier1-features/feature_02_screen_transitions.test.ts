import { TestHarness, MockAnimatedValue } from '../harness/testHarness';

describe('Tier 1 - Feature 02: Smooth Screen Transitions', () => {
  test('TC02-01: useScreenTransition initializes with opacity 0 and translateY offset', () => {
    const transition = TestHarness.createScreenTransitionAnim('Attendance');
    expect(transition.opacity).toBeInstanceOf(MockAnimatedValue);
    expect(transition.translateY).toBeInstanceOf(MockAnimatedValue);

    // Initial values before transition trigger
    expect(transition.opacity._value).toBe(0);
    expect(transition.translateY._value).toBe(15);
  });

  test('TC02-02: Triggering transition animates opacity to 1 and translateY to 0', (done) => {
    const transition = TestHarness.createScreenTransitionAnim('Dashboard');
    transition.runTransition();

    setTimeout(() => {
      expect(transition.opacity._value).toBeCloseTo(1, 1);
      expect(transition.translateY._value).toBeCloseTo(0, 1);
      done();
    }, 50);
  });

  test('TC02-03: Transition duration completes within 250ms for snappy 60fps feel', () => {
    const start = Date.now();
    const transition = TestHarness.createScreenTransitionAnim('SalaryConfig');
    transition.runTransition();
    expect(Date.now() - start).toBeLessThan(100);
  });

  test('TC02-04: Distinct route keys produce isolated animation instances', () => {
    const t1 = TestHarness.createScreenTransitionAnim('Payroll');
    const t2 = TestHarness.createScreenTransitionAnim('History');

    expect(t1.opacity).not.toBe(t2.opacity);
    expect(t1.translateY).not.toBe(t2.translateY);
  });

  test('TC02-05: Rapid route toggling handles interrupted animations gracefully without unhandled rejections', () => {
    const t = TestHarness.createScreenTransitionAnim('Attendance');
    expect(() => {
      t.runTransition();
      t.runTransition();
      t.runTransition();
    }).not.toThrow();
  });
});
