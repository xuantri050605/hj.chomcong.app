import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { AppRoute } from '../utils/navigationState';
import HojeongLogo from './HojeongLogo';
import { useAuthStore } from '../store/authStore';

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export interface DrawerItem {
  key: AppRoute;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
}

export const DRAWER_ITEMS: DrawerItem[] = [
  { key: 'Dashboard', label: 'Tổng quan', icon: 'home-outline' },
  { key: 'Attendance', label: 'Chấm công', icon: 'calendar-outline' },
  { key: 'Overtime', label: 'Tăng ca (OT)', icon: 'time-outline' },
  { key: 'Payroll', label: 'Bảng lương', icon: 'layers-outline' },
  { key: 'Salary', label: 'Cấu hình', icon: 'settings-outline' },
  { key: 'History', label: 'Lịch sử', icon: 'time-outline' },
  { key: 'Reports', label: 'Báo cáo', icon: 'stats-chart-outline' },
];

const DRAWER_WIDTH = Math.min(320, Math.round(Dimensions.get('window').width * 0.84));

export default function MobileDrawer({
  isOpen,
  onClose,
  activeRoute,
  onNavigate,
}: MobileDrawerProps) {
  const animValue = useRef(new Animated.Value(0)).current;
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isOpen ? 1 : 0,
      duration: isOpen ? 280 : 220,
      useNativeDriver: true,
    }).start();

    // Prevent background scrolling on web while drawer is open
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
    }
  }, [isOpen]);

  if (!isOpen && (animValue as any)._value === 0) {
    return null;
  }

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const handleSelect = (key: AppRoute) => {
    onNavigate(key);
    onClose();
  };

  return (
    <View style={styles.container} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Semi-transparent Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Slide-in Drawer Container */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            transform: [{ translateX }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Drawer Top Header */}
          <View style={styles.drawerHeader}>
            <HojeongLogo size="md" showSubtitle={true} />
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityLabel="Đóng menu điều hướng"
              accessibilityRole="button"
            >
              <Ionicons name="close-outline" size={24} color={theme.colors.slate600} />
            </TouchableOpacity>
          </View>

          {/* User Profile / Workspace Badge */}
          <View style={styles.workspaceCard}>
            <View style={styles.workspaceDot} />
            <View style={styles.workspaceTextWrap}>
              <Text style={styles.workspaceTitle}>HOJEONG WORKSPACE</Text>
              <Text style={styles.workspaceUser} numberOfLines={1}>
                {profile?.fullName || user?.email || 'Chế độ người dùng'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Navigation Items */}
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionHeading}>MENU HỆ THỐNG</Text>
            {DRAWER_ITEMS.map((item) => {
              const isActive = activeRoute === item.key;
              const iconName = isActive ? (item.icon.replace('-outline', '') as any) : item.icon;

              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => handleSelect(item.key)}
                  activeOpacity={0.7}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={item.label}
                >
                  <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                    <Ionicons
                      name={iconName}
                      size={20}
                      color={isActive ? theme.colors.white : theme.colors.slate700}
                    />
                  </View>
                  <Text
                    style={[
                      styles.menuLabel,
                      isActive && styles.menuLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>

                  {item.badge ? (
                    <View style={styles.badgePill}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  ) : isActive ? (
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.white} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Drawer Footer */}
          <View style={styles.drawerFooter}>
            <Text style={styles.footerBrand}>HOJEONG ENTERPRISE</Text>
            <Text style={styles.footerVersion}>Phiên bản 0.1.0 • Chấm công & Tính lương</Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.white,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  safeArea: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.slate100,
  },
  workspaceCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.slate50,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workspaceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  workspaceTextWrap: {
    flex: 1,
  },
  workspaceTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.slate400,
    letterSpacing: 0.5,
  },
  workspaceUser: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.slate800,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 10,
    marginHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.slate400,
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    marginBottom: 4,
    minHeight: 46,
  },
  menuItemActive: {
    backgroundColor: theme.colors.primary, // HOJEONG Red (#D71920)
  },
  iconWrap: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconWrapActive: {
    // Active styling if needed
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.slate700,
  },
  menuLabelActive: {
    color: theme.colors.white,
    fontWeight: '800',
  },
  badgePill: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.white,
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.slate50,
  },
  footerBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  footerVersion: {
    fontSize: 10,
    color: theme.colors.slate400,
    marginTop: 2,
  },
});
