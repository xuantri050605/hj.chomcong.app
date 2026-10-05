import React from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

export default function AppHeader({ title, user }: { title: string; user?: string }) {
  const userName = user || 'Nguyễn Xuân Trí';
  const initial = userName.trim().split(' ').pop()?.charAt(0).toUpperCase() || 'U';

  return (
    <View style={styles.header}>
      <View style={styles.headerInner}>
        {/* Brand logo & name */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>CHẤM CÔNG</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.brandSubtitle}>Hệ thống chấm công thông minh</Text>
          </View>
        </View>

        {/* User profile capsule */}
        <View style={styles.userCapsule}>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Đang hoạt động</Text>
            </View>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
            <View style={styles.avatarBadge} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    width: '100%',
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 50,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        position: 'sticky' as any,
        top: 0,
      },
    }),
  },
  headerInner: {
    maxWidth: 1200,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glow(theme.colors.primary),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    color: theme.colors.slate900,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  proBadge: {
    backgroundColor: theme.colors.purple,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.radius.full,
  },
  proText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: theme.colors.slate400,
    fontWeight: '500',
  },
  userCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate50,
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  userName: {
    color: theme.colors.slate800,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 100,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
  },
  statusText: {
    fontSize: 9,
    color: theme.colors.slate500,
    fontWeight: '600',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: theme.colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: theme.colors.success,
    borderWidth: 1.5,
    borderColor: theme.colors.white,
  },
});
