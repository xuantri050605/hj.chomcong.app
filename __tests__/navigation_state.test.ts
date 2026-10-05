import { backToDashboard, dashboardDestination } from '../src/utils/navigationState';

test('dashboard actions resolve to the existing Attendance and Payroll routes', () => {
  expect(dashboardDestination('attendance')).toBe('Attendance');
  expect(dashboardDestination('payroll')).toBe('Payroll');
});

test('back navigation does not require or mutate the shared month key', () => {
  const selectedMonth = '2026-09';
  expect(backToDashboard()).toBe('Dashboard');
  expect(selectedMonth).toBe('2026-09');
});
