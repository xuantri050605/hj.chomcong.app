import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSalaryStore } from '../store/salaryStore';
import { formatVND } from '../utils/format';
import Card from '../components/Card';
import Button from '../components/Button';
import { theme } from '../theme/theme';
import { DEFAULT_CONFIG } from '../engine/payrollCalculator';
import {
  sanitizeCurrency,
  sanitizePercentage,
  sanitizeSalaryConfig,
  sanitizeStandardHours,
} from '../utils/securityValidator';

export default function SalaryConfig() {
  const { config, setConfig, resetDefaults, loadConfig } = useSalaryStore();
  const [local, setLocal] = useState(config);

  useEffect(() => {
    void loadConfig();
    setLocal(config);
  }, []);

  useEffect(() => {
    setLocal(config);
  }, [config]);

  const save = async () => {
    const sanitized = sanitizeSalaryConfig(local, DEFAULT_CONFIG);
    await setConfig(sanitized);
    setLocal(sanitized);
    Alert.alert('Thành công', 'Đã lưu cấu hình lương mới thành công!');
  };

  const handleReset = () => {
    Alert.alert(
      'Khôi phục mặc định',
      'Bạn có muốn đặt lại cấu hình lương về giá trị tiêu chuẩn ban đầu?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          style: 'destructive',
          onPress: async () => {
            await resetDefaults();
            Alert.alert('Đã đặt lại', 'Cấu hình lương đã về mặc định');
          },
        },
      ]
    );
  };

  // Live insights calculation
  const stdHours = local.standardHours || 208;
  const baseSalary = local.basicSalary || 0;
  const seniority = local.seniorityAllowance || 0;
  const living = local.livingAllowance || 0;
  const hourlyRate = stdHours > 0 ? Math.round((baseSalary + seniority) / stdHours) : 0;
  const premiumRate = stdHours > 0 ? (baseSalary + seniority + living) / stdHours : 0;
  const ot150Rate = Math.round(premiumRate * 1.5);
  const ot200Rate = Math.round(premiumRate * 2.0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Title */}
      <View style={styles.titleRow}>
        <View style={styles.titleIconBadge}>
          <Ionicons name="options" size={20} color={theme.colors.primary} />
        </View>
        <View>
          <Text style={styles.title}>CẤU HÌNH LƯƠNG</Text>
          <Text style={styles.subtitle}>Thiết lập mức lương, phụ cấp & tỷ lệ trích nộp</Text>
        </View>
      </View>

      {/* Hourly Rate Insights Card */}
      <Card style={styles.insightsCard}>
        <View style={styles.insightsHeader}>
          <Ionicons name="calculator-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.insightsTitle}>ƯỚC TÍNH ĐƠN GIÁ GIỜ CÔNG</Text>
        </View>
        <View style={styles.insightsGrid}>
          <View style={styles.insightsCol}>
            <Text style={styles.insightsLabel}>Lương 1 giờ</Text>
            <Text style={styles.insightsVal}>{formatVND(hourlyRate)}</Text>
          </View>
          <View style={styles.insightsDivider} />
          <View style={styles.insightsCol}>
            <Text style={styles.insightsLabel}>Đơn giá OT 150%</Text>
            <Text style={[styles.insightsVal, { color: theme.colors.warningDark }]}>{formatVND(ot150Rate)}</Text>
          </View>
          <View style={styles.insightsDivider} />
          <View style={styles.insightsCol}>
            <Text style={styles.insightsLabel}>Đơn giá OT 200%</Text>
            <Text style={[styles.insightsVal, { color: '#EA580C' }]}>{formatVND(ot200Rate)}</Text>
          </View>
        </View>
      </Card>

      {/* GROUP 1: LƯƠNG CƠ BẢN & THÂM NIÊN */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconBox, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="cash-outline" size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>LƯƠNG CƠ BẢN & THÂM NIÊN</Text>
              <Text style={styles.sectionSub}>Mức lương đóng bảo hiểm & tính đơn giá giờ</Text>
            </View>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>LƯƠNG CƠ BẢN (VND)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={String(local.basicSalary || '')}
              onChangeText={(t) => setLocal({ ...local, basicSalary: sanitizeCurrency(t, 0) })}
              keyboardType="numeric"
              placeholder="Nhập lương cơ bản..."
            />
            <Text style={styles.inputUnit}>đ</Text>
          </View>
          <Text style={styles.previewText}>Bằng số: {formatVND(local.basicSalary || 0)}</Text>
        </View>

        <View style={[styles.fieldGroup, { marginTop: 12 }]}>
          <Text style={styles.fieldLabel}>PHỤ CẤP THÂM NIÊN (VND)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={String(local.seniorityAllowance || '')}
              onChangeText={(t) => setLocal({ ...local, seniorityAllowance: sanitizeCurrency(t, 0) })}
              keyboardType="numeric"
              placeholder="Nhập phụ cấp thâm niên..."
            />
            <Text style={styles.inputUnit}>đ</Text>
          </View>
          <Text style={styles.previewText}>Bằng số: {formatVND(local.seniorityAllowance || 0)}</Text>
        </View>
      </Card>

      {/* GROUP 2: CÁC KHOẢN PHỤ CẤP */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconBox, { backgroundColor: theme.colors.warningSoft }]}>
              <Ionicons name="gift-outline" size={18} color={theme.colors.warning} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>CÁC KHOẢN PHỤ CẤP HÀNG THÁNG</Text>
              <Text style={styles.sectionSub}>Trợ cấp phúc lợi & chuyên cần</Text>
            </View>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>PHỤ CẤP CHUYÊN CẦN (VND)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={String(local.attendanceAllowance || '')}
              onChangeText={(t) => setLocal({ ...local, attendanceAllowance: sanitizeCurrency(t, 0) })}
              keyboardType="numeric"
            />
            <Text style={styles.inputUnit}>đ</Text>
          </View>
          <Text style={styles.previewText}>Bằng số: {formatVND(local.attendanceAllowance || 0)}</Text>
        </View>

        <View style={[styles.fieldGroup, { marginTop: 12 }]}>
          <Text style={styles.fieldLabel}>PHỤ CẤP SINH HOẠT (VND)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={String(local.livingAllowance || '')}
              onChangeText={(t) => setLocal({ ...local, livingAllowance: sanitizeCurrency(t, 0) })}
              keyboardType="numeric"
            />
            <Text style={styles.inputUnit}>đ</Text>
          </View>
          <Text style={styles.previewText}>Bằng số: {formatVND(local.livingAllowance || 0)}</Text>
        </View>

        <View style={[styles.fieldGroup, { marginTop: 12 }]}>
          <Text style={styles.fieldLabel}>PHỤ CẤP KHÁC (VND)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={String(local.otherAllowance || '')}
              onChangeText={(t) => setLocal({ ...local, otherAllowance: sanitizeCurrency(t, 0) })}
              keyboardType="numeric"
            />
            <Text style={styles.inputUnit}>đ</Text>
          </View>
          <Text style={styles.previewText}>Bằng số: {formatVND(local.otherAllowance || 0)}</Text>
        </View>
      </Card>

      {/* GROUP 3: CHUẨN CÔNG & BẢO HIỂM */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconBox, { backgroundColor: theme.colors.purpleSoft }]}>
              <Ionicons name="shield-outline" size={18} color={theme.colors.purple} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>CHUẨN CÔNG & BẢO HIỂM</Text>
              <Text style={styles.sectionSub}>Quy chuẩn thời gian & tỷ lệ khấu trừ</Text>
            </View>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>SỐ GIỜ CHUẨN TRONG THÁNG</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={String(local.standardHours || '')}
              onChangeText={(t) => setLocal({ ...local, standardHours: sanitizeStandardHours(t, 208) })}
              keyboardType="numeric"
            />
            <Text style={styles.inputUnit}>giờ</Text>
          </View>
          <Text style={styles.previewText}>Tiêu chuẩn: 208 giờ (tương đương 26 ngày công × 8 giờ)</Text>
        </View>

        <View style={[styles.fieldGroup, { marginTop: 12 }]}>
          <Text style={styles.fieldLabel}>TỶ LỆ ĐÓNG BẢO HIỂM XÃ HỘI (%)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={String(local.insuranceRate || '')}
              onChangeText={(t) => setLocal({ ...local, insuranceRate: sanitizePercentage(t, 10.5) })}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputUnit}>%</Text>
          </View>
          <Text style={styles.previewText}>
            Quy định người lao động: 8% BHXH + 1.5% BHYT + 1% BHTN = 10.5%
          </Text>
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actionGroup}>
        <Button
          title="LƯU CẤU HÌNH"
          variant="primary"
          size="lg"
          icon={<Ionicons name="checkmark-done" size={20} color={theme.colors.white} />}
          onPress={save}
        />
        <Button
          title="Khôi phục mặc định"
          variant="secondary"
          size="md"
          icon={<Ionicons name="refresh-outline" size={17} color={theme.colors.slate700} />}
          onPress={handleReset}
          style={{ marginTop: 8 }}
        />
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
  titleRow: {
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

  // Insights
  insightsCard: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primaryBorder,
    borderRadius: theme.radius.xl,
    padding: 16,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  insightsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightsCol: {
    flex: 1,
    alignItems: 'center',
  },
  insightsDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.primaryBorder,
  },
  insightsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.slate500,
  },
  insightsVal: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.slate800,
    marginTop: 3,
  },

  // Section Cards
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

  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.slate600,
    letterSpacing: 0.4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.colors.slate900,
    fontWeight: '700',
  },
  inputUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.slate400,
    marginLeft: 6,
  },
  previewText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  actionGroup: {
    marginTop: 6,
  },
});

