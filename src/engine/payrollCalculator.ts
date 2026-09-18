import { DayAttendance, computeWorkedHours, computeDayNightBreakdown } from './attendanceCalculator';
import { computeOvertimeForDay } from './overtimeCalculator';

export type SalaryConfig = {
  basicSalary: number; // monthly
  seniorityAllowance: number;
  livingAllowance: number;
  attendanceAllowance: number;
  otherAllowance: number;
  standardHours: number; // monthly standard hours
  attendanceBonus100: number; // 26 days full
  attendanceBonusPartialPercentFor25: number; // 0.5 means 50%
};

export type PayrollBreakdown = {
  normalHours: number;
  normalPay: number;
  ot150Hours: number;
  ot150Pay: number;
  nightHours: number;
  nightAllowance: number;
  weeklyOffPay: number;
  holidayPay: number;
  attendanceBonus: number;
  allowances: number;
  gross: number;
  deductions: number;
  net: number;
};

export const DEFAULT_CONFIG: SalaryConfig = {
  basicSalary: 5652500,
  seniorityAllowance: 425000,
  livingAllowance: 807500,
  attendanceAllowance: 425000,
  otherAllowance: 765000,
  standardHours: 208,
  attendanceBonus100: 1000000,
  attendanceBonusPartialPercentFor25: 0.5,
};

function hourlyRateFromConfig(cfg: SalaryConfig) {
  return (cfg.basicSalary + cfg.seniorityAllowance + cfg.livingAllowance) / cfg.standardHours;
}

// Core per-day calculation: returns monetary breakdown for the day
function calculateDayPay(a: DayAttendance, cfg: SalaryConfig) {
  // multipliers
  const MULT = {
    NORMAL: 1.0,
    OT_DAY: 1.5,
    NIGHT_ALLOWANCE: 0.3,
    OT_NIGHT: 2.0,
    OT_SPECIAL: 2.1,
    WEEKLY_OFF: 2.0,
    WEEKLY_OFF_NIGHT: 2.7,
    HOLIDAY: 3.0,
    HOLIDAY_NIGHT: 3.9,
  };

  const hourly = hourlyRateFromConfig(cfg);

  // PN => 8 paid hours at normal rate
  if (a.leaveType === 'PN') {
    const normalHours = 8;
    const normalPay = normalHours * hourly * MULT.NORMAL;
    return {
      normalHours,
      normalPay,
      ot150Hours: 0,
      ot150Pay: 0,
      nightHours: 0,
      nightAllowance: 0,
      weeklyOffPay: 0,
      holidayPay: 0,
    };
  }

  const worked = computeWorkedHours(a);
  if (worked <= 0) {
    return {
      normalHours: 0,
      normalPay: 0,
      ot150Hours: 0,
      ot150Pay: 0,
      nightHours: 0,
      nightAllowance: 0,
      weeklyOffPay: 0,
      holidayPay: 0,
    };
  }

  const { dayHours, nightHours } = computeDayNightBreakdown(a);

  // default allocations
  let normalHours = 0;
  let ot150Hours = 0;
  let normalPay = 0;
  let ot150Pay = 0;
  let weeklyOffPay = 0;
  let holidayPay = 0;

  if (a.dayType === 'NORMAL') {
    // dayHours count towards normal 8 hours first
    const dayNormal = Math.min(8, dayHours);
    const remainingDay = Math.max(0, dayHours - dayNormal);
    normalHours = dayNormal + 0; // night handled separately
    ot150Hours = remainingDay + Math.max(0, +(worked - 8 - nightHours).toFixed(6));

    normalPay = normalHours * hourly * MULT.NORMAL;
    ot150Pay = ot150Hours * hourly * MULT.OT_DAY;
  } else if (a.dayType === 'WEEKLY_OFF') {
    // all worked hours paid at WEEKLY_OFF (2.0) or WEEKLY_OFF_NIGHT for night part
    weeklyOffPay = worked * hourly * MULT.WEEKLY_OFF;
    // we'll subtract portion of night paid at higher rate below
  } else if (a.dayType === 'HOLIDAY') {
    holidayPay = worked * hourly * MULT.HOLIDAY;
  }

  // Night allowance always added: nightHours * hourly * 0.3
  const nightAllowance = nightHours * hourly * MULT.NIGHT_ALLOWANCE;

  // If weekly off or holiday, apply night multiplier for night hours additionally
  if (a.dayType === 'WEEKLY_OFF') {
    // night portion gets WEEKLY_OFF_NIGHT multiplier instead of WEEKLY_OFF
    const nightPayExtra = nightHours * hourly * (MULT.WEEKLY_OFF_NIGHT - MULT.WEEKLY_OFF);
    weeklyOffPay += nightPayExtra;
  }
  if (a.dayType === 'HOLIDAY') {
    const nightPayExtra = nightHours * hourly * (MULT.HOLIDAY_NIGHT - MULT.HOLIDAY);
    holidayPay += nightPayExtra;
  }
  // Night base pay for NORMAL days (night hours paid at normal rate) — separate from night allowance
  const nightBasePay = a.dayType === 'NORMAL' ? nightHours * hourly * MULT.NORMAL : 0;

  const totalNormalPay = +(normalPay || 0).toFixed(2);
  const totalOT150Pay = +(ot150Pay || 0).toFixed(2);
  const totalNightAllowance = +nightAllowance.toFixed(2);

  return {
    normalHours: +(normalHours || 0).toFixed(6),
    normalPay: totalNormalPay,
    ot150Hours: +(ot150Hours || 0).toFixed(6),
    ot150Pay: totalOT150Pay,
    nightHours: +(nightHours || 0).toFixed(6),
    nightAllowance: totalNightAllowance,
    nightBasePay: +nightBasePay.toFixed(2),
    weeklyOffPay: +(weeklyOffPay || 0).toFixed(2),
    holidayPay: +(holidayPay || 0).toFixed(2),
  };
}

