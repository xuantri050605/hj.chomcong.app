import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MonthSelector from '../components/MonthSelector';
import AttendanceStatusCard from '../components/AttendanceStatusCard';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAttendanceStore } from '../store/attendanceStore';
import { useGeofenceStore } from '../store/geofenceStore';
import { localDateKey, weekdayForDateKey } from '../utils/monthUtils';
import { buildCalendarDays } from '../engine/calendarProjection';
import { normalizeTimeInput } from '../engine/timeCalculator';
import { theme } from '../theme/theme';
import { isValidDate, isValidMonth, sanitizeTimeInput } from '../utils/securityValidator';

type DayChoice = 'WORK' | 'PN' | 'UNPAID' | 'OTHER' | 'WEEKLY_OFF' | 'HOLIDAY';

const choices: { key: DayChoice; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'WORK', label: 'Đi làm bình thường', icon: 'briefcase-outline', color: theme.colors.primary },
  { key: 'PN', label: 'Nghỉ phép năm (PN)', icon: 'calendar-outline', color: theme.colors.purple },
  { key: 'UNPAID', label: 'Nghỉ không lương', icon: 'close-circle-outline', color: theme.colors.slate500 },
  { key: 'OTHER', label: 'Nghỉ khác / Chế độ', icon: 'help-circle-outline', color: theme.colors.cyan },
  { key: 'WEEKLY_OFF', label: 'Nghỉ hàng tuần (CN/Off)', icon: 'cafe-outline', color: theme.colors.warning },
  { key: 'HOLIDAY', label: 'Nghỉ lễ / Tết quy định', icon: 'ribbon-outline', color: theme.colors.danger },
];

const choiceFor = (item: any): DayChoice =>
  item?.leaveType === 'PN' || item?.leaveCode === 'PN'
    ? 'PN'
    : item?.leaveType === 'UNPAID'
    ? 'UNPAID'
    : item?.leaveType === 'OTHER'
    ? 'OTHER'
    : item?.dayType === 'WEEKLY_OFF'
    ? 'WEEKLY_OFF'
    : item?.dayType === 'HOLIDAY'
    ? 'HOLIDAY'
    : 'WORK';

