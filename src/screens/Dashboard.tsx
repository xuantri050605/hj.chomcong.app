import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAttendanceStore } from '../store/attendanceStore';
import { useSalaryStore } from '../store/salaryStore';
import { useAuthStore } from '../store/authStore';
import { calculatePayroll } from '../engine/payrollCalculator';
import { buildCalendarDays } from '../engine/calendarProjection';
import { formatVND } from '../utils/format';
import Card from '../components/Card';
import MonthSelector from '../components/MonthSelector';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import { theme } from '../theme/theme';
import { localDateKey } from '../utils/monthUtils';
import { AppRoute } from '../utils/navigationState';

interface DashboardProps {
  onNavigate?: (route: AppRoute) => void;
  onOpenAttendance?: () => void;
  onOpenPayroll?: () => void;
  onOpenNotifications?: () => void;
}

export default function Dashboard({
  onNavigate,
  onOpenAttendance,
  onOpenPayroll,
  onOpenNotifications,
}: DashboardProps) {
  const { items, month, selectMonth, clockIn, clockOut } = useAttendanceStore();
  const config = useSalaryStore((state) => state.config);
  const profile = useAuthStore((state) => state.profile);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const today = localDateKey(new Date());
  const todayRec = items.find((item) => item.date === today);

  const payroll = useMemo(() => calculatePayroll(items, config), [items, config]);
  const calendarDays = useMemo(() => buildCalendarDays(month, items), [month, items]);

  const summary = useMemo(() => {
    const pn = items.filter((item) => item.leaveType === 'PN' || item.leaveCode === 'PN').length;
    const worked = items.filter((item) => Boolean(item.shift?.start) && item.leaveType !== 'PN').length;
    const unpaid = items.filter((item) => item.leaveType === 'UNPAID' || item.leaveCode === 'UNPAID').length;
    const holidays = items.filter((item) => item.dayType === 'HOLIDAY').length;
    const weeklyOff = items.filter((item) => item.dayType === 'WEEKLY_OFF').length;
    const actualWorkDays = worked + pn;
    const targetDays = 26;
    const progressPercent = Math.min(100, Math.round((actualWorkDays / targetDays) * 100));

    return {
      pn,
      worked,
      unpaid,
      holidays,
      weeklyOff,
      actualWorkDays,
      targetDays,
      progressPercent,
    };
  }, [items]);

  const totalHours = +(
    payroll.normalHours +
    payroll.nightHours130 +
    payroll.ot150Hours +
    payroll.ot200Hours +
    payroll.ot210Hours
  ).toFixed(2);

  const totalOtHours = +(payroll.ot150Hours + payroll.ot200Hours + payroll.ot210Hours).toFixed(2);

  const handleQuickNav = (dest: AppRoute) => {
    if (onNavigate) {
      onNavigate(dest);
    } else if (dest === 'Attendance' && onOpenAttendance) {
      onOpenAttendance();
    } else if (dest === 'Payroll' && onOpenPayroll) {
      onOpenPayroll();
    }
  };

  const isClockedIn = Boolean(todayRec?.shift?.start && !todayRec?.shift?.end);
  const isClockedDone = Boolean(todayRec?.shift?.start && todayRec?.shift?.end);

  const kpiWidth = isDesktop ? ('23.8%' as const) : width >= 380 ? ('48.2%' as const) : ('100%' as const);

  const renderClockActionCard = () => (
    <Card style={styles.clockActionCard}>
      <View style={[styles.clockHeader, !isDesktop && styles.clockHeaderMobile]}>
        <View style={styles.clockLeftSection}>
          <View
            style={[
              styles.clockIconBox,
              isClockedIn && styles.clockIconBoxWorking,
              isClockedDone && styles.clockIconBoxDone,
            ]}
          >
            <Ionicons
              name={isClockedIn ? 'radio' : isClockedDone ? 'checkmark-circle' : 'finger-print'}
              size={22}
              color={
                isClockedIn
                  ? theme.colors.warning
                  : isClockedDone
                  ? theme.colors.success
                  : theme.colors.primary
              }
            />
          </View>
          <View style={styles.clockTextWrap}>
            <Text style={styles.clockCardTitle}>
              {isClockedIn
                ? 'ĐANG TRONG CA LÀM VIỆC'
                : isClockedDone
                ? 'CA HÔM NAY ĐÃ HOÀN TẤT'
                : 'CHẤM CÔNG HÔM NAY'}
            </Text>
            <Text style={styles.clockCardDesc}>
              {isClockedIn
                ? `Đã vào ca lúc ${todayRec?.shift?.start}. Đừng quên bấm kết thúc ca khi ra về!`
                : isClockedDone
                ? `Thời gian: ${todayRec?.shift?.start} → ${todayRec?.shift?.end}. Ca làm đã được ghi nhận vào bảng lương.`
                : 'Ghi nhận giờ vào ca làm việc tiêu chuẩn HOJEONG (08:00 - 17:00).'}
            </Text>
          </View>
        </View>
        <View style={!isDesktop ? styles.clockButtonFull : styles.clockButtonDesktop}>
          {isClockedIn ? (
            <Button
              title="KẾT THÚC CA (CHECK-OUT)"
              variant="danger"
              size="md"
              icon={<Ionicons name="log-out-outline" size={18} color={theme.colors.white} />}
              onPress={() => void clockOut()}
              style={!isDesktop ? { width: '100%' } : undefined}
            />
          ) : isClockedDone ? (
            <Button
              title="Xem chi tiết ca"
              variant="secondary"
              size="md"
              icon={<Ionicons name="eye-outline" size={18} color={theme.colors.slate700} />}
              onPress={() => handleQuickNav('Attendance')}
              style={!isDesktop ? { width: '100%' } : undefined}
            />
          ) : (
            <Button
              title="VÀO CA NGAY (CHECK-IN)"
              variant="primary"
              size="md"
              icon={<Ionicons name="log-in-outline" size={18} color={theme.colors.white} />}
              onPress={() => void clockIn()}
              style={!isDesktop ? { width: '100%' } : undefined}
            />
          )}
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.content, !isDesktop && styles.contentMobile]}
        showsVerticalScrollIndicator={false}
      >
        {/* Corporate Branding Banner with Factory Architecture - Always Visible */}
        <View style={[styles.corporateBanner, !isDesktop && styles.corporateBannerMobile]}>
          <View style={[styles.bannerLeft, !isDesktop && styles.bannerLeftMobile]}>
            <View style={styles.badgeRow}>
              <View style={styles.corpBadge}>
                <Text style={styles.corpBadgeText}>HOJEONG ENTERPRISE</Text>
              </View>
              <Text style={styles.systemStatusText}>• Hệ thống vận hành ổn định</Text>
            </View>

            <View style={styles.mainTitleRow}>
              <Text style={styles.mainTitle}>Chấm công – Tính lương </Text>
              <Text style={styles.mainTitleRed}>HOJEONG</Text>
            </View>

            <Text style={styles.subtitle}>
              Hệ thống quản lý nhân sự & công lương doanh nghiệp
            </Text>

            {/* Feature Pills */}
            <View style={styles.featurePillsRow}>
              <View style={styles.featurePill}>
                <Ionicons name="flash" size={13} color={theme.colors.primary} />
                <Text style={styles.featurePillText}>Chính xác</Text>
              </View>
              <View style={styles.featurePill}>
                <Ionicons name="shield-checkmark" size={13} color={theme.colors.primary} />
                <Text style={styles.featurePillText}>Ổn định</Text>
              </View>
              <View style={styles.featurePill}>
                <Ionicons name="layers" size={13} color={theme.colors.primary} />
                <Text style={styles.featurePillText}>Hiệu quả</Text>
              </View>
              <View style={styles.featurePill}>
                <Ionicons name="people" size={13} color={theme.colors.primary} />
                <Text style={styles.featurePillText}>Dễ sử dụng</Text>
              </View>
            </View>
          </View>

          {/* Right/Bottom: Modern HOJEONG Factory Banner Image */}
          <View style={[styles.bannerRight, !isDesktop && styles.bannerRightMobile]}>
            <View
              style={[
                styles.factoryImageWrapper,
                !isDesktop && styles.factoryImageWrapperMobile,
              ]}
            >
              <Image
                source={require('../../assets/images/hojeong_factory_banner.jpg')}
                style={styles.factoryImage}
                resizeMode="cover"
                accessibilityLabel="Nhà máy hiện đại HOJEONG"
              />
              <View style={styles.factoryOverlayTag}>
                <View style={styles.factoryTagDot} />
                <Text style={styles.factoryTagText}>HOJEONG FACTORY CAMPUS</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Mobile View: Sleek Modern Hero Greeting */}
        {!isDesktop && (
          <View style={styles.mobileHeroCard}>
            <View style={styles.mobileHeroTop}>
              <View style={styles.mobileAvatarBox}>
                <Ionicons name="person" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.mobileHeroTextWrap}>
                <Text style={styles.mobileGreetingText} numberOfLines={1}>
                  Xin chào, {profile?.fullName || 'bạn'}! 👋
                </Text>
                <Text style={styles.mobileDateText}>
                  {new Date().toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}{' '}
                  • HOJEONG
                </Text>
              </View>
              <View
                style={[
                  styles.mobileShiftBadge,
                  isClockedIn
                    ? styles.badgeWorking
                    : isClockedDone
                    ? styles.badgeDone
                    : styles.badgeIdle,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    isClockedIn
                      ? styles.dotWorking
                      : isClockedDone
                      ? styles.dotDone
                      : styles.dotIdle,
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    isClockedIn
                      ? styles.textWorking
                      : isClockedDone
                      ? styles.textDone
                      : styles.textIdle,
                  ]}
                >
                  {isClockedIn ? 'Đang làm' : isClockedDone ? 'Xong ca' : 'Chưa vào'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Priority Check-in Action Card on Mobile (First Thing Worker Sees!) */}
        {!isDesktop && renderClockActionCard()}

        {/* Month Selector */}
        <MonthSelector month={month} onChange={selectMonth} />

        {/* 4 Primary KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="NGÀY CÔNG"
              value={`${summary.actualWorkDays} / ${summary.targetDays}`}
              subtitle={`${summary.progressPercent}% mục tiêu tháng`}
              tone={theme.colors.primary}
              icon={<Ionicons name="calendar-outline" size={17} color={theme.colors.primary} />}
            />
          </View>

          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="TỔNG GIỜ LÀM"
              value={`${totalHours}h`}
              subtitle={`Giờ chuẩn: ${payroll.normalHours}h`}
              tone={theme.colors.purple}
              icon={<Ionicons name="time-outline" size={17} color={theme.colors.purple} />}
            />
          </View>

          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="TĂNG CA (OT)"
              value={`${totalOtHours}h`}
              subtitle={`OT 150%: ${payroll.ot150Hours}h • 200%: ${payroll.ot200Hours}h`}
              tone="#EA580C"
              icon={<Ionicons name="trending-up-outline" size={17} color="#EA580C" />}
            />
          </View>

          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="DỰ KIẾN THỰC LĨNH"
              value={formatVND(payroll.netPay)}
              subtitle={`Tổng thu nhập: ${formatVND(payroll.grossPay)}`}
              tone={theme.colors.success}
              icon={<Ionicons name="cash-outline" size={17} color={theme.colors.success} />}
            />
          </View>
        </View>

        {/* Desktop Check-in Action Card Placement */}
        {isDesktop && renderClockActionCard()}

        {/* 2-Column Desktop Grid for Section A & Section D */}
        <View style={isDesktop ? styles.rowCols : styles.colStack}>
          {/* Section A: Tiến độ công tháng */}
          <Card style={[styles.sectionCard, isDesktop && { flex: 1.2 }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleWrap}>
                <Ionicons name="bar-chart-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.cardTitleText}>TIẾN ĐỘ CÔNG THÁNG</Text>
              </View>
              <Text style={styles.progressPercentText}>{summary.progressPercent}%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${summary.progressPercent}%`, backgroundColor: theme.colors.primary },
                ]}
              />
            </View>

            <View style={styles.progressStatsGrid}>
              <View style={styles.progressStatItem}>
                <Text style={styles.pStatLabel}>Mục tiêu công</Text>
                <Text style={styles.pStatValue}>{summary.targetDays} ngày</Text>
              </View>
              <View style={styles.progressStatDivider} />
              <View style={styles.progressStatItem}>
                <Text style={styles.pStatLabel}>Đã tích lũy</Text>
                <Text style={[styles.pStatValue, { color: theme.colors.primary }]}>
                  {summary.actualWorkDays} ngày
                </Text>
              </View>
              <View style={styles.progressStatDivider} />
              <View style={styles.progressStatItem}>
                <Text style={styles.pStatLabel}>Còn lại</Text>
                <Text style={styles.pStatValue}>
                  {Math.max(0, summary.targetDays - summary.actualWorkDays)} ngày
                </Text>
              </View>
            </View>
          </Card>

          {/* Section D: Chức năng nhanh */}
          <Card style={[styles.sectionCard, isDesktop && { flex: 1 }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleWrap}>
                <Ionicons name="apps-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.cardTitleText}>CHỨC NĂNG NHANH</Text>
              </View>
            </View>

            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => handleQuickNav('Attendance')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickIconBox, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name="calendar" size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.quickBtnText}>Chấm công</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => handleQuickNav('Overtime')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickIconBox, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="time" size={18} color="#EA580C" />
                </View>
                <Text style={styles.quickBtnText}>Tăng ca (OT)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => handleQuickNav('Payroll')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickIconBox, { backgroundColor: theme.colors.purpleSoft }]}>
                  <Ionicons name="wallet" size={18} color={theme.colors.purple} />
                </View>
                <Text style={styles.quickBtnText}>Bảng lương</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => handleQuickNav('History')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickIconBox, { backgroundColor: theme.colors.purpleSoft }]}>
                  <Ionicons name="time" size={18} color={theme.colors.purple} />
                </View>
                <Text style={styles.quickBtnText}>Lịch sử</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => handleQuickNav('Salary')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickIconBox, { backgroundColor: theme.colors.cyanSoft }]}>
                  <Ionicons name="options" size={18} color={theme.colors.cyan} />
                </View>
                <Text style={styles.quickBtnText}>Cấu hình</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => handleQuickNav('Reports')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickIconBox, { backgroundColor: theme.colors.slate100 }]}>
                  <Ionicons name="stats-chart" size={18} color={theme.colors.slate700} />
                </View>
                <Text style={styles.quickBtnText}>Báo cáo</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Section B & Section F: Lịch công tháng tóm tắt & Thống kê nhanh */}
        <View style={isDesktop ? styles.rowCols : styles.colStack}>
          {/* Section B: Lịch công tháng */}
          <Card style={[styles.sectionCard, isDesktop && { flex: 1.3 }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleWrap}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.cardTitleText}>LỊCH CÔNG THÁNG {month}</Text>
              </View>
              <TouchableOpacity onPress={() => handleQuickNav('Attendance')}>
                <Text style={styles.viewDetailLink}>Xem đầy đủ →</Text>
              </TouchableOpacity>
            </View>

            {/* Calendar Mini Grid */}
            <View style={styles.calendarMiniGrid}>
              {calendarDays.slice(0, 21).map((d) => {
                const isW = Boolean(d.attendance?.shift?.start);
                const isPn = d.attendance?.leaveType === 'PN';
                const isOff = d.dayType === 'WEEKLY_OFF' || d.dayType === 'HOLIDAY';
                return (
                  <View
                    key={d.date}
                    style={[
                      styles.miniDayCell,
                      isW && styles.miniDayWorked,
                      isPn && styles.miniDayPn,
                      isOff && styles.miniDayOff,
                      d.date === today && styles.miniDayToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniDayText,
                        isW && styles.miniDayTextWorked,
                        d.date === today && styles.miniDayTextToday,
                      ]}
                    >
                      {d.date.slice(-2)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                <Text style={styles.legendLabel}>Đi làm</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.legendLabel}>Phép năm</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
                <Text style={styles.legendLabel}>Nghỉ tuần / Lễ</Text>
              </View>
            </View>
          </Card>

          {/* Section F: Thống kê nhanh */}
          <Card style={[styles.sectionCard, isDesktop && { flex: 1 }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleWrap}>
                <Ionicons name="pie-chart-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.cardTitleText}>THỐNG KÊ CHI TIẾT</Text>
              </View>
            </View>

            <View style={styles.statDetailList}>
              <View style={styles.statDetailRow}>
                <Text style={styles.statDetailLabel}>Số ngày đi làm</Text>
                <Text style={[styles.statDetailVal, { color: theme.colors.successDark }]}>
                  {summary.worked} ngày
                </Text>
              </View>
              <View style={styles.statDetailRow}>
                <Text style={styles.statDetailLabel}>Phép năm hưởng lương (PN)</Text>
                <Text style={[styles.statDetailVal, { color: theme.colors.primary }]}>
                  {summary.pn} ngày
                </Text>
              </View>
              <View style={styles.statDetailRow}>
                <Text style={styles.statDetailLabel}>Nghỉ không lương (K/L)</Text>
                <Text style={styles.statDetailVal}>{summary.unpaid} ngày</Text>
              </View>
              <View style={styles.statDetailRow}>
                <Text style={styles.statDetailLabel}>Nghỉ hàng tuần (Chủ nhật)</Text>
                <Text style={styles.statDetailVal}>{summary.weeklyOff} ngày</Text>
              </View>
              <View style={styles.statDetailRow}>
                <Text style={styles.statDetailLabel}>Thưởng chuyên cần dự kiến</Text>
                <Text style={[styles.statDetailVal, { color: theme.colors.primary, fontWeight: '900' }]}>
                  {formatVND(payroll.attendanceBonus)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Section E: Thông báo hệ thống */}
        <Card style={styles.announcementCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenNotifications}
            style={styles.announceHeader}
            accessibilityRole="button"
            accessibilityLabel="Mở danh sách thông báo hệ thống"
          >
            <View style={styles.announceHeaderLeft}>
              <Ionicons name="notifications" size={18} color={theme.colors.primary} />
              <Text style={styles.announceTitle}>THÔNG BÁO VẬN HÀNH DOANH NGHIỆP HOJEONG</Text>
            </View>
            {onOpenNotifications && (
              <View style={styles.announceViewAll}>
                <Text style={styles.announceViewAllText}>Xem tất cả</Text>
                <Ionicons name="chevron-forward" size={13} color={theme.colors.primary} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.announceContent}>
            <Text style={styles.announceText}>
              • Kỳ chốt công tháng {month} diễn ra vào ngày cuối cùng của tháng. Vui lòng kiểm tra và hoàn thành các bản ghi chấm công.
            </Text>
            <Text style={styles.announceText}>
              • Hệ thống tự động tính lương theo biểu mẫu pháp quy Bộ luật Lao động, bao gồm bảo hiểm 10.5% và hệ số làm đêm, tăng ca.
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
  contentMobile: {
    padding: 12,
    gap: 12,
    paddingBottom: 85,
  },
  mobileHeroCard: {
    backgroundColor: theme.colors.white,
    padding: 14,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      },
    }),
  },
  mobileHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileAvatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  mobileHeroTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  mobileGreetingText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.slate900,
    letterSpacing: -0.2,
  },
  mobileDateText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.slate500,
    marginTop: 2,
  },
  mobileShiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  badgeWorking: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgeDone: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  badgeIdle: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotWorking: {
    backgroundColor: theme.colors.success,
  },
  dotDone: {
    backgroundColor: theme.colors.purple,
  },
  dotIdle: {
    backgroundColor: theme.colors.warning,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textWorking: {
    color: theme.colors.successDark,
  },
  textDone: {
    color: theme.colors.purple,
  },
  textIdle: {
    color: theme.colors.warningDark,
  },
  clockIconBoxWorking: {
    backgroundColor: '#FEF3C7',
  },
  clockIconBoxDone: {
    backgroundColor: '#D1FAE5',
  },
  corporateBanner: {
    backgroundColor: theme.colors.white,
    padding: 16,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  corporateBannerMobile: {
    padding: 14,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  bannerLeft: {
    flex: 1,
    minWidth: 260,
  },
  bannerLeftMobile: {
    minWidth: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  corpBadge: {
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  corpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  systemStatusText: {
    fontSize: 11,
    color: theme.colors.successDark,
    fontWeight: '600',
  },
  mainTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.slate900,
    letterSpacing: 0.3,
  },
  mainTitleRed: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.slate500,
    marginTop: 2,
  },
  featurePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.md,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate700,
  },
  bannerRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bannerRightMobile: {
    width: '100%',
    alignItems: 'stretch',
    marginTop: 8,
  },
  factoryImageWrapper: {
    width: 380,
    height: 125,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.slate100,
  },
  factoryImageWrapperMobile: {
    width: '100%',
    height: 150,
  },
  factoryImage: {
    width: '100%',
    height: '100%',
  },
  factoryOverlayTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(215, 25, 32, 0.25)',
  },
  factoryTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  factoryTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
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
  clockActionCard: {
    padding: 16,
    borderRadius: theme.radius.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryBorder,
    backgroundColor: theme.colors.white,
    minWidth: 0,
  },
  clockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  clockHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  clockLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  clockTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  clockIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  clockCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.slate900,
    letterSpacing: 0.3,
  },
  clockCardDesc: {
    fontSize: 12,
    color: theme.colors.slate600,
    marginTop: 2,
    lineHeight: 16,
  },
  clockButtonDesktop: {
    flexShrink: 0,
  },
  clockButtonFull: {
    width: '100%',
    marginTop: 4,
  },
  rowCols: {
    flexDirection: 'row',
    gap: 14,
  },
  colStack: {
    flexDirection: 'column',
    gap: 14,
  },
  sectionCard: {
    padding: 16,
    borderRadius: theme.radius.xl,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.slate900,
    letterSpacing: 0.4,
  },
  progressPercentText: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.slate100,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  progressStatItem: {
    alignItems: 'center',
  },
  pStatLabel: {
    fontSize: 11,
    color: theme.colors.slate400,
    fontWeight: '600',
  },
  pStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.slate900,
    marginTop: 2,
  },
  progressStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  quickActionBtn: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  quickIconBox: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate700,
  },
  viewDetailLink: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  calendarMiniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 10,
  },
  miniDayCell: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: theme.colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDayWorked: {
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1,
    borderColor: theme.colors.successBorder,
  },
  miniDayPn: {
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  miniDayOff: {
    backgroundColor: theme.colors.slate200,
  },
  miniDayToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  miniDayText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.slate600,
  },
  miniDayTextWorked: {
    color: theme.colors.successDark,
  },
  miniDayTextToday: {
    color: theme.colors.primary,
    fontWeight: '900',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 10,
    color: theme.colors.slate500,
    fontWeight: '600',
  },
  statDetailList: {
    gap: 8,
  },
  statDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  statDetailLabel: {
    fontSize: 12,
    color: theme.colors.slate600,
    fontWeight: '600',
  },
  statDetailVal: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.slate800,
  },
  announcementCard: {
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  announceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  announceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  announceViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  announceViewAllText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  announceTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  announceContent: {
    gap: 4,
  },
  announceText: {
    fontSize: 11,
    color: theme.colors.slate700,
    lineHeight: 18,
  },
});
