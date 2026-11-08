import { DayAttendance } from '../src/engine/attendanceCalculator';
import { calculatePayroll } from '../src/engine/payrollCalculator';
import {
  formatDateToVn,
  getVietnameseWeekday,
  mapAttendanceToDetailRows,
  mapPayrollToSummaryCategories,
} from '../src/services/excel/excelDataMapper';

describe('Excel Data Mapper - 18 Columns & 11 Categories', () => {
  it('formats dates and weekdays correctly in Vietnamese', () => {
    expect(formatDateToVn('2026-11-08')).toBe('08/11/2026');
    // 2026-11-08 is a Sunday
    expect(getVietnameseWeekday('2026-11-08')).toBe('Chủ Nhật');
    // 2026-11-09 is Monday
    expect(getVietnameseWeekday('2026-11-09')).toBe('Thứ Hai');
  });

  it('maps calendar days into exactly 18 structured columns', () => {
    const month = '2026-11';
    const sampleItems: DayAttendance[] = [
      {
        date: '2026-11-02', // Monday
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
        note: 'Ca hành chính chuẩn',
      },
      {
        date: '2026-11-03', // Tuesday with OT
        dayOfWeek: 2,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '20:00' },
        note: 'Tăng ca ngày 150%',
      },
      {
        date: '2026-11-04', // Wednesday PN
        dayOfWeek: 3,
        dayType: 'NORMAL',
        leaveType: 'PN',
        leaveCode: 'PN',
        shift: { start: undefined, end: undefined },
        note: 'Nghỉ phép năm',
      },
      {
        date: '2026-11-08', // Sunday
        dayOfWeek: 0,
        dayType: 'WEEKLY_OFF',
        shift: { start: '08:00', end: '16:00' },
        note: 'Làm Chủ nhật 200%',
      },
    ];

    const rows = mapAttendanceToDetailRows(month, sampleItems);

    // November has 30 days
    expect(rows.length).toBe(30);

    // Verify 18 attributes exist on row
    const firstRow = rows[0];
    expect(firstRow).toHaveProperty('stt');
    expect(firstRow).toHaveProperty('dateStr');
    expect(firstRow).toHaveProperty('dateRaw');
    expect(firstRow).toHaveProperty('dayOfWeekName');
    expect(firstRow).toHaveProperty('clockIn');
    expect(firstRow).toHaveProperty('clockOut');
    expect(firstRow).toHaveProperty('statusType');
    expect(firstRow).toHaveProperty('normal100Hours');
    expect(firstRow).toHaveProperty('ot150DayHours');
    expect(firstRow).toHaveProperty('nightAllowanceHours');
    expect(firstRow).toHaveProperty('ot200NightHours');
    expect(firstRow).toHaveProperty('ot210Hours');
    expect(firstRow).toHaveProperty('weeklyOff200Hours');
    expect(firstRow).toHaveProperty('weeklyOffNight270Hours');
    expect(firstRow).toHaveProperty('holiday300Hours');
    expect(firstRow).toHaveProperty('holidayNight390Hours');
    expect(firstRow).toHaveProperty('leave70Hours');
    expect(firstRow).toHaveProperty('specialLeaveHours');
    expect(firstRow).toHaveProperty('note');

    // Day 2 (Nov 2) - Standard shift 08:00 - 17:00 (08:00-16:10 normal = 7h10m, 16:10-17:00 OT150 = 50m)
    const nov2 = rows.find((r) => r.dateRaw === '2026-11-02')!;
    expect(nov2.normal100Hours).toBeCloseTo(7 + 10 / 60, 3);
    expect(nov2.ot150DayHours).toBeCloseTo(50 / 60, 3);

    // Day 3 (Nov 3) - Shift 08:00 - 20:00 (08:00-16:10 normal = 7h10m, 16:10-20:00 OT150 = 3h50m)
    const nov3 = rows.find((r) => r.dateRaw === '2026-11-03')!;
    expect(nov3.normal100Hours).toBeCloseTo(7 + 10 / 60, 3);
    expect(nov3.ot150DayHours).toBeGreaterThan(0);

    // Day 4 (Nov 4) - PN gives 8h normal
    const nov4 = rows.find((r) => r.dateRaw === '2026-11-04')!;
    expect(nov4.normal100Hours).toBe(8);
    expect(nov4.statusType).toContain('Nghỉ phép năm (PN)');

    // Day 8 (Nov 8) - Sunday shift gives weeklyOff200Hours
    const nov8 = rows.find((r) => r.dateRaw === '2026-11-08')!;
    expect(nov8.weeklyOff200Hours).toBeGreaterThan(0);
  });

  it('maps canonical PayrollBreakdown into exactly 11 summary categories', () => {
    const items: DayAttendance[] = [
      {
        date: '2026-11-02',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      },
    ];
    const payroll = calculatePayroll(items);
    const categories = mapPayrollToSummaryCategories(payroll);

    expect(categories.length).toBe(11);
    expect(categories.map((c) => c.stt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    expect(categories[0].name).toBe('Số giờ cơ bản');
    expect(categories[0].coefficientPercent).toBe('100%');
    expect(categories[0].coefficientNumeric).toBe(1.0);
    expect(categories[0].totalHours).toBeCloseTo(7 + 10 / 60, 3);

    expect(categories[1].name).toBe('Số giờ tăng ca ngày');
    expect(categories[1].coefficientPercent).toBe('150%');
    expect(categories[1].coefficientNumeric).toBe(1.5);

    expect(categories[2].name).toBe('Số giờ phụ cấp ca đêm');
    expect(categories[2].coefficientPercent).toBe('30%');
    expect(categories[2].coefficientNumeric).toBe(0.3);

    expect(categories[3].name).toBe('Số giờ tăng ca đêm');
    expect(categories[3].coefficientPercent).toBe('200%');
    expect(categories[3].coefficientNumeric).toBe(2.0);

    expect(categories[4].name).toBe('Số giờ tăng ca ngày thường');
    expect(categories[4].coefficientPercent).toBe('210%');
    expect(categories[4].coefficientNumeric).toBe(2.1);

    expect(categories[5].name).toBe('Số giờ tăng ca ngày Chủ nhật');
    expect(categories[5].coefficientPercent).toBe('200%');
    expect(categories[5].coefficientNumeric).toBe(2.0);

    expect(categories[6].name).toBe('Số giờ tăng ca đêm Chủ nhật');
    expect(categories[6].coefficientPercent).toBe('270%');
    expect(categories[6].coefficientNumeric).toBe(2.7);

    expect(categories[7].name).toBe('Số giờ tăng ca ngày lễ');
    expect(categories[7].coefficientPercent).toBe('300%');
    expect(categories[7].coefficientNumeric).toBe(3.0);

    expect(categories[8].name).toBe('Số giờ tăng ca đêm ngày lễ');
    expect(categories[8].coefficientPercent).toBe('390%');
    expect(categories[8].coefficientNumeric).toBe(3.9);

    expect(categories[9].name).toBe('Số giờ hưởng nghỉ');
    expect(categories[9].coefficientPercent).toBe('70%');
    expect(categories[9].coefficientNumeric).toBe(0.7);

    expect(categories[10].name).toBe('Số giờ nghỉ chế độ đặc biệt');
    expect(categories[10].coefficientPercent).toBe('Theo cấu hình');
    expect(categories[10].coefficientNumeric).toBe(1.0);
  });
});
