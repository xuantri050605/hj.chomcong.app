import { DayAttendance } from '../../engine/attendanceCalculator';
import { buildCalendarDays } from '../../engine/calendarProjection';
import { PayrollBreakdown } from '../../engine/payrollCalculator';
import { classifyShiftIntervals } from '../../engine/timeCalculator';
import { weekdayForDateKey } from '../../utils/monthUtils';
import { AttendanceDetailRow, AttendanceSummaryCategory } from './excelTypes';

export function getVietnameseWeekday(dateKey: string): string {
  const dow = weekdayForDateKey(dateKey);
  switch (dow) {
    case 0:
      return 'Chủ Nhật';
    case 1:
      return 'Thứ Hai';
    case 2:
      return 'Thứ Ba';
    case 3:
      return 'Thứ Tư';
    case 4:
      return 'Thứ Năm';
    case 5:
      return 'Thứ Sáu';
    case 6:
      return 'Thứ Bảy';
    default:
      return '';
  }
}

export function formatDateToVn(dateKey: string): string {
  // YYYY-MM-DD -> dd/MM/yyyy
  const parts = dateKey.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateKey;
}

/**
 * Maps actual monthly attendance records into exactly 18 structured columns.
 * Every day in the calendar month is represented sequentially.
 */
export function mapAttendanceToDetailRows(
  month: string,
  items: DayAttendance[]
): AttendanceDetailRow[] {
  const calendarDays = buildCalendarDays(month, items);

  return calendarDays.map((calDay, index) => {
    const att = calDay.attendance;
    const hasShift = Boolean(att?.shift?.start && att?.shift?.end);

    let statusType = 'Chưa chấm công';
    if (calDay.leaveType === 'PN' || att?.leaveType === 'PN' || att?.leaveCode === 'PN') {
      statusType = 'Nghỉ phép năm (PN)';
    } else if (calDay.leaveType === 'UNPAID') {
      statusType = 'Nghỉ không lương';
    } else if ((calDay.leaveType as any) === 'LEAVE_70' || (att?.leaveType as any) === 'LEAVE_70') {
      statusType = 'Nghỉ hưởng 70%';
    } else if ((calDay.leaveType as any) === 'SPECIAL' || (att?.leaveType as any) === 'SPECIAL') {
      statusType = 'Nghỉ chế độ đặc biệt';
    } else if (calDay.leaveType === 'OTHER') {
      statusType = 'Nghỉ khác';
    } else if (calDay.dayType === 'HOLIDAY') {
      statusType = hasShift ? 'Làm việc ngày lễ' : 'Nghỉ lễ / Tết';
    } else if (calDay.dayType === 'WEEKLY_OFF') {
      statusType = hasShift ? 'Làm việc ngày nghỉ tuần' : 'Nghỉ tuần (CN)';
    } else if (hasShift) {
      statusType = 'Đi làm tiêu chuẩn';
    }

    // 11 numerical hour categories for this specific day
    let normal100Hours = 0;
    let ot150DayHours = 0;
    let nightAllowanceHours = 0;
    let ot200NightHours = 0;
    let ot210Hours = 0;
    let weeklyOff200Hours = 0;
    let weeklyOffNight270Hours = 0;
    let holiday300Hours = 0;
    let holidayNight390Hours = 0;
    let leave70Hours = 0;
    let specialLeaveHours = 0;

    if (calDay.leaveType === 'PN' || att?.leaveType === 'PN' || att?.leaveCode === 'PN') {
      normal100Hours = 8;
    } else if ((calDay.leaveType as any) === 'LEAVE_70' || (att?.leaveType as any) === 'LEAVE_70') {
      leave70Hours = 8;
    } else if ((calDay.leaveType as any) === 'SPECIAL' || (att?.leaveType as any) === 'SPECIAL') {
      specialLeaveHours = 8;
    } else if (hasShift && att?.shift?.start && att?.shift?.end) {
      const effectiveDayType = att.dayType ?? calDay.dayType;
      const intervals = classifyShiftIntervals(att.shift.start, att.shift.end, effectiveDayType);
      for (const iv of intervals) {
        const h = iv.durationMinutes / 60;
        switch (iv.category) {
          case 'NORMAL_100':
          case 'NIGHT_100':
            normal100Hours += h;
            break;
          case 'OT_150_DAY':
          case 'OT_150_NIGHT':
            ot150DayHours += h;
            break;
          case 'OT_130_NIGHT':
            nightAllowanceHours += h;
            break;
          case 'OT_200_NIGHT':
            ot200NightHours += h;
            break;
          case 'OT_210':
            ot210Hours += h;
            break;
          case 'WEEKLY_OFF_200':
          case 'WEEKLY_OFF_NIGHT_200':
            weeklyOff200Hours += h;
            break;
          case 'WEEKLY_OFF_NIGHT_270':
            weeklyOffNight270Hours += h;
            break;
          case 'HOLIDAY_300':
          case 'HOLIDAY_NIGHT_300':
            holiday300Hours += h;
            break;
          case 'HOLIDAY_NIGHT_390':
            holidayNight390Hours += h;
            break;
        }
      }
    }

    return {
      stt: index + 1,
      dateStr: formatDateToVn(calDay.date),
      dateRaw: calDay.date,
      dayOfWeekName: getVietnameseWeekday(calDay.date),
      clockIn: att?.shift?.start || '',
      clockOut: att?.shift?.end || '',
      statusType,
      normal100Hours: +normal100Hours.toFixed(4),
      ot150DayHours: +ot150DayHours.toFixed(4),
      nightAllowanceHours: +nightAllowanceHours.toFixed(4),
      ot200NightHours: +ot200NightHours.toFixed(4),
      ot210Hours: +ot210Hours.toFixed(4),
      weeklyOff200Hours: +weeklyOff200Hours.toFixed(4),
      weeklyOffNight270Hours: +weeklyOffNight270Hours.toFixed(4),
      holiday300Hours: +holiday300Hours.toFixed(4),
      holidayNight390Hours: +holidayNight390Hours.toFixed(4),
      leave70Hours: +leave70Hours.toFixed(4),
      specialLeaveHours: +specialLeaveHours.toFixed(4),
      note: att?.note || '',
    };
  });
}