export default function AttendanceScreen() {
  const { items, month, addManual, editAttendance, remove, clockIn, clockOut, selectMonth } =
    useAttendanceStore();
  const { pendingEvents, confirmEvent, dismissEvent, initGeofence } = useGeofenceStore();
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void initGeofence();
  }, []);

  const activePendingEvents = useMemo(
    () => pendingEvents.filter((e) => e.status === 'PENDING'),
    [pendingEvents]
  );

  const calendarDays = useMemo(() => buildCalendarDays(month, items), [month, items]);
  const today = localDateKey(new Date());
  const todayRec = items.find((item) => item.date === today);

  useEffect(() => setEditing(null), [month]);

  const changeMonth = async (next: string) => {
    if (!isValidMonth(next)) {
      return Alert.alert('Tháng không hợp lệ', 'Định dạng tháng phải theo chuẩn YYYY-MM.');
    }
    setLoading(true);
    try {
      await selectMonth(next);
    } finally {
      setLoading(false);
    }
  };

  const setChoice = (choice: DayChoice) =>
    setEditing((current: any) => {
      const next = {
        ...current,
        dayType: choice === 'WEEKLY_OFF' ? 'WEEKLY_OFF' : choice === 'HOLIDAY' ? 'HOLIDAY' : 'NORMAL',
        leaveType: choice === 'PN' ? 'PN' : choice === 'UNPAID' ? 'UNPAID' : choice === 'OTHER' ? 'OTHER' : null,
        leaveCode: choice === 'PN' ? 'PN' : choice === 'UNPAID' ? 'UNPAID' : choice === 'OTHER' ? 'OTHER' : null,
      };
      return next.leaveType ? { ...next, shift: null } : next;
    });

  const save = async () => {
    if (!editing?.date || !isValidDate(editing.date)) {
      return Alert.alert('Ngày không hợp lệ', 'Định dạng ngày không hợp lệ (YYYY-MM-DD).');
    }
    if (!editing.date.startsWith(month)) {
      return Alert.alert('Ngày không hợp lệ', 'Bản ghi phải thuộc tháng đang xem.');
    }
    const rawShift = editing.shift;
    const start = rawShift?.start ? sanitizeTimeInput(rawShift.start) : undefined;
    const end = rawShift?.end ? sanitizeTimeInput(rawShift.end) : undefined;

    if ((rawShift?.start && !start) || (rawShift?.end && !end)) {
      return Alert.alert(
        'Giờ không hợp lệ',
        'Nhập giờ từ 0–23 và phút từ 0–59 (ví dụ: 8, 8:30, 17:30).'
      );
    }

    const value = {
      ...editing,
      shift: editing.leaveType ? null : { ...rawShift, start, end },
      dayOfWeek: weekdayForDateKey(editing.date),
    };

    if (items.some((item) => item.date === editing.date)) {
      await editAttendance(editing.date, value);
    } else {
      await addManual(value);
    }
    setEditing(null);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Xóa bản ghi',
      `Bạn có chắc chắn muốn xóa bản ghi ngày ${editing?.date}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            await remove(editing.date);
            setEditing(null);
          },
        },
      ]
    );
  };

  const status = !todayRec?.shift
    ? {
        mode: 'idle',
        dateLabel: today,
        onClockIn: () => void clockIn(),
        onManual: () => setEditing({ date: today, dayType: 'NORMAL', leaveType: null, shift: {} }),
      }
    : !todayRec.shift.end
    ? {
        mode: 'working',
        start: todayRec.shift.start,
        source: todayRec.timeSource,
        gpsMetadata: todayRec.gpsMetadata,
        onClockOut: () => void clockOut(),
      }
    : {
        mode: 'done',
        start: todayRec.shift.start,
        end: todayRec.shift.end,
        durationLabel: 'Hoàn tất',
        source: todayRec.timeSource,
        gpsMetadata: todayRec.gpsMetadata,
        onView: () => setEditing(todayRec),
      };

  const first = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1);
  const blanks = Array.from({ length: (first.getDay() + 6) % 7 }, (_, index) => `blank-${index}`);
  const isLeave = Boolean(editing?.leaveType || editing?.leaveCode);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Title */}
      <View style={styles.titleRow}>
        <View style={styles.titleIconBadge}>
          <Ionicons name="calendar" size={20} color={theme.colors.primary} />
        </View>
        <View>
          <Text style={styles.title}>LỊCH CHẤM CÔNG</Text>
          <Text style={styles.subtitle}>Ghi nhận & điều chỉnh ca làm việc</Text>
        </View>
      </View>

      {/* Month Selector */}
      <MonthSelector month={month} onChange={changeMonth} />

      {/* Pending Geofence Events Banner */}
      {activePendingEvents.map((evt) => {
        const isCheckIn = evt.type === 'CHECK_IN';
        return (
          <Card key={evt.id} style={styles.pendingEventCard}>
            <View style={styles.pendingHeaderRow}>
              <View
                style={[
                  styles.pendingIconBox,
                  isCheckIn ? styles.checkInIconBox : styles.checkOutIconBox,
                ]}
              >
                <Ionicons
                  name={isCheckIn ? 'location' : 'exit'}
                  size={20}
                  color={isCheckIn ? theme.colors.primary : theme.colors.warningDark}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>
                  {isCheckIn ? 'ĐÃ ĐẾN KHU VỰC CÔNG TY' : 'BẠN ĐÃ RỜI CÔNG TY'}
                </Text>
                <Text style={styles.pendingDesc}>
                  Phát hiện lúc {evt.timeString} • Cách {evt.distanceFromCompany}m (±{evt.accuracy}m)
                </Text>
                <Text style={styles.pendingPrompt}>
                  {isCheckIn
                    ? 'Bạn có muốn xác nhận chấm công giờ vào ca?'
                    : 'Bạn có muốn xác nhận chấm công giờ ra ca?'}
                </Text>
              </View>
            </View>
            <View style={styles.pendingActionsRow}>
              <Button
                title="XÁC NHẬN"
                variant="primary"
                size="sm"
                icon={<Ionicons name="checkmark-sharp" size={16} color={theme.colors.white} />}
                onPress={() => void confirmEvent(evt.id)}
                style={{ flex: 1 }}
              />
              <Button
                title="BỎ QUA"
                variant="secondary"
                size="sm"
                icon={<Ionicons name="close-sharp" size={16} color={theme.colors.slate600} />}
                onPress={() => void dismissEvent(evt.id)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        );
      })}

      {/* Status Card (Live Clock & Action) */}
      <AttendanceStatusCard state={status as any} />

      {/* Calendar Card */}
      <Card style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarHeaderTitle}>BẢNG CHẤM CÔNG THÁNG</Text>
          <Text style={styles.calendarHeaderHint}>Nhấn vào ngày để chỉnh sửa</Text>
        </View>

        {/* Day of Week Labels */}
        <View style={styles.weekHeader}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, index) => {
            const isWeekend = index >= 5;
            return (
              <Text key={d} style={[styles.weekday, isWeekend && styles.weekendDay]}>
                {d}
              </Text>
            );
          })}
        </View>

        {/* Calendar Grid */}
        <View style={styles.grid}>
          {blanks.map((key) => (
            <View key={key} style={styles.blankCell} />
          ))}

          {calendarDays.map((day) => {
            const row = day.attendance;
            const isToday = day.date === today;
            const isHoliday = day.dayType === 'HOLIDAY';
            const isWeeklyOff = day.dayType === 'WEEKLY_OFF';
            const isPN = day.leaveType === 'PN';
            const isWorked = Boolean(day.worked);

            const leaveLabel = isPN
              ? 'PN'
              : day.leaveType === 'UNPAID'
              ? 'K/L'
              : day.leaveType === 'OTHER'
              ? 'Khác'
              : '';
            const restLabel = isHoliday ? 'Lễ' : isWeeklyOff ? 'Nghỉ' : '';
            const workLabel = row?.shift?.start
              ? `${row.shift.start}`
              : isWorked
              ? 'Xong'
              : '';

            const statusText = leaveLabel || restLabel || workLabel;

            return (
              <TouchableOpacity
                key={day.date}
                activeOpacity={0.7}
                style={[
                  styles.dayCell,
                  isToday && styles.todayCell,
                  (isHoliday || isWeeklyOff) && styles.restDayCell,
                  isPN && styles.pnDayCell,
                  isWorked && styles.workedDayCell,
                ]}
                onPress={() =>
                  setEditing(row || { date: day.date, dayType: day.dayType, leaveType: null, shift: {} })
                }
              >
                {/* Day Number */}
                <View style={styles.dayNoRow}>
                  <Text
                    style={[
                      styles.dayNo,
                      isToday && styles.todayNo,
                      isHoliday && styles.holidayNo,
                      isWeeklyOff && styles.weeklyOffNo,
                    ]}
                  >
                    {day.date.slice(-2)}
                  </Text>
                  {day.hasOvertime ? <View style={styles.otDot} /> : null}
                </View>

                {/* Day Status Pill */}
                <View style={styles.statusPillWrapper}>
                  {statusText ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.dayStatusText,
                        isWorked && styles.workedStatusText,
                        isPN && styles.pnStatusText,
                        (isHoliday || isWeeklyOff) && styles.restStatusText,
                      ]}
                    >
                      {statusText}
                    </Text>
                  ) : (
                    <Text style={styles.emptyDot}>•</Text>
                  )}
                </View>

                {isToday && <View style={styles.todayIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
            <Text style={styles.legendText}>Đi làm</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.purple }]} />
            <Text style={styles.legendText}>Phép năm (PN)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
            <Text style={styles.legendText}>Nghỉ tuần</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
            <Text style={styles.legendText}>Ngày lễ</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.legendText}>Hôm nay</Text>
          </View>
        </View>
      </Card>

      {loading && <Text style={styles.loading}>Đang cập nhật dữ liệu tháng…</Text>}

      {/* Edit / Add Modal */}
      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.modalTitle}>Chi tiết ngày công</Text>
              </View>
              <TouchableOpacity onPress={() => setEditing(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={theme.colors.slate400} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {/* Date Box */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NGÀY LÀM VIỆC</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="calendar-outline" size={18} color={theme.colors.slate400} style={styles.inputIcon} />
                  <TextInput value={editing?.date || ''} editable={false} style={[styles.input, styles.disabledInput]} />
                </View>
              </View>

              {/* Day Choice (Segmented Chips) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>HÌNH THỨC CÔNG</Text>
                <View style={styles.choiceGrid}>
                  {choices.map((choice) => {
                    const isSelected = choiceFor(editing) === choice.key;
                    return (
                      <TouchableOpacity
                        key={choice.key}
                        activeOpacity={0.7}
                        onPress={() => setChoice(choice.key)}
                        style={[
                          styles.choiceChip,
                          isSelected && { backgroundColor: `${choice.color}15`, borderColor: choice.color },
                        ]}
                      >
                        <Ionicons
                          name={choice.icon}
                          size={16}
                          color={isSelected ? choice.color : theme.colors.slate400}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.choiceText,
                            isSelected && { color: choice.color, fontWeight: '800' },
                          ]}
                        >
                          {choice.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Shifts Input */}
              {!isLeave && (
                <View style={styles.timeInputsRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>GIỜ VÀO (HH:mm)</Text>
                    <View style={styles.inputWithIcon}>
                      <Ionicons name="log-in-outline" size={18} color={theme.colors.primary} style={styles.inputIcon} />
                      <TextInput
                        value={editing?.shift?.start || ''}
                        placeholder="VD: 08:00"
                        placeholderTextColor={theme.colors.slate400}
                        onChangeText={(start) =>
                          setEditing({ ...editing, shift: { ...editing.shift, start } })
                        }
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>GIỜ RA (HH:mm)</Text>
                    <View style={styles.inputWithIcon}>
                      <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} style={styles.inputIcon} />
                      <TextInput
                        value={editing?.shift?.end || ''}
                        placeholder="VD: 17:00"
                        placeholderTextColor={theme.colors.slate400}
                        onChangeText={(end) =>
                          setEditing({ ...editing, shift: { ...editing.shift, end } })
                        }
                        style={styles.input}
                      />
                    </View>
                  </View>
                </View>
              )}

              {isLeave && (
                <View style={styles.leaveHintBox}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.leaveHintText}>
                    {choiceFor(editing) === 'PN'
                      ? 'Nghỉ phép năm (PN) được tính 8 giờ công hưởng 100% lương cơ bản theo quy định.'
                      : 'Nghỉ không lương / nghỉ khác sẽ không tính giờ làm việc vào bảng lương.'}
                  </Text>
                </View>
              )}

              {/* Note */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>GHI CHÚ THÊM</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="document-text-outline" size={18} color={theme.colors.slate400} style={styles.inputIcon} />
                  <TextInput
                    value={editing?.note || ''}
                    placeholder="Nhập lý do hoặc ghi chú..."
                    placeholderTextColor={theme.colors.slate400}
                    onChangeText={(note) => setEditing({ ...editing, note })}
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Source & GPS Metadata if available */}
              {editing?.timeSource && (
                <View style={styles.sourceInfoBox}>
                  <View style={styles.sourceHeaderRow}>
                    <Ionicons
                      name={
                        editing.timeSource === 'GEOFENCE_CONFIRMED'
                          ? 'location'
                          : editing.timeSource === 'DEVICE'
                          ? 'phone-portrait-outline'
                          : 'create-outline'
                      }
                      size={16}
                      color={
                        editing.timeSource === 'GEOFENCE_CONFIRMED'
                          ? theme.colors.successDark
                          : theme.colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.sourceTitle,
                        editing.timeSource === 'GEOFENCE_CONFIRMED' && { color: theme.colors.successDark },
                      ]}
                    >
                      {editing.timeSource === 'GEOFENCE_CONFIRMED'
                        ? 'Xác thực: GPS Geofence (Đã xác nhận)'
                        : editing.timeSource === 'DEVICE'
                        ? 'Xác thực: Bấm trên thiết bị'
                        : 'Xác thực: Nhập thủ công'}
                    </Text>
                  </View>
                  {editing.gpsMetadata && (
                    <View style={styles.gpsMetaContainer}>
                      <Text style={styles.gpsMetaItem}>
                        • Khoảng cách: {editing.gpsMetadata.distance ?? '--'}m
                      </Text>
                      <Text style={styles.gpsMetaItem}>
                        • Sai số GPS: ±{editing.gpsMetadata.accuracy ?? '--'}m
                      </Text>
                      {editing.gpsMetadata.latitude && editing.gpsMetadata.longitude && (
                        <Text style={styles.gpsMetaItem}>
                          • Tọa độ: {editing.gpsMetadata.latitude.toFixed(5)}, {editing.gpsMetadata.longitude.toFixed(5)}
                        </Text>
                      )}
                    </View>
                  )}
                  {editing.originalTimeSource && (
                    <Text style={styles.originalSourceText}>
                      Nguồn gốc ban đầu: {editing.originalTimeSource}
                    </Text>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActionGroup}>
                <Button
                  title="LƯU BẢN GHI"
                  variant="primary"
                  size="md"
                  icon={<Ionicons name="checkmark-sharp" size={18} color={theme.colors.white} />}
                  onPress={() => void save()}
                  style={{ flex: 1 }}
                />
                <Button
                  title="HỦY BỎ"
                  variant="secondary"
                  size="md"
                  onPress={() => setEditing(null)}
                  style={{ width: 100 }}
                />
              </View>

              {items.some((i) => i.date === editing?.date) && (
                <TouchableOpacity activeOpacity={0.7} onPress={confirmDelete} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={16} color={theme.colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.deleteText}>Xóa bản ghi này</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  calendarCard: {
    padding: 14,
    borderRadius: theme.radius.xl,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  calendarHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.slate900,
    letterSpacing: 0.5,
  },
  calendarHeaderHint: {
    fontSize: 11,
    color: theme.colors.slate400,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: theme.colors.slate100,
    marginBottom: 6,
  },
  weekday: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.slate500,
  },
  weekendDay: {
    color: theme.colors.warningDark,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  blankCell: {
    width: '14.285%',
    aspectRatio: 1,
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: theme.colors.slate100,
    borderRadius: theme.radius.sm,
    padding: 4,
    backgroundColor: theme.colors.white,
    justifyContent: 'space-between',
    position: 'relative',
    marginVertical: 1,
  },
  todayCell: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    backgroundColor: theme.colors.primarySoft,
  },
  restDayCell: {
    backgroundColor: theme.colors.warningSoft,
    borderColor: theme.colors.warningBorder,
  },
  pnDayCell: {
    backgroundColor: theme.colors.purpleSoft,
    borderColor: theme.colors.purpleBorder,
  },
  workedDayCell: {
    backgroundColor: '#F0FDF4',
    borderColor: theme.colors.successBorder,
  },
  dayNoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayNo: {
    fontWeight: '800',
    fontSize: 12,
    color: theme.colors.slate800,
  },
  todayNo: {
    color: theme.colors.primary,
  },
  holidayNo: {
    color: theme.colors.dangerDark,
  },
  weeklyOffNo: {
    color: theme.colors.warningDark,
  },
  otDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.warning,
  },
  statusPillWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.slate400,
  },
  workedStatusText: {
    color: theme.colors.successDark,
  },
  pnStatusText: {
    color: theme.colors.purpleDark,
  },
  restStatusText: {
    color: theme.colors.warningDark,
  },
  emptyDot: {
    fontSize: 8,
    color: theme.colors.slate200,
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: theme.colors.slate100,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.slate500,
  },
  loading: {
    textAlign: 'center',
    color: theme.colors.slate500,
    fontSize: 12,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: 20,
    maxHeight: '90%',
    ...theme.shadows.float,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.slate900,
  },
  modalCloseBtn: {
    padding: 4,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.slate500,
    letterSpacing: 0.5,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.slate900,
    fontWeight: '600',
  },
  disabledInput: {
    color: theme.colors.slate500,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  choiceText: {
    fontSize: 12,
    color: theme.colors.slate600,
    fontWeight: '600',
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  leaveHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    padding: 12,
    borderRadius: theme.radius.md,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  leaveHintText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.primaryDark,
    lineHeight: 18,
    fontWeight: '500',
  },
  modalActionGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.radius.md,
  },
  deleteText: {
    color: theme.colors.danger,
    fontWeight: '800',
    fontSize: 13,
  },
  pendingEventCard: {
    padding: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: '#F0F9FF',
    gap: 12,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pendingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInIconBox: {
    backgroundColor: theme.colors.primarySoft,
  },
  checkOutIconBox: {
    backgroundColor: theme.colors.warningSoft,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.slate900,
    letterSpacing: 0.3,
  },
  pendingDesc: {
    fontSize: 12,
    color: theme.colors.slate600,
    marginTop: 2,
  },
  pendingPrompt: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primaryDark,
    marginTop: 4,
  },
  pendingActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  sourceInfoBox: {
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    gap: 6,
  },
  sourceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.slate800,
  },
  gpsMetaContainer: {
    paddingLeft: 4,
    gap: 2,
    marginTop: 2,
  },
  gpsMetaItem: {
    fontSize: 11,
    color: theme.colors.slate600,
  },
  originalSourceText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: theme.colors.slate500,
    marginTop: 2,
  },
});
