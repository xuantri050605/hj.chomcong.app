import { DayAttendance } from '../../engine/attendanceCalculator';
import { PayrollBreakdown, SalaryConfig } from '../../engine/payrollCalculator';

export interface AttendanceDetailRow {
  stt: number;
  dateStr: string; // dd/MM/yyyy
  dateRaw: string; // YYYY-MM-DD
  dayOfWeekName: string; // Thứ Hai, Thứ Ba...
  clockIn: string; // HH:mm or ""
  clockOut: string; // HH:mm or ""
  statusType: string; // Đi làm tiêu chuẩn, Nghỉ phép năm...
  normal100Hours: number;
  ot150DayHours: number;
  nightAllowanceHours: number; // 30%
  ot200NightHours: number;
  ot210Hours: number;
  weeklyOff200Hours: number;
  weeklyOffNight270Hours: number;
  holiday300Hours: number;
  holidayNight390Hours: number;
  leave70Hours: number;
  specialLeaveHours: number;
  note: string;
}

export interface AttendanceSummaryCategory {
  stt: number;
  name: string;
  coefficientPercent: string;
  coefficientNumeric: number;
  totalHours: number;
  note: string;
}

export interface ExcelReconciliationReport {
  isMatched: boolean;
  discrepancies: string[];
  totals: {
    normal100: { app: number; sheet1: number; sheet2: number };
    ot150Day: { app: number; sheet1: number; sheet2: number };
    nightAllowance: { app: number; sheet1: number; sheet2: number };
    ot200Night: { app: number; sheet1: number; sheet2: number };
    ot210: { app: number; sheet1: number; sheet2: number };
    weeklyOff200: { app: number; sheet1: number; sheet2: number };
    weeklyOffNight270: { app: number; sheet1: number; sheet2: number };
    holiday300: { app: number; sheet1: number; sheet2: number };
    holidayNight390: { app: number; sheet1: number; sheet2: number };
    leave70: { app: number; sheet1: number; sheet2: number };
    specialLeave: { app: number; sheet1: number; sheet2: number };
  };
}

export interface ExportMetadata {
  month: string; // YYYY-MM
  employeeCode?: string;
  employeeName?: string;
  department?: string;
  companyName?: string;
  exportedAt?: string;
}
