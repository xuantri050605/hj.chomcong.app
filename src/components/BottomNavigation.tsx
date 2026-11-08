import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { AppRoute } from '../utils/navigationState';

export interface BottomNavigationProps {
  activeRoute: AppRoute;
  onSelect: (route: AppRoute | 'Menu') => void;
  onOpenMenu?: () => void;
}

interface TabConfig {
  key: AppRoute | 'Menu';
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

export const BOTTOM_TABS: TabConfig[] = [
  {
    key: 'Dashboard',
    label: 'Tổng quan',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    key: 'Attendance',
    label: 'Chấm công',
    activeIcon: 'calendar',
    inactiveIcon: 'calendar-outline',
  },
  {
    key: 'Overtime',
    label: 'Tăng ca',
    activeIcon: 'time',
    inactiveIcon: 'time-outline',
  },
  {
    key: 'Payroll',
    label: 'Bảng lương',
    activeIcon: 'wallet',
    inactiveIcon: 'wallet-outline',
  },
  {
    key: 'Menu',
    label: 'Thêm',
    activeIcon: 'grid',
    inactiveIcon: 'grid-outline',
  },
];

export default function BottomNavigation({
  activeRoute,
  onSelect,
  onOpenMenu,
}: BottomNavigationProps) {
  // If user is in an extended subpage (Salary, History, Reports), highlight the 'Menu' tab
  const isExtendedMenuRoute =
    activeRoute === 'Salary' || activeRoute === 'History' || activeRoute === 'Reports';

  const handlePress = (key: AppRoute | 'Menu') => {
    if (key === 'Menu') {
      if (onOpenMenu) {
        onOpenMenu();
      } else {
        onSelect('Menu');
      }
    } else {
      onSelect(key);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {BOTTOM_TABS.map((tab) => {
          const isActive =
            tab.key === 'Menu'
              ? isExtendedMenuRoute
              : activeRoute === tab.key;

          const iconName = isActive ? tab.activeIcon : tab.inactiveIcon;

          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              style={styles.tabItem}
              activeOpacity={0.65}
              onPress={() => handlePress(tab.key)}
            >
              {/* Active Top Glow/Indicator Bar */}
              {isActive && <View style={styles.activeTopBar} />}

              <View
                style={[
                  styles.iconContainer,
                  isActive && styles.activeIconContainer,
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={isActive ? theme.colors.primary : theme.colors.slate500}
                />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    flexShrink: 0,
    zIndex: 90,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 -3px 16px rgba(15, 23, 42, 0.06)',
        position: 'sticky' as any,
        bottom: 0,
      },
    }),
  },
  bar: {
    height: Platform.OS === 'ios' ? 74 : 60,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingBottom: Platform.OS === 'ios' ? 16 : 4,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 4,
  },
  activeTopBar: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconContainer: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    marginBottom: 2,
  },
  activeIconContainer: {
    backgroundColor: theme.colors.primarySoft,
  },
  tabLabel: {
    fontSize: 10,
    color: theme.colors.slate500,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  activeTabLabel: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
});
