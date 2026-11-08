import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { AppRoute } from '../utils/navigationState';
import HojeongLogo from './HojeongLogo';

interface SidebarItem {
  key: AppRoute;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
}

interface AppSidebarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'Dashboard', label: 'Tổng quan', icon: 'home-outline' },
  { key: 'Attendance', label: 'Chấm công', icon: 'calendar-outline' },
  { key: 'Overtime', label: 'Tăng ca (OT)', icon: 'time-outline' },
  { key: 'Payroll', label: 'Bảng lương', icon: 'layers-outline' },
  { key: 'Salary', label: 'Cấu hình', icon: 'settings-outline' },
  { key: 'History', label: 'Lịch sử', icon: 'time-outline' },
  { key: 'Reports', label: 'Báo cáo', icon: 'stats-chart-outline' },
];

export default function AppSidebar({
  activeRoute,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}: AppSidebarProps) {
  return (
    <View style={[styles.sidebar, isCollapsed && styles.sidebarCollapsed]}>
      {/* Brand Logo Header */}
      <View style={[styles.brandHeader, isCollapsed && styles.brandHeaderCollapsed]}>
        {!isCollapsed ? (
          <HojeongLogo size="md" showSubtitle={true} />
        ) : (
          <View style={styles.collapsedLogoBadge}>
            <Text style={styles.collapsedLogoText}>H</Text>
          </View>
        )}
      </View>

      {/* Menu items */}
      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = activeRoute === item.key;
          const iconName = isActive ? (item.icon.replace('-outline', '') as any) : item.icon;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.8}
              onPress={() => onNavigate(item.key)}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                isCollapsed && styles.navItemCollapsed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  name={iconName}
                  size={19}
                  color={isActive ? theme.colors.white : theme.colors.slate700}
                />
              </View>

              {!isCollapsed && (
                <Text
                  style={[
                    styles.navLabel,
                    isActive && styles.navLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              )}

              {!isCollapsed && item.badge && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer Info / Decorative Watermark */}
      <View style={styles.sidebarFooter}>
        {!isCollapsed ? (
          <View style={styles.watermarkContainer}>
            <Text style={styles.watermarkLetter}>H</Text>
            <View style={styles.footerCorpContent}>
              <Text style={styles.corpTitle}>HOJEONG</Text>
              <Text style={styles.corpDesc}>Hệ thống chuẩn hoá doanh nghiệp</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onToggleCollapse}
            style={styles.expandBtn}
            accessibilityLabel="Mở rộng menu"
          >
            <Ionicons name="chevron-forward" size={18} color={theme.colors.slate600} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    height: '100%',
    backgroundColor: theme.colors.white,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 40,
  },
  sidebarCollapsed: {
    width: 68,
  },
  brandHeader: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  brandHeaderCollapsed: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  collapsedLogoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedLogoText: {
    color: theme.colors.white,
    fontWeight: '900',
    fontStyle: 'italic',
    transform: [{ skewX: '-6deg' }],
    fontSize: 18,
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {},
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.slate700,
  },
  navLabelActive: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  badgePill: {
    backgroundColor: theme.colors.primaryDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  sidebarFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderColor: theme.colors.borderLight,
    position: 'relative',
    overflow: 'hidden',
  },
  watermarkContainer: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  watermarkLetter: {
    position: 'absolute',
    right: -6,
    bottom: -14,
    fontSize: 64,
    fontWeight: '900',
    fontStyle: 'italic',
    color: 'rgba(215, 25, 32, 0.08)',
  },
  footerCorpContent: {
    zIndex: 2,
  },
  corpTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  corpDesc: {
    fontSize: 10,
    color: theme.colors.slate500,
    marginTop: 2,
  },
  expandBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
