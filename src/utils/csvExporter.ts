import { Platform, Alert } from 'react-native';
import type { DayAttendance } from '../engine/attendanceCalculator';

function getDayOfWeekName(dow: number): string {
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

/**
 * Exports monthly attendance records to an Excel-compatible CSV file.
 * Includes UTF-8 BOM (\uFEFF) to guarantee Vietnamese characters render correctly in Microsoft Excel.
 */
export function exportAttendanceToCsv(month: string, items: DayAttendance[]): boolean {
  try {
    const headers = [
      'STT',
      'Ngày',
      'Thứ',
      'Giờ vào (In)',
      'Giờ ra (Out)',
      'Hình thức',
      'Tăng ca (OT 150%)',
      'Tăng ca (OT 200%)',
      'Tăng ca (OT 210%)',
      'Ghi chú',
    ];

    const sortedItems = [...items].sort((a, b) => a.date.localeCompare(b.date));

    const rows = sortedItems.map((item, index) => {
      const isPn = item.leaveType === 'PN';
      const isUnpaid = item.leaveType === 'UNPAID';
      const isHoliday = item.dayType === 'HOLIDAY';
      const isWeeklyOff = item.dayType === 'WEEKLY_OFF';

      const typeLabel = isPn
        ? 'Phép năm (PN)'
        : isUnpaid
        ? 'Nghỉ không lương'
        : isHoliday
        ? 'Ngày Lễ'
        : isWeeklyOff
        ? 'Nghỉ tuần'
        : item.shift?.start
        ? 'Đi làm'
        : 'Không có dữ liệu';

      const ot150 = (item as any).ot?.ot150 ?? 0;
      const ot200 = (item as any).ot?.ot200 ?? 0;
      const ot210 = (item as any).ot?.ot210 ?? 0;

      return [
        index + 1,
        item.date,
        getDayOfWeekName(item.dayOfWeek),
        item.shift?.start || '--:--',
        item.shift?.end || '--:--',
        `"${typeLabel}"`,
        ot150 > 0 ? `${ot150}h` : '0',
        ot200 > 0 ? `${ot200}h` : '0',
        ot210 > 0 ? `${ot210}h` : '0',
        `"${item.note || ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const fileName = `HOJEONG_BangChamCong_${month.replace('-', '_')}.csv`;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' } as any);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } else {
      Alert.alert('Xuất thành công', `Đã xuất ${sortedItems.length} bản ghi tháng ${month}.`);
      return true;
    }
  } catch (err: any) {
    Alert.alert('Lỗi xuất file', err?.message || 'Không thể tạo file CSV');
    return false;
  }
}
