import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, StyleSheet, Dimensions, Text, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Dashboard from './screens/Dashboard';
import AttendanceScreen from './screens/Attendance';
import SalaryConfig from './screens/SalaryConfig';
import PayrollResult from './screens/PayrollResult';
import History from './screens/History';
import { useSalaryStore } from './store/salaryStore';
import { useAttendanceStore } from './store/attendanceStore';
import AppHeader from './components/AppHeader';
import BottomNavigation from './components/BottomNavigation';
import { AppRoute, backToDashboard, dashboardDestination } from './utils/navigationState';
import { theme } from './theme/theme';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('Dashboard');
  const loadConfig = useSalaryStore((s) => s.loadConfig);
  const loadMonth = useAttendanceStore((s) => s.loadMonth);

  useEffect(() => {
    void loadConfig();
    void loadMonth();
  }, []);

  const items = [
    { key: 'Dashboard', label: 'Tổng quan' },
    { key: 'Attendance', label: 'Chấm công' },
    { key: 'Payroll', label: 'Bảng lương' },
    { key: 'Salary', label: 'Cấu hình' },
    { key: 'History', label: 'Lịch sử' },
  ];

  const getRouteTitle = (r: AppRoute) => {
    switch (r) {
      case 'Attendance':
        return 'Lịch chấm công';
      case 'Payroll':
        return 'Bảng lương chi tiết';
      case 'Salary':
        return 'Cấu hình lương';
      case 'History':
        return 'Lịch sử bảng lương';
      default:
        return 'Tổng quan';
    }
  };

  const { width } = Dimensions.get('window');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      <AppHeader title="CHẤM CÔNG PRO" user="Nguyễn Xuân Trí" />

      <View style={styles.container}>
        <View style={[styles.content, { maxWidth: Math.min(1200, width) }]}>
          {route !== 'Dashboard' && (
            <View style={styles.backNav}>
              <TouchableOpacity
                accessibilityLabel="Quay lại Tổng quan"
                activeOpacity={0.7}
                onPress={() => setRoute(backToDashboard())}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={16} color={theme.colors.primary} />
                <Text style={styles.backText}>Về Tổng quan</Text>
              </TouchableOpacity>
              <View style={styles.breadcrumbDivider}>
                <Text style={styles.dividerSlash}>/</Text>
                <Text style={styles.currentRouteText}>{getRouteTitle(route)}</Text>
              </View>
            </View>
          )}

          {route === 'Dashboard' && (
            <Dashboard
              onOpenAttendance={() => setRoute(dashboardDestination('attendance'))}
              onOpenPayroll={() => setRoute(dashboardDestination('payroll'))}
            />
          )}
          {route === 'Attendance' && <AttendanceScreen />}
          {route === 'Payroll' && <PayrollResult />}
          {route === 'Salary' && <SalaryConfig />}
          {route === 'History' && <History onOpenPayroll={() => setRoute('Payroll')} />}
        </View>
      </View>

      <BottomNavigation items={items} activeKey={route} onSelect={(k) => setRoute(k as AppRoute)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    width: '100%',
  },
  backNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    gap: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
    gap: 4,
  },
  backText: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  breadcrumbDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerSlash: {
    color: theme.colors.slate300,
    fontSize: 14,
  },
  currentRouteText: {
    color: theme.colors.slate600,
    fontSize: 12,
    fontWeight: '700',
  },
});
