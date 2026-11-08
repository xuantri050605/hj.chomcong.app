import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  useWindowDimensions,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Dashboard from './screens/Dashboard';
import AttendanceScreen from './screens/Attendance';
import OvertimeScreen from './screens/Overtime';
import PayrollResult from './screens/PayrollResult';
import EmployeesScreen from './screens/Employees';
import SalaryConfig from './screens/SalaryConfig';
import History from './screens/History';
import ReportsScreen from './screens/Reports';
import { useSalaryStore } from './store/salaryStore';
import { useAttendanceStore } from './store/attendanceStore';
import { useAuthStore } from './store/authStore';
import AppHeader from './components/AppHeader';
import AppSidebar from './components/AppSidebar';
import BottomNavigation from './components/BottomNavigation';
import AuthModal from './components/AuthModal';
import NotificationModal from './components/NotificationModal';
import SyncModal from './components/SyncModal';
import MigrationModal from './components/MigrationModal';
import HojeongWatermark from './components/HojeongWatermark';
import {
  AppRoute,
  backToDashboard,
  dashboardDestination,
  formatRouteHash,
  parseRouteFromHash,
} from './utils/navigationState';
import { theme } from './theme/theme';
import { useScreenTransition } from './hooks/useScreenTransition';

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      return parseRouteFromHash(window.location.hash) || 'Dashboard';
    }
    return 'Dashboard';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(3);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { style: transitionStyle } = useScreenTransition(route);

  const navigateTo = useCallback((newRoute: AppRoute) => {
    setRoute(newRoute);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      const targetHash = formatRouteHash(newRoute);
      if (window.location.hash !== targetHash) {
        if (!targetHash) {
          window.history.pushState(null, '', `${window.location.pathname}${window.location.search}`);
        } else {
          window.location.hash = targetHash;
        }
      }
    }
  }, []);

  const loadConfig = useSalaryStore((s) => s.loadConfig);
  const loadMonth = useAttendanceStore((s) => s.loadMonth);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const isAuthModalOpen = useAuthStore((s) => s.isAuthModalOpen);
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
  const authModalMode = useAuthStore((s) => s.authModalMode);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const isMigrationModalOpen = useAuthStore((s) => s.isMigrationModalOpen);
  const closeMigrationModal = useAuthStore((s) => s.closeMigrationModal);

  useEffect(() => {
    void loadConfig();
    void loadMonth();
    void initializeAuth();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const onHashChange = () => {
      const routeFromUrl = parseRouteFromHash(window.location.hash) || 'Dashboard';
      setRoute(routeFromUrl);
    };

    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.style.height = '100%';
        rootEl.style.overflow = 'hidden';
      }

      // Inject Google Font Plus Jakarta Sans
      const fontId = 'hojeong-google-fonts';
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,800;1,900&display=swap';
        document.head.appendChild(link);
      }

      // Inject global font-family rule without breaking vector icon fonts
      const styleId = 'hojeong-global-font-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html, body, #root, input, textarea, select, button {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          [style*="font-family: Ionicons"], [style*="font-family: ionicons"] {
            font-family: Ionicons !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const mobileNavItems = [
    { key: 'Dashboard', label: 'Tổng quan' },
    { key: 'Attendance', label: 'Chấm công' },
    { key: 'Overtime', label: 'Tăng ca' },
    { key: 'Payroll', label: 'Bảng lương' },
    { key: 'Salary', label: 'Cấu hình' },
    { key: 'History', label: 'Lịch sử' },
    { key: 'Reports', label: 'Báo cáo' },
  ];

  const getRouteTitle = (r: AppRoute) => {
    switch (r) {
      case 'Attendance':
        return 'Chấm công & Điểm danh';
      case 'Overtime':
        return 'Quản trị Tăng ca (OT)';
      case 'Payroll':
        return 'Bảng lương chi tiết';
      case 'Salary':
        return 'Cấu hình Lương & Chấm công';
      case 'History':
        return 'Lịch sử Biến động';
      case 'Reports':
        return 'Báo cáo & Thống kê';
      default:
        return 'Tổng quan';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />

      <View style={styles.appShell}>
        {/* Left Desktop Sidebar */}
        {isDesktop && (
          <AppSidebar
            activeRoute={route}
            onNavigate={navigateTo}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}

        {/* Right Main Application Area */}
        <View style={styles.mainWrapper}>
          {/* Subtle Enterprise Copyright Watermark */}
          <HojeongWatermark />

          {/* Top Header */}
          <AppHeader
            onToggleSidebar={isDesktop ? () => setIsSidebarCollapsed(!isSidebarCollapsed) : undefined}
            isSidebarCollapsed={isSidebarCollapsed}
            showLogo={!isDesktop}
            onOpenNotifications={() => setIsNotifModalOpen(true)}
            unreadCount={unreadNotifCount}
            onPressUser={() => openAuthModal()}
          />

          {/* Breadcrumb Header when inside a subpage */}
          {route !== 'Dashboard' && (
            <View style={styles.breadcrumbBar}>
              <TouchableOpacity
                accessibilityLabel="Quay lại Tổng quan"
                activeOpacity={0.7}
                onPress={() => navigateTo(backToDashboard())}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={15} color={theme.colors.primary} />
                <Text style={styles.backText}>Về Tổng quan</Text>
              </TouchableOpacity>
              <View style={styles.breadcrumbDivider}>
                <Text style={styles.dividerSlash}>/</Text>
                <Text style={styles.brandBreadcrumb}>HOJEONG</Text>
                <Text style={styles.dividerSlash}>/</Text>
                <Text style={styles.currentRouteText}>{getRouteTitle(route)}</Text>
              </View>
            </View>
          )}

          {/* Dynamic Screen Container */}
          <View style={styles.screenScrollArea}>
            <Animated.View style={[styles.screenContainer, transitionStyle]}>
              {route === 'Dashboard' && (
                <Dashboard
                  onOpenAttendance={() => navigateTo('Attendance')}
                  onOpenPayroll={() => navigateTo('Payroll')}
                  onOpenNotifications={() => setIsNotifModalOpen(true)}
                />
              )}
              {route === 'Attendance' && <AttendanceScreen />}
              {route === 'Overtime' && <OvertimeScreen />}
              {route === 'Payroll' && <PayrollResult />}
              {route === 'Salary' && <SalaryConfig />}
              {route === 'History' && <History onOpenPayroll={() => navigateTo('Payroll')} />}
              {route === 'Reports' && <ReportsScreen />}
            </Animated.View>
          </View>

          {/* Mobile Bottom Navigation */}
          {!isDesktop && (
            <BottomNavigation
              items={mobileNavItems}
              activeKey={route}
              onSelect={(k) => navigateTo(k as AppRoute)}
            />
          )}
        </View>
      </View>

      {/* Notification Center Modal */}
      <NotificationModal
        visible={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        onNotificationsCountChange={setUnreadNotifCount}
      />

      {/* Cloud Sync Status Modal */}
      <SyncModal />

      {/* Auth Modal */}
      <AuthModal
        visible={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
      />

      {/* Legacy SQLite / Local Data Migration Modal */}
      <MigrationModal
        visible={isMigrationModalOpen}
        onClose={closeMigrationModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    ...Platform.select({
      web: {
        height: '100vh' as any,
        maxHeight: '100vh' as any,
        overflow: 'hidden',
      },
      default: {
        height: '100%',
      },
    }),
  },
  appShell: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  mainWrapper: {
    flex: 1,
    height: '100%',
    flexDirection: 'column',
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
    position: 'relative',
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    paddingVertical: 4,
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
    fontSize: 13,
  },
  brandBreadcrumb: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  currentRouteText: {
    color: theme.colors.slate700,
    fontSize: 12,
    fontWeight: '700',
  },
  screenScrollArea: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  screenContainer: {
    flex: 1,
    width: '100%',
  },
});
