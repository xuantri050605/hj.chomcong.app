import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DayAttendance } from '../engine/attendanceCalculator';
import { theme } from '../theme/theme';

export default function AttendanceRow({ item }: { item: DayAttendance }) {
  const isLeave = Boolean(item.leaveType || item.leaveCode);
  const isHoliday = item.dayType === 'HOLIDAY';
  const isWeeklyOff = item.dayType === 'WEEKLY_OFF';

  const dayLabel = isHoliday ? 'Ngày lễ' : isWeeklyOff ? 'Nghỉ tuần' : 'Ngày thường';

  const statusText = item.leaveType === 'PN' || item.leaveCode === 'PN'
    ? 'Nghỉ phép năm (PN)'
    : item.leaveType === 'UNPAID'
    ? 'Nghỉ không lương'
    : item.leaveType === 'OTHER'
    ? 'Nghỉ khác'
    : item.shift?.start
    ? `${item.shift.start} → ${item.shift.end || 'đang làm'}`
    : isWeeklyOff
    ? 'Nghỉ hàng tuần'
    : isHoliday
    ? 'Nghỉ lễ'
    : 'Chưa có giờ';

  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{item.date.slice(-2)}</Text>
          <Text style={styles.dateMonth}>{item.date.slice(5, 7)}</Text>
        </View>
      </View>

      <View style={styles.midCol}>
        <View style={styles.titleRow}>
          <Text style={styles.dateFull}>{item.date}</Text>
          <View
            style={[
              styles.typeBadge,
              isHoliday && styles.badgeHoliday,
              isWeeklyOff && styles.badgeWeeklyOff,
              isLeave && styles.badgeLeave,
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                isHoliday && styles.textHoliday,
                isWeeklyOff && styles.textWeeklyOff,
                isLeave && styles.textLeave,
              ]}
            >
              {dayLabel}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Ionicons
            name={isLeave ? 'calendar-outline' : item.shift?.start ? 'time-outline' : 'moon-outline'}
            size={14}
            color={theme.colors.slate400}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.statusText}>{statusText}</Text>
          {item.note ? <Text style={styles.noteText}> · {item.note}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: theme.colors.slate100,
    backgroundColor: theme.colors.white,
  },
  leftCol: {
    marginRight: 12,
  },
  dateBadge: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
    lineHeight: 18,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryLight,
  },
  midCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateFull: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.slate800,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.slate100,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.slate600,
  },
  badgeHoliday: {
    backgroundColor: theme.colors.dangerSoft,
  },
  textHoliday: {
    color: theme.colors.dangerDark,
  },
  badgeWeeklyOff: {
    backgroundColor: theme.colors.warningSoft,
  },
  textWeeklyOff: {
    color: theme.colors.warningDark,
  },
  badgeLeave: {
    backgroundColor: theme.colors.purpleSoft,
  },
  textLeave: {
    color: theme.colors.purpleDark,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.slate600,
    fontWeight: '500',
  },
  noteText: {
    fontSize: 12,
    color: theme.colors.slate400,
    fontStyle: 'italic',
  },
});
