import XLSX from 'xlsx-js-style';
import { DayAttendance } from '../../engine/attendanceCalculator';
import { calculatePayroll, PayrollBreakdown, SalaryConfig } from '../../engine/payrollCalculator';
import {
  formatDateToVn,
  mapAttendanceToDetailRows,
  mapPayrollToSummaryCategories,
} from './excelDataMapper';
import { reconcileAttendanceExport } from './excelReconciler';
import { EXCEL_STYLES, HOJEONG_COLORS } from './excelStyleHelper';
import {
  AttendanceDetailRow,
  AttendanceSummaryCategory,
  ExcelReconciliationReport,
  ExportMetadata,
} from './excelTypes';

const isBrowserEnvironment = (): boolean =>
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof document.createElement === 'function';

export interface ExportResult {
  success: boolean;
  fileName: string;
  report: ExcelReconciliationReport;
  error?: string;
  dataBase64?: string;
}

const DETAIL_HEADERS = [
  'STT',
  'Ngày',
  'Thứ',
  'Giờ vào (In)',
  'Giờ ra (Out)',
  'Hình thức',
  'Số giờ cơ bản 100%',
  'Số giờ tăng ca ngày 150%',
  'Số giờ phụ cấp ca đêm 30%',
  'Số giờ tăng ca đêm 200%',
  'Số giờ tăng ca ngày thường 210%',
  'Số giờ tăng ca ngày Chủ nhật 200%',
  'Số giờ tăng ca đêm Chủ nhật 270%',
  'Số giờ tăng ca ngày lễ 300%',
  'Số giờ tăng ca đêm ngày lễ 390%',
  'Số giờ hưởng nghỉ 70%',
  'Số giờ nghỉ chế độ đặc biệt',
  'Ghi chú',
];

const SUMMARY_HEADERS = [
  'STT',
  'Hạng mục',
  'Hệ số (%)',
  'Hệ số (dạng số)',
  'Tổng giờ (giờ)',
  'Ghi chú',
];

/**
 * Builds the Sheet 1 "Chi tiết chấm công" worksheet with professional styling.
 */
