import React, { useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';
import { useSyncStore } from '../store/syncStore';

export default function SyncStatusBadge() {
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const openSyncModal = useSyncStore((s) => s.openSyncModal);
  const setOnline = useSyncStore((s) => s.setOnline);

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
          dotColor: '#16A34A',
          bgColor: '#F0FDF4',
          borderColor: '#BBF7D0',
          textColor: '#15803D',
        };
      case 'syncing':
        return {
          label: 'Đang lưu...',
          dotColor: theme.colors.primary,
          bgColor: '#FFF1F2',
          borderColor: '#FECDD3',
          textColor: theme.colors.primaryDark,
        };
      case 'error':
        return {
          label: 'Lỗi mạng',
          dotColor: theme.colors.danger,
          bgColor: '#FEF2F2',
          borderColor: '#FCA5A5',
          textColor: theme.colors.dangerDark,
        };
      default:
        return {
          label: 'Offline',
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
        {
          backgroundColor: indicator.bgColor,
          borderColor: indicator.borderColor,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Trạng thái đồng bộ máy chủ: ${indicator.label}`}
    >
      <View style={[styles.dot, { backgroundColor: indicator.dotColor }]} />
      <Text style={[styles.label, { color: indicator.textColor }]}>{indicator.label}</Text>
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
