import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';

export interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
}

export default function AuthModal({
  visible,
  onClose,
  initialMode = 'LOGIN',
}: AuthModalProps) {
  const {
    user,
    profile,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    continueAsGuest,
    clearError,
  } = useAuthStore();

  const [tab, setTab] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (visible) {
      setTab(initialMode);
      setLocalError(null);
      clearError();
    }
  }, [visible, initialMode]);

  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async () => {
    setLocalError(null);
    clearError();
    setResetSent(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Vui lòng nhập địa chỉ email.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setLocalError('Định dạng email không hợp lệ (ví dụ: user@example.com).');
      return;
    }

    if (tab === 'FORGOT_PASSWORD') {
      const ok = await resetPassword(trimmedEmail);
      if (ok) {
        setResetSent(true);
      }
      return;
    }

    if (!password) {
      setLocalError('Vui lòng nhập mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    if (tab === 'REGISTER') {
      if (!fullName.trim()) {
        setLocalError('Vui lòng nhập họ và tên của bạn.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Xác nhận mật khẩu không trùng khớp.');
        return;
      }

      const ok = await signUp(trimmedEmail, password, fullName.trim());
      if (ok) {
        onClose();
      }
    } else {
      const ok = await signIn(trimmedEmail, password);
      if (ok) {
        onClose();
      }
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const displayError = localError || error;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}>
                <Ionicons
                  name={user ? 'person-circle-outline' : 'shield-checkmark-outline'}
                  size={24}
                  color={theme.colors.brand[600]}
                />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {user ? 'Tài khoản người dùng' : tab === 'LOGIN' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {user
                    ? 'Quản lý phiên làm việc & đồng bộ Supabase Cloud'
                    : 'Đồng bộ dữ liệu chấm công & bảng lương mọi lúc'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
            >
              <Ionicons name="close" size={20} color={theme.colors.slate500} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* View when Already Logged In */}
            {user ? (
              <View style={styles.authenticatedBox}>
                <View style={styles.profileHero}>
                  <View style={styles.avatarBig}>
                    <Text style={styles.avatarBigText}>
                      {(profile?.fullName || user.email || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.profileName}>{profile?.fullName || 'Người dùng'}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                  <View style={styles.cloudBadge}>
                    <Ionicons name="cloud-done-outline" size={14} color={theme.colors.success} />
                    <Text style={styles.cloudBadgeText}>Đã kết nối Supabase Cloud</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mã định danh (UID):</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{user.id}</Text>
                </View>

                <TouchableOpacity
                  style={styles.signOutBtn}
                  onPress={handleSignOut}
                  disabled={isLoading}
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.danger} />
                  ) : (
                    <>
                      <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
                      <Text style={styles.signOutText}>Đăng xuất khỏi thiết bị</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* View when Unauthenticated: Tabs + Form */
              <View>
                {/* Mode Switch Tabs */}
                <View style={styles.tabsContainer}>
                  <TouchableOpacity
                    style={[styles.tabButton, tab === 'LOGIN' && styles.tabButtonActive]}
                    onPress={() => {
                      setTab('LOGIN');
                      setLocalError(null);
                      setResetSent(false);
                      clearError();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        tab === 'LOGIN' && styles.tabTextActive,
                      ]}
                    >
                      Đăng nhập
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabButton, tab === 'REGISTER' && styles.tabButtonActive]}
                    onPress={() => {
                      setTab('REGISTER');
                      setLocalError(null);
                      setResetSent(false);
                      clearError();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        tab === 'REGISTER' && styles.tabTextActive,
                      ]}
                    >
                      Đăng ký mới
                    </Text>
                  </TouchableOpacity>

                  {tab === 'FORGOT_PASSWORD' && (
                    <TouchableOpacity
                      style={[styles.tabButton, styles.tabButtonActive]}
                      activeOpacity={1}
                    >
                      <Text style={[styles.tabText, styles.tabTextActive]}>
                        Quên mật khẩu
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Reset Password Success Banner */}
                {resetSent && (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.successDark} />
                    <Text style={styles.successText}>
                      Đã gửi hướng dẫn khôi phục tới email của bạn. Vui lòng kiểm tra hộp thư (inbox và spam).
                    </Text>
                  </View>
                )}

                {/* Error Banner */}
                {displayError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
                    <Text style={styles.errorText}>{displayError}</Text>
                  </View>
                )}

                {/* Forgot Password Hint */}
                {tab === 'FORGOT_PASSWORD' && (
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color={theme.colors.primaryDark} />
                    <Text style={styles.infoText}>
                      Nhập địa chỉ email tài khoản của bạn để nhận liên kết khôi phục mật khẩu từ Supabase Cloud.
                    </Text>
                  </View>
                )}

                {/* Form Fields */}
                {tab === 'REGISTER' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Họ và tên</Text>
                    <View style={styles.inputField}>
                      <Ionicons name="person-outline" size={18} color={theme.colors.slate400} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        placeholderTextColor={theme.colors.slate400}
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Địa chỉ Email</Text>
                  <View style={styles.inputField}>
                    <Ionicons name="mail-outline" size={18} color={theme.colors.slate400} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="tenban@congty.com"
                      placeholderTextColor={theme.colors.slate400}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {tab !== 'FORGOT_PASSWORD' && (
                  <View style={styles.inputGroup}>
                    <View style={styles.passwordLabelRow}>
                      <Text style={styles.inputLabel}>Mật khẩu</Text>
                      {tab === 'LOGIN' && (
                        <TouchableOpacity
                          onPress={() => {
                            setTab('FORGOT_PASSWORD');
                            setLocalError(null);
                            setResetSent(false);
                            clearError();
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.forgotPasswordLink}>Quên mật khẩu?</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.inputField}>
                      <Ionicons name="lock-closed-outline" size={18} color={theme.colors.slate400} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Tối thiểu 6 ký tự"
                        placeholderTextColor={theme.colors.slate400}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={theme.colors.slate400}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {tab === 'REGISTER' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
                    <View style={styles.inputField}>
                      <Ionicons name="shield-outline" size={18} color={theme.colors.slate400} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Nhập lại mật khẩu phía trên"
                        placeholderTextColor={theme.colors.slate400}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                      />
                    </View>
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {tab === 'LOGIN'
                        ? 'Đăng nhập ngay'
                        : tab === 'REGISTER'
                        ? 'Hoàn tất đăng ký'
                        : 'Gửi liên kết khôi phục'}
                    </Text>
                  )}
                </TouchableOpacity>

                {tab === 'FORGOT_PASSWORD' && (
                  <TouchableOpacity
                    style={styles.backToLoginBtn}
                    onPress={() => {
                      setTab('LOGIN');
                      setLocalError(null);
                      setResetSent(false);
                      clearError();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.backToLoginText}>← Quay lại Đăng nhập</Text>
                  </TouchableOpacity>
                )}

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>HOẶC</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Continue as Guest Button */}
                <TouchableOpacity
                  style={styles.guestBtn}
                  onPress={handleGuest}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Ionicons name="laptop-outline" size={18} color={theme.colors.slate600} />
                  <Text style={styles.guestBtnText}>Tiếp tục chế độ Offline (Khách)</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.slate900,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.slate400,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    maxHeight: 520,
  },
  bodyContent: {
    padding: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.slate100,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.white,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.slate500,
  },
  tabTextActive: {
    color: theme.colors.brand[600],
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.dangerSoft,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.slate700,
    marginBottom: 6,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.slate50,
    height: 44,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.slate900,
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  eyeBtn: {
    padding: 4,
  },
  primaryBtn: {
    backgroundColor: theme.colors.brand[600],
    borderRadius: theme.radius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  primaryBtnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate400,
    letterSpacing: 0.5,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    height: 42,
    backgroundColor: theme.colors.white,
  },
  guestBtnText: {
    fontSize: 13,
    color: theme.colors.slate600,
    fontWeight: '600',
  },
  authenticatedBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  avatarBigText: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.white,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.slate900,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: theme.colors.slate500,
    fontWeight: '500',
    marginBottom: 8,
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.successBorder,
  },
  cloudBadgeText: {
    fontSize: 11,
    color: theme.colors.success,
    fontWeight: '700',
  },
  infoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.slate100,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate100,
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.slate400,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    color: theme.colors.slate700,
    fontWeight: '700',
    maxWidth: 220,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md,
    height: 44,
  },
  signOutText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotPasswordLink: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 14,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: '500',
    flex: 1,
  },
  backToLoginBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  backToLoginText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