function buildDetailWorksheet(
  metadata: ExportMetadata,
  detailRows: AttendanceDetailRow[]
): XLSX.WorkSheet {
  const aoa: any[][] = [];

  // Row 1: Company Header
  aoa.push([
    metadata.companyName || 'CÔNG TY TNHH HOJEONG',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  ]);

  // Row 2: Subtitle
  aoa.push([
    'HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG CHUYÊN NGHIỆP',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  ]);

  // Row 3: Report Title
  aoa.push([
    'BẢNG CHẤM CÔNG CHI TIẾT',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  ]);

  // Row 4: Metadata 1
  const monthParts = metadata.month.split('-');
  const formattedMonth =
    monthParts.length === 2 ? `Tháng ${monthParts[1]}/${monthParts[0]}` : metadata.month;
  aoa.push([
    `Kỳ chấm công: ${formattedMonth}`,
    '', '', '', '',
    `Mã nhân viên: ${metadata.employeeCode || 'HJ-NV01'}`,
    '', '', '',
    `Họ và tên: ${metadata.employeeName || 'Nhân viên HOJEONG'}`,
    '', '', '', '', '', '', '', '',
  ]);

  // Row 5: Metadata 2
  aoa.push([
    `Bộ phận / Phòng ban: ${metadata.department || 'Bộ phận sản xuất'}`,
    '', '', '', '',
    `Thời điểm xuất: ${metadata.exportedAt || new Date().toLocaleString('vi-VN')}`,
    '', '', '', '', '', '', '', '', '', '', '', '',
  ]);

  // Row 6: Empty spacer
  aoa.push(new Array(18).fill(''));

  // Row 7 (index 6): Table Column Headers
  aoa.push(DETAIL_HEADERS);

  // Rows 8+: Data rows
  detailRows.forEach((r) => {
    aoa.push([
      r.stt,
      r.dateStr,
      r.dayOfWeekName,
      r.clockIn || '--:--',
      r.clockOut || '--:--',
      r.statusType,
      r.normal100Hours,
      r.ot150DayHours,
      r.nightAllowanceHours,
      r.ot200NightHours,
      r.ot210Hours,
      r.weeklyOff200Hours,
      r.weeklyOffNight270Hours,
      r.holiday300Hours,
      r.holidayNight390Hours,
      r.leave70Hours,
      r.specialLeaveHours,
      r.note || '',
    ]);
  });

  // Summary Row (Totals)
  const sumCols = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  detailRows.forEach((r) => {
    sumCols[0] += r.normal100Hours;
    sumCols[1] += r.ot150DayHours;
    sumCols[2] += r.nightAllowanceHours;
    sumCols[3] += r.ot200NightHours;
    sumCols[4] += r.ot210Hours;
    sumCols[5] += r.weeklyOff200Hours;
    sumCols[6] += r.weeklyOffNight270Hours;
    sumCols[7] += r.holiday300Hours;
    sumCols[8] += r.holidayNight390Hours;
    sumCols[9] += r.leave70Hours;
    sumCols[10] += r.specialLeaveHours;
  });

  aoa.push([
    'TỔNG CỘNG',
    '', '', '', '', '',
    +sumCols[0].toFixed(2),
    +sumCols[1].toFixed(2),
    +sumCols[2].toFixed(2),
    +sumCols[3].toFixed(2),
    +sumCols[4].toFixed(2),
    +sumCols[5].toFixed(2),
    +sumCols[6].toFixed(2),
    +sumCols[7].toFixed(2),
    +sumCols[8].toFixed(2),
    +sumCols[9].toFixed(2),
    +sumCols[10].toFixed(2),
    'Đã đối soát toàn bộ',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Apply Styles
  // Company & Report Title
  if (ws['A1']) ws['A1'].s = EXCEL_STYLES.companyHeader;
  if (ws['A2']) ws['A2'].s = EXCEL_STYLES.companySubtext;
  if (ws['A3']) ws['A3'].s = EXCEL_STYLES.reportTitle;
  if (ws['A4']) ws['A4'].s = EXCEL_STYLES.metaLabel;
  if (ws['F4']) ws['F4'].s = EXCEL_STYLES.metaLabel;
  if (ws['J4']) ws['J4'].s = EXCEL_STYLES.metaLabel;
  if (ws['A5']) ws['A5'].s = EXCEL_STYLES.metaValue;
  if (ws['F5']) ws['F5'].s = EXCEL_STYLES.metaValue;

  const headerRowIdx = 6; // 0-indexed row 7
  for (let c = 0; c < 18; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (ws[cellRef]) ws[cellRef].s = EXCEL_STYLES.tableHeader;
  }

  // Data rows styling
  const dataStartRow = 7;
  const dataEndRow = dataStartRow + detailRows.length - 1;
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    const isZebra = (r - dataStartRow) % 2 === 1;
    for (let c = 0; c < 18; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;

      if (c === 0 || c === 1 || c === 2 || c === 3 || c === 4) {
        ws[cellRef].s = EXCEL_STYLES.dataCellCenter(isZebra);
      } else if (c === 5 || c === 17) {
        ws[cellRef].s = EXCEL_STYLES.dataCellLeft(isZebra);
      } else {
        const val = Number(ws[cellRef].v) || 0;
        ws[cellRef].s = EXCEL_STYLES.dataCellHour(isZebra, val > 0);
      }
    }
  }

  // Total Row styling
  const totalRowIdx = dataEndRow + 1;
  for (let c = 0; c < 18; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIdx, c });
    if (!ws[cellRef]) continue;
    if (c < 6 || c === 17) {
      ws[cellRef].s = EXCEL_STYLES.totalLabel;
    } else {
      ws[cellRef].s = EXCEL_STYLES.totalHour;
    }
  }

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Company Header
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Subtitle
    { s: { r: 2, c: 0 }, e: { r: 2, c: 17 } }, // Report Title
    { s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: 5 } }, // Total label
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 6 }, // 1. STT
    { wch: 13 }, // 2. Ngày
    { wch: 11 }, // 3. Thứ
    { wch: 13 }, // 4. Giờ vào
    { wch: 13 }, // 5. Giờ ra
    { wch: 22 }, // 6. Hình thức
    { wch: 16 }, // 7. Cơ bản 100%
    { wch: 16 }, // 8. Tăng ca 150%
    { wch: 16 }, // 9. Phụ cấp đêm 30%
    { wch: 16 }, // 10. Tăng ca đêm 200%
    { wch: 16 }, // 11. Tăng ca thường 210%
    { wch: 18 }, // 12. Tăng ca CN 200%
    { wch: 18 }, // 13. Tăng ca đêm CN 270%
    { wch: 16 }, // 14. Tăng ca lễ 300%
    { wch: 18 }, // 15. Tăng ca đêm lễ 390%
    { wch: 16 }, // 16. Hưởng nghỉ 70%
    { wch: 18 }, // 17. Nghỉ đặc biệt
    { wch: 24 }, // 18. Ghi chú
  ];

  // Views (freeze panes at header row)
  ws['!views'] = [{ state: 'frozen', ySplit: headerRowIdx + 1 }];

  // AutoFilter
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range(
      { r: headerRowIdx, c: 0 },
      { r: dataEndRow, c: 17 }
    ),
  };

  return ws;
}

