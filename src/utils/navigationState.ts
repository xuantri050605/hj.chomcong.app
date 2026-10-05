export type AppRoute = 'Dashboard' | 'Attendance' | 'Payroll' | 'Salary' | 'History';

/** Route-only transitions. Month belongs to the shared attendance store, never route params. */
export function dashboardDestination(action: 'attendance' | 'payroll'): AppRoute {
  return action === 'attendance' ? 'Attendance' : 'Payroll';
}

export function backToDashboard(): AppRoute {
  return 'Dashboard';
}
