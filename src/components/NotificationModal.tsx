import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  category: 'ATTENDANCE' | 'PAYROLL' | 'GPS' | 'SYSTEM';
  read: boolean;
  priority?: 'HIGH' | 'NORMAL';
}

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'Nhắc nhở chấm công hàng ngày',
    message: 'Vui lòng hoàn tất ghi nhận giờ vào ca và giờ ra ca trước 17:00 hàng ngày để đảm bảo quyền lợi tính lương.',
    time: '08:00 - Hôm nay',
    category: 'ATTENDANCE',
    read: false,
    priority: 'HIGH',
  },
  {
    id: 'notif-2',
    title: 'Cập nhật hệ số làm thêm giờ (OT)',
    message: 'Quy định tính hệ số OT 150% ngày thường, 200% ngày nghỉ tuần và phụ cấp ca đêm 130% đã được áp dụng tự động.',
    time: '15:30 - Hôm qua',
    category: 'PAYROLL',
    read: false,
    priority: 'NORMAL',
  },
  {
    id: 'notif-3',
    title: 'Định vị GPS Geofencing sẵn sàng',
    message: 'Hệ thống định vị vị trí công ty tự động phát hiện khi bạn đến/rời văn phòng và tạo thông báo xác nhận giờ công tiện lợi.',
    time: '05/10/2026',
    category: 'GPS',
    read: false,
    priority: 'NORMAL',
  },
  {
    id: 'notif-4',
    title: 'Thông báo vận hành doanh nghiệp HOJEONG',
    message: 'Hệ thống quản lý nhân sự & công lương phiên bản 2.6 chính thức vận hành với dữ liệu bảo mật tiêu chuẩn doanh nghiệp.',
    time: '01/10/2026',
    category: 'SYSTEM',
    read: true,
    priority: 'NORMAL',
  },
];

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onNotificationsCountChange?: (count: number) => void;
}

export default function NotificationModal({
  visible,
  onClose,
  onNotificationsCountChange,
}: NotificationModalProps) {
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ATTENDANCE' | 'PAYROLL' | 'GPS'>('ALL');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    onNotificationsCountChange?.(0);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    onNotificationsCountChange?.(updated.filter((n) => !n.read).length);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    onNotificationsCountChange?.(updated.filter((n) => !n.read).length);
  };

  const filtered = notifications.filter((n) => {
    if (selectedFilter === 'ALL') return true;
    return n.category === selectedFilter;
  });

  const getCategoryIcon = (cat: SystemNotification['category']) => {
    switch (cat) {
      case 'ATTENDANCE':
        return { name: 'time-outline' as const, color: theme.colors.primary, bg: theme.colors.primarySoft };
      case 'PAYROLL':
        return { name: 'wallet-outline' as const, color: '#16A34A', bg: '#DCFCE7' };
      case 'GPS':
        return { name: 'location-outline' as const, color: '#2563EB', bg: '#DBEAFE' };
      default:
        return { name: 'information-circle-outline' as const, color: theme.colors.slate600, bg: theme.colors.slate100 };
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="notifications" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={styles.titleText}>THÔNG BÁO HỆ THỐNG</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount} mới</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.subText}>Cập nhật chấm công, ca làm và bảng lương</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Đóng thông báo"
            >
              <Ionicons name="close" size={20} color={theme.colors.slate500} />
            </TouchableOpacity>
          </View>

          {/* Action Row */}
          <View style={styles.actionBar}>
            {/* Filter Pills */}
            <View style={styles.filterPills}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'ATTENDANCE', label: 'Chấm công' },
                { key: 'PAYROLL', label: 'Bảng lương' },
                { key: 'GPS', label: 'GPS' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setSelectedFilter(f.key as any)}
                  style={[
                    styles.filterChip,
                    selectedFilter === f.key && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === f.key && styles.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
                <Ionicons name="checkmark-done" size={14} color={theme.colors.primary} />
                <Text style={styles.markAllText}>Đã đọc tất cả</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notification List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="notifications-off-outline" size={36} color={theme.colors.slate300} />
                <Text style={styles.emptyTitle}>Không có thông báo nào</Text>
                <Text style={styles.emptyDesc}>Các thông báo chấm công và biến động sẽ hiển thị tại đây.</Text>
              </View>
            ) : (
              filtered.map((item) => {
                const iconInfo = getCategoryIcon(item.category);
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() => markAsRead(item.id)}
                    style={[styles.itemCard, !item.read && styles.itemCardUnread]}
                  >
                    <View style={[styles.itemIconBox, { backgroundColor: iconInfo.bg }]}>
                      <Ionicons name={iconInfo.name} size={18} color={iconInfo.color} />
                    </View>

                    <View style={styles.itemBody}>
                      <View style={styles.itemHeaderRow}>
                        <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemTime}>{item.time}</Text>
                      </View>

                      <Text style={styles.itemMessage}>{item.message}</Text>

                      <View style={styles.itemFooterRow}>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryPillText}>
                            {item.category === 'ATTENDANCE'
                              ? 'Chấm công'
                              : item.category === 'PAYROLL'
                              ? 'Lương'
                              : item.category === 'GPS'
                              ? 'GPS Geofence'
                              : 'Hệ thống'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => deleteNotification(item.id)}
                          style={styles.deleteBtn}
                          accessibilityLabel="Xóa thông báo"
                        >
                          <Ionicons name="trash-outline" size={14} color={theme.colors.slate400} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {!item.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.footerCloseBtn}>
              <Text style={styles.footerCloseText}>Đóng thông báo</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999,
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    width: '100%',
    maxWidth: 540,
    maxHeight: '85%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.slate900,
    letterSpacing: 0.4,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  subText: {
    fontSize: 11,
    color: theme.colors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.slate100,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: theme.colors.slate50,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate600,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.slate700,
  },
  emptyDesc: {
    fontSize: 12,
    color: theme.colors.slate400,
    textAlign: 'center',
    maxWidth: 260,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    padding: 12,
    gap: 12,
    position: 'relative',
  },
  itemCardUnread: {
    backgroundColor: '#FFF9F9',
    borderColor: '#FED7D7',
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.slate800,
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '900',
    color: theme.colors.slate900,
  },
  itemTime: {
    fontSize: 10,
    color: theme.colors.slate400,
    fontWeight: '600',
  },
  itemMessage: {
    fontSize: 12,
    color: theme.colors.slate600,
    lineHeight: 17,
    marginBottom: 8,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    backgroundColor: theme.colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.slate600,
  },
  deleteBtn: {
    padding: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.primary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.slate50,
    alignItems: 'flex-end',
  },
  footerCloseBtn: {
    backgroundColor: theme.colors.slate200,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  footerCloseText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.slate700,
  },
});