/**
 * Builds the Sheet 2 "Tổng hợp giờ công" worksheet with professional styling.
 */
function buildSummaryWorksheet(
  metadata: ExportMetadata,
  summaryCategories: AttendanceSummaryCategory[]
): XLSX.WorkSheet {
  const aoa: any[][] = [];

  // Row 1: Company Header
  aoa.push([metadata.companyName || 'CÔNG TY TNHH HOJEONG', '', '', '', '', '']);

  // Row 2: Subtitle
  aoa.push(['HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG CHUYÊN NGHIỆP', '', '', '', '', '']);

  // Row 3: Report Title
  aoa.push(['BẢNG TỔNG HỢP GIỜ CÔNG', '', '', '', '', '']);

  // Row 4: Metadata 1
  const monthParts = metadata.month.split('-');
  const formattedMonth =
    monthParts.length === 2 ? `Tháng ${monthParts[1]}/${monthParts[0]}` : metadata.month;
  aoa.push([
    `Kỳ chấm công: ${formattedMonth}`,
    '',
    `Mã nhân viên: ${metadata.employeeCode || 'HJ-NV01'}`,
    '',
    `Họ và tên: ${metadata.employeeName || 'Nhân viên HOJEONG'}`,
    '',
  ]);

  // Row 5: Metadata 2
  aoa.push([
    `Bộ phận: ${metadata.department || 'Bộ phận sản xuất'}`,
    '',
    `Thời điểm xuất: ${metadata.exportedAt || new Date().toLocaleString('vi-VN')}`,
    '', '', '',
  ]);

  // Row 6: Empty spacer
  aoa.push(new Array(6).fill(''));

  // Row 7 (index 6): Table Column Headers
  aoa.push(SUMMARY_HEADERS);

  // Rows 8+: Data rows
  let totalAllHours = 0;
  summaryCategories.forEach((c) => {
    totalAllHours += c.totalHours;
    aoa.push([
      c.stt,
      c.name,
      c.coefficientPercent,
      c.coefficientNumeric,
      c.totalHours,
      c.note,
    ]);
  });

  // Summary Row (Total of All Hours)
  aoa.push([
    'TỔNG CỘNG GIỜ CÔNG',
    '', '', '',
    +totalAllHours.toFixed(2),
    'Đã đồng bộ tuyệt đối với Bảng chấm công chi tiết',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Apply Styles
  if (ws['A1']) ws['A1'].s = EXCEL_STYLES.companyHeader;
  if (ws['A2']) ws['A2'].s = EXCEL_STYLES.companySubtext;
  if (ws['A3']) ws['A3'].s = EXCEL_STYLES.reportTitle;
  if (ws['A4']) ws['A4'].s = EXCEL_STYLES.metaLabel;
  if (ws['C4']) ws['C4'].s = EXCEL_STYLES.metaLabel;
  if (ws['E4']) ws['E4'].s = EXCEL_STYLES.metaLabel;
  if (ws['A5']) ws['A5'].s = EXCEL_STYLES.metaValue;
  if (ws['C5']) ws['C5'].s = EXCEL_STYLES.metaValue;

  const headerRowIdx = 6; // 0-indexed row 7
  for (let c = 0; c < 6; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (ws[cellRef]) ws[cellRef].s = EXCEL_STYLES.tableHeader;
  }

  // Data rows styling
  const dataStartRow = 7;
  const dataEndRow = dataStartRow + summaryCategories.length - 1;
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    const isZebra = (r - dataStartRow) % 2 === 1;
    for (let c = 0; c < 6; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;

      if (c === 0 || c === 2 || c === 3) {
        ws[cellRef].s = EXCEL_STYLES.dataCellCenter(isZebra);
      } else if (c === 1 || c === 5) {
        ws[cellRef].s = EXCEL_STYLES.dataCellLeft(isZebra);
      } else if (c === 4) {
        const val = Number(ws[cellRef].v) || 0;
        ws[cellRef].s = EXCEL_STYLES.dataCellHour(isZebra, val > 0);
      }
    }
  }

  // Total Row styling
  const totalRowIdx = dataEndRow + 1;
  for (let c = 0; c < 6; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIdx, c });
    if (!ws[cellRef]) continue;
    if (c < 4 || c === 5) {
      ws[cellRef].s = EXCEL_STYLES.totalLabel;
    } else {
      ws[cellRef].s = EXCEL_STYLES.totalHour;
    }
  }

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Company Header
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Subtitle
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // Report Title
    { s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: 3 } }, // Total label
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 6 }, // 1. STT
    { wch: 32 }, // 2. Hạng mục
    { wch: 14 }, // 3. Hệ số (%)
    { wch: 16 }, // 4. Hệ số (dạng số)
    { wch: 18 }, // 5. Tổng giờ (giờ)
    { wch: 48 }, // 6. Ghi chú
  ];

  // Views (freeze panes)
  ws['!views'] = [{ state: 'frozen', ySplit: headerRowIdx + 1 }];

  // AutoFilter
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range(
      { r: headerRowIdx, c: 0 },
      { r: dataEndRow, c: 5 }
    ),
  };

  return ws;
}

