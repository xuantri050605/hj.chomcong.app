import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMonthDisplay, getNextMonth, getPreviousMonth, parseMonthKey } from '../utils/monthUtils';
import { theme } from '../theme/theme';

type Props = { month: string; onChange: (month: string) => void | Promise<void> };

/** Shared, key-based month navigation with luxury design. */
export default function MonthSelector({ month, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [{ year, selected }, setDraft] = useState(() => {
    const value = parseMonthKey(month);
    return { year: value.year, selected: value.month };
  });

  useEffect(() => {
    const value = parseMonthKey(month);
    setDraft({ year: value.year, selected: value.month });
  }, [month]);

  const apply = () => {
    void onChange(`${year}-${String(selected).padStart(2, '0')}`);
    setOpen(false);
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          accessibilityLabel="Tháng trước"
          activeOpacity={0.7}
          onPress={() => void onChange(getPreviousMonth(month))}
          style={styles.chevronBtn}
        >
          <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.75}
          onPress={() => setOpen(true)}
          style={styles.centerBtn}
        >
          <View style={styles.calendarIcon}>
            <Ionicons name="calendar-outline" size={15} color={theme.colors.primary} />
          </View>
          <Text style={styles.monthText}>{formatMonthDisplay(month).toUpperCase()}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.slate400} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Tháng sau"
          activeOpacity={0.7}
          onPress={() => void onChange(getNextMonth(month))}
          style={styles.chevronBtn}
        >
          <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Chọn thời gian</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={theme.colors.slate400} />
              </TouchableOpacity>
            </View>

            {/* Year Selector */}
            <View style={styles.yearRow}>
              <TouchableOpacity
                onPress={() => setDraft((v) => ({ ...v, year: v.year - 1 }))}
                style={styles.yearArrow}
              >
                <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
              </TouchableOpacity>

              <View style={styles.yearPill}>
                <Ionicons name="calendar" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.yearText}>{year}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setDraft((v) => ({ ...v, year: v.year + 1 }))}
                style={styles.yearArrow}
              >
                <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Month 12-grid */}
            <View style={styles.grid}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => {
                const isSelected = selected === value;
                return (
                  <TouchableOpacity
                    key={value}
                    activeOpacity={0.7}
                    onPress={() => setDraft((v) => ({ ...v, selected: value }))}
                    style={[styles.monthOption, isSelected && styles.selected]}
                  >
                    <Text style={[styles.optionText, isSelected && styles.selectedText]}>
                      Tháng {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setOpen(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>ĐÓNG</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={apply}
                style={styles.applyBtn}
              >
                <Text style={styles.applyText}>ÁP DỤNG</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 4,
    ...theme.shadows.card,
  },
  chevronBtn: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  centerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  calendarIcon: {
    marginRight: 6,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.slate900,
    letterSpacing: 0.5,
  },

  // Modal
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: 20,
    ...theme.shadows.float,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.slate900,
  },
  closeBtn: {
    padding: 4,
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: theme.colors.slate50,
    borderRadius: theme.radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  yearPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.slate900,
  },
  yearArrow: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthOption: {
    width: '31%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.slate200,
  },
  selected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.glow(theme.colors.primary),
  },
  optionText: {
    fontWeight: '700',
    fontSize: 13,
    color: theme.colors.slate700,
  },
  selectedText: {
    color: theme.colors.white,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
  },
  cancelText: {
    fontWeight: '800',
    color: theme.colors.slate500,
    fontSize: 13,
  },
  applyBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    ...theme.shadows.glow(theme.colors.primary),
  },
  applyText: {
    color: theme.colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
});
