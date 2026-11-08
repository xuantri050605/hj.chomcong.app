import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';
import { executeLegacyMigration } from '../services/migration/migrationService';
import {
  MigrationConflict,
  MigrationProgress,
  MigrationVerificationReport,
} from '../services/migration/migrationTypes';
import HojeongLogo from './HojeongLogo';

export interface MigrationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MigrationModal({ visible, onClose, onSuccess }: MigrationModalProps) {
  const { user, legacySummary, checkLegacyData } = useAuthStore();

  const [step, setStep] = useState<'PREVIEW' | 'PROGRESS' | 'SUCCESS' | 'ERROR'>('PREVIEW');
  const [progress, setProgress] = useState<MigrationProgress>({
    stage: 'IDLE',
    percentage: 0,
    message: '',
  });
  const [verificationReport, setVerificationReport] = useState<MigrationVerificationReport | null>(null);
  const [conflicts, setConflicts] = useState<MigrationConflict[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const counts = legacySummary?.counts || {
    attendance: 0,
    payroll: 0,
    config: 0,
    employees: 0,
    companyLocation: 0,
    pendingEvents: 0,
  };

  const startMigration = async () => {
    if (!user?.id) return;
    setStep('PROGRESS');
    setErrorMessage(null);

    const res = await executeLegacyMigration({
      userId: user.id,
      userEmail: user.email,
      fingerprint: legacySummary?.fingerprint || `fp_${Date.now()}`,
      onProgress: (p) => setProgress(p),
    });

    if (res.success) {
      setVerificationReport(res.verification);
      setConflicts(res.conflicts);
      setStep('SUCCESS');
      void checkLegacyData(user.id);
      if (onSuccess) onSuccess();
    } else {
      setErrorMessage(res.error || 'Quá trình di trú gặp sự cố. Dữ liệu cục bộ của bạn vẫn an toàn.');
      setVerificationReport(res.verification);
      setStep('ERROR');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerLogoWrapper}>
                <HojeongLogo size="sm" showSubtitle={false} />
              </View>
              <View>
                <Text style={styles.headerTitle}>HOJEONG CLOUD MIGRATION</Text>
                <Text style={styles.headerSubtitle}>Di trú & Hợp nhất Dữ liệu CSDL Cục bộ</Text>
              </View>
            </View>

            {step !== 'PROGRESS' && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={theme.colors.slate500} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* ==========================================
                STEP 1: PREVIEW & CONFIRMATION
               ========================================== */}
            {step === 'PREVIEW' && (
              <View style={styles.stepContainer}>
                <View style={styles.badgeRow}>
                  <View style={styles.previewBadge}>
                    <Ionicons name="server-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.previewBadgeText}>PHÁT HIỆN DỮ LIỆU CỤC BỘ TRÊN THIẾT BỊ</Text>
                  </View>
                </View>

                <Text style={styles.stepTitle}>Đưa dữ liệu chấm công lên Cloud an toàn</Text>
                <Text style={styles.stepDesc}>
                  Thiết bị của bạn hiện đang lưu trữ các bản ghi chấm công và tính lương lịch sử. Bạn có muốn nhập toàn bộ dữ liệu này vào tài khoản đám mây{' '}
                  <Text style={styles.userEmailHighlight}>{user?.email}</Text> không?
                </Text>

                {/* Metrics Grid */}
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.statVal}>{counts.attendance}</Text>
                    <Text style={styles.statLbl}>Ngày công</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Ionicons name="receipt-outline" size={20} color={theme.colors.successDark} />
                    <Text style={styles.statVal}>{counts.payroll}</Text>
                    <Text style={styles.statLbl}>Kỳ lương</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Ionicons name="options-outline" size={20} color={theme.colors.warningDark} />
                    <Text style={styles.statVal}>{counts.config > 0 ? 'Có' : 'Mặc định'}</Text>
                    <Text style={styles.statLbl}>Cấu hình lương</Text>
                  </View>
                </View>

                {/* Safety Guarantee Callout */}
                <View style={styles.safetyBox}>
                  <Ionicons name="shield-checkmark" size={22} color={theme.colors.successDark} />
                  <View style={styles.safetyTextWrapper}>
                    <Text style={styles.safetyHeading}>Cam kết an toàn dữ liệu 100%:</Text>
                    <Text style={styles.safetyDesc}>
                      • Tự động tạo bản sao lưu snapshot cục bộ trước khi truyền.{'\n'}
                      • Không xóa hay can thiệp vào CSDL SQLite gốc.{'\n'}
                      • Phát hiện chống trùng lặp ngày công bằng khóa duy nhất.{'\n'}
                      • Dữ liệu được bảo vệ bằng Row Level Security (RLS) cách ly riêng cho tài khoản của bạn.
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                    <Text style={styles.cancelBtnText}>Để sau</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.confirmBtn} onPress={startMigration} activeOpacity={0.85}>
                    <Ionicons name="cloud-upload" size={17} color={theme.colors.white} />
                    <Text style={styles.confirmBtnText}>Bắt đầu Di trú lên Cloud</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ==========================================
                STEP 2: PROGRESS
               ========================================== */}
            {step === 'PROGRESS' && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 16 }} />
                <Text style={styles.progressPercentage}>{progress.percentage}%</Text>
                <Text style={styles.progressMessage}>{progress.message}</Text>

