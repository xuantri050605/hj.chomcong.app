import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAttendanceStore } from '../store/attendanceStore';
import { useSalaryStore } from '../store/salaryStore';
import { calculatePayroll } from '../engine/payrollCalculator';
import { computeOvertimeForDay } from '../engine/overtimeCalculator';
import MonthSelector from '../components/MonthSelector';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import { theme } from '../theme/theme';

export default function OvertimeScreen() {
  const { items, month, selectMonth } = useAttendanceStore();
  const config = useSalaryStore((state) => state.config);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | '150' | '200' | '210'>('ALL');

  const payroll = useMemo(() => calculatePayroll(items, config), [items, config]);

  // Extract all days that have overtime hours
  const overtimeRecords = useMemo(() => {
    return items
      .map((item) => {
        const ot = computeOvertimeForDay(item);
        const totalDayOt = +(ot.ot150 + ot.ot200 + ot.ot210).toFixed(2);
        return {
          ...item,
          ot,
          totalDayOt,
        };
      })
      .filter((r) => r.totalDayOt > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [items]);

  const filteredRecords = useMemo(() => {
    return overtimeRecords.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.date.includes(searchQuery) ||
        (r.note && r.note.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (filterType === '150') return r.ot.ot150 > 0;
      if (filterType === '200') return r.ot.ot200 > 0;
      if (filterType === '210') return r.ot.ot210 > 0;
      return true;
    });
  }, [overtimeRecords, searchQuery, filterType]);

  const totalOtHours = +(payroll.ot150Hours + payroll.ot200Hours + payroll.ot210Hours).toFixed(2);

  const kpiWidth = isDesktop ? ('23.8%' as const) : ('48.2%' as const);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="time" size={22} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.pageTitle}>QUẢN LÝ TĂNG CA (OT)</Text>
              <Text style={styles.pageSubtitle}>
                Theo dõi, phân loại và đối soát giờ tăng ca doanh nghiệp HOJEONG
              </Text>
            </View>
          </View>
        </View>

        {/* Month Selector */}
        <MonthSelector month={month} onChange={selectMonth} />

        {/* Overtime KPI Summary Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="TỔNG GIỜ TĂNG CA"
              value={`${totalOtHours}h`}
              subtitle="Tất cả các hệ số"
              tone={theme.colors.primary}
              icon={<Ionicons name="time" size={16} color={theme.colors.primary} />}
            />
          </View>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="OT NGÀY 150%"
              value={`${payroll.ot150Hours}h`}
              subtitle="Tăng ca ngày thường"
              tone="#EA580C"
              icon={<Ionicons name="sunny-outline" size={16} color="#EA580C" />}
            />
          </View>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="OT ĐÊM / NGHỈ 200%"
              value={`${payroll.ot200Hours}h`}
              subtitle="Ca đêm / Nghỉ tuần"
              tone={theme.colors.purple}
              icon={<Ionicons name="moon-outline" size={16} color={theme.colors.purple} />}
            />
          </View>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="OT ĐẶC BIỆT 210%"
              value={`${payroll.ot200Hours > 0 ? payroll.ot210Hours : 0}h`}
              subtitle="Tăng ca đêm ngày nghỉ"
              tone={theme.colors.danger}
              icon={<Ionicons name="flash-outline" size={16} color={theme.colors.danger} />}
            />
          </View>
        </View>

        {/* Filter & Search Toolbar */}
        <Card style={styles.toolbarCard}>
          <View style={styles.toolbarRow}>
            {/* Search Box */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={theme.colors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm theo ngày (YYYY-MM-DD) hoặc ghi chú..."
                placeholderTextColor={theme.colors.slate400}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={theme.colors.slate400} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPills}>
              <TouchableOpacity
                style={[styles.pill, filterType === 'ALL' && styles.pillActive]}
                onPress={() => setFilterType('ALL')}
              >
                <Text style={[styles.pillText, filterType === 'ALL' && styles.pillTextActive]}>
                  Tất cả ({overtimeRecords.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, filterType === '150' && styles.pillActive]}
                onPress={() => setFilterType('150')}
              >
                <Text style={[styles.pillText, filterType === '150' && styles.pillTextActive]}>
                  150%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, filterType === '200' && styles.pillActive]}
                onPress={() => setFilterType('200')}
              >
                <Text style={[styles.pillText, filterType === '200' && styles.pillTextActive]}>
                  200%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, filterType === '210' && styles.pillActive]}
                onPress={() => setFilterType('210')}
              >
                <Text style={[styles.pillText, filterType === '210' && styles.pillTextActive]}>
                  210%
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Overtime Records Table */}
        <Card style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <View style={styles.tableHeaderTitleRow}>
              <Ionicons name="list" size={18} color={theme.colors.primary} />
              <Text style={styles.tableTitle}>DANH SÁCH CA LÀM CÓ PHÁT SINH TĂNG CA</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {!isDesktop && (
                <Text style={styles.swipeHintText}>← Vuốt ngang →</Text>
              )}
              <Text style={styles.recordCountText}>
                Hiển thị {filteredRecords.length} / {overtimeRecords.length} ca
              </Text>
            </View>
          </View>

          {filteredRecords.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={42} color={theme.colors.slate300} />
              <Text style={styles.emptyTitle}>Không có dữ liệu tăng ca</Text>
              <Text style={styles.emptySub}>
                Trong tháng {month} không có ca làm việc nào phát sinh tăng ca phù hợp bộ lọc.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
              <View style={styles.table}>
                {/* Header */}
                <View style={styles.tHead}>
                  <Text style={[styles.th, { width: 105 }]}>NGÀY</Text>
                  <Text style={[styles.th, { width: 130 }]}>CA LÀM VIỆC</Text>
                  <Text style={[styles.th, { width: 85, textAlign: 'center' }]}>OT 150%</Text>
                  <Text style={[styles.th, { width: 85, textAlign: 'center' }]}>OT 200%</Text>
                  <Text style={[styles.th, { width: 85, textAlign: 'center' }]}>OT 210%</Text>
                  <Text style={[styles.th, { width: 95, textAlign: 'right' }]}>TỔNG OT</Text>
                  <Text style={[styles.th, { width: 155, paddingLeft: 16 }]}>LOẠI NGÀY / GHI CHÚ</Text>
                </View>

                {/* Rows */}
                {filteredRecords.map((r, idx) => (
                  <View
                    key={r.date}
                    style={[styles.tRow, idx % 2 === 1 && styles.tRowAlt]}
                  >
                    <Text style={[styles.td, styles.dateCell, { width: 105 }]}>{r.date}</Text>
                    <Text style={[styles.td, { width: 130 }]}>
                      {r.shift?.start || '--:--'} → {r.shift?.end || '--:--'}
                    </Text>
                    <View style={[{ width: 85, alignItems: 'center' }]}>
                      {r.ot.ot150 > 0 ? (
                        <View style={[styles.badge, styles.badge150]}>
                          <Text style={styles.badgeText150}>{r.ot.ot150}h</Text>
                        </View>
                      ) : (
                        <Text style={styles.dashText}>—</Text>
                      )}
                    </View>
                    <View style={[{ width: 85, alignItems: 'center' }]}>
                      {r.ot.ot200 > 0 ? (
                        <View style={[styles.badge, styles.badge200]}>
                          <Text style={styles.badgeText200}>{r.ot.ot200}h</Text>
                        </View>
                      ) : (
                        <Text style={styles.dashText}>—</Text>
                      )}
                    </View>
                    <View style={[{ width: 85, alignItems: 'center' }]}>
                      {r.ot.ot210 > 0 ? (
                        <View style={[styles.badge, styles.badge210]}>
                          <Text style={styles.badgeText210}>{r.ot.ot210}h</Text>
                        </View>
                      ) : (
                        <Text style={styles.dashText}>—</Text>
                      )}
                    </View>
                    <Text style={[styles.td, styles.totalOtCell, { width: 95, textAlign: 'right' }]}>
                      {r.totalDayOt}h
                    </Text>
                    <View style={{ width: 155, paddingLeft: 16 }}>
                      <Text style={styles.noteText} numberOfLines={1}>
                        {r.dayType === 'WEEKLY_OFF'
                          ? 'Nghỉ tuần'
                          : r.dayType === 'HOLIDAY'
                          ? 'Ngày Lễ'
                          : r.note || 'Ca ngày thường'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </Card>

        {/* Overtime Policy Notes */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.infoTitle}>QUY ĐỊNH TÍNH HỆ SỐ TĂNG CA (OT) HOJEONG</Text>
          </View>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>
              • <Text style={styles.bold}>Hệ số 150%</Text>: Tăng ca ban ngày của các ngày làm việc tiêu chuẩn trong tuần.
            </Text>
            <Text style={styles.infoItem}>
              • <Text style={styles.bold}>Hệ số 200%</Text>: Làm việc vào ngày nghỉ hàng tuần (Chủ nhật/Off) hoặc ca đêm thông thường.
            </Text>
            <Text style={styles.infoItem}>
              • <Text style={styles.bold}>Hệ số 210% - 300%</Text>: Tăng ca vào ban đêm của ngày nghỉ hàng tuần hoặc làm việc vào ngày Lễ/Tết theo quy định Bộ luật Lao động.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.slate900,
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 12,
    color: theme.colors.slate500,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  kpiCol: {
    marginBottom: 2,
  },
  toolbarCard: {
    padding: 12,
    borderRadius: theme.radius.lg,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.slate900,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.slate100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate600,
  },
  pillTextActive: {
    color: theme.colors.primary,
  },
  tableCard: {
    padding: 16,
    borderRadius: theme.radius.xl,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  tableHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.slate900,
    letterSpacing: 0.3,
  },
  recordCountText: {
    fontSize: 11,
    color: theme.colors.slate500,
    fontWeight: '600',
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.slate800,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.slate500,
    marginTop: 4,
  },
  swipeHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  horizontalScroll: {
    width: '100%',
  },
  table: {
    minWidth: 740,
    marginTop: 8,
  },
  tHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderColor: theme.colors.border,
  },
  th: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.slate500,
    letterSpacing: 0.5,
  },
  tRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  tRowAlt: {
    backgroundColor: theme.colors.slate50,
  },
  td: {
    fontSize: 12,
    color: theme.colors.slate800,
    fontWeight: '600',
  },
  dateCell: {
    fontWeight: '800',
    color: theme.colors.slate900,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  badge150: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  badgeText150: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  badge200: {
    backgroundColor: theme.colors.purpleSoft,
    borderWidth: 1,
    borderColor: theme.colors.purpleBorder,
  },
  badgeText200: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.purpleDark,
  },
  badge210: {
    backgroundColor: theme.colors.dangerSoft,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
  },
  badgeText210: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.dangerDark,
  },
  dashText: {
    color: theme.colors.slate300,
    fontSize: 12,
  },
  totalOtCell: {
    fontWeight: '900',
    color: theme.colors.primary,
  },
  noteText: {
    fontSize: 11,
    color: theme.colors.slate500,
  },
  infoCard: {
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.3,
  },
  infoList: {
    gap: 4,
  },
  infoItem: {
    fontSize: 11,
    color: theme.colors.slate700,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '800',
    color: theme.colors.slate900,
  },
});
