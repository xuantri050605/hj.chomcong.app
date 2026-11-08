import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';
import HojeongLogo from './HojeongLogo';
import SyncStatusBadge from './SyncStatusBadge';

export interface AppHeaderProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onOpenNotifications?: () => void;
  unreadCount?: number;
  onOpenHelp?: () => void;
  onPressUser?: () => void;
  showLogo?: boolean;
}

export default function AppHeader({
  onToggleSidebar,
  isSidebarCollapsed = false,
  onOpenNotifications,
  unreadCount,
  onOpenHelp,
  onPressUser,
  showLogo = false,
}: AppHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const [searchQuery, setSearchQuery] = useState('');
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleUserClick = () => {
    if (onPressUser) {
      onPressUser();
    } else {
      openAuthModal();
    }
  };

  return (
    <View style={[styles.header, { paddingHorizontal: width < 420 ? 12 : 16 }]}>
      <View style={styles.headerInner}>
        {/* Left: Sidebar / Drawer Toggle & Brand */}
        <View style={styles.leftSection}>
          {onToggleSidebar && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onToggleSidebar}
              style={styles.iconButton}
              accessibilityLabel="Mở menu điều hướng"
              accessibilityRole="button"
            >
              <Ionicons
                name={isDesktop && isSidebarCollapsed ? 'menu-outline' : 'menu'}
                size={22}
                color={theme.colors.slate800}
              />
            </TouchableOpacity>
          )}

          {showLogo && (
            <View style={styles.mobileLogoWrap}>
              <HojeongLogo size="sm" showSubtitle={false} />
            </View>
          )}
        </View>

        {/* Center: Search Input (Desktop Only - Matching Reference Image) */}
        {isDesktop && (
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={17} color={theme.colors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm nhân viên, mã, ca làm..."
                placeholderTextColor={theme.colors.slate400}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View style={styles.kbdBadge}>
                <Text style={styles.kbdText}>Ctrl + K</Text>
              </View>
            </View>
          </View>
        )}

        {/* Right Section: System Actions & Auth */}
        <View style={[styles.rightSection, width < 420 && { gap: 6 }]}>
          {/* Live Cloud Sync Status Badge */}
          <SyncStatusBadge />

          {/* Notifications Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenNotifications}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount !== undefined
                ? `Thông báo hệ thống (${unreadCount} chưa đọc)`
                : 'Thông báo hệ thống'
            }
          >
            <Ionicons name="notifications-outline" size={19} color={theme.colors.slate700} />
            {unreadCount !== 0 && (
              <View style={unreadCount ? styles.notifBadgeWithCount : styles.notifBadge}>
                {typeof unreadCount === 'number' && unreadCount > 0 && (
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Help Button (Shown when width >= 500) */}
          {width >= 500 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onOpenHelp}
              style={styles.iconButton}
              accessibilityLabel="Trợ giúp hệ thống"
            >
              <Ionicons name="help-circle-outline" size={19} color={theme.colors.slate700} />
            </TouchableOpacity>
          )}

          {/* Account / Auth Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleUserClick}
            style={styles.accountBtn}
            accessibilityRole="button"
            accessibilityLabel={user ? `Tài khoản: ${user.email}` : 'Đăng nhập tài khoản'}
          >
            <View style={[styles.avatarBox, user && styles.avatarBoxActive]}>
              <Ionicons
                name={user ? 'person' : 'person-outline'}
                size={16}
                color={user ? theme.colors.white : theme.colors.slate700}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    height: 58,
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      },
    }),
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  mobileLogoWrap: {
    marginLeft: 2,
  },
  searchSection: {
    flex: 1,
    maxWidth: 480,
    marginHorizontal: 16,
    ...Platform.select({
      default: {},
    }),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.slate800,
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  kbdBadge: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  kbdText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.slate400,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    marginRight: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: theme.colors.slate50,
    flexShrink: 0,
  },
  notifBadge: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.primary,
  },
  notifBadgeWithCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.white,
  },
  notifBadgeText: {
    color: theme.colors.white,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  accountBtn: {
    flexShrink: 0,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  avatarBoxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
});
