import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

interface NavItem {
  key: string;
  label: string;
}

interface BottomNavigationProps {
  items: NavItem[];
  activeKey?: string;
  onSelect: (key: string) => void;
}

const getTabIcon = (key: string, isActive: boolean): keyof typeof Ionicons.glyphMap => {
  switch (key) {
    case 'Dashboard':
      return isActive ? 'grid' : 'grid-outline';
    case 'Attendance':
      return isActive ? 'calendar' : 'calendar-outline';
    case 'Payroll':
      return isActive ? 'wallet' : 'wallet-outline';
    case 'Salary':
      return isActive ? 'options' : 'options-outline';
    case 'History':
      return isActive ? 'time' : 'time-outline';
    default:
      return isActive ? 'apps' : 'apps-outline';
  }
};

export default function BottomNavigation({ items, activeKey, onSelect }: BottomNavigationProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {items.map((it) => {
          const isActive = activeKey === it.key;
          const iconName = getTabIcon(it.key, isActive);

          return (
            <TouchableOpacity
              key={it.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => onSelect(it.key)}
            >
              <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
                <Ionicons
                  name={iconName}
                  size={20}
                  color={isActive ? theme.colors.primary : theme.colors.slate400}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.activeLabel,
                ]}
                numberOfLines={1}
              >
                {it.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
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
    borderColor: theme.colors.border,
    flexShrink: 0,
    zIndex: 50,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 -2px 10px rgba(0,0,0,0.04)',
        position: 'sticky' as any,
        bottom: 0,
      },
    }),
  },
  bar: {
    height: 68,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  iconWrapper: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    marginBottom: 2,
  },
  activeIconWrapper: {
    backgroundColor: theme.colors.primarySoft,
  },
  label: {
    fontSize: 10,
    color: theme.colors.slate500,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
});