                {/* Progress Bar */}
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} />
                </View>

                <Text style={styles.progressSubtext}>
                  Vui lòng không đóng ứng dụng hoặc làm mới trình duyệt trong quá trình đồng bộ dữ liệu.
                </Text>
              </View>
            )}

            {/* ==========================================
                STEP 3: SUCCESS & VERIFICATION
               ========================================== */}
            {step === 'SUCCESS' && (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={32} color={theme.colors.successDark} />
                </View>

                <Text style={styles.successHeading}>Di trú dữ liệu hoàn tất an toàn 100%!</Text>
                <Text style={styles.successDesc}>
                  Dữ liệu chấm công của bạn đã được kiểm toán đối soát và đồng bộ vào kho lưu trữ đám mây độc lập của HOJEONG.
                </Text>

                {/* Verification Summary Card */}
                {verificationReport && (
                  <View style={styles.verifyCard}>
                    <Text style={styles.verifyCardTitle}>BÁO CÁO NGHIỆM THU ĐỐI SOÁT:</Text>
                    <View style={styles.verifyRow}>
                      <Text style={styles.verifyLabel}>• Ngày công (Attendance):</Text>
                      <Text style={styles.verifyVal}>
                        {verificationReport.localCounts.attendance} máy trạm ➔ {verificationReport.cloudCounts.attendance} đám mây (Khớp)
                      </Text>
                    </View>
                    <View style={styles.verifyRow}>
                      <Text style={styles.verifyLabel}>• Bảng lương (Payroll):</Text>
                      <Text style={styles.verifyVal}>
                        {verificationReport.localCounts.payroll} kỳ lương ➔ {verificationReport.cloudCounts.payroll} đám mây (Khớp)
                      </Text>
                    </View>
                    <View style={styles.verifyRow}>
                      <Text style={styles.verifyLabel}>• Cấu hình & BHXH:</Text>
                      <Text style={styles.verifyVal}>Đã hợp nhất chính xác</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
                  <Text style={styles.doneBtnText}>Vào không gian làm việc HOJEONG</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ==========================================
                STEP 4: ERROR & RECOVERY
               ========================================== */}
            {step === 'ERROR' && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={42} color={theme.colors.danger} />
                <Text style={styles.errorHeading}>Quá trình di trú gặp sự cố</Text>
                <Text style={styles.errorDesc}>{errorMessage}</Text>

                <View style={styles.recoveryNotice}>
                  <Ionicons name="information-circle" size={18} color={theme.colors.primaryDark} />
                  <Text style={styles.recoveryNoticeText}>
                    Bản sao lưu CSDL cục bộ và dữ liệu SQLite trên máy của bạn vẫn được bảo toàn nguyên vẹn. Bạn có thể thử lại bất cứ khi nào có kết nối mạng ổn định.
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                    <Text style={styles.cancelBtnText}>Đóng</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.confirmBtn} onPress={startMigration} activeOpacity={0.85}>
                    <Ionicons name="refresh" size={16} color={theme.colors.white} />
                    <Text style={styles.confirmBtnText}>Thử lại ngay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    overflow: 'hidden',
    ...theme.elevations.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: theme.colors.slate100,
    backgroundColor: '#FAFAFA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogoWrapper: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.slate500,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.sm,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: 20,
  },
  stepContainer: {
    gap: 14,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    letterSpacing: 0.3,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.colors.slate900,
  },
  stepDesc: {
    fontSize: 13,
    color: theme.colors.slate600,
    lineHeight: 20,
  },
  userEmailHighlight: {
    fontWeight: '800',
    color: theme.colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 4,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.slate50,
    borderRadius: theme.radius.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.slate900,
  },
  statLbl: {
    fontSize: 11,
    color: theme.colors.slate500,
    fontWeight: '600',
  },
  safetyBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: theme.radius.lg,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  safetyTextWrapper: {
    flex: 1,
  },
  safetyHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.successDark,
    marginBottom: 4,
  },
  safetyDesc: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 18,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.slate600,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.elevations.card,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.white,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  progressMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.slate800,
    textAlign: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.slate100,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 11,
    color: theme.colors.slate400,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#86EFAC',
  },
  successHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.colors.slate900,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 12,
    color: theme.colors.slate600,
    textAlign: 'center',
    lineHeight: 18,
  },
  verifyCard: {
    width: '100%',
    backgroundColor: theme.colors.slate50,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 6,
    marginTop: 6,
  },
  verifyCardTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.slate500,
    letterSpacing: 0.4,
  },
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifyLabel: {
    fontSize: 11,
    color: theme.colors.slate700,
    fontWeight: '600',
  },
  verifyVal: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.successDark,
  },
  doneBtn: {
    width: '100%',
    paddingVertical: 13,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: 8,
    ...theme.elevations.card,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.white,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  errorHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.dangerDark,
  },
  errorDesc: {
    fontSize: 12,
    color: theme.colors.danger,
    textAlign: 'center',
    lineHeight: 18,
  },
  recoveryNotice: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primarySoft,
    padding: 12,
    borderRadius: theme.radius.md,
    gap: 8,
    alignItems: 'center',
  },
  recoveryNoticeText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.primaryDark,
    lineHeight: 16,
  },
});
