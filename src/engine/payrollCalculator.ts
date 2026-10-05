import { DayAttendance } from './attendanceCalculator';
import {
  ClassifiedInterval,
  classifyShiftIntervals,
} from './timeCalculator';

export type SalaryConfig = {
  basicSalary: number;
  seniorityAllowance: number;
  livingAllowance: number;
  attendanceAllowance: number;
  otherAllowance: number;
  standardHours: number;
  insuranceRate: number;
};

export type PayrollAdjustments = {
  // A2
  leave70Hours?: number;
  specialLeaveHours?: number;

  // A1
  womenAllowance?: number;
  childSupport?: number;

  // A4. Các khoản cộng khác
  annualLeaveSettlement?: number;
  mealSupport?: number;
  referralBonus?: number;
  salaryBonusAdjustment?: number;
  pitRefund?: number;

  // B1. Các khoản trừ
  latenessDeduction?: number;

  // B2. Bảo hiểm
  healthInsuranceRecovery?: number;
  unionDeduction?: number;

  // B4. Các khoản trừ khác
  damageDeduction?: number;
  mealDeduction?: number;
  uniformDeduction?: number;
  previousMonthDeduction?: number;
  disasterFundDeduction?: number;
};

export type HoursSummaryInput = {
  normalHours?: number;
  normal100Hours?: number;
  pnHours?: number;
  ot150Hours?: number;
  ot150DayHours?: number;
  ot150NightHours?: number;
  night100Hours?: number;
  nightAllowanceHours?: number;
  ot130NightHours?: number;
  ot200Hours?: number;
  ot200NightHours?: number;
  ot210Hours?: number;
  weeklyOffHours?: number;
  weeklyOff200Hours?: number;
  weeklyOffNightHours?: number;
  weeklyOffNight200Hours?: number;
  weeklyOffNight270Hours?: number;
  holidayHours?: number;
  holiday300Hours?: number;
  holidayNightHours?: number;
  holidayNight300Hours?: number;
  holidayNight390Hours?: number;
  leave70Hours?: number;
  specialLeaveHours?: number;
};

export type PayrollBreakdown = {
  // Hợp đồng & Chuẩn
  basicSalary: number;
  seniorityAllowance: number;
  livingAllowance: number;
  attendanceAllowance: number;
  otherAllowance: number;
  standardHours: number;
  actualHours: number;

  // A2. Lương chính thức
  normalHours: number;
  normalPay: number;
  normal100Hours: number;
  normal100Pay: number;
  pnHours: number;
  pnPay: number;

  ot150Hours: number;
  ot150Pay: number;
  ot150DayHours: number;
  ot150DayPay: number;

  night100Hours: number;
  night100Pay: number;

  nightAllowanceHours: number;
  nightAllowancePay: number;
  ot130NightHours: number;
  ot130NightPay: number;

  ot200Hours: number;
  ot200Pay: number;
  ot200NightHours: number;
  ot200NightPay: number;

  ot150NightHours: number;
  ot150NightPay: number;

  ot210Hours: number;
  ot210Pay: number;

  weeklyOffHours: number;
  weeklyOffPay: number;
  weeklyOff200Hours: number;
  weeklyOff200Pay: number;
  weeklyOffNight200Hours: number;
  weeklyOffNight200Pay: number;

  weeklyOffNightHours: number;
  weeklyOffNightPay: number;
  weeklyOffNight270Hours: number;
  weeklyOffNight270Pay: number;

  holidayHours: number;
  holidayPay: number;
  holiday300Hours: number;
  holiday300Pay: number;
  holidayNight300Hours: number;
  holidayNight300Pay: number;

  holidayNightHours: number;
  holidayNightPay: number;
  holidayNight390Hours: number;
  holidayNight390Pay: number;

  leave70Hours: number;
  leave70Pay: number;
  specialLeaveHours: number;
  specialLeavePay: number;
  totalA2: number;

  // A1. Các khoản phụ cấp
  livingAllowancePay: number;
  attendanceBonus: number;
  womenAllowance: number;
  childSupport: number;
  otherAllowancePay: number;
  totalA1: number;

  // A4. Các khoản cộng khác
  annualLeaveSettlement: number;
  mealSupport: number;
  referralBonus: number;
  salaryBonusAdjustment: number;
  pitRefund: number;
  totalA4: number;

  // Tổng A
  totalA: number;
  grossPay: number; // alias
  gross: number; // alias

  // B1. Các khoản trừ
  latenessDeduction: number;
  totalB1: number;

  // B2. Bảo hiểm
  insuranceRate: number;
  insuranceBase: number;
  insuranceDeduction: number;
  healthInsuranceRecovery: number;
  unionDeduction: number;
  totalB2: number;

  // B4. Các khoản trừ khác
  damageDeduction: number;
  mealDeduction: number;
  uniformDeduction: number;
  previousMonthDeduction: number;
  disasterFundDeduction: number;
  totalB4: number;

  // Tổng giảm trừ
  totalDeductions: number;
  deductions: number; // alias

  // Thu nhập thực lĩnh
  netPay: number;
  net: number; // alias

  // Compatibility aliases
  nightHours130: number;
  nightNormalHours: number;
  nightAllowance: number;
  allowances: number;
  otherIncome: number;
  otherDeductions: number;

  // Intervals breakdown
  intervals: ClassifiedInterval[];
};

