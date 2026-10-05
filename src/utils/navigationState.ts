export type AppRoute = 'Dashboard' | 'Attendance' | 'Payroll' | 'Salary' | 'History';

export const APP_ROUTES: readonly AppRoute[] = ['Dashboard', 'Attendance', 'Payroll', 'Salary', 'History'] as const;

/** Route-only transitions. Month belongs to the shared attendance store, never route params. */
export function dashboardDestination(action: 'attendance' | 'payroll'): AppRoute {
  return action === 'attendance' ? 'Attendance' : 'Payroll';
}

export function backToDashboard(): AppRoute {
  return 'Dashboard';
}

export function isValidRoute(r: string): r is AppRoute {
  return (APP_ROUTES as readonly string[]).includes(r);
}

/** Parses a URL hash (e.g. #attendance or #/payroll) into a valid AppRoute */
export function parseRouteFromHash(hash?: string): AppRoute | null {
  if (!hash) return null;
  const clean = hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (!clean) return null;
  const match = APP_ROUTES.find((r) => r.toLowerCase() === clean);
  return match || null;
}

/** Formats an AppRoute into a URL hash suitable for web SPAs on GitHub Pages */
export function formatRouteHash(route: AppRoute): string {
  return route === 'Dashboard' ? '' : `#${route.toLowerCase()}`;
}
