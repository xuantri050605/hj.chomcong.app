import {
  isValidDate,
  isValidMonth,
  sanitizeCurrency,
  sanitizePercentage,
  sanitizeStandardHours,
  sanitizeTimeInput,
  sanitizeSalaryConfig,
  sanitizeDayAttendance,
  MAX_SAFE_CURRENCY,
} from '../src/utils/securityValidator';
import { DEFAULT_CONFIG } from '../src/engine/payrollCalculator';

describe('Security Validator & OWASP Input Hardening Suite', () => {
  describe('Month & Date Validation', () => {
    test('validates standard YYYY-MM months', () => {
      expect(isValidMonth('2026-10')).toBe(true);
      expect(isValidMonth('2024-02')).toBe(true);
      expect(isValidMonth('1999-12')).toBe(false); // out of safe year range
      expect(isValidMonth('2026-13')).toBe(false); // invalid month
      expect(isValidMonth('2026-00')).toBe(false);
      expect(isValidMonth('invalid')).toBe(false);
      expect(isValidMonth(null)).toBe(false);
      expect(isValidMonth(12345)).toBe(false);
    });

    test('validates calendar dates with leap year rules', () => {
      expect(isValidDate('2026-10-05')).toBe(true);
      expect(isValidDate('2024-02-29')).toBe(true); // 2024 is leap year
      expect(isValidDate('2025-02-29')).toBe(false); // 2025 is not leap year
      expect(isValidDate('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidDate('2026-02-30')).toBe(false);
      expect(isValidDate('malformed-date')).toBe(false);
      expect(isValidDate('')).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });

  describe('Time Validation & Normalization', () => {
    test('sanitizes valid and boundary time strings', () => {
      expect(sanitizeTimeInput('8')).toBe('08:00');
      expect(sanitizeTimeInput('8:30')).toBe('08:30');
      expect(sanitizeTimeInput('17:00')).toBe('17:00');
      expect(sanitizeTimeInput('23:59')).toBe('23:59');
      expect(sanitizeTimeInput('0:0')).toBe('00:00');
    });

    test('rejects malformed or out-of-range times', () => {
      expect(sanitizeTimeInput('24:00')).toBeUndefined();
      expect(sanitizeTimeInput('12:60')).toBeUndefined();
      expect(sanitizeTimeInput('abc')).toBeUndefined();
      expect(sanitizeTimeInput('-1:00')).toBeUndefined();
      expect(sanitizeTimeInput('verylongtimestringmorethan10chars')).toBeUndefined();
    });
  });

  describe('Numerical & Currency Hardening', () => {
    test('rejects NaN, Infinity, -Infinity, and negative numbers', () => {
      expect(sanitizeCurrency(NaN, 0)).toBe(0);
      expect(sanitizeCurrency(Infinity, 0)).toBe(0);
      expect(sanitizeCurrency(-Infinity, 0)).toBe(0);
      expect(sanitizeCurrency(-50000, 0)).toBe(0);
      expect(sanitizeCurrency('-1000', 0)).toBe(0);
    });

    test('caps oversized numbers exceeding safe currency boundary', () => {
      expect(sanitizeCurrency(MAX_SAFE_CURRENCY + 1, 0)).toBe(0);
      expect(sanitizeCurrency(8_100_000, 0)).toBe(8_100_000);
      expect(sanitizeCurrency('8,100,000', 0)).toBe(8_100_000);
    });

    test('sanitizes standard hours safely', () => {
      expect(sanitizeStandardHours(208)).toBe(208);
      expect(sanitizeStandardHours(0)).toBe(208); // fallback
      expect(sanitizeStandardHours(-10)).toBe(208); // fallback
      expect(sanitizeStandardHours(1000)).toBe(208); // exceeds monthly max (744)
      expect(sanitizeStandardHours('160')).toBe(160);
    });

    test('sanitizes insurance percentage safely', () => {
      expect(sanitizePercentage(10.5)).toBe(10.5);
      expect(sanitizePercentage(-5)).toBe(10.5); // fallback
      expect(sanitizePercentage(150)).toBe(10.5); // fallback (>100%)
      expect(sanitizePercentage('8.5')).toBe(8.5);
    });
  });

  describe('SalaryConfig Security & Prototype Pollution Protection', () => {
    test('normalizes corrupted or prototype-polluted config', () => {
      const maliciousPayload = JSON.parse(`{
        "basicSalary": -999999,
        "seniorityAllowance": "NaN",
        "standardHours": 0,
        "insuranceRate": 999,
        "__proto__": { "polluted": true }
      }`);

      const sanitized = sanitizeSalaryConfig(maliciousPayload, DEFAULT_CONFIG);
      expect(sanitized.basicSalary).toBe(DEFAULT_CONFIG.basicSalary);
      expect(sanitized.seniorityAllowance).toBe(DEFAULT_CONFIG.seniorityAllowance);
      expect(sanitized.standardHours).toBe(DEFAULT_CONFIG.standardHours);
      expect(sanitized.insuranceRate).toBe(DEFAULT_CONFIG.insuranceRate);
      expect((({} as any)).polluted).toBeUndefined();
    });
  });

  describe('DayAttendance Sanitization', () => {
    test('accepts clean attendance record', () => {
      const clean = sanitizeDayAttendance({
        date: '2026-10-05',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      });
      expect(clean).not.toBeNull();
      expect(clean?.date).toBe('2026-10-05');
      expect(clean?.shift?.start).toBe('08:00');
      expect(clean?.shift?.end).toBe('17:00');
    });

    test('rejects record with malformed date', () => {
      expect(sanitizeDayAttendance({ date: 'invalid-date' })).toBeNull();
      expect(sanitizeDayAttendance(null)).toBeNull();
      expect(sanitizeDayAttendance(12345)).toBeNull();
    });

    test('strips unknown or malicious properties', () => {
      const record = sanitizeDayAttendance({
        date: '2026-10-05',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        hackProperty: '<script>alert(1)</script>',
      } as any);

      expect((record as any).hackProperty).toBeUndefined();
    });
  });
});

