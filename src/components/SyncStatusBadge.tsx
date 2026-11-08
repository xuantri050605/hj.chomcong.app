import React, { useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useSyncStore } from '../store/syncStore';

export default function SyncStatusBadge() {
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const openSyncModal = useSyncStore((s) => s.openSyncModal);
  const setOnline = useSyncStore((s) => s.setOnline);
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => setOnline(true);
      const handleOffline = () => setOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [setOnline]);

  const getIndicator = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          label: 'Cloud Synced',
          icon: 'cloud-done-outline' as const,
          dotColor: '#16A34A',
          bgColor: '#F0FDF4',
          borderColor: '#BBF7D0',
          textColor: '#15803D',
        };
      case 'syncing':
        return {
          label: 'Đang lưu...',
          icon: 'cloud-upload-outline' as const,
          dotColor: theme.colors.primary,
          bgColor: '#FFF1F2',
          borderColor: '#FECDD3',
          textColor: theme.colors.primaryDark,
        };
      case 'error':
        return {
          label: 'Lỗi mạng',
          icon: 'cloud-offline-outline' as const,
          dotColor: theme.colors.danger,
          bgColor: '#FEF2F2',
          borderColor: '#FCA5A5',
          textColor: theme.colors.dangerDark,
        };
      default:
        return {
          label: 'Offline',
          icon: 'cloud-offline-outline' as const,
          dotColor: theme.colors.slate400,
          bgColor: theme.colors.slate100,
          borderColor: theme.colors.border,
          textColor: theme.colors.slate600,
        };
    }
  };

  const indicator = getIndicator();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={openSyncModal}
      style={[
        styles.badge,
        isCompact && styles.badgeCompact,
        {
          backgroundColor: indicator.bgColor,
          borderColor: indicator.borderColor,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Trạng thái đồng bộ máy chủ: ${indicator.label}`}
    >
      <Ionicons
        name={indicator.icon}
        size={isCompact ? 16 : 14}
        color={indicator.textColor}
      />
      {!isCompact && (
        <>
          <View style={[styles.dot, { backgroundColor: indicator.dotColor }]} />
          <Text style={[styles.label, { color: indicator.textColor }]}>{indicator.label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  badgeCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
