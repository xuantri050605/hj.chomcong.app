import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { formatVND } from '../utils/format';
import { numberToVietnameseWords } from '../utils/numberToVietnameseWords';
import type { PayrollBreakdown } from '../engine/payrollCalculator';
import HojeongLogo from './HojeongLogo';

interface PayslipModalProps {
  visible: boolean;
  onClose: () => void;
  month: string;
  payroll: PayrollBreakdown;
  userName?: string;
  userEmail?: string;
}

export default function PayslipModal({
  visible,
  onClose,
  month,
  payroll,
  userName = 'Cán bộ Nhân viên',
  userEmail = 'nhanvien@hojeong.vn',
}: PayslipModalProps) {
  const currentDate = new Date().toLocaleDateString('vi-VN');
  const netAmountWords = numberToVietnameseWords(payroll.net);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'hojeong-payslip-print-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #hojeong-printable-payslip, #hojeong-printable-payslip * {
              visibility: visible !important;
            }
            #hojeong-printable-payslip {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 16px !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print, [data-no-print="true"] {
              display: none !important;
              visibility: hidden !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Click outside to close / exit */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalCard}>
          {/* Action Bar (Top) */}
          <View style={styles.actionBar}>
            <View style={styles.actionBarLeft}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={styles.exitTopBtn}
                accessibilityRole="button"
                accessibilityLabel="Thoát phiếu lương"
              >
                <Ionicons name="arrow-back" size={17} color={theme.colors.slate800} />
                <Text style={styles.exitTopBtnText}>Thoát</Text>
              </TouchableOpacity>
              <View style={styles.headerSeparator} />
              <Ionicons name="document-text" size={18} color={theme.colors.primary} />
              <Text style={styles.actionBarTitle} numberOfLines={1}>
                {isMobile ? `Phiếu lương ${month}` : `XEM TRƯỚC PHIẾU LƯƠNG HOJEONG – THÁNG ${month}`}
              </Text>
            </View>
            <View style={styles.actionBarRight}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePrint}
                style={styles.printBtn}
                accessibilityRole="button"
                accessibilityLabel="In hoặc Tải Phiếu Lương PDF"
              >
                <Ionicons name="print-outline" size={16} color={theme.colors.white} />
                <Text style={styles.printBtnText}>{isMobile ? 'In PDF' : 'In / Xuất PDF'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Đóng phiếu lương"
              >
                <Ionicons name="close" size={20} color={theme.colors.slate600} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Printable Payslip Container */}
          <ScrollView
            style={styles.payslipScroll}
            contentContainerStyle={styles.payslipScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.payslipPaper} id="hojeong-printable-payslip">
              {/* Header */}
              <View style={styles.paperHeader}>
                <HojeongLogo size="md" showSubtitle={true} />
                <View style={styles.companyMeta}>
                  <Text style={styles.companyName}>HOJEONG VIETNAM ENTERPRISE</Text>
                  <Text style={styles.companySub}>Phòng Quản Trị Nhân Sự & Tiền Lương</Text>
                  <Text style={styles.issueDate}>Ngày lập: {currentDate}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Title */}
              <View style={styles.titleSection}>
                <Text style={styles.slipTitle}>PHIẾU LƯƠNG NHÂN VIÊN</Text>
                <Text style={styles.slipSubtitle}>
                  KỲ LƯƠNG THÁNG {month} (Từ 01/{month.slice(5)} đến 31/{month.slice(5)}/{month.slice(0, 4)})
                </Text>
              </View>

              {/* Employee Meta Box */}
              <View style={styles.metaGrid}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Họ và tên:</Text>
                  <Text style={styles.metaValBold}>{userName}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Mã nhân viên:</Text>
                  <Text style={styles.metaValCode}>HJ-2026-085</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Tài khoản email:</Text>
                  <Text style={styles.metaVal}>{userEmail}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Bộ phận / Vị trí:</Text>
                  <Text style={styles.metaVal}>Nhân viên Vận hành sản xuất</Text>
                </View>
              </View>

              {/* SECTION A: CÁC KHOẢN THU NHẬP */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>A. CÁC KHOẢN THU NHẬP (EARNINGS)</Text>
              </View>

              <View style={styles.tableBlock}>
                {/* A1 */}
                <View style={styles.subCategoryHeader}>
                  <Text style={styles.subCategoryTitle}>A1. Lương thời gian làm việc & Tăng ca</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.itemCol}>• Lương làm việc chuẩn ({payroll.normalHours} giờ)</Text>
                  <Text style={styles.amountCol}>{formatVND(payroll.normalPay)}</Text>
                </View>
                {payroll.ot130NightPay > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.itemCol}>• Lương làm đêm 130% ({payroll.ot130NightHours} giờ)</Text>
                    <Text style={styles.amountCol}>{formatVND(payroll.ot130NightPay)}</Text>
                  </View>
                )}
                {payroll.ot150Pay > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.itemCol}>• Làm thêm giờ ngày thường OT 150% ({payroll.ot150Hours} giờ)</Text>
                    <Text style={styles.amountCol}>{formatVND(payroll.ot150Pay)}</Text>
                  </View>
                )}
                {payroll.ot200Pay > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.itemCol}>• Làm thêm ngày nghỉ tuần OT 200% ({payroll.ot200Hours} giờ)</Text>
                    <Text style={styles.amountCol}>{formatVND(payroll.ot200Pay)}</Text>
                  </View>
                )}
                {payroll.ot210Pay > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.itemCol}>• Làm thêm ban đêm OT 210%–300% ({payroll.ot210Hours} giờ)</Text>
                    <Text style={styles.amountCol}>{formatVND(payroll.ot210Pay)}</Text>
                  </View>
                )}

                {/* A2 */}
                <View style={styles.subCategoryHeader}>
                  <Text style={styles.subCategoryTitle}>A2. Các khoản phụ cấp lương</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.itemCol}>• Phụ cấp thâm niên</Text>
                  <Text style={styles.amountCol}>{formatVND(payroll.seniorityAllowance)}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.itemCol}>• Phụ cấp sinh hoạt / Đi lại</Text>
                  <Text style={styles.amountCol}>{formatVND(payroll.livingAllowance)}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.itemCol}>• Phụ cấp chuyên cần</Text>
                  <Text style={styles.amountCol}>{formatVND(payroll.attendanceBonus)}</Text>
                </View>
                {payroll.otherAllowance > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.itemCol}>• Phụ cấp khác</Text>
                    <Text style={styles.amountCol}>{formatVND(payroll.otherAllowance)}</Text>
                  </View>
                )}

                {/* A4 */}
                {payroll.totalA4 > 0 && (
                  <>
                    <View style={styles.subCategoryHeader}>
                      <Text style={styles.subCategoryTitle}>A4. Các khoản cộng khác (Thưởng / Bù lương / Phép)</Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.itemCol}>• Tổng cộng mục A4</Text>
                      <Text style={styles.amountCol}>{formatVND(payroll.totalA4)}</Text>
                    </View>
                  </>
                )}

                {/* Total A */}
                <View style={styles.totalRowA}>
                  <Text style={styles.totalLabelA}>TỔNG THU NHẬP (A = A1 + A2 + A4):</Text>
                  <Text style={styles.totalValA}>{formatVND(payroll.totalA)}</Text>
                </View>
              </View>

              {/* SECTION B: CÁC KHOẢN TRỪ */}
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <Text style={styles.sectionTitle}>B. CÁC KHOẢN KHẤU TRỪ (DEDUCTIONS)</Text>
              </View>

              <View style={styles.tableBlock}>
                <View style={styles.tableRow}>
                  <Text style={styles.itemCol}>• Trích đóng BHXH, BHYT, BHTN bắt buộc ({payroll.insuranceRate}%)</Text>
                  <Text style={[styles.amountCol, { color: theme.colors.danger }]}>
                    -{formatVND(payroll.insuranceDeduction)}
                  </Text>
                </View>
                {payroll.unionDeduction > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.itemCol}>• Đoàn phí công đoàn</Text>
                    <Text style={[styles.amountCol, { color: theme.colors.danger }]}>
                      -{formatVND(payroll.unionDeduction)}
                    </Text>
                  </View>
                )}
                {payroll.previousMonthDeduction > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.itemCol}>• Trừ tháng trước / Tiền nhận trước</Text>
                    <Text style={[styles.amountCol, { color: theme.colors.danger }]}>
                      -{formatVND(payroll.previousMonthDeduction)}
                    </Text>
                  </View>
                )}
                {payroll.latenessDeduction > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.itemCol}>• Trừ vi phạm đi muộn / Về sớm</Text>
                    <Text style={[styles.amountCol, { color: theme.colors.danger }]}>
                      -{formatVND(payroll.latenessDeduction)}
                    </Text>
                  </View>
                )}
                {payroll.mealDeduction > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.itemCol}>• Trừ tiền cơm ca</Text>
                    <Text style={[styles.amountCol, { color: theme.colors.danger }]}>
                      -{formatVND(payroll.mealDeduction)}
                    </Text>
                  </View>
                )}

                {/* Total B */}
                <View style={styles.totalRowB}>
                  <Text style={styles.totalLabelB}>TỔNG CÁC KHOẢN TRỪ (B):</Text>
                  <Text style={styles.totalValB}>-{formatVND(payroll.totalDeductions)}</Text>
                </View>
              </View>

              {/* NET PAY: THỰC LĨNH */}
              <View style={styles.netPayCard}>
                <View style={styles.netPayTop}>
                  <Text style={styles.netPayLabel}>THỰC LĨNH CHUYỂN KHOẢN (NET PAY):</Text>
                  <Text style={styles.netPayAmount}>{formatVND(payroll.net)}</Text>
                </View>
                <View style={styles.netPayWordsRow}>
                  <Text style={styles.netPayWordsLabel}>Bằng chữ:</Text>
                  <Text style={styles.netPayWordsVal}>{netAmountWords}</Text>
                </View>
              </View>

              {/* Signatures */}
              <View style={styles.signatureRow}>
                <View style={styles.sigBlock}>
                  <Text style={styles.sigTitle}>Người lập biểu</Text>
                  <Text style={styles.sigDesc}>(Ký, họ tên)</Text>
                  <View style={styles.sigSpace} />
                  <Text style={styles.sigName}>Ban Nhân Sự</Text>
                </View>
                <View style={styles.sigBlock}>
                  <Text style={styles.sigTitle}>Kế toán trưởng</Text>
                  <Text style={styles.sigDesc}>(Ký, họ tên)</Text>
                  <View style={styles.sigSpace} />
                  <Text style={styles.sigName}>Ban Tài Chính</Text>
                </View>
                <View style={styles.sigBlock}>
                  <Text style={styles.sigTitle}>Người nhận tiền</Text>
                  <Text style={styles.sigDesc}>(Ký, xác nhận)</Text>
                  <View style={styles.sigSpace} />
                  <Text style={styles.sigName}>{userName}</Text>
                </View>
              </View>

              {/* Footer Note */}
              <View style={styles.paperFooter}>
                <Text style={styles.footerNote}>
                  * Mọi thắc mắc về số công, hệ số tăng ca và các khoản khấu trừ, vui lòng gửi phản hồi tới phòng Nhân sự trong vòng 03 ngày làm việc kể từ ngày nhận phiếu.
                </Text>
              </View>

              {/* In-Page Action & Exit Buttons (Hidden in print) */}
              <View style={styles.inPaperExitSection}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={styles.inPaperExitBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Thoát xem phiếu lương"
                >
                  <Ionicons name="arrow-back-circle-outline" size={20} color={theme.colors.slate700} />
                  <Text style={styles.inPaperExitBtnText}>Thoát xem phiếu lương</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePrint}
                  style={styles.inPaperPrintBtn}
                  accessibilityRole="button"
                  accessibilityLabel="In phiếu lương này"
                >
                  <Ionicons name="print-outline" size={18} color={theme.colors.white} />
                  <Text style={styles.inPaperPrintBtnText}>In / Xuất PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Sticky Action Bar */}
          <View style={styles.bottomStickyBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.stickyExitBtn}
              accessibilityRole="button"
              accessibilityLabel="Thoát trang phiếu lương"
            >
              <Ionicons name="arrow-back" size={17} color={theme.colors.slate700} />
              <Text style={styles.stickyExitBtnText}>Thoát trang</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePrint}
              style={styles.stickyPrintBtn}
              accessibilityRole="button"
              accessibilityLabel="In hoặc Tải Phiếu Lương PDF"
            >
              <Ionicons name="print-outline" size={17} color={theme.colors.white} />
              <Text style={styles.stickyPrintBtnText}>In / Tải Phiếu Lương</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    width: '100%',
    maxWidth: 780,
    maxHeight: '92%',
    overflow: 'hidden',
    flexDirection: 'column',
    ...theme.elevations.modal,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.slate50,
  },
  actionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  exitTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: theme.radius.md,
    flexShrink: 0,
  },
  exitTopBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.slate800,
  },
  headerSeparator: {
    width: 1,
    height: 18,
    backgroundColor: theme.colors.border,
    marginHorizontal: 2,
    flexShrink: 0,
  },
  actionBarTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.slate900,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  actionBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.md,
  },
  printBtnText: {
    color: theme.colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  payslipScroll: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  payslipScrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  payslipPaper: {
    backgroundColor: theme.colors.white,
    width: '100%',
    maxWidth: 700,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
      default: {},
    }),
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  companyMeta: {
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  companySub: {
    fontSize: 11,
    color: theme.colors.slate500,
    marginTop: 2,
  },
  issueDate: {
    fontSize: 10,
    color: theme.colors.slate400,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 14,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  slipTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  slipSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.slate500,
    marginTop: 4,
  },
  metaGrid: {
    backgroundColor: theme.colors.slate50,
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 14,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    width: 140,
    fontSize: 11,
    color: theme.colors.slate500,
    fontWeight: '600',
  },
  metaVal: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.slate800,
  },
  metaValBold: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.slate900,
  },
  metaValCode: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  sectionHeader: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  tableBlock: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
  },
  subCategoryHeader: {
    backgroundColor: theme.colors.slate50,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  subCategoryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.slate600,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#F8FAFC',
  },
  itemCol: {
    fontSize: 11,
    color: theme.colors.slate700,
    flex: 1,
  },
  amountCol: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate900,
    textAlign: 'right',
  },
  totalRowA: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1.5,
    borderColor: '#BBF7D0',
  },
  totalLabelA: {
    fontSize: 11,
    fontWeight: '900',
    color: '#166534',
  },
  totalValA: {
    fontSize: 12,
    fontWeight: '900',
    color: '#166534',
  },
  totalRowB: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFF1F2',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1.5,
    borderColor: '#FECDD3',
  },
  totalLabelB: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9F1239',
  },
  totalValB: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9F1239',
  },
  netPayCard: {
    marginTop: 14,
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  netPayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  netPayLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  netPayAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  netPayWordsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  netPayWordsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate500,
    fontStyle: 'italic',
  },
  netPayWordsVal: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate800,
    fontStyle: 'italic',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 12,
  },
  sigBlock: {
    alignItems: 'center',
    flex: 1,
  },
  sigTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.slate900,
  },
  sigDesc: {
    fontSize: 10,
    color: theme.colors.slate400,
    fontStyle: 'italic',
    marginTop: 2,
  },
  sigSpace: {
    height: 48,
  },
  sigName: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.slate800,
  },
  paperFooter: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingTop: 10,
  },
  footerNote: {
    fontSize: 9.5,
    color: theme.colors.slate400,
    fontStyle: 'italic',
    lineHeight: 14,
  },
  inPaperExitSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  inPaperExitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.slate100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  inPaperExitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.slate700,
  },
  inPaperPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  inPaperPrintBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.white,
  },
  bottomStickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  stickyExitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.slate100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  stickyExitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.slate700,
  },
  stickyPrintBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  stickyPrintBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.white,
  },
});