export function calculatePayroll(attendances: DayAttendance[], cfg: SalaryConfig = DEFAULT_CONFIG): PayrollBreakdown {
  const hourly = hourlyRateFromConfig(cfg);
  let normalHours = 0;
  let normalPay = 0;
  let ot150Hours = 0;
  let ot150Pay = 0;
  let nightHours = 0;
  let nightAllowance = 0;
  let nightBasePay = 0;
  let weeklyOffPay = 0;
  let holidayPay = 0;

  let workedDaysCount = 0; // for attendance bonus

  for (const a of attendances) {
    const dayRes = calculateDayPay(a, cfg);
    normalHours += dayRes.normalHours;
    normalPay += dayRes.normalPay;
    ot150Hours += dayRes.ot150Hours;
    ot150Pay += dayRes.ot150Pay;
    nightHours += dayRes.nightHours;
    nightAllowance += dayRes.nightAllowance;
    // @ts-ignore - nightBasePay included on day result
    nightBasePay += (dayRes as any).nightBasePay || 0;
    weeklyOffPay += dayRes.weeklyOffPay;
    holidayPay += dayRes.holidayPay;

    // count as attendance if any paid hours (normal or ot or weekly/holiday)
    const paidThisDay = dayRes.normalPay + dayRes.ot150Pay + dayRes.weeklyOffPay + dayRes.holidayPay;
    if (paidThisDay > 0) workedDaysCount += 1;
  }

  // allowances
  const allowances = cfg.attendanceAllowance + cfg.otherAllowance;

  // attendance bonus
  let attendanceBonus = 0;
  if (workedDaysCount >= 26) attendanceBonus = cfg.attendanceBonus100;
  else if (workedDaysCount === 25) attendanceBonus = Math.round(cfg.attendanceBonus100 * cfg.attendanceBonusPartialPercentFor25);

  const gross = +(cfg.basicSalary + cfg.seniorityAllowance + cfg.livingAllowance + allowances + normalPay + ot150Pay + weeklyOffPay + holidayPay + nightBasePay + nightAllowance + attendanceBonus).toFixed(2);

  // simple deduction placeholders (percentages unknown) - set to zero so tests focus on payroll math
  const deductions = 0;
  const net = +(gross - deductions).toFixed(2);

  return {
    normalHours: +normalHours.toFixed(6),
    normalPay: +normalPay.toFixed(2),
    ot150Hours: +ot150Hours.toFixed(6),
    ot150Pay: +ot150Pay.toFixed(2),
    nightHours: +nightHours.toFixed(6),
    nightAllowance: +nightAllowance.toFixed(2),
    weeklyOffPay: +weeklyOffPay.toFixed(2),
    holidayPay: +holidayPay.toFixed(2),
    attendanceBonus: +attendanceBonus.toFixed(2),
    allowances: +allowances.toFixed(2),
    gross,
    deductions,
    net,
  };
}
