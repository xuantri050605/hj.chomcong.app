import { DayAttendance } from '../src/engine/attendanceCalculator';
import { calculatePayroll } from '../src/engine/payrollCalculator';
import {
  mapAttendanceToDetailRows,
  mapPayrollToSummaryCategories,
} from '../src/services/excel/excelDataMapper';
import { reconcileAttendanceExport } from '../src/services/excel/excelReconciler';

describe('Excel Reconciler - 3-Way Reconciliation', () => {
  it('passes reconciliation when application, Sheet 1, and Sheet 2 totals match', () => {
    const month = '2026-11';
    const items: DayAttendance[] = [
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
        shift: { start: '08:00', end: '20:00' },
      },
      {
        date: '2026-11-04',
        dayOfWeek: 3,
        dayType: 'NORMAL',
        leaveType: 'PN',
        leaveCode: 'PN',
      },
      {
        date: '2026-11-08',
        dayOfWeek: 0,
        dayType: 'WEEKLY_OFF',
        shift: { start: '08:00', end: '16:00' },
      },
    ];

    const payroll = calculatePayroll(items);
    const detailRows = mapAttendanceToDetailRows(month, items);
    const summaryCategories = mapPayrollToSummaryCategories(payroll);

    const report = reconcileAttendanceExport(payroll, detailRows, summaryCategories);

    expect(report.isMatched).toBe(true);
    expect(report.discrepancies).toHaveLength(0);
    expect(report.totals.normal100.sheet1).toBeCloseTo(report.totals.normal100.app, 3);
    expect(report.totals.normal100.sheet2).toBeCloseTo(report.totals.normal100.app, 3);
  });

  it('detects discrepancies if Sheet 1 totals differ from application totals', () => {
    const month = '2026-11';
    const items: DayAttendance[] = [
      {
        date: '2026-11-02',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      },
    ];

    const payroll = calculatePayroll(items);
    const detailRows = mapAttendanceToDetailRows(month, items);
    const summaryCategories = mapPayrollToSummaryCategories(payroll);

    // Artificially alter Sheet 1 data
    const corruptedDetailRows = [...detailRows];
    corruptedDetailRows[0] = {
      ...corruptedDetailRows[0],
      normal100Hours: corruptedDetailRows[0].normal100Hours + 5,
    };

    const report = reconcileAttendanceExport(payroll, corruptedDetailRows, summaryCategories);

    expect(report.isMatched).toBe(false);
    expect(report.discrepancies.length).toBeGreaterThan(0);
    expect(report.discrepancies[0]).toContain('Số giờ cơ bản 100%');
  });

  it('detects discrepancies if Sheet 2 totals differ from application totals', () => {
    const month = '2026-11';
    const items: DayAttendance[] = [
      {
        date: '2026-11-02',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      },
    ];

    const payroll = calculatePayroll(items);
    const detailRows = mapAttendanceToDetailRows(month, items);
    const summaryCategories = mapPayrollToSummaryCategories(payroll);

    // Artificially alter Sheet 2 category
    const corruptedSummary = summaryCategories.map((c) =>
      c.stt === 1 ? { ...c, totalHours: c.totalHours + 2 } : c
    );

    const report = reconcileAttendanceExport(payroll, detailRows, corruptedSummary);

    expect(report.isMatched).toBe(false);
    expect(report.discrepancies.length).toBeGreaterThan(0);
    expect(report.discrepancies[0]).toContain('Số giờ cơ bản 100%');
  });
});
