import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useSyncStore } from '../store/syncStore';
import { useAuthStore } from '../store/authStore';

export default function SyncModal() {
  const isModalOpen = useSyncStore((s) => s.isModalOpen);
  const closeSyncModal = useSyncStore((s) => s.closeSyncModal);
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const errorMessage = useSyncStore((s) => s.errorMessage);
  const syncNow = useSyncStore((s) => s.syncNow);
  const user = useAuthStore((s) => s.user);

  const isSyncing = syncStatus === 'syncing';

  const getStatusInfo = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          label: 'Đã đồng bộ Cloud an toàn',
          desc: 'Dữ liệu chấm công và bảng lương đã được sao lưu toàn vẹn trên Supabase.',
          color: theme.colors.success,
          bg: '#DCFCE7',
          icon: 'cloud-done' as const,
        };
      case 'syncing':
        return {
          label: 'Đang đồng bộ dữ liệu...',
          desc: 'Hệ thống đang truyền tải các bản ghi mới lên máy chủ Supabase.',
          color: theme.colors.primary,
          bg: '#FEE2E2',
          icon: 'sync' as const,
        };
      case 'error':
        return {
          label: 'Lỗi đồng bộ máy chủ',
          desc: errorMessage || 'Không thể thiết lập kết nối tới cơ sở dữ liệu Supabase.',
          color: theme.colors.danger,
          bg: '#FEE2E2',
          icon: 'alert-circle' as const,
        };
      default:
        return {
          label: 'Chế độ Ngoại tuyến (Offline)',
          desc: 'Dữ liệu được lưu trữ cục bộ trên máy và sẽ tự động đồng bộ khi có kết nối.',
          color: theme.colors.slate500,
          bg: theme.colors.slate100,
          icon: 'cloud-offline' as const,
        };
    }
  };

  const info = getStatusInfo();

  return (
    <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={closeSyncModal}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.statusIconBox, { backgroundColor: info.bg }]}>
                <Ionicons name={info.icon} size={20} color={info.color} />
              </View>
              <View>
                <Text style={styles.modalTitle}>ĐỒNG BỘ DỮ LIỆU ĐÁM MÂY</Text>
                <Text style={styles.modalSubtitle}>Supabase Cloud Enterprise Database</Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeSyncModal} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.colors.slate600} />
            </TouchableOpacity>
          </View>

          {/* Status Capsule */}
          <View style={[styles.statusBanner, { backgroundColor: info.bg, borderColor: info.color }]}>
            <Text style={[styles.statusBannerText, { color: info.color }]}>{info.label}</Text>
            <Text style={styles.statusBannerDesc}>{info.desc}</Text>
          </View>

          {/* Details Table */}
          <View style={styles.detailList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Máy chủ Cloud:</Text>
              <Text style={styles.detailValBold}>byzsyyzothoizcvffsbt.supabase.co</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tài khoản hiện tại:</Text>
              <Text style={styles.detailVal}>{user?.email || 'Chế độ khách (Lưu cục bộ thiết bị)'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Đồng bộ gần nhất:</Text>
              <Text style={styles.detailVal}>
                {lastSyncedAt ? lastSyncedAt.toLocaleTimeString('vi-VN') + ' - Hôm nay' : 'Chưa đồng bộ'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bảng đã kích hoạt RLS:</Text>
              <Text style={styles.detailValPill}>5 bảng (profiles, salary, attendance...)</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => void syncNow()}
              disabled={isSyncing}
              style={[styles.syncNowBtn, isSyncing && styles.syncNowBtnDisabled]}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Ionicons name="refresh" size={17} color={theme.colors.white} />
              )}
              <Text style={styles.syncNowBtnText}>
                {isSyncing ? 'Đang đồng bộ...' : 'ĐỒNG BỘ NGAY BÂY GIỜ'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={closeSyncModal} style={styles.dismissBtn}>
              <Text style={styles.dismissBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    ...theme.elevations.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.slate900,
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 11,
    color: theme.colors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  statusBanner: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBannerDesc: {
    fontSize: 11,
    color: theme.colors.slate600,
    lineHeight: 16,
  },
  detailList: {
    backgroundColor: theme.colors.slate50,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 8,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: theme.colors.slate500,
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 11,
    color: theme.colors.slate800,
    fontWeight: '600',
  },
  detailValBold: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  detailValPill: {
    fontSize: 10,
    color: theme.colors.successDark,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  syncNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  syncNowBtnDisabled: {
    opacity: 0.6,
  },
  syncNowBtnText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  dismissBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissBtnText: {
    color: theme.colors.slate700,
    fontSize: 12,
    fontWeight: '700',
  },
});
