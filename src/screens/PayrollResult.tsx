import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Share, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculatePayroll } from '../engine/payrollCalculator';
import { useAttendanceStore } from '../store/attendanceStore';
import { useSalaryStore } from '../store/salaryStore';
import { formatVND } from '../utils/format';
import { savePayroll } from '../utils/persistence';
import MonthSelector from '../components/MonthSelector';
import Card from '../components/Card';
import { theme } from '../theme/theme';

export default function PayrollResult() {
  const { items, month, selectMonth } = useAttendanceStore();
  const cfg = useSalaryStore((s) => s.config);
  const res = calculatePayroll(items, cfg);

  useEffect(() => {
    void savePayroll(month, res);
  }, [month, JSON.stringify(res)]);

  const sharePayslip = async () => {
    const text = `BẢNG LƯƠNG THÁNG ${month}\nTHU NHẬP THỰC LĨNH: ${formatVND(res.netPay)}\nTổng A (Thu nhập): ${formatVND(res.totalA)}\nTổng giảm trừ: ${formatVND(res.totalDeductions)}`;
    try {
      await Share.share({ message: text, title: `Bảng lương tháng ${month}` });
    } catch (e) {
      // ignore
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Title & Share Action */}
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <View style={styles.titleIconBadge}>
            <Ionicons name="receipt-outline" size={20} color={theme.colors.successDark} />
          </View>
          <View>
            <Text style={styles.title}>BẢNG LƯƠNG</Text>
            <Text style={styles.subtitle}>Chi tiết theo chuẩn bảng lương Excel</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={sharePayslip} style={styles.shareBtn}>
          <Ionicons name="share-social-outline" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Month Selector - GIỮ NGUYÊN */}
      <MonthSelector month={month} onChange={selectMonth} />

      {/* HERO CARD - THỰC LĨNH */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark" size={13} color={theme.colors.white} />
            <Text style={styles.heroBadgeText}>CHÍNH THỨC</Text>
          </View>
          <Text style={styles.heroMonthLabel}>KỲ LƯƠNG {month}</Text>
        </View>

        <Text style={styles.heroLabel}>THU NHẬP THỰC LĨNH</Text>
        <Text style={styles.heroAmount}>{formatVND(res.netPay)}</Text>

        <View style={styles.heroFooter}>
          <View style={styles.heroFooterItem}>
            <Text style={styles.heroFooterLabel}>Tổng A (Thu nhập)</Text>
            <Text style={styles.heroFooterVal}>{formatVND(res.totalA)}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroFooterItem}>
            <Text style={styles.heroFooterLabel}>Tổng giảm trừ</Text>
            <Text style={[styles.heroFooterVal, { color: '#FCA5A5' }]}>-{formatVND(res.totalDeductions)}</Text>
          </View>
        </View>
      </View>

      {/* ==================================================
          1. LƯƠNG & CÁC KHOẢN PHỤ CẤP THEO HỢP ĐỒNG
         ================================================== */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>LƯƠNG & CÁC KHOẢN PHỤ CẤP THEO HỢP ĐỒNG</Text>
        </View>

        <Row title="Lương cơ bản" amount={formatVND(res.basicSalary)} />
        <Row title="PC thâm niên, công việc" amount={formatVND(res.seniorityAllowance)} />
        <Row title="PC sinh hoạt" amount={formatVND(res.livingAllowance)} />
        <Row title="PC chuyên cần" amount={formatVND(res.attendanceAllowance)} />
        <Row title="PC khác" amount={formatVND(res.otherAllowance)} />
        <Row title="Số giờ công tiêu chuẩn" hours={`${res.standardHours}h`} />
        <Row title="Số giờ công thực tế" hours={`${res.actualHours}h`} isLast />
      </Card>

      {/* ==================================================
          2. A2. LƯƠNG CHÍNH THỨC
         ================================================== */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>A2. LƯƠNG CHÍNH THỨC</Text>
        </View>

        <Row title="Số giờ cơ bản 100%" hours={`${res.normalHours}h`} amount={formatVND(res.normalPay)} />
        <Row title="Số giờ tăng ca ngày 150%" hours={`${res.ot150Hours}h`} amount={formatVND(res.ot150Pay)} />
        <Row title="Số giờ phụ cấp ca đêm 30%" hours={`${res.nightAllowanceHours}h`} amount={formatVND(res.nightAllowancePay)} />
        <Row title="Số giờ tăng ca đêm 200%" hours={`${res.ot200Hours}h`} amount={formatVND(res.ot200Pay)} />
        <Row title="Số giờ tăng ca ngày thường 210%" hours={`${res.ot210Hours}h`} amount={formatVND(res.ot210Pay)} />
        <Row title="Số giờ tăng ca ngày chủ nhật 200%" hours={`${res.weeklyOffHours}h`} amount={formatVND(res.weeklyOffPay)} />
        <Row title="Số giờ tăng ca đêm chủ nhật 270%" hours={`${res.weeklyOffNightHours}h`} amount={formatVND(res.weeklyOffNightPay)} />
        <Row title="Số giờ tăng ca ngày lễ 300%" hours={`${res.holidayHours}h`} amount={formatVND(res.holidayPay)} />
        <Row title="Số giờ tăng ca đêm ngày lễ 390%" hours={`${res.holidayNightHours}h`} amount={formatVND(res.holidayNightPay)} />
        <Row title="Số giờ hưởng nghỉ 70%" hours={`${res.leave70Hours}h`} amount={formatVND(res.leave70Pay)} />
        <Row title="Số giờ nghỉ chế độ đặc biệt" hours={`${res.specialLeaveHours}h`} amount={formatVND(res.specialLeavePay)} />

        <SubtotalRow title="Tổng A2" amount={formatVND(res.totalA2)} />
      </Card>

      {/* ==================================================
          3. A1. CÁC KHOẢN PHỤ CẤP
         ================================================== */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>A1. CÁC KHOẢN PHỤ CẤP</Text>
        </View>

        <Row title="Phụ cấp sinh hoạt" amount={formatVND(res.livingAllowancePay)} />
        <Row title="Phụ cấp chuyên cần" amount={formatVND(res.attendanceBonus)} />
        <Row title="Phụ cấp &quot; phụ nữ&quot;" amount={formatVND(res.womenAllowance)} />
        <Row title="Hỗ trợ trẻ em" amount={formatVND(res.childSupport)} />
        <Row title="Phụ cấp khác" amount={formatVND(res.otherAllowancePay)} />

        <SubtotalRow title="Tổng A1" amount={formatVND(res.totalA1)} />
      </Card>

      {/* ==================================================
          4. A4. CÁC KHOẢN CỘNG KHÁC
         ================================================== */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>A4. CÁC KHOẢN CỘNG KHÁC</Text>
        </View>

        <Row title="TT phép năm nghỉ việc/cuối năm" amount={formatVND(res.annualLeaveSettlement)} />
        <Row title="Hỗ trợ tiền ăn" amount={formatVND(res.mealSupport)} />
        <Row title="Thưởng/thưởng người giới thiệu" amount={formatVND(res.referralBonus)} />
        <Row title="Bù lương/thưởng/lĩnh BH" amount={formatVND(res.salaryBonusAdjustment)} />
        <Row title="Hoàn thuế TNCN năm 2020" amount={formatVND(res.pitRefund)} />

        <SubtotalRow title="Tổng A4" amount={formatVND(res.totalA4)} />
      </Card>

      {/* ==================================================
          TỔNG A = A1 + A2 + A4
         ================================================== */}
      <View style={styles.totalABox}>
        <Text style={styles.totalALabel}>TỔNG A (A1 + A2 + A4)</Text>
        <Text style={styles.totalAValue}>{formatVND(res.totalA)}</Text>
      </View>

      {/* ==================================================
          5. B1. CÁC KHOẢN TRỪ
         ================================================== */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>B1. CÁC KHOẢN TRỪ</Text>
        </View>

        <Row title="Đi muộn về sớm" amount={formatVND(res.latenessDeduction)} />

        <SubtotalRow title="Tổng B1" amount={formatVND(res.totalB1)} isDeduction />
      </Card>

      {/* ==================================================
          6. B2. BẢO HIỂM
         ================================================== */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>B2. BẢO HIỂM</Text>
        </View>

        <Row title={`Trừ bảo hiểm ${res.insuranceRate.toLocaleString('vi-VN')}%`} amount={formatVND(res.insuranceDeduction)} />
        <Row title="Truy thu BHYT" amount={formatVND(res.healthInsuranceRecovery)} />
        <Row title="Công đoàn" amount={formatVND(res.unionDeduction)} />

        <SubtotalRow title="Tổng B2" amount={formatVND(res.totalB2)} isDeduction />
      </Card>

      {/* ==================================================
          7. B4. CÁC KHOẢN TRỪ KHÁC
         ================================================== */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>B4. CÁC KHOẢN TRỪ KHÁC</Text>
        </View>

        <Row title="Vi phạm gây thiệt hại cho công ty" amount={formatVND(res.damageDeduction)} />
        <Row title="Cơm ca" amount={formatVND(res.mealDeduction)} />
        <Row title="Trừ tiền đồng phục" amount={formatVND(res.uniformDeduction)} />
        <Row title="Trừ tháng trước/tiền nhận trước" amount={formatVND(res.previousMonthDeduction)} />
        <Row title="Thu tiền quỹ phòng chống thiên tai" amount={formatVND(res.disasterFundDeduction)} />

        <SubtotalRow title="Tổng B4" amount={formatVND(res.totalB4)} isDeduction />
      </Card>

      {/* ==================================================
          TỔNG CÁC KHOẢN GIẢM TRỪ (B1 + B2 + B4)
         ================================================== */}
      <View style={styles.totalDeductionsBox}>
        <Text style={styles.totalDeductionsLabel}>TỔNG CÁC KHOẢN GIẢM TRỪ (B1 + B2 + B4)</Text>
        <Text style={styles.totalDeductionsValue}>-{formatVND(res.totalDeductions)}</Text>
      </View>

      {/* ==================================================
          THU NHẬP THỰC LĨNH = TỔNG A - TỔNG GIẢM TRỪ
         ================================================== */}
      <View style={styles.finalNetBox}>
        <Text style={styles.finalNetLabel}>THU NHẬP THỰC LĨNH</Text>
        <Text style={styles.finalNetFormula}>(Tổng A − Tổng giảm trừ)</Text>
        <Text style={styles.finalNetValue}>{formatVND(res.netPay)}</Text>
      </View>
    </ScrollView>
  );
}

function Row({ title, hours, amount, isLast }: { title: string; hours?: string; amount?: string; isLast?: boolean }) {
  return (
    <View style={[styles.itemRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.itemTitle}>{title}</Text>
      <View style={styles.itemRight}>
        {hours ? (
          <View style={styles.hoursBadge}>
            <Text style={styles.hoursText}>{hours}</Text>
          </View>
        ) : null}
        {amount ? <Text style={styles.itemAmount}>{amount}</Text> : null}
      </View>
    </View>
  );
}

function SubtotalRow({ title, amount, isDeduction }: { title: string; amount: string; isDeduction?: boolean }) {
  return (
    <View style={styles.subtotalRow}>
      <Text style={styles.subtotalTitle}>{title}</Text>
      <Text style={[styles.subtotalAmount, isDeduction && { color: theme.colors.danger }]}>{amount}</Text>
    </View>
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
    paddingBottom: 32,
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
    backgroundColor: theme.colors.successSoft,
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
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // HERO CARD
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: theme.radius.xl,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
      },
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    gap: 4,
  },
  heroBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroMonthLabel: {
    color: theme.colors.slate400,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroLabel: {
    color: theme.colors.slate400,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroAmount: {
    color: '#34D399',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginVertical: 8,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroFooterItem: {
    flex: 1,
  },
  heroFooterLabel: {
    color: theme.colors.slate400,
    fontSize: 10,
    fontWeight: '700',
  },
  heroFooterVal: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 12,
  },

  // SECTION CARDS
  sectionCard: {
    padding: 16,
    borderRadius: theme.radius.xl,
  },
  sectionHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: theme.colors.slate200,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    letterSpacing: 0.6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: theme.colors.slate100,
  },
  itemTitle: {
    fontSize: 13,
    color: theme.colors.slate800,
    fontWeight: '600',
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoursBadge: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  hoursText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.slate900,
    minWidth: 90,
    textAlign: 'right',
  },
  subtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderColor: theme.colors.slate200,
  },
  subtotalTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.slate900,
    letterSpacing: 0.4,
  },
  subtotalAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.primary,
  },

  // TOTAL BLOCKS
  totalABox: {
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalALabel: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    letterSpacing: 0.4,
  },
  totalAValue: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.colors.primaryDark,
  },
  totalDeductionsBox: {
    backgroundColor: theme.colors.dangerSoft,
    borderWidth: 1.5,
    borderColor: theme.colors.dangerBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalDeductionsLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.dangerDark,
    letterSpacing: 0.3,
  },
  totalDeductionsValue: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.colors.dangerDark,
  },
  finalNetBox: {
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.success,
    borderRadius: theme.radius.xl,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    ...theme.shadows.float,
  },
  finalNetLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.slate800,
    letterSpacing: 0.8,
  },
  finalNetFormula: {
    fontSize: 11,
    color: theme.colors.slate400,
    fontWeight: '600',
  },
  finalNetValue: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.successDark,
    letterSpacing: -0.5,
    marginTop: 4,
  },
});
