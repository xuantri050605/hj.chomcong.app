import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAttendanceStore } from '../store/attendanceStore';
import { useSalaryStore } from '../store/salaryStore';
import { calculatePayroll } from '../engine/payrollCalculator';
import MonthSelector from '../components/MonthSelector';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import { theme } from '../theme/theme';
import { formatVND } from '../utils/format';
import { exportAttendanceToCsv } from '../utils/csvExporter';
import { useAuthStore } from '../store/authStore';
import { exportProfessionalAttendanceWorkbook } from '../services/excel/excelExporterService';

export default function ReportsScreen() {
  const { items, month, selectMonth } = useAttendanceStore();
  const config = useSalaryStore((state) => state.config);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const payroll = useMemo(() => calculatePayroll(items, config), [items, config]);
  const otTotalPay =
    (payroll.ot150Pay || 0) +
    (payroll.ot200Pay || 0) +
    (payroll.ot210Pay || 0) +
    (payroll.weeklyOffPay || 0) +
    (payroll.holidayPay || 0);

  const summary = useMemo(() => {
    const totalRecords = items.length;
    const workedDays = items.filter((i) => Boolean(i.shift?.start) && i.leaveType !== 'PN').length;
    const pnDays = items.filter((i) => i.leaveType === 'PN' || i.leaveCode === 'PN').length;
    const unpaidDays = items.filter((i) => i.leaveType === 'UNPAID' || i.leaveCode === 'UNPAID').length;
    const holidayDays = items.filter((i) => i.dayType === 'HOLIDAY').length;
    const weeklyOffDays = items.filter((i) => i.dayType === 'WEEKLY_OFF').length;

    const totalOtHours = +(payroll.ot150Hours + payroll.ot200Hours + payroll.ot210Hours).toFixed(2);
    const standardTargetDays = 26;
    const actualWorkDays = workedDays + pnDays;
    const attendanceRate = Math.min(100, Math.round((actualWorkDays / standardTargetDays) * 100));

    return {
      totalRecords,
      workedDays,
      pnDays,
      unpaidDays,
      holidayDays,
      weeklyOffDays,
      totalOtHours,
      actualWorkDays,
      attendanceRate,
    };
  }, [items, payroll]);

  const profile = useAuthStore((state) => state.profile);

  const handleExportReport = async () => {
    const res = await exportProfessionalAttendanceWorkbook(month, items, config, {
      employeeCode: profile?.id ? `HJ-${profile.id.slice(0, 5).toUpperCase()}` : 'HJ-001',
      employeeName: profile?.fullName || 'Nhân viên HOJEONG',
      department: 'Bộ phận sản xuất',
    });
    if (!res.success) {
      Alert.alert('Lỗi đối soát dữ liệu xuất Excel', res.error || 'Không thể xuất bảng công Excel');
    } else if (Platform.OS !== 'web') {
      Alert.alert(
        'Xuất báo cáo thành công',
        `Báo cáo tổng hợp chấm công tháng ${month} của hệ thống HOJEONG đã được tạo sẵn sàng (file: ${res.fileName}).`
      );
    }
  };

  const kpiWidth = isDesktop ? ('23.8%' as const) : width >= 380 ? ('48.2%' as const) : ('100%' as const);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="stats-chart" size={22} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.pageTitle}>BÁO CÁO QUẢN TRỊ & CÔNG LƯƠNG</Text>
              <Text style={styles.pageSubtitle}>
                Thống kê chi tiết chuyên cần, giờ công và phân tích chi phí nhân sự HOJEONG
              </Text>
            </View>
          </View>

          <Button
            title="Xuất báo cáo tổng hợp"
            variant="primary"
            size="md"
            icon={<Ionicons name="download-outline" size={16} color={theme.colors.white} />}
            onPress={handleExportReport}
          />
        </View>

        {/* Month Selector */}
        <MonthSelector month={month} onChange={selectMonth} />

        {/* Top KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="TỶ LỆ CHUYÊN CẦN"
              value={`${summary.attendanceRate}%`}
              subtitle={`${summary.actualWorkDays} / 26 ngày công`}
              tone={theme.colors.success}
              icon={<Ionicons name="checkmark-done-circle" size={16} color={theme.colors.success} />}
            />
          </View>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="TỔNG GIỜ LÀM VIỆC"
              value={`${payroll.normalHours}h`}
              subtitle="Giờ chuẩn trong ca"
              tone={theme.colors.primary}
              icon={<Ionicons name="time" size={16} color={theme.colors.primary} />}
            />
          </View>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="TỔNG GIỜ TĂNG CA"
              value={`${summary.totalOtHours}h`}
              subtitle="OT 150% + 200% + 210%"
              tone="#EA580C"
              icon={<Ionicons name="trending-up" size={16} color="#EA580C" />}
            />
          </View>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="TỔNG THỰC LĨNH"
              value={formatVND(payroll.netPay)}
              subtitle="Sau các khoản trích nộp"
              tone={theme.colors.purple}
              icon={<Ionicons name="cash" size={16} color={theme.colors.purple} />}
            />
          </View>
        </View>

        {/* Attendance Breakdown Analysis */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderTitleRow}>
              <Ionicons name="pie-chart-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>PHÂN TÍCH CƠ CẤU NGÀY CÔNG & NGHỈ PHÉP</Text>
            </View>
            <Text style={styles.cardSub}>Chu kỳ: {month}</Text>
          </View>

          <View style={styles.breakdownGrid}>
            <View style={styles.barItem}>
              <View style={styles.barHeader}>
                <Text style={styles.barLabel}>Ngày đi làm thực tế</Text>
                <Text style={[styles.barVal, { color: theme.colors.successDark }]}>
                  {summary.workedDays} ngày
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(100, (summary.workedDays / 26) * 100)}%`,
                      backgroundColor: theme.colors.success,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.barItem}>
              <View style={styles.barHeader}>
                <Text style={styles.barLabel}>Phép năm có hưởng lương (PN)</Text>
                <Text style={[styles.barVal, { color: theme.colors.primary }]}>
                  {summary.pnDays} ngày
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(100, (summary.pnDays / 5) * 100)}%`,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.barItem}>
              <View style={styles.barHeader}>
                <Text style={styles.barLabel}>Nghỉ tuần quy định (Chủ nhật/Off)</Text>
                <Text style={[styles.barVal, { color: theme.colors.warningDark }]}>
                  {summary.weeklyOffDays} ngày
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(100, (summary.weeklyOffDays / 5) * 100)}%`,
                      backgroundColor: theme.colors.warning,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.barItem}>
              <View style={styles.barHeader}>
                <Text style={styles.barLabel}>Nghỉ không lương (K/L)</Text>
                <Text style={[styles.barVal, { color: theme.colors.slate600 }]}>
                  {summary.unpaidDays} ngày
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(100, (summary.unpaidDays / 5) * 100)}%`,
                      backgroundColor: theme.colors.slate400,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Cost Structure Summary Table */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderTitleRow}>
              <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>BẢNG ĐỐI SOÁT CHI TIẾT CÁC KHOẢN LƯƠNG & KHẤU TRỪ</Text>
            </View>
          </View>

          <View style={styles.costTable}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>1. Lương cơ bản theo ngày công thực tế</Text>
              <Text style={styles.costValue}>{formatVND(payroll.normalPay)}</Text>
            </View>
            <View style={[styles.costRow, styles.costRowAlt]}>
              <Text style={styles.costLabel}>2. Tiền lương làm thêm giờ (OT 150%, 200%, 210%)</Text>
              <Text style={[styles.costValue, { color: '#EA580C' }]}>
                {formatVND(otTotalPay)}
              </Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>3. Phụ cấp thâm niên công tác</Text>
              <Text style={styles.costValue}>{formatVND(payroll.seniorityAllowance)}</Text>
            </View>
            <View style={[styles.costRow, styles.costRowAlt]}>
              <Text style={styles.costLabel}>4. Phụ cấp sinh hoạt & đời sống</Text>
              <Text style={styles.costValue}>{formatVND(payroll.livingAllowance)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>5. Thưởng chuyên cần tháng</Text>
              <Text style={[styles.costValue, { color: theme.colors.successDark }]}>
                {formatVND(payroll.attendanceBonus)}
              </Text>
            </View>
            <View style={[styles.costRow, styles.costRowAlt]}>
              <Text style={[styles.costLabel, { fontWeight: '800' }]}>TỔNG THU NHẬP TRƯỚC GIẢM TRỪ</Text>
              <Text style={[styles.costValue, { fontWeight: '900', color: theme.colors.slate900 }]}>
                {formatVND(payroll.grossPay)}
              </Text>
            </View>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: theme.colors.danger }]}>
                6. Trích nộp BHXH / BHYT / BHTN (10.5%)
              </Text>
              <Text style={[styles.costValue, { color: theme.colors.danger }]}>
                - {formatVND(payroll.insuranceDeduction)}
              </Text>
            </View>
            <View style={[styles.costRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>LƯƠNG THỰC LĨNH HOJEONG</Text>
              <Text style={styles.totalValue}>{formatVND(payroll.netPay)}</Text>
            </View>
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
    flexWrap: 'wrap',
    gap: 10,
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
  sectionCard: {
    padding: 16,
    borderRadius: theme.radius.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.slate900,
    letterSpacing: 0.3,
  },
  cardSub: {
    fontSize: 11,
    color: theme.colors.slate500,
    fontWeight: '600',
  },
  breakdownGrid: {
    gap: 12,
  },
  barItem: {
    gap: 6,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.slate700,
  },
  barVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.slate100,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  costTable: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  costRowAlt: {
    backgroundColor: theme.colors.slate50,
  },
  costLabel: {
    fontSize: 12,
    color: theme.colors.slate700,
    fontWeight: '600',
  },
  costValue: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.slate800,
  },
  totalRow: {
    backgroundColor: theme.colors.primarySoft,
    borderBottomWidth: 0,
    paddingVertical: 12,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    letterSpacing: 0.3,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.primary,
  },
});
