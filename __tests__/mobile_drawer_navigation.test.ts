jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: any) => obj.web || obj.default },
  StyleSheet: { create: (s: any) => s, absoluteFillObject: {} },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  Animated: {
    Value: jest.fn(() => ({
      interpolate: jest.fn(),
      _value: 0,
    })),
    timing: jest.fn(() => ({ start: jest.fn() })),
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  SafeAreaView: 'SafeAreaView',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

import {
  APP_ROUTES,
  AppRoute,
  dashboardDestination,
  formatRouteHash,
  isValidRoute,
  parseRouteFromHash,
} from '../src/utils/navigationState';
import { DRAWER_ITEMS } from '../src/components/MobileDrawer';
import { SIDEBAR_ITEMS } from '../src/components/AppSidebar';
import { BOTTOM_TABS } from '../src/components/BottomNavigation';

describe('Mobile Navigation & UI/UX Redesign (No Employees)', () => {
  it('defines exactly the 7 required routes in APP_ROUTES without Employees', () => {
    expect(APP_ROUTES).toEqual([
      'Dashboard',
      'Attendance',
      'Overtime',
      'Payroll',
      'Salary',
      'History',
      'Reports',
    ]);
  });

  it('DRAWER_ITEMS contains all 7 items without Nhân sự', () => {
    expect(DRAWER_ITEMS).toHaveLength(7);
    const labels = DRAWER_ITEMS.map((item) => item.label);
    expect(labels).toEqual([
      'Tổng quan',
      'Chấm công',
      'Tăng ca (OT)',
      'Bảng lương',
      'Cấu hình',
      'Lịch sử',
      'Báo cáo',
    ]);

    const keys = DRAWER_ITEMS.map((item) => item.key);
    expect(keys).toEqual([
      'Dashboard',
      'Attendance',
      'Overtime',
      'Payroll',
      'Salary',
      'History',
      'Reports',
    ]);
  });

  it('SIDEBAR_ITEMS matches the 7 routes for desktop synchronization', () => {
    expect(SIDEBAR_ITEMS).toHaveLength(7);
    expect(SIDEBAR_ITEMS.map((s) => s.key)).toEqual([
      'Dashboard',
      'Attendance',
      'Overtime',
      'Payroll',
      'Salary',
      'History',
      'Reports',
    ]);
  });

  it('BOTTOM_TABS defines 5 comfortable mobile tabs', () => {
    expect(BOTTOM_TABS).toHaveLength(5);
    expect(BOTTOM_TABS.map((t) => t.key)).toEqual([
      'Dashboard',
      'Attendance',
      'Overtime',
      'Payroll',
      'Menu',
    ]);
    expect(BOTTOM_TABS.map((t) => t.label)).toEqual([
      'Tổng quan',
      'Chấm công',
      'Tăng ca',
      'Bảng lương',
      'Thêm',
    ]);
  });

  it('correctly maps URL hashes for all routes', () => {
    expect(formatRouteHash('Dashboard')).toBe('');
    expect(formatRouteHash('Attendance')).toBe('#attendance');
    expect(formatRouteHash('Overtime')).toBe('#overtime');
    expect(formatRouteHash('Payroll')).toBe('#payroll');
    expect(formatRouteHash('Salary')).toBe('#salary');
    expect(formatRouteHash('History')).toBe('#history');
    expect(formatRouteHash('Reports')).toBe('#reports');

    expect(parseRouteFromHash('#attendance')).toBe('Attendance');
    expect(parseRouteFromHash('#payroll')).toBe('Payroll');
    expect(parseRouteFromHash('')).toBeNull();
  });

  it('validates routes using isValidRoute', () => {
    expect(isValidRoute('Dashboard')).toBe(true);
    expect(isValidRoute('Attendance')).toBe(true);
    expect(isValidRoute('Employees')).toBe(false);
    expect(isValidRoute('UnknownRoute')).toBe(false);
  });

  it('supports dashboardDestination for all valid subpages', () => {
    expect(dashboardDestination('attendance')).toBe('Attendance');
    expect(dashboardDestination('payroll')).toBe('Payroll');
    expect(dashboardDestination('overtime')).toBe('Overtime');
    expect(dashboardDestination('salary')).toBe('Salary');
    expect(dashboardDestination('history')).toBe('History');
    expect(dashboardDestination('reports')).toBe('Reports');
  });
});