/**
 * Generates the HOJEONG Excel Workbook containing exactly 2 sheets:
 * 1. Chi tiết chấm công (18 columns)
 * 2. Tổng hợp giờ công (11 categories)
 *
 * Enforces automated reconciliation between Application totals, Sheet 1 totals, and Sheet 2 totals.
 */
export function generateHojeongAttendanceWorkbook(
  month: string,
  items: DayAttendance[],
  config?: SalaryConfig,
  customMetadata?: Partial<ExportMetadata>
): { workbook: XLSX.WorkBook; report: ExcelReconciliationReport; metadata: ExportMetadata } {
  // 1. Calculate canonical payroll
  const payroll: PayrollBreakdown = calculatePayroll(items, config);

  // 2. Map data
  const detailRows = mapAttendanceToDetailRows(month, items);
  const summaryCategories = mapPayrollToSummaryCategories(payroll);

  // 3. Automated Reconciliation Check
  const report = reconcileAttendanceExport(payroll, detailRows, summaryCategories);
  if (!report.isMatched) {
    const errorDetails = report.discrepancies.join('\n');
    throw new Error(
      `LỖI ĐỐI SOÁT DỮ LIỆU XUẤT EXCEL: Phát hiện sai lệch số liệu giữa hệ thống và báo cáo:\n${errorDetails}`
    );
  }

  // 4. Metadata
  const metadata: ExportMetadata = {
    month,
    companyName: 'CÔNG TY TNHH HOJEONG',
    employeeCode: customMetadata?.employeeCode || 'HJ-NV01',
    employeeName: customMetadata?.employeeName || 'Nhân viên HOJEONG',
    department: customMetadata?.department || 'Bộ phận sản xuất',
    exportedAt: customMetadata?.exportedAt || new Date().toLocaleString('vi-VN'),
  };

  // 5. Construct sheets
  const wsDetail = buildDetailWorksheet(metadata, detailRows);
  const wsSummary = buildSummaryWorksheet(metadata, summaryCategories);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi tiết chấm công');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng hợp giờ công');

  return { workbook: wb, report, metadata };
}

/**
 * High-level export function that runs reconciliation and triggers download/export.
 */
export async function exportProfessionalAttendanceWorkbook(
  month: string,
  items: DayAttendance[],
  config?: SalaryConfig,
  metadata?: Partial<ExportMetadata>
): Promise<ExportResult> {
  const cleanMonth = month.replace(/[^0-9]/g, '');
  const empCode = (metadata?.employeeCode || 'NV').replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `HOJEONG_BangChamCong_${cleanMonth}_${empCode}.xlsx`;

  try {
    const { workbook, report } = generateHojeongAttendanceWorkbook(
      month,
      items,
      config,
      metadata
    );

    if (isBrowserEnvironment()) {
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as any);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        fileName,
        report,
      };
    }

    // Mobile / Node fallback: output base64
    const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    return {
      success: true,
      fileName,
      report,
      dataBase64: base64,
    };
  } catch (error: any) {
    return {
      success: false,
      fileName,
      report: {
        isMatched: false,
        discrepancies: [error?.message || 'Lỗi không xác định khi xuất Excel'],
        totals: {} as any,
      },
      error: error?.message || 'Không thể tạo bảng tính Excel',
    };
  }
}
