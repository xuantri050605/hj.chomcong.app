jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
  },
  Alert: {
    alert: jest.fn(),
  },
}));

import { numberToVietnameseWords } from '../src/utils/numberToVietnameseWords';
import { exportAttendanceToCsv } from '../src/utils/csvExporter';
import type { DayAttendance } from '../src/engine/attendanceCalculator';

describe('Option 1 (s1): Payslip Words & CSV Export Tests', () => {
  describe('numberToVietnameseWords', () => {
    test('converts 0 to Vietnamese words', () => {
      expect(numberToVietnameseWords(0)).toBe('Không đồng chẵn');
    });

    test('converts round millions correctly', () => {
      expect(numberToVietnameseWords(1000000)).toBe('Một triệu đồng chẵn.');
      expect(numberToVietnameseWords(10000000)).toBe('Mười triệu đồng chẵn.');
    });

    test('converts realistic salary amounts', () => {
      expect(numberToVietnameseWords(15200000)).toBe('Mười lăm triệu hai trăm nghìn đồng chẵn.');
      expect(numberToVietnameseWords(5652500)).toBe('Năm triệu sáu trăm năm mươi hai nghìn năm trăm đồng chẵn.');
    });

    test('handles negative amounts safely with prefix', () => {
      const words = numberToVietnameseWords(-500000);
      expect(words).toContain('Âm');
      expect(words).toContain('Năm trăm nghìn đồng chẵn.');
    });
  });

  describe('exportAttendanceToCsv', () => {
    test('exports empty attendance list without error', () => {
      const result = exportAttendanceToCsv('2026-11', []);
      expect(result).toBe(true);
    });

    test('exports attendance records with shifts and leave codes', () => {
      const items: DayAttendance[] = [
        {
          date: '2026-11-01',
          dayOfWeek: 0,
          dayType: 'WEEKLY_OFF',
        },
        {
          date: '2026-11-02',
          dayOfWeek: 1,
          dayType: 'NORMAL',
          shift: { start: '08:00', end: '17:00' },
        },
        {
          date: '2026-11-03',
          dayOfWeek: 2,
          dayType: 'NORMAL',
          leaveType: 'PN',
          leaveCode: 'PN',
        },
      ];

      const result = exportAttendanceToCsv('2026-11', items);
      expect(result).toBe(true);
    });
  });
});
