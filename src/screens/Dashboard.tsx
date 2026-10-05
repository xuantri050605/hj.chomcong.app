import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAttendanceStore } from '../store/attendanceStore';
import { useSalaryStore } from '../store/salaryStore';
import { calculatePayroll } from '../engine/payrollCalculator';
import { computeWorkedHours } from '../engine/attendanceCalculator';
import { computeOvertimeForDay } from '../engine/overtimeCalculator';
import { formatVND } from '../utils/format';
import Card from '../components/Card';
import MonthSelector from '../components/MonthSelector';
import StatCard from '../components/StatCard';
import { theme } from '../theme/theme';

type Props = { onOpenAttendance: () => void; onOpenPayroll: () => void };

const dateLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const barWidth = (value: number, total: number) =>
  `${Math.min(100, Math.max(0, total > 0 ? (value / total) * 100 : 0))}%`;

export default function Dashboard({ onOpenAttendance, onOpenPayroll }: Props) {
  const { items, month, selectMonth } = useAttendanceStore();
  const config = useSalaryStore((state) => state.config);

  // Dashboard consumes the established engine result; it does not recreate pay rules.
  const payroll = calculatePayroll(items, config);

  const summary = useMemo(() => {
    const pn = items.filter((item) => item.leaveType === 'PN' || item.leaveCode === 'PN').length;
    const worked = items.filter((item) => Boolean(item.shift?.start) && item.leaveType !== 'PN').length;
    const rest = items.filter((item) => item.dayType === 'WEEKLY_OFF' || item.dayType === 'HOLIDAY').length;
    const recent = [...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return { pn, worked, rest, recent };
  }, [items]);

  const totalHours = +(
    payroll.normalHours +
    payroll.nightHours130 +
    payroll.ot150Hours +
    payroll.ot200Hours +
    payroll.ot210Hours
  ).toFixed(2);

  const workDays = summary.worked + summary.pn;
  const totalOtHours = +(payroll.ot150Hours + payroll.ot200Hours + payroll.ot210Hours).toFixed(2);
  const completionPercent = Math.min(100, Math.round((workDays / 26) * 100));

  const hourRows = [
    { label: 'Giờ chuẩn', value: payroll.normalHours, color: theme.colors.primary, icon: 'time-outline' },
    { label: 'Ca đêm', value: payroll.nightHours130, color: theme.colors.purple, icon: 'moon-outline' },
    { label: 'OT 150%', value: payroll.ot150Hours, color: theme.colors.warning, icon: 'trending-up-outline' },
    { label: 'OT 200%', value: payroll.ot200Hours, color: '#EA580C', icon: 'flame-outline' },
    { label: 'OT 210%', value: payroll.ot210Hours, color: theme.colors.danger, icon: 'flash-outline' },
  ] as const;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Greeting Banner */}
      <View style={styles.greetingCard}>
        <View style={{ flex: 1 }}>
          <View style={styles.greetingBadge}>
            <Ionicons name="star" size={13} color={theme.colors.primary} />
            <Text style={styles.greetingBadgeText}>Bảng tin chấm công</Text>
          </View>
          <Text style={styles.hello}>Xin chào, Trí 👋</Text>
          <Text style={styles.subhead}>Theo dõi tiến độ công và thu nhập chính xác</Text>
        </View>
        <View style={styles.avatarGlow}>
          <Text style={styles.avatarText}>T</Text>
        </View>
      </View>

      {/* Month Selector */}
      <MonthSelector month={month} onChange={selectMonth} />

      {/* KPI Grid */}
      <View style={styles.kpis}>
        <View style={styles.kpiCol}>
          <StatCard
            title="NGÀY CÔNG"
            value={`${workDays} / 26`}
            subtitle={`${completionPercent}% mục tiêu`}
            tone={theme.colors.primary}
            icon={<Ionicons name="calendar" size={16} color={theme.colors.primary} />}
          />
        </View>
        <View style={styles.kpiCol}>
          <StatCard
            title="TỔNG GIỜ LÀM"
            value={`${totalHours}h`}
            subtitle="Tổng các loại ca"
            tone={theme.colors.purple}
            icon={<Ionicons name="time" size={16} color={theme.colors.purple} />}
          />
        </View>
        <View style={styles.kpiCol}>
          <StatCard
            title="TĂNG CA (OT)"
            value={`${totalOtHours}h`}
            subtitle="Hưởng hệ số OT"
            tone={theme.colors.warning}
            icon={<Ionicons name="flame" size={16} color={theme.colors.warning} />}
          />
        </View>
        <View style={styles.kpiCol}>
          <StatCard
            title="DỰ KIẾN THỰC LĨNH"
            value={formatVND(payroll.net)}
            subtitle="Đã trừ BHXH"
            small
            tone={theme.colors.success}
            icon={<Ionicons name="wallet" size={16} color={theme.colors.success} />}
          />
        </View>
      </View>

      {/* Work Days Progress */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconBox, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="trending-up" size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>TIẾN ĐỘ CÔNG THÁNG</Text>
              <Text style={styles.sectionSub}>Kỳ công tiêu chuẩn 26 ngày</Text>
            </View>
          </View>
          <View style={styles.percentPill}>
            <Text style={styles.percentText}>{completionPercent}%</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: barWidth(workDays, 26) }]} />
        </View>

        <View style={styles.progressChips}>
          <View style={styles.chip}>
            <View style={[styles.chipDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.chipText}>{summary.worked} ngày đi làm</Text>
          </View>
          <View style={styles.chip}>
            <View style={[styles.chipDot, { backgroundColor: theme.colors.purple }]} />
            <Text style={styles.chipText}>{summary.pn} phép năm (PN)</Text>
          </View>
          <View style={styles.chip}>
            <View style={[styles.chipDot, { backgroundColor: theme.colors.slate400 }]} />
            <Text style={styles.chipText}>{summary.rest} ngày nghỉ</Text>
          </View>
        </View>
      </Card>

      {/* Hour Distribution */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconBox, { backgroundColor: theme.colors.purpleSoft }]}>
              <Ionicons name="pie-chart" size={18} color={theme.colors.purple} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>PHÂN BỔ GIỜ LÀM VIỆC</Text>
              <Text style={styles.sectionSub}>Tổng cộng {totalHours} giờ được ghi nhận</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 6 }}>
          {hourRows.map((row) => (
            <View key={row.label} style={styles.hourRow}>
              <View style={styles.hourLabelBox}>
                <Ionicons name={row.icon} size={15} color={row.color} style={{ marginRight: 6 }} />
                <Text style={styles.hourLabel}>{row.label}</Text>
              </View>
              <View style={styles.hourTrack}>
                <View
                  style={[
                    styles.hourFill,
                    {
                      width: barWidth(row.value, Math.max(totalHours, 1)),
                      backgroundColor: row.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.hourValue}>{row.value}h</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Recent Activity */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconBox, { backgroundColor: theme.colors.warningSoft }]}>
              <Ionicons name="list" size={18} color={theme.colors.warning} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>HOẠT ĐỘNG GẦN ĐÂY</Text>
              <Text style={styles.sectionSub}>5 bản ghi chấm công mới nhất</Text>
            </View>
          </View>
        </View>

        {summary.recent.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="calendar-outline" size={32} color={theme.colors.slate300} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có dữ liệu chấm công</Text>
            <Text style={styles.emptySub}>Hãy bắt đầu vào ca hoặc nhập giờ thủ công cho tháng này</Text>
          </View>
        ) : (
          <View style={{ marginTop: 4 }}>
            {summary.recent.map((item, idx) => {
              const hours = computeWorkedHours(item);
              const overtime = computeOvertimeForDay(item);
              const ot = overtime.ot150 + overtime.ot200 + overtime.ot210;

              const isPN = item.leaveType === 'PN' || item.leaveCode === 'PN';
              const isUnpaid = item.leaveType === 'UNPAID';
              const isOther = item.leaveType === 'OTHER';
              const isHoliday = item.dayType === 'HOLIDAY';
              const isWeeklyOff = item.dayType === 'WEEKLY_OFF';

              const status = isPN
                ? 'Nghỉ phép năm (PN)'
                : isUnpaid
                ? 'Nghỉ không lương'
                : isOther
                ? 'Nghỉ khác'
                : isHoliday
                ? 'Nghỉ lễ'
                : isWeeklyOff
                ? 'Nghỉ tuần'
                : item.shift?.start
                ? `${item.shift.start} → ${item.shift.end || 'Đang làm'}`
                : 'Chưa có giờ';

              return (
                <View
                  key={item.date}
                  style={[
                    styles.activityRow,
                    idx === summary.recent.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateDay}>{item.date.slice(8, 10)}</Text>
                    <Text style={styles.dateMonth}>T{item.date.slice(5, 7)}</Text>
                  </View>

                  <View style={styles.activityInfo}>
                    <View style={styles.activityTitleRow}>
                      <Text style={styles.activityTitle}>{status}</Text>
                      {ot > 0 && (
                        <View style={styles.otBadge}>
                          <Text style={styles.otBadgeText}>OT +{ot}h</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.activityDetail}>
                      {isPN
                        ? '8h tính công · 100% lương'
                        : hours
                        ? `Đã làm ${hours} giờ`
                        : item.note || 'Không có ghi chú'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Quick Action Banners */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={onOpenAttendance}
          style={styles.primaryActionCard}
        >
          <View style={styles.actionIconPill}>
            <Ionicons name="finger-print-outline" size={24} color={theme.colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryActionTitle}>CHẤM CÔNG NGÀY</Text>
            <Text style={styles.primaryActionDesc}>Xem lịch & ghi nhận giờ làm</Text>
          </View>
          <View style={styles.actionArrowCircle}>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={onOpenPayroll}
          style={styles.secondaryActionCard}
        >
          <View style={[styles.actionIconPill, { backgroundColor: theme.colors.successSoft }]}>
            <Ionicons name="wallet-outline" size={24} color={theme.colors.successDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.secondaryActionTitle}>BẢNG LƯƠNG CHI TIẾT</Text>
            <Text style={styles.secondaryActionDesc}>Xem phiếu lương & phụ cấp</Text>
          </View>
          <View style={[styles.actionArrowCircle, { backgroundColor: theme.colors.slate100 }]}>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.slate700} />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    padding: 16,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  greetingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    gap: 4,
    marginBottom: 6,
  },
  greetingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  hello: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.slate900,
    letterSpacing: -0.3,
  },
  subhead: {
    fontSize: 12,
    color: theme.colors.slate500,
    marginTop: 2,
    fontWeight: '500',
  },
  avatarGlow: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glow(theme.colors.primary),
  },
  avatarText: {
    fontWeight: '900',
    color: theme.colors.white,
    fontSize: 20,
  },
  kpis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCol: {
    width: '48.1%',
  },
  sectionCard: {
    padding: 18,
    borderRadius: theme.radius.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: theme.colors.slate900,
  },
  sectionSub: {
    fontSize: 11,
    color: theme.colors.slate400,
    marginTop: 1,
  },
  percentPill: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  progressTrack: {
    height: 12,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.slate100,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
  },
  progressChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.slate600,
    fontWeight: '600',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  hourLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  hourLabel: {
    fontSize: 12,
    color: theme.colors.slate700,
    fontWeight: '600',
  },
  hourTrack: {
    flex: 1,
    height: 8,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    backgroundColor: theme.colors.slate100,
    marginHorizontal: 8,
  },
  hourFill: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
  hourValue: {
    width: 50,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.slate800,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.slate700,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.slate400,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate100,
    gap: 12,
  },
  dateBadge: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  dateDay: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    lineHeight: 17,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryLight,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.slate900,
  },
  otBadge: {
    backgroundColor: theme.colors.warningSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.full,
  },
  otBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.warningDark,
  },
  activityDetail: {
    fontSize: 11,
    color: theme.colors.slate500,
    marginTop: 2,
  },
  actionGrid: {
    gap: 12,
  },
  primaryActionCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...theme.shadows.glow(theme.colors.primary),
  },
  actionIconPill: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionTitle: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  primaryActionDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  actionArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  secondaryActionTitle: {
    color: theme.colors.slate900,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryActionDesc: {
    color: theme.colors.slate500,
    fontSize: 12,
    marginTop: 2,
  },
});
