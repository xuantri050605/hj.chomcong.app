import { PayrollBreakdown } from '../../engine/payrollCalculator';
import {
  AttendanceDetailRow,
  AttendanceSummaryCategory,
  ExcelReconciliationReport,
} from './excelTypes';

const EPSILON = 0.0001;

function isClose(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

export function reconcileAttendanceExport(
  payroll: PayrollBreakdown,
  detailRows: AttendanceDetailRow[],
  summaryCategories: AttendanceSummaryCategory[]
): ExcelReconciliationReport {
  // 1. Calculate totals from Sheet 1 (Detail Rows)
  let s1Normal100 = 0;
  let s1Ot150Day = 0;
  let s1NightAllowance = 0;
  let s1Ot200Night = 0;
  let s1Ot210 = 0;
  let s1WeeklyOff200 = 0;
  let s1WeeklyOffNight270 = 0;
  let s1Holiday300 = 0;
  let s1HolidayNight390 = 0;
  let s1Leave70 = 0;
  let s1SpecialLeave = 0;

  for (const r of detailRows) {
    s1Normal100 += r.normal100Hours;
    s1Ot150Day += r.ot150DayHours;
    s1NightAllowance += r.nightAllowanceHours;
    s1Ot200Night += r.ot200NightHours;
    s1Ot210 += r.ot210Hours;
    s1WeeklyOff200 += r.weeklyOff200Hours;
    s1WeeklyOffNight270 += r.weeklyOffNight270Hours;
    s1Holiday300 += r.holiday300Hours;
    s1HolidayNight390 += r.holidayNight390Hours;
    s1Leave70 += r.leave70Hours;
    s1SpecialLeave += r.specialLeaveHours;
  }

  // 2. Extract totals from Sheet 2 (Summary Categories)
  const s2Map = new Map<number, number>();
  for (const c of summaryCategories) {
    s2Map.set(c.stt, c.totalHours);
  }

  const s2Normal100 = s2Map.get(1) ?? 0;
  const s2Ot150Day = s2Map.get(2) ?? 0;
  const s2NightAllowance = s2Map.get(3) ?? 0;
  const s2Ot200Night = s2Map.get(4) ?? 0;
  const s2Ot210 = s2Map.get(5) ?? 0;
  const s2WeeklyOff200 = s2Map.get(6) ?? 0;
  const s2WeeklyOffNight270 = s2Map.get(7) ?? 0;
  const s2Holiday300 = s2Map.get(8) ?? 0;
  const s2HolidayNight390 = s2Map.get(9) ?? 0;
  const s2Leave70 = s2Map.get(10) ?? 0;
  const s2SpecialLeave = s2Map.get(11) ?? 0;

  // 3. Extract canonical Application totals from PayrollBreakdown
  const appNormal100 = payroll.normal100Hours;
  const appOt150Day = payroll.ot150Hours;
  const appNightAllowance = payroll.nightAllowanceHours;
  const appOt200Night = payroll.ot200NightHours;
  const appOt210 = payroll.ot210Hours;
  const appWeeklyOff200 = payroll.weeklyOffHours;
  const appWeeklyOffNight270 = payroll.weeklyOffNight270Hours;
  const appHoliday300 = payroll.holidayHours;
  const appHolidayNight390 = payroll.holidayNight390Hours;
  const appLeave70 = payroll.leave70Hours;
  const appSpecialLeave = payroll.specialLeaveHours;

  const discrepancies: string[] = [];

  const checkCategory = (
    label: string,
    appVal: number,
    s1Val: number,
    s2Val: number
  ) => {
    if (!isClose(appVal, s1Val) || !isClose(appVal, s2Val) || !isClose(s1Val, s2Val)) {
      discrepancies.push(
        `Lệch số liệu [${label}]: Hệ thống = ${appVal.toFixed(2)}h, Sheet 1 = ${s1Val.toFixed(2)}h, Sheet 2 = ${s2Val.toFixed(2)}h`
      );
    }
  };

  checkCategory('Số giờ cơ bản 100%', appNormal100, s1Normal100, s2Normal100);
  checkCategory('Số giờ tăng ca ngày 150%', appOt150Day, s1Ot150Day, s2Ot150Day);
  checkCategory('Số giờ phụ cấp ca đêm 30%', appNightAllowance, s1NightAllowance, s2NightAllowance);
  checkCategory('Số giờ tăng ca đêm 200%', appOt200Night, s1Ot200Night, s2Ot200Night);
  checkCategory('Số giờ tăng ca ngày thường 210%', appOt210, s1Ot210, s2Ot210);
  checkCategory('Số giờ tăng ca ngày Chủ nhật 200%', appWeeklyOff200, s1WeeklyOff200, s2WeeklyOff200);
  checkCategory('Số giờ tăng ca đêm Chủ nhật 270%', appWeeklyOffNight270, s1WeeklyOffNight270, s2WeeklyOffNight270);
  checkCategory('Số giờ tăng ca ngày lễ 300%', appHoliday300, s1Holiday300, s2Holiday300);
  checkCategory('Số giờ tăng ca đêm ngày lễ 390%', appHolidayNight390, s1HolidayNight390, s2HolidayNight390);
  checkCategory('Số giờ hưởng nghỉ 70%', appLeave70, s1Leave70, s2Leave70);
  checkCategory('Số giờ nghỉ chế độ đặc biệt', appSpecialLeave, s1SpecialLeave, s2SpecialLeave);

  return {
    isMatched: discrepancies.length === 0,
    discrepancies,
    totals: {
      normal100: { app: appNormal100, sheet1: s1Normal100, sheet2: s2Normal100 },
      ot150Day: { app: appOt150Day, sheet1: s1Ot150Day, sheet2: s2Ot150Day },
      nightAllowance: { app: appNightAllowance, sheet1: s1NightAllowance, sheet2: s2NightAllowance },
      ot200Night: { app: appOt200Night, sheet1: s1Ot200Night, sheet2: s2Ot200Night },
      ot210: { app: appOt210, sheet1: s1Ot210, sheet2: s2Ot210 },
      weeklyOff200: { app: appWeeklyOff200, sheet1: s1WeeklyOff200, sheet2: s2WeeklyOff200 },
      weeklyOffNight270: { app: appWeeklyOffNight270, sheet1: s1WeeklyOffNight270, sheet2: s2WeeklyOffNight270 },
      holiday300: { app: appHoliday300, sheet1: s1Holiday300, sheet2: s2Holiday300 },
      holidayNight390: { app: appHolidayNight390, sheet1: s1HolidayNight390, sheet2: s2HolidayNight390 },
      leave70: { app: appLeave70, sheet1: s1Leave70, sheet2: s2Leave70 },
      specialLeave: { app: appSpecialLeave, sheet1: s1SpecialLeave, sheet2: s2SpecialLeave },
    },
  };
}
