import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import Button from './Button';
import { theme } from '../theme/theme';

export default function AttendanceStatusCard({ state }: { state: any }) {
  // Live clock
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('vi-VN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Mode: IDLE
  if (state.mode === 'idle') {
    return (
      <Card style={styles.card}>
        {/* Top bar with live clock */}
        <View style={styles.topClockBar}>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>{dateString}</Text>
            <Text style={styles.clockDigital}>{timeString}</Text>
          </View>
          <View style={[styles.badge, styles.badgeIdle]}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.slate400 }]} />
            <Text style={styles.badgeIdleText}>Chưa vào ca</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIconBox}>
            <Ionicons name="briefcase-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoHeading}>Ca làm việc tiêu chuẩn</Text>
            <Text style={styles.infoSub}>Giờ quy định: 08:00 – 17:00 (Nghỉ trưa 12:00–13:00)</Text>
          </View>
        </View>

        <View style={styles.actionGroup}>
          <Button
            title="VÀO CA NGAY (CHECK-IN)"
            variant="primary"
            size="lg"
            icon={<Ionicons name="log-in-outline" size={20} color={theme.colors.white} />}
            onPress={state.onClockIn}
          />
          <Button
            title="Nhập giờ thủ công"
            variant="secondary"
            size="md"
            icon={<Ionicons name="create-outline" size={17} color={theme.colors.slate700} />}
            onPress={state.onManual}
            style={{ marginTop: 8 }}
          />
        </View>
      </Card>
    );
  }

  // Mode: WORKING
  if (state.mode === 'working') {
    return (
      <Card style={[styles.card, styles.cardWorking]}>
        <View style={styles.topClockBar}>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>{dateString}</Text>
            <Text style={[styles.clockDigital, { color: theme.colors.primaryDark }]}>{timeString}</Text>
          </View>
          <View style={[styles.badge, styles.badgeWorking]}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
            <Text style={styles.badgeWorkingText}>Đang trong ca</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.workingCardBody}>
          <View style={styles.workingCheckInBox}>
            <Text style={styles.workingCheckInLabel}>GIỜ CHECK-IN</Text>
            <View style={styles.timeTag}>
              <Ionicons name="time" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.checkInTimeText}>{state.start}</Text>
            </View>
          </View>

          <View style={styles.workingSourceBox}>
            <Text style={styles.workingCheckInLabel}>XÁC THỰC</Text>
            <View style={styles.sourceTag}>
              <Ionicons name="phone-portrait-outline" size={16} color={theme.colors.slate600} style={{ marginRight: 4 }} />
              <Text style={styles.sourceTagText}>Thiết bị cá nhân</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionGroup}>
          <Button
            title="KẾT THÚC CA (CHECK-OUT)"
            variant="danger"
            size="lg"
            icon={<Ionicons name="log-out-outline" size={20} color={theme.colors.white} />}
            onPress={state.onClockOut}
          />
        </View>
      </Card>
    );
  }

  // Mode: DONE
  return (
    <Card style={[styles.card, styles.cardDone]}>
      <View style={styles.topClockBar}>
        <View style={styles.dateInfo}>
          <Text style={styles.dateLabel}>{dateString}</Text>
          <Text style={styles.clockDigital}>{timeString}</Text>
        </View>
        <View style={[styles.badge, styles.badgeDone]}>
          <Ionicons name="checkmark-circle" size={14} color={theme.colors.successDark} style={{ marginRight: 4 }} />
          <Text style={styles.badgeDoneText}>Hoàn tất ca làm việc</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.doneTimeline}>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineLabel}>BẮT ĐẦU</Text>
          <Text style={styles.timelineValue}>{state.start || '--:--'}</Text>
        </View>
        <View style={styles.timelineArrow}>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.slate400} />
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineLabel}>KẾT THÚC</Text>
          <Text style={styles.timelineValue}>{state.end || '--:--'}</Text>
        </View>
        <View style={styles.timelineDivider} />
        <View style={styles.timelineItem}>
          <Text style={styles.timelineLabel}>TRẠNG THÁI</Text>
          <Text style={[styles.timelineValue, { color: theme.colors.successDark }]}>
            {state.durationLabel || 'Đã ghi nhận'}
          </Text>
        </View>
      </View>

      <View style={styles.actionGroup}>
        <Button
          title="Xem & Chỉnh sửa ca"
          variant="secondary"
          size="md"
          icon={<Ionicons name="eye-outline" size={17} color={theme.colors.slate700} />}
          onPress={state.onView}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: theme.radius.xl,
  },
  cardWorking: {
    borderColor: theme.colors.primaryBorder,
    backgroundColor: '#F8FAFF',
  },
  cardDone: {
    borderColor: theme.colors.successBorder,
    backgroundColor: '#FAFCF8',
  },
  topClockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: theme.colors.slate500,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  clockDigital: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.slate900,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  badgeIdle: {
    backgroundColor: theme.colors.slate100,
  },
  badgeIdleText: {
    fontSize: 11,
    color: theme.colors.slate600,
    fontWeight: '700',
  },
  badgeWorking: {
    backgroundColor: theme.colors.successSoft,
  },
  badgeWorkingText: {
    fontSize: 11,
    color: theme.colors.successDark,
    fontWeight: '800',
  },
  badgeDone: {
    backgroundColor: theme.colors.successSoft,
  },
  badgeDoneText: {
    fontSize: 11,
    color: theme.colors.successDark,
    fontWeight: '800',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate50,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 16,
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.slate800,
  },
  infoSub: {
    fontSize: 11,
    color: theme.colors.slate500,
    marginTop: 2,
  },
  actionGroup: {
    marginTop: 4,
  },

  // Working body
  workingCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    marginBottom: 16,
  },
  workingCheckInBox: {
    flex: 1,
  },
  workingSourceBox: {
    alignItems: 'flex-end',
  },
  workingCheckInLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.slate400,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkInTimeText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  sourceTagText: {
    fontSize: 11,
    color: theme.colors.slate700,
    fontWeight: '600',
  },

  // Done timeline
  doneTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  timelineItem: {
    alignItems: 'center',
  },
  timelineArrow: {
    paddingHorizontal: 4,
  },
  timelineDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  timelineLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.slate400,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.slate800,
  },
});