/**
 * Maps the canonical monthly PayrollBreakdown into the exact 11 summary categories.
 */
export function mapPayrollToSummaryCategories(payroll: PayrollBreakdown): AttendanceSummaryCategory[] {
  return [
    {
      stt: 1,
      name: 'Số giờ cơ bản',
      coefficientPercent: '100%',
      coefficientNumeric: 1.0,
      totalHours: payroll.normal100Hours,
      note: 'Giờ làm việc tiêu chuẩn và nghỉ phép năm (PN) hưởng nguyên lương',
    },
    {
      stt: 2,
      name: 'Số giờ tăng ca ngày',
      coefficientPercent: '150%',
      coefficientNumeric: 1.5,
      totalHours: payroll.ot150Hours,
      note: 'Làm thêm ban ngày của các ngày làm việc tiêu chuẩn trong tuần',
    },
    {
      stt: 3,
      name: 'Số giờ phụ cấp ca đêm',
      coefficientPercent: '30%',
      coefficientNumeric: 0.3,
      totalHours: payroll.nightAllowanceHours,
      note: 'Phụ cấp làm việc ban đêm (khung giờ 22:00 – 06:00)',
    },
    {
      stt: 4,
      name: 'Số giờ tăng ca đêm',
      coefficientPercent: '200%',
      coefficientNumeric: 2.0,
      totalHours: payroll.ot200NightHours,
      note: 'Tăng ca ban đêm các ngày làm việc tiêu chuẩn',
    },
    {
      stt: 5,
      name: 'Số giờ tăng ca ngày thường',
      coefficientPercent: '210%',
      coefficientNumeric: 2.1,
      totalHours: payroll.ot210Hours,
      note: 'Tăng ca làm thêm ban đêm ngày thường có phụ cấp lũy tiến',
    },
    {
      stt: 6,
      name: 'Số giờ tăng ca ngày Chủ nhật',
      coefficientPercent: '200%',
      coefficientNumeric: 2.0,
      totalHours: payroll.weeklyOffHours,
      note: 'Làm việc ban ngày của ngày nghỉ hàng tuần (Chủ nhật/Off)',
    },
    {
      stt: 7,
      name: 'Số giờ tăng ca đêm Chủ nhật',
      coefficientPercent: '270%',
      coefficientNumeric: 2.7,
      totalHours: payroll.weeklyOffNight270Hours,
      note: 'Làm việc ban đêm của ngày nghỉ hàng tuần (Chủ nhật/Off)',
    },
    {
      stt: 8,
      name: 'Số giờ tăng ca ngày lễ',
      coefficientPercent: '300%',
      coefficientNumeric: 3.0,
      totalHours: payroll.holidayHours,
      note: 'Làm việc ban ngày các ngày Lễ/Tết theo quy định Bộ luật Lao động',
    },
    {
      stt: 9,
      name: 'Số giờ tăng ca đêm ngày lễ',
      coefficientPercent: '390%',
      coefficientNumeric: 3.9,
      totalHours: payroll.holidayNight390Hours,
      note: 'Làm việc ban đêm các ngày Lễ/Tết theo quy định Bộ luật Lao động',
    },
    {
      stt: 10,
      name: 'Số giờ hưởng nghỉ',
      coefficientPercent: '70%',
      coefficientNumeric: 0.7,
      totalHours: payroll.leave70Hours,
      note: 'Nghỉ ngừng việc hoặc nghỉ thỏa thuận theo quy định công ty hưởng 70%',
    },
    {
      stt: 11,
      name: 'Số giờ nghỉ chế độ đặc biệt',
      coefficientPercent: 'Theo cấu hình',
      coefficientNumeric: 1.0,
      totalHours: payroll.specialLeaveHours,
      note: 'Nghỉ thai sản, kết hôn, tang chế, việc riêng hưởng nguyên lương',
    },
  ];
}
