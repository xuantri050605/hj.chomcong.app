import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listMonths, loadPayroll, deletePayroll } from '../utils/persistence';
import { formatVND } from '../utils/format';
import { useAttendanceStore } from '../store/attendanceStore';
import Card from '../components/Card';
import Button from '../components/Button';
import { theme } from '../theme/theme';

export default function History({ onOpenPayroll }: { onOpenPayroll?: () => void }) {
  const [months, setMonths] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const selectMonth = useAttendanceStore((s) => s.selectMonth);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setSelected(null);
    setDetail(null);
    try {
      const m = await listMonths();
      setMonths(m);
    } finally {
      setLoading(false);
    }
  }

  async function openMonth(m: string) {
    setLoading(true);
    try {
      const p = await loadPayroll(m);
      setSelected(m);
      setDetail(p);
      await selectMonth(m);
      onOpenPayroll?.();
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(m: string) {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa vĩnh viễn bảng lương lưu trữ tháng ${m}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa vĩnh viễn',
        style: 'destructive',
        onPress: async () => {
          await deletePayroll(m);
          await refresh();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      {/* Title */}
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <View style={styles.titleIconBadge}>
            <Ionicons name="time" size={20} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>LỊCH SỬ BẢNG LƯƠNG</Text>
            <Text style={styles.subtitle}>Dữ liệu các kỳ lương đã lưu trữ</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={refresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && <Text style={styles.loading}>Đang tải dữ liệu lịch sử…</Text>}

      {months.length === 0 && !loading ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="archive-outline" size={36} color={theme.colors.slate300} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có dữ liệu lưu trữ</Text>
          <Text style={styles.emptySub}>
            Các bảng lương sau khi tính toán sẽ tự động được lưu trữ tại đây để bạn đối chiếu hàng tháng.
          </Text>
        </Card>
      ) : (
        <FlatList
          data={months}
          keyExtractor={(i) => i}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card style={styles.monthCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.monthCardMain}
                onPress={() => openMonth(item)}
              >
                <View style={styles.monthIconBadge}>
                  <Ionicons name="receipt-outline" size={20} color={theme.colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.monthTitle}>Kỳ lương tháng {item}</Text>
                  <Text style={styles.monthSub}>Nhấn để xem chi tiết phiếu lương</Text>
                </View>

                <View style={styles.arrowCircle}>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                </View>
              </TouchableOpacity>

              <View style={styles.cardBottomRow}>
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={theme.colors.successDark} />
                  <Text style={styles.statusBadgeText}>Đã chốt sổ</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => confirmDelete(item)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                  <Text style={styles.deleteBtnText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}

      {selected && detail && (
        <Card style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
            <Text style={styles.previewTitle}>TÓM TẮT THÁNG {selected}</Text>
          </View>
          <View style={styles.previewGrid}>
            <View style={styles.previewCol}>
              <Text style={styles.previewLabel}>Tổng thu nhập</Text>
              <Text style={styles.previewVal}>{formatVND(detail.gross)}</Text>
            </View>
            <View style={styles.previewDivider} />
            <View style={styles.previewCol}>
              <Text style={styles.previewLabel}>Thực lĩnh</Text>
              <Text style={[styles.previewVal, { color: theme.colors.successDark }]}>
                {formatVND(detail.net)}
              </Text>
            </View>
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleIconBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.slate900,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.slate500,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    textAlign: 'center',
    color: theme.colors.slate500,
    fontSize: 12,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: theme.radius.xl,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.slate800,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.slate400,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  monthCard: {
    padding: 14,
    borderRadius: theme.radius.lg,
  },
  monthCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthIconBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.slate900,
  },
  monthSub: {
    fontSize: 11,
    color: theme.colors.slate400,
    marginTop: 2,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: theme.colors.slate100,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.successDark,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  previewCard: {
    backgroundColor: theme.colors.slate900,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.slate300,
    letterSpacing: 0.5,
  },
  previewGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewCol: {
    flex: 1,
  },
  previewDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.slate700,
    marginHorizontal: 12,
  },
  previewLabel: {
    fontSize: 10,
    color: theme.colors.slate400,
    fontWeight: '600',
  },
  previewVal: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.white,
    marginTop: 2,
  },
});
