import {
  backToDashboard,
  dashboardDestination,
  parseRouteFromHash,
  formatRouteHash,
  isValidRoute,
} from '../src/utils/navigationState';

test('dashboard actions resolve to the existing Attendance and Payroll routes', () => {
  expect(dashboardDestination('attendance')).toBe('Attendance');
  expect(dashboardDestination('payroll')).toBe('Payroll');
});

test('back navigation does not require or mutate the shared month key', () => {
  const selectedMonth = '2026-09';
  expect(backToDashboard()).toBe('Dashboard');
  expect(selectedMonth).toBe('2026-09');
});

test('parseRouteFromHash handles valid hash strings and variants', () => {
  expect(parseRouteFromHash('#attendance')).toBe('Attendance');
  expect(parseRouteFromHash('#/attendance')).toBe('Attendance');
  expect(parseRouteFromHash('#Payroll')).toBe('Payroll');
  expect(parseRouteFromHash('#/SALARY')).toBe('Salary');
  expect(parseRouteFromHash('#history')).toBe('History');
  expect(parseRouteFromHash('#dashboard')).toBe('Dashboard');
});

test('parseRouteFromHash returns null for invalid or empty hashes', () => {
  expect(parseRouteFromHash('')).toBeNull();
  expect(parseRouteFromHash('#')).toBeNull();
  expect(parseRouteFromHash('#/')).toBeNull();
  expect(parseRouteFromHash('#unknownRoute')).toBeNull();
  expect(parseRouteFromHash(undefined)).toBeNull();
});

test('formatRouteHash formats routes into valid hash strings', () => {
  expect(formatRouteHash('Dashboard')).toBe('');
  expect(formatRouteHash('Attendance')).toBe('#attendance');
  expect(formatRouteHash('Payroll')).toBe('#payroll');
  expect(formatRouteHash('Salary')).toBe('#salary');
  expect(formatRouteHash('History')).toBe('#history');
});

test('isValidRoute correctly identifies valid AppRoute values', () => {
  expect(isValidRoute('Dashboard')).toBe(true);
  expect(isValidRoute('Attendance')).toBe(true);
  expect(isValidRoute('Payroll')).toBe(true);
  expect(isValidRoute('Salary')).toBe(true);
  expect(isValidRoute('History')).toBe(true);
  expect(isValidRoute('Invalid')).toBe(false);
  expect(isValidRoute('')).toBe(false);
});