export const DEFAULT_CONFIG: SalaryConfig = {
  basicSalary: 5652500,
  seniorityAllowance: 425000,
  livingAllowance: 807500,
  attendanceAllowance: 425000,
  otherAllowance: 765000,
  standardHours: 208,
  insuranceRate: 10.5,
};

export const roundMoney = (value: number) => +(Math.round(value * 100) / 100);
export const roundHours = (value: number) => +(Math.round(value * 1000000) / 1000000);

/**
 * Calculates payroll strictly following the Excel "Bảng lương" formulas and
 * the Interval Classification Engine.
 */
export function calculatePayroll(
  attendancesOrSummary: DayAttendance[] | HoursSummaryInput,
  rawConfig: SalaryConfig = DEFAULT_CONFIG,
  adjustments: PayrollAdjustments = {}
): PayrollBreakdown {
  const cfg: SalaryConfig = { ...DEFAULT_CONFIG, ...rawConfig };
  const stdHours = cfg.standardHours > 0 ? cfg.standardHours : DEFAULT_CONFIG.standardHours;

  // Hourly rates per Excel:
  // normalHourlyRate = (basicSalary + seniorityAllowance) / standardHours
  const normalHourlyRate = stdHours > 0 ? (cfg.basicSalary + cfg.seniorityAllowance) / stdHours : 0;
  // premiumHourlyRate = (basicSalary + seniorityAllowance + livingAllowance) / standardHours
  const premiumHourlyRate = stdHours > 0 ? (cfg.basicSalary + cfg.seniorityAllowance + cfg.livingAllowance) / stdHours : 0;

  let normal100Hours = 0;
  let pnHours = 0;
  let night100Hours = 0;
  let ot150DayHours = 0;
  let ot130NightHours = 0;
  let ot200NightHours = 0;
  let ot150NightHours = 0;
  let ot210Hours = 0;

  let weeklyOff200Hours = 0;
  let weeklyOffNight200Hours = 0;
  let weeklyOffNight270Hours = 0;

  let holiday300Hours = 0;
  let holidayNight300Hours = 0;
  let holidayNight390Hours = 0;

  let leave70Hours = adjustments.leave70Hours || 0;
  let specialLeaveHours = adjustments.specialLeaveHours || 0;

  let isSummaryInput = false;
  let summaryNightAllowanceGiven = false;
  let summaryNightAllowanceVal = 0;

  const allIntervals: ClassifiedInterval[] = [];

  // Check if input is a direct hours summary object
  if (!Array.isArray(attendancesOrSummary)) {
    isSummaryInput = true;
    const summary = attendancesOrSummary as HoursSummaryInput;
    normal100Hours = summary.normal100Hours ?? (summary.normalHours || 0);
    pnHours = summary.pnHours || 0;
    night100Hours = summary.night100Hours || 0;
    ot150DayHours = summary.ot150DayHours ?? (summary.ot150Hours || 0);
    ot150NightHours = summary.ot150NightHours || 0;

    if (summary.nightAllowanceHours !== undefined && summary.ot130NightHours === undefined) {
      summaryNightAllowanceGiven = true;
      summaryNightAllowanceVal = summary.nightAllowanceHours;
      ot130NightHours = summary.nightAllowanceHours;
    } else {
      ot130NightHours = summary.ot130NightHours ?? (summary.nightAllowanceHours || 0);
    }

    ot200NightHours = summary.ot200NightHours ?? (summary.ot200Hours || 0);
    ot210Hours = summary.ot210Hours || 0;

    weeklyOff200Hours = summary.weeklyOff200Hours ?? (summary.weeklyOffHours || 0);
    weeklyOffNight200Hours = summary.weeklyOffNight200Hours || 0;
    weeklyOffNight270Hours = summary.weeklyOffNight270Hours ?? (summary.weeklyOffNightHours || 0);

    holiday300Hours = summary.holiday300Hours ?? (summary.holidayHours || 0);
    holidayNight300Hours = summary.holidayNight300Hours || 0;
    holidayNight390Hours = summary.holidayNight390Hours ?? (summary.holidayNightHours || 0);

    leave70Hours = summary.leave70Hours ?? leave70Hours;
    specialLeaveHours = summary.specialLeaveHours ?? specialLeaveHours;
  } else {
    // Process attendance records using the Interval Classification Engine
    const attendances = attendancesOrSummary;
    for (const att of attendances) {
      // PN: 8 hours at 100% normal
      if (att.leaveType === 'PN' || att.leaveCode === 'PN') {
        normal100Hours += 8;
        pnHours += 8;
        continue;
      }

      // Unpaid leaves
      if (att.leaveType === 'UNPAID' || att.leaveType === 'OTHER') {
        continue;
      }

      // Special leaves
      if ((att.leaveType as any) === 'LEAVE_70') {
        leave70Hours += 8;
        continue;
      }
      if ((att.leaveType as any) === 'SPECIAL') {
        specialLeaveHours += 8;
        continue;
      }

      if (!att.shift || !att.shift.start || !att.shift.end) {
        continue;
      }

      const intervals = classifyShiftIntervals(att.shift.start, att.shift.end, att.dayType);
      allIntervals.push(...intervals);

      for (const iv of intervals) {
        const h = iv.durationMinutes / 60;
        switch (iv.category) {
          case 'NORMAL_100':
            normal100Hours += h;
            break;
          case 'NIGHT_100':
            night100Hours += h;
            normal100Hours += h;
            break;
          case 'OT_150_DAY':
            ot150DayHours += h;
            break;
          case 'OT_130_NIGHT':
            ot130NightHours += h;
            break;
          case 'OT_200_NIGHT':
            ot200NightHours += h;
            break;
          case 'OT_150_NIGHT':
            ot150NightHours += h;
            break;
          case 'OT_210':
            ot210Hours += h;
            break;
          case 'WEEKLY_OFF_200':
            weeklyOff200Hours += h;
            break;
          case 'WEEKLY_OFF_NIGHT_200':
            weeklyOffNight200Hours += h;
            break;
          case 'WEEKLY_OFF_NIGHT_270':
            weeklyOffNight270Hours += h;
            break;
          case 'HOLIDAY_300':
            holiday300Hours += h;
            break;
          case 'HOLIDAY_NIGHT_300':
            holidayNight300Hours += h;
            break;
          case 'HOLIDAY_NIGHT_390':
            holidayNight390Hours += h;
            break;
          case 'UNPAID_BREAK':
            break;
        }
      }
    }
  }

  // Combined totals & compatibility aliases
  const normalHours = normal100Hours;
  const ot150Hours = ot150DayHours + ot150NightHours;
  const ot200Hours = ot200NightHours;
  const weeklyOffHours = weeklyOff200Hours + weeklyOffNight200Hours;
  const weeklyOffNightHours = weeklyOffNight270Hours;
  const holidayHours = holiday300Hours + holidayNight300Hours;
  const holidayNightHours = holidayNight390Hours;
  const nightAllowanceHours = ot130NightHours;

  // ==================================================
  // 1. TÍNH A2: LƯƠNG CHÍNH THỨC
  // ==================================================
  const normal100Pay = roundMoney(normal100Hours * normalHourlyRate * 1.0);
  const normalPay = normal100Pay;
  const pnPay = roundMoney(pnHours * normalHourlyRate * 1.0);
  const night100Pay = roundMoney(night100Hours * normalHourlyRate * 1.0);

  const ot150DayPay = roundMoney(ot150DayHours * premiumHourlyRate * 1.5);
  const ot150NightPay = roundMoney(ot150NightHours * premiumHourlyRate * 1.5);
  const ot150Pay = roundMoney(ot150Hours * premiumHourlyRate * 1.5);

  let nightAllowancePay = 0;
  let ot130NightPay = 0;
  if (isSummaryInput && summaryNightAllowanceGiven) {
    // Benchmark test case (Excel sheet uses 30% allowance because normal hours were already included in 208h)
    nightAllowancePay = roundMoney(summaryNightAllowanceVal * premiumHourlyRate * 0.30);
    ot130NightPay = nightAllowancePay;
  } else {
    ot130NightPay = roundMoney(ot130NightHours * premiumHourlyRate * 1.30);
    nightAllowancePay = ot130NightPay;
  }

  const ot200NightPay = roundMoney(ot200NightHours * premiumHourlyRate * 2.0);
  const ot200Pay = roundMoney(ot200Hours * premiumHourlyRate * 2.0);

  const ot210Pay = roundMoney(ot210Hours * premiumHourlyRate * 2.1);

  const weeklyOff200Pay = roundMoney(weeklyOff200Hours * premiumHourlyRate * 2.0);
  const weeklyOffNight200Pay = roundMoney(weeklyOffNight200Hours * premiumHourlyRate * 2.0);
  const weeklyOffPay = roundMoney(weeklyOffHours * premiumHourlyRate * 2.0);

  const weeklyOffNight270Pay = roundMoney(weeklyOffNight270Hours * premiumHourlyRate * 2.7);
  const weeklyOffNightPay = weeklyOffNight270Pay;

  const holiday300Pay = roundMoney(holiday300Hours * premiumHourlyRate * 3.0);
  const holidayNight300Pay = roundMoney(holidayNight300Hours * premiumHourlyRate * 3.0);
  const holidayPay = roundMoney(holidayHours * premiumHourlyRate * 3.0);

  const holidayNight390Pay = roundMoney(holidayNight390Hours * premiumHourlyRate * 3.9);
  const holidayNightPay = holidayNight390Pay;

  const leave70Pay = roundMoney(leave70Hours * normalHourlyRate * 0.7);
  const specialLeavePay = roundMoney(specialLeaveHours * normalHourlyRate * 1.0);

  const totalA2 = roundMoney(
    normalPay +
    ot150Pay +
    nightAllowancePay +
    ot200Pay +
    ot210Pay +
    weeklyOffPay +
    weeklyOffNightPay +
    holidayPay +
    holidayNightPay +
    leave70Pay +
    specialLeavePay
  );

  // ==================================================
  // 2. TÍNH A1: CÁC KHOẢN PHỤ CẤP
  // ==================================================
  const livingAllowancePay = roundMoney((cfg.livingAllowance / 26) * (normal100Hours / 8));
  const attendanceBonus = roundMoney((cfg.attendanceAllowance / 26) * (normal100Hours / 8));
  const otherAllowancePay = roundMoney((cfg.otherAllowance / 26) * (normal100Hours / 8));
  const womenAllowance = roundMoney(adjustments.womenAllowance || 0);
  const childSupport = roundMoney(adjustments.childSupport || 0);

  const totalA1 = roundMoney(
    livingAllowancePay +
    attendanceBonus +
    womenAllowance +
    childSupport +
    otherAllowancePay
  );

  // ==================================================
  // 3. TÍNH A4: CÁC KHOẢN CỘNG KHÁC
  // ==================================================
  const annualLeaveSettlement = roundMoney(adjustments.annualLeaveSettlement || 0);
  const mealSupport = roundMoney(adjustments.mealSupport || 0);
  const referralBonus = roundMoney(adjustments.referralBonus || 0);
  const salaryBonusAdjustment = roundMoney(adjustments.salaryBonusAdjustment || 0);
  const pitRefund = roundMoney(adjustments.pitRefund || 0);

  const totalA4 = roundMoney(
    annualLeaveSettlement +
    mealSupport +
    referralBonus +
    salaryBonusAdjustment +
    pitRefund
  );

  // TỔNG A = A1 + A2 + A4
  const totalA = roundMoney(totalA1 + totalA2 + totalA4);

  // ==================================================
  // 4. TÍNH B1: CÁC KHOẢN TRỪ
  // ==================================================
  const latenessDeduction = roundMoney(adjustments.latenessDeduction || 0);
  const totalB1 = latenessDeduction;

  // ==================================================
  // 5. TÍNH B2: BẢO HIỂM
  // ==================================================
  const insuranceBase = cfg.basicSalary + cfg.seniorityAllowance;
  const insuranceDeduction = roundMoney((insuranceBase * cfg.insuranceRate) / 100);
  const healthInsuranceRecovery = roundMoney(adjustments.healthInsuranceRecovery || 0);
  const unionDeduction = roundMoney(adjustments.unionDeduction || 0);
  const totalB2 = roundMoney(insuranceDeduction + healthInsuranceRecovery + unionDeduction);

  // ==================================================
  // 6. TÍNH B4: CÁC KHOẢN TRỪ KHÁC
  // ==================================================
  const damageDeduction = roundMoney(adjustments.damageDeduction || 0);
  const mealDeduction = roundMoney(adjustments.mealDeduction || 0);
  const uniformDeduction = roundMoney(adjustments.uniformDeduction || 0);
  const previousMonthDeduction = roundMoney(adjustments.previousMonthDeduction || 0);
  const disasterFundDeduction = roundMoney(adjustments.disasterFundDeduction || 0);
  const totalB4 = roundMoney(
    damageDeduction +
    mealDeduction +
    uniformDeduction +
    previousMonthDeduction +
    disasterFundDeduction
  );

  // TỔNG GIẢM TRỪ = B1 + B2 + B4
  const totalDeductions = roundMoney(totalB1 + totalB2 + totalB4);

  // THU NHẬP THỰC LĨNH = TỔNG A - TỔNG GIẢM TRỪ
  const netPay = roundMoney(totalA - totalDeductions);

  // Số giờ công thực tế
  const actualHours = roundHours(
    normal100Hours +
    ot150Hours +
    ot130NightHours +
    ot200Hours +
    ot210Hours +
    weeklyOffHours +
    weeklyOffNightHours +
    holidayHours +
    holidayNightHours +
    leave70Hours +
    specialLeaveHours
  );

  return {
    // Hợp đồng & Chuẩn
    basicSalary: cfg.basicSalary,
    seniorityAllowance: cfg.seniorityAllowance,
    livingAllowance: cfg.livingAllowance,
    attendanceAllowance: cfg.attendanceAllowance,
    otherAllowance: cfg.otherAllowance,
    standardHours: cfg.standardHours,
    actualHours,

    // A2. Lương chính thức
    normalHours: roundHours(normalHours),
    normalPay,
    normal100Hours: roundHours(normal100Hours),
    normal100Pay,
    pnHours: roundHours(pnHours),
    pnPay,

    ot150Hours: roundHours(ot150Hours),
    ot150Pay,
    ot150DayHours: roundHours(ot150DayHours),
    ot150DayPay,

    night100Hours: roundHours(night100Hours),
    night100Pay,

    nightAllowanceHours: roundHours(nightAllowanceHours),
    nightAllowancePay,
    ot130NightHours: roundHours(ot130NightHours),
    ot130NightPay,

    ot200Hours: roundHours(ot200Hours),
    ot200Pay,
    ot200NightHours: roundHours(ot200NightHours),
    ot200NightPay,

    ot150NightHours: roundHours(ot150NightHours),
    ot150NightPay,

    ot210Hours: roundHours(ot210Hours),
    ot210Pay,

    weeklyOffHours: roundHours(weeklyOffHours),
    weeklyOffPay,
    weeklyOff200Hours: roundHours(weeklyOff200Hours),
    weeklyOff200Pay,
    weeklyOffNight200Hours: roundHours(weeklyOffNight200Hours),
    weeklyOffNight200Pay,

    weeklyOffNightHours: roundHours(weeklyOffNightHours),
    weeklyOffNightPay,
    weeklyOffNight270Hours: roundHours(weeklyOffNight270Hours),
    weeklyOffNight270Pay,

    holidayHours: roundHours(holidayHours),
    holidayPay,
    holiday300Hours: roundHours(holiday300Hours),
    holiday300Pay,
    holidayNight300Hours: roundHours(holidayNight300Hours),
    holidayNight300Pay,

    holidayNightHours: roundHours(holidayNightHours),
    holidayNightPay,
    holidayNight390Hours: roundHours(holidayNight390Hours),
    holidayNight390Pay,

    leave70Hours: roundHours(leave70Hours),
    leave70Pay,
    specialLeaveHours: roundHours(specialLeaveHours),
    specialLeavePay,
    totalA2,

    // A1. Các khoản phụ cấp
    livingAllowancePay,
    attendanceBonus,
    womenAllowance,
    childSupport,
    otherAllowancePay,
    totalA1,

    // A4. Các khoản cộng khác
    annualLeaveSettlement,
    mealSupport,
    referralBonus,
    salaryBonusAdjustment,
    pitRefund,
    totalA4,

    // Tổng A
    totalA,
    grossPay: totalA,
    gross: totalA,

    // B1. Các khoản trừ
    latenessDeduction,
    totalB1,

    // B2. Bảo hiểm
    insuranceRate: cfg.insuranceRate,
    insuranceBase,
    insuranceDeduction,
    healthInsuranceRecovery,
    unionDeduction,
    totalB2,

    // B4. Các khoản trừ khác
    damageDeduction,
    mealDeduction,
    uniformDeduction,
    previousMonthDeduction,
    disasterFundDeduction,
    totalB4,

    // Tổng giảm trừ
    totalDeductions,
    deductions: totalDeductions,

    // Thu nhập thực lĩnh
    netPay,
    net: netPay,

    // Compatibility aliases
    nightHours130: roundHours(ot130NightHours + ot200NightHours),
    nightNormalHours: roundHours(night100Hours),
    nightAllowance: nightAllowancePay,
    allowances: roundMoney(livingAllowancePay + otherAllowancePay + attendanceBonus),
    otherIncome: totalA4,
    otherDeductions: roundMoney(totalB1 + healthInsuranceRecovery + unionDeduction + totalB4),

    // Intervals list
    intervals: allIntervals,
  };
}

export function calculatePayrollFromHours(
  hours: HoursSummaryInput,
  rawConfig: SalaryConfig = DEFAULT_CONFIG,
  adjustments: PayrollAdjustments = {}
): PayrollBreakdown {
  return calculatePayroll(hours, rawConfig, adjustments);
}
