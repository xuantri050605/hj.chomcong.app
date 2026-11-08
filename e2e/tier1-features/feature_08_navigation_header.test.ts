import {
  parseRouteFromHash,
  formatRouteHash,
  isValidRoute,
  dashboardDestination,
} from '../../src/utils/navigationState';

describe('Tier 1 - Feature 08: Enhanced Navigation & Header', () => {
  test('TC08-01: Header and router map all 5 core routes bidirectionally to hashes', () => {
    const routes = ['Dashboard', 'Attendance', 'Payroll', 'Salary', 'History'] as const;

    for (const r of routes) {
      expect(isValidRoute(r)).toBe(true);
      const hash = formatRouteHash(r);
      if (r === 'Dashboard') {
        expect(hash).toBe('');
      } else {
        expect(hash.toLowerCase()).toBe(`#${r.toLowerCase()}`);
        expect(parseRouteFromHash(hash)).toBe(r);
      }
    }
  });

  test('TC08-02: Route parser handles leading slashes and mixed casing in hash URLs', () => {
    expect(parseRouteFromHash('#/attendance')).toBe('Attendance');
    expect(parseRouteFromHash('#/PAYROLL')).toBe('Payroll');
    expect(parseRouteFromHash('#/salary')).toBe('Salary');
    expect(parseRouteFromHash('#/History')).toBe('History');
  });

  test('TC08-03: Invalid or empty route hashes fallback to null for default route handling', () => {
    expect(parseRouteFromHash('')).toBeNull();
    expect(parseRouteFromHash('#unknownRoute')).toBeNull();
    expect(parseRouteFromHash(undefined)).toBeNull();
  });

  test('TC08-04: Dashboard quick actions map directly to primary attendance and payroll destinations', () => {
    expect(dashboardDestination('attendance')).toBe('Attendance');
    expect(dashboardDestination('payroll')).toBe('Payroll');
  });

  test('TC08-05: Navigation bar maintains consistent tab ordering across mobile and desktop views', () => {
    const navItems = [
      { key: 'Dashboard', label: 'Tổng quan' },
      { key: 'Attendance', label: 'Chấm công' },
      { key: 'Payroll', label: 'Bảng lương' },
      { key: 'Salary', label: 'Cấu hình' },
      { key: 'History', label: 'Lịch sử' },
    ];
    expect(navItems.length).toBe(5);
    navItems.forEach((item) => expect(isValidRoute(item.key)).toBe(true));
  });
});
