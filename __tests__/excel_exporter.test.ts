import { DayAttendance } from '../src/engine/attendanceCalculator';
import {
  exportProfessionalAttendanceWorkbook,
  generateHojeongAttendanceWorkbook,
} from '../src/services/excel/excelExporterService';

describe('Excel Exporter Service - Professional HOJEONG Export', () => {
  const month = '2026-11';
  const sampleItems: DayAttendance[] = [
    {
      date: '2026-11-02',
      dayOfWeek: 1,
      dayType: 'NORMAL',
      shift: { start: '08:00', end: '17:00' },
      note: 'Ca chuẩn 8h',
    },
    {
      date: '2026-11-03',
      dayOfWeek: 2,
      dayType: 'NORMAL',
      shift: { start: '08:00', end: '20:00' },
      note: 'Tăng ca ngày',
    },
    {
      date: '2026-11-04',
      dayOfWeek: 3,
      dayType: 'NORMAL',
      leaveType: 'PN',
      leaveCode: 'PN',
    },
  ];

  it('generates a workbook containing exactly two sheets with required names', () => {
    const { workbook, report, metadata } = generateHojeongAttendanceWorkbook(
      month,
      sampleItems,
      undefined,
      {
        employeeCode: 'HJ-007',
        employeeName: 'Nguyễn Văn A',
        department: 'Xưởng cơ khí',
      }
    );

    expect(report.isMatched).toBe(true);
    expect(workbook.SheetNames).toEqual(['Chi tiết chấm công', 'Tổng hợp giờ công']);

    // Check Sheet 1
    const ws1 = workbook.Sheets['Chi tiết chấm công'];
    expect(ws1).toBeDefined();
    expect(ws1['!merges']).toBeDefined();
    expect(ws1['!cols']).toHaveLength(18);

    // Check Sheet 2
    const ws2 = workbook.Sheets['Tổng hợp giờ công'];
    expect(ws2).toBeDefined();
    expect(ws2['!cols']).toHaveLength(6);

    expect(metadata.employeeCode).toBe('HJ-007');
    expect(metadata.employeeName).toBe('Nguyễn Văn A');
  });

  it('runs exportProfessionalAttendanceWorkbook producing valid base64 data', async () => {
    const result = await exportProfessionalAttendanceWorkbook(month, sampleItems, undefined, {
      employeeCode: 'HJ-001',
      employeeName: 'Trần Văn B',
    });

    expect(result.success).toBe(true);
    expect(result.fileName).toContain('HOJEONG_BangChamCong_202611_HJ001.xlsx');
    expect(result.report.isMatched).toBe(true);
    expect(typeof result.dataBase64).toBe('string');
    expect(result.dataBase64!.length).toBeGreaterThan(100);
  });
});
