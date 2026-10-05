import {
  calculatePayroll,
  calculatePayrollFromHours,
  DEFAULT_CONFIG,
  roundMoney,
} from '../src/engine/payrollCalculator';
import { DayAttendance } from '../src/engine/attendanceCalculator';
import { classifyShiftIntervals } from '../src/engine/timeCalculator';

const cfg = DEFAULT_CONFIG;

function att(
  date: string,
  dayOfWeek: number,
  dayType: DayAttendance['dayType'],
  start?: string,
  end?: string,
  leaveType?: DayAttendance['leaveType']
): DayAttendance {
  return { date, dayOfWeek, dayType, shift: start && end ? { start, end } : undefined, leaveType };
}

describe('Payroll Engine - Excel Bảng Lương Source Tests', () => {
  // ==================================================
  // MỤC 12: DỮ LIỆU TEST CHUẨN THÁNG 09/2026 TỪ EXCEL
  // ==================================================
  test('Benchmark tháng 09/2026 từ file Excel', () => {
    const res = calculatePayrollFromHours(
      {
        normalHours: 208,
        ot150Hours: 42,
        nightAllowanceHours: 66,
        ot200Hours: 19.08333333,
        ot210Hours: 0,
        weeklyOffHours: 8,
        weeklyOffNightHours: 0,
        holidayHours: 0,
        holidayNightHours: 0,
        specialLeaveHours: 0,
      },
      {
        ...cfg,
        insuranceRate: 0,
      }
    );

    expect(res.normalPay).toBeCloseTo(6077500, 2);
    expect(res.ot150Pay).toBeCloseTo(2085360.577, 1);
    expect(res.nightAllowancePay).toBeCloseTo(655399.0385, 1);
    expect(res.ot200Pay).toBeCloseTo(1263353.365, 1);
    expect(res.weeklyOffPay).toBeCloseTo(529615.3846, 1);
    expect(res.livingAllowancePay).toBeCloseTo(807500, 2);
    expect(res.attendanceBonus).toBeCloseTo(425000, 2);
    expect(res.otherAllowancePay).toBeCloseTo(765000, 2);

    expect(res.totalA).toBeCloseTo(12608728.37, 2);
    expect(res.grossPay).toBeCloseTo(12608728.37, 2);
    expect(res.deductions).toBe(0);
    expect(res.netPay).toBeCloseTo(12608728.37, 2);
  });

  // ==================================================
  // MỤC 16: TOÀN BỘ 22 TEST BẮT BUỘC THEO RULE KHUNG GIỜ
  // ==================================================

  // Test 1: 08:00 -> 17:00 => Tăng ca từ 16h10: normal100 = 7h10 (7.167h), OT150 = 50m (0.833h)
  test('1. 08:00 -> 17:00 => normal100 = 7h10 & OT150 = 50m', () => {
    const res = calculatePayroll([att('2026-09-01', 2, 'NORMAL', '08:00', '17:00')], cfg);
    expect(res.normal100Hours).toBeCloseTo(7 + 10 / 60, 5);
    expect(res.normalHours).toBeCloseTo(7 + 10 / 60, 5);
    expect(res.ot150Hours).toBeCloseTo(50 / 60, 5);
    expect(res.ot150DayHours).toBeCloseTo(50 / 60, 5);
    expect(res.actualHours).toBeCloseTo(8, 5);
  });

  // Test 1b: 08:00 -> 18:00 => Tăng ca từ 16h10: normal100 = 7h10, OT150 = 1h50 (1.833h)
  test('1b. 08:00 -> 18:00 => normal100 = 7h10 & OT150 = 1h50', () => {
    const res = calculatePayroll([att('2026-09-01', 2, 'NORMAL', '08:00', '18:00')], cfg);
    expect(res.normal100Hours).toBeCloseTo(7 + 10 / 60, 5);
    expect(res.ot150Hours).toBeCloseTo(1 + 50 / 60, 5);
    expect(res.ot150DayHours).toBeCloseTo(1 + 50 / 60, 5);
    expect(res.actualHours).toBeCloseTo(9, 5);
  });

  // Test 1c: 08:00 -> 20:00 => Tăng ca từ 16h10: normal100 = 7h10, OT150 = 3h50 (3.833h)
  test('1c. 08:00 -> 20:00 => normal100 = 7h10 & OT150 = 3h50', () => {
    const res = calculatePayroll([att('2026-09-01', 2, 'NORMAL', '08:00', '20:00')], cfg);
    expect(res.normal100Hours).toBeCloseTo(7 + 10 / 60, 5);
    expect(res.ot150Hours).toBeCloseTo(3 + 50 / 60, 5);
    expect(res.ot150DayHours).toBeCloseTo(3 + 50 / 60, 5);
    expect(res.actualHours).toBeCloseTo(11, 5);
  });

  // Test 2: PN => 100% = 8h
  test('2. PN => 100% = 8h', () => {
    const res = calculatePayroll([att('2026-09-01', 2, 'NORMAL', undefined, undefined, 'PN')], cfg);
    expect(res.normal100Hours).toBeCloseTo(8, 5);
    expect(res.pnHours).toBeCloseTo(8, 5);
    expect(res.normalHours).toBeCloseTo(8, 5);
    expect(res.normalPay).toBeGreaterThan(0);
  });

  // Test 3: 16:10 -> 20:00 => OT150 = 3h50
  test('3. 16:10 -> 20:00 => OT150 = 3h50', () => {
    const res = calculatePayroll([att('2026-09-01', 2, 'NORMAL', '16:10', '20:00')], cfg);
    // 3h50 = 3 + 50/60 = 3.833333h
    expect(res.ot150DayHours).toBeCloseTo(3 + 50 / 60, 5);
    expect(res.ot150Hours).toBeCloseTo(3 + 50 / 60, 5);
    expect(res.normal100Hours).toBe(0);
  });

  // Test 4: 16:10 -> 22:00 => OT150 = 5h50 (5.833h)
  test('4. 16:10 -> 22:00 => OT150 = 5h50', () => {
    const res = calculatePayroll([att('2026-09-01', 2, 'NORMAL', '16:10', '22:00')], cfg);
    expect(res.ot150Hours).toBeCloseTo(5 + 50 / 60, 5);
    expect(res.ot150DayHours).toBeCloseTo(5 + 50 / 60, 5);
    expect(res.normal100Hours).toBe(0);
    expect(res.night100Hours).toBe(0);
  });

  // Test 5: 20:00 -> 06:00 => normal100 = 2h, OT130 = 6h, OT200 = 2h
  test('5. 20:00 -> 06:00 => normal100 = 2h, OT130 = 6h, OT200 = 2h', () => {
    const res = calculatePayroll([att('2026-09-01', 2, 'NORMAL', '20:00', '06:00')], cfg);
    expect(res.normal100Hours).toBeCloseTo(2, 5);
    expect(res.night100Hours).toBeCloseTo(2, 5);
    expect(res.ot130NightHours).toBeCloseTo(6, 5);
    expect(res.ot200NightHours).toBeCloseTo(2, 5);
    expect(res.ot200Hours).toBeCloseTo(2, 5);
  });

  // Test 6: 16:10 -> 10:00 hôm sau => OT150 = 9h50, OT130 = 6h, OT200 = 2h
  test('6. 16:10 -> 10:00 hôm sau => OT150 = 9h50, OT130 = 6h, OT200 = 2h', () => {
    const res = calculatePayroll([att('2026-09-01', 2, 'NORMAL', '16:10', '10:00')], cfg);
    expect(res.normal100Hours).toBe(0);
    expect(res.night100Hours).toBe(0);
    expect(res.ot130NightHours).toBeCloseTo(6, 5);
    expect(res.ot150Hours).toBeCloseTo(9 + 50 / 60, 5);
    expect(res.ot150DayHours).toBeCloseTo(5 + 50 / 60, 5);
    expect(res.ot150NightHours).toBeCloseTo(4, 5);
    expect(res.ot200NightHours).toBeCloseTo(2, 5);
    expect(res.ot200Hours).toBeCloseTo(2, 5);
  });

  // Test 7: Chủ nhật 08:00 -> 17:00 => 200% = 8h
  test('7. Chủ nhật 08:00 -> 17:00 => 200% = 8h', () => {
    const res = calculatePayroll([att('2026-09-06', 0, 'WEEKLY_OFF', '08:00', '17:00')], cfg);
    expect(res.weeklyOff200Hours).toBeCloseTo(8, 5);
    expect(res.weeklyOffHours).toBeCloseTo(8, 5);
    expect(res.normal100Hours).toBe(0);
  });

  // Test 8: Chủ nhật 20:00 -> 22:00 => 200% = 2h
  test('8. Chủ nhật 20:00 -> 22:00 => 200% = 2h', () => {
    const res = calculatePayroll([att('2026-09-06', 0, 'WEEKLY_OFF', '20:00', '22:00')], cfg);
    expect(res.weeklyOffNight200Hours).toBeCloseTo(2, 5);
    expect(res.weeklyOffHours).toBeCloseTo(2, 5);
  });

  // Test 9: Chủ nhật 20:00 -> 06:00 => 200% = 2h, 270% = 8h
  test('9. Chủ nhật 20:00 -> 06:00 => 200% = 2h, 270% = 8h', () => {
    const res = calculatePayroll([att('2026-09-06', 0, 'WEEKLY_OFF', '20:00', '06:00')], cfg);
    expect(res.weeklyOffNight200Hours).toBeCloseTo(2, 5);
    expect(res.weeklyOffHours).toBeCloseTo(2, 5);
    expect(res.weeklyOffNight270Hours).toBeCloseTo(8, 5);
    expect(res.weeklyOffNightHours).toBeCloseTo(8, 5);
  });

  // Test 10: Chủ nhật 06:00 -> 10:00 => 200% = 4h
  test('10. Chủ nhật 06:00 -> 10:00 => 200% = 4h', () => {
    const res = calculatePayroll([att('2026-09-06', 0, 'WEEKLY_OFF', '06:00', '10:00')], cfg);
    expect(res.weeklyOff200Hours).toBeCloseTo(4, 5);
    expect(res.weeklyOffHours).toBeCloseTo(4, 5);
  });

  // Test 11: Lễ 08:00 -> 17:00 => 300% = 8h
  test('11. Lễ 08:00 -> 17:00 => 300% = 8h', () => {
    const res = calculatePayroll([att('2026-09-02', 3, 'HOLIDAY', '08:00', '17:00')], cfg);
    expect(res.holiday300Hours).toBeCloseTo(8, 5);
    expect(res.holidayHours).toBeCloseTo(8, 5);
    expect(res.normal100Hours).toBe(0);
  });

  // Test 12: Lễ 20:00 -> 22:00 => 300% = 2h
  test('12. Lễ 20:00 -> 22:00 => 300% = 2h', () => {
    const res = calculatePayroll([att('2026-09-02', 3, 'HOLIDAY', '20:00', '22:00')], cfg);
    expect(res.holidayNight300Hours).toBeCloseTo(2, 5);
    expect(res.holidayHours).toBeCloseTo(2, 5);
  });

  // Test 13: Lễ 20:00 -> 06:00 => 300% = 2h, 390% = 8h
  test('13. Lễ 20:00 -> 06:00 => 300% = 2h, 390% = 8h', () => {
    const res = calculatePayroll([att('2026-09-02', 3, 'HOLIDAY', '20:00', '06:00')], cfg);
    expect(res.holidayNight300Hours).toBeCloseTo(2, 5);
    expect(res.holidayHours).toBeCloseTo(2, 5);
    expect(res.holidayNight390Hours).toBeCloseTo(8, 5);
    expect(res.holidayNightHours).toBeCloseTo(8, 5);
  });

  // Test 14: PN + ngày làm việc
  test('14. PN + ngày làm việc', () => {
    const res = calculatePayroll(
      [
        att('2026-09-01', 2, 'NORMAL', undefined, undefined, 'PN'),
        att('2026-09-02', 3, 'NORMAL', '08:00', '17:00'),
      ],
      cfg
    );
    expect(res.pnHours).toBeCloseTo(8, 5);
    expect(res.normal100Hours).toBeCloseTo(8 + 7 + 10 / 60, 5);
    expect(res.ot150Hours).toBeCloseTo(50 / 60, 5);
    expect(res.actualHours).toBeCloseTo(16, 5);
  });

  // Test 15: Overnight (20:00 -> 05:00)
  test('15. Overnight', () => {
    const res = calculatePayroll([att('2026-09-01', 2, 'NORMAL', '20:00', '05:00')], cfg);
    expect(res.normal100Hours).toBeCloseTo(2, 5);
    expect(res.ot130NightHours).toBeCloseTo(6, 5);
    expect(res.ot200NightHours).toBeCloseTo(1, 5);
    expect(res.actualHours).toBeCloseTo(9, 5);
  });

  // Test 16: Không overlap interval
  test('16. Không overlap interval', () => {
    const ivs = classifyShiftIntervals('16:10', '10:00', 'NORMAL');
    for (let i = 0; i < ivs.length - 1; i++) {
      expect(ivs[i].endMinute).toBe(ivs[i + 1].startMinute);
    }
    const sumMinutes = ivs.reduce((sum, iv) => sum + iv.durationMinutes, 0);
    // (1440 - 970) + 600 = 470 + 600 = 1070 min
    expect(sumMinutes).toBe(1070);
  });

  // Test 17: Không double count
  test('17. Không double count (Mỗi phút chỉ thuộc đúng 1 category)', () => {
    const ivs = classifyShiftIntervals('20:00', '06:00', 'NORMAL');
    const totalDuration = ivs.reduce((sum, iv) => sum + iv.durationMinutes, 0);
    expect(totalDuration).toBe(600); // 10 hours exactly
  });

  // Test 18: Insurance 10.5%
  test('18. Insurance 10.5%', () => {
    const res = calculatePayroll([], { ...cfg, insuranceRate: 10.5 });
    const expected = roundMoney((cfg.basicSalary + cfg.seniorityAllowance) * 0.105);
    expect(res.insuranceDeduction).toBe(expected);
    expect(res.insuranceDeduction).toBe(638137.5);
  });

  // Test 19: Insurance 8%
  test('19. Insurance 8%', () => {
    const res = calculatePayroll([], { ...cfg, insuranceRate: 8 });
    const expected = roundMoney((cfg.basicSalary + cfg.seniorityAllowance) * 0.08);
    expect(res.insuranceDeduction).toBe(expected);
    expect(res.insuranceDeduction).toBe(486200);
  });

  // Test 20: Insurance 0%
  test('20. Insurance 0%', () => {
    const res = calculatePayroll([], { ...cfg, insuranceRate: 0 });
    expect(res.insuranceDeduction).toBe(0);
  });

  // Test 21: Gross = tổng toàn bộ income breakdown
  test('21. Gross = tổng toàn bộ income breakdown (totalA === totalA1 + totalA2 + totalA4)', () => {
    const days = [
      att('2026-09-01', 2, 'NORMAL', '08:00', '18:00'),
      att('2026-09-02', 3, 'NORMAL', '20:00', '06:00'),
      att('2026-09-06', 0, 'WEEKLY_OFF', '08:00', '17:00'),
    ];
    const adjustments = {
      womenAllowance: 50000,
      childSupport: 100000,
      annualLeaveSettlement: 200000,
      mealSupport: 300000,
      referralBonus: 500000,
    };
    const res = calculatePayroll(days, cfg, adjustments);

    expect(res.totalA).toBe(roundMoney(res.totalA1 + res.totalA2 + res.totalA4));
    expect(res.grossPay).toBe(res.totalA);
  });

  // Test 22: Net = gross - toàn bộ deductions
  test('22. Net = gross - toàn bộ deductions (netPay === totalA - totalDeductions)', () => {
    const days = [
      att('2026-09-01', 2, 'NORMAL', '08:00', '17:00'),
    ];
    const adjustments = {
      latenessDeduction: 50000,
      damageDeduction: 100000,
      mealDeduction: 30000,
    };
    const res = calculatePayroll(days, cfg, adjustments);

    expect(res.totalDeductions).toBe(roundMoney(res.totalB1 + res.totalB2 + res.totalB4));
    expect(res.netPay).toBe(roundMoney(res.totalA - res.totalDeductions));
  });

  // Extra zero-hours test
  test('Zero attendance: net is negative deductions', () => {
    const res = calculatePayroll([], cfg);
    expect(res.normalHours).toBe(0);
    expect(res.actualHours).toBe(0);
    expect(res.grossPay).toBe(0);
    expect(res.netPay).toBe(-res.totalDeductions);
  });
});
