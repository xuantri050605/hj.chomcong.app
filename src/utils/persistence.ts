// Persistence adapter: uses expo-sqlite at runtime, falls back to in-memory for tests/node.
import type { DayAttendance } from '../engine/attendanceCalculator';
import { DEFAULT_CONFIG, type PayrollBreakdown, type SalaryConfig } from '../engine/payrollCalculator';
import { sanitizeDayAttendance, sanitizeSalaryConfig } from './securityValidator';

type AttendanceRow = DayAttendance & { id: string };

// In-memory storage used for tests and Node environment
class InMemoryStorage {
  attendances: Map<string, AttendanceRow[]> = new Map();
  configs: Map<string, SalaryConfig> = new Map();
  payrolls: Map<string, PayrollBreakdown> = new Map();

  async init() {
    return;
  }

  async saveAttendance(month: string, rows: DayAttendance[]) {
    const validRows = rows
      .map(sanitizeDayAttendance)
      .filter((r): r is DayAttendance => r !== null);
    this.attendances.set(month, validRows.map((r, i) => ({ ...r, id: (r.date || '') + '_' + i })));
  }

  async loadAttendance(month: string): Promise<DayAttendance[]> {
    return (this.attendances.get(month) || []).map(({ id, ...r }) => r as DayAttendance);
  }

  async saveConfig(cfg: SalaryConfig) {
    this.configs.set('current', sanitizeSalaryConfig(cfg, DEFAULT_CONFIG));
  }

  async loadConfig(): Promise<SalaryConfig | null> {
    return this.configs.get('current') || null;
  }

  async savePayroll(month: string, payroll: PayrollBreakdown) {
    this.payrolls.set(month, payroll);
  }

  async loadPayroll(month: string): Promise<PayrollBreakdown | null> {
    return this.payrolls.get(month) || null;
  }

  async listMonths(): Promise<string[]> {
    const months = new Set<string>();
    for (const k of this.attendances.keys()) months.add(k);
    for (const k of this.payrolls.keys()) months.add(k);
    return Array.from(months);
  }

  async deletePayroll(month: string) {
    this.payrolls.delete(month);
  }

  async deleteAttendance(month: string) {
    this.attendances.delete(month);
  }
}

// Web storage adapter using localStorage for browser persistence
class WebStorageAdapter {
  private PREFIX = 'payroll_';

  async init() {
    return;
  }

  private getKey(type: string, id: string) {
    return this.PREFIX + type + '_' + id;
  }

  async saveAttendance(month: string, rows: DayAttendance[]) {
    try {
      const validRows = rows
        .map(sanitizeDayAttendance)
        .filter((r): r is DayAttendance => r !== null);
      localStorage.setItem(this.getKey('attendance', month), JSON.stringify(validRows));
    } catch {
      // Storage quota or serialization safety
    }
  }

  async loadAttendance(month: string): Promise<DayAttendance[]> {
    try {
      const data = localStorage.getItem(this.getKey('attendance', month));
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeDayAttendance).filter((r): r is DayAttendance => r !== null);
    } catch {
      return [];
    }
  }

  async saveConfig(cfg: SalaryConfig) {
    try {
      const sanitized = sanitizeSalaryConfig(cfg, DEFAULT_CONFIG);
      localStorage.setItem(this.getKey('config', 'current'), JSON.stringify(sanitized));
    } catch {
      // Storage quota or serialization safety
    }
  }

  async loadConfig(): Promise<SalaryConfig | null> {
    try {
      const data = localStorage.getItem(this.getKey('config', 'current'));
      if (!data) return null;
      return sanitizeSalaryConfig(JSON.parse(data), DEFAULT_CONFIG);
    } catch {
      return null;
    }
  }

  async savePayroll(month: string, payroll: PayrollBreakdown) {
    try {
      localStorage.setItem(this.getKey('payroll', month), JSON.stringify(payroll));
    } catch {
      // Storage quota or serialization safety
    }
  }

  async loadPayroll(month: string): Promise<PayrollBreakdown | null> {
    try {
      const data = localStorage.getItem(this.getKey('payroll', month));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async listMonths(): Promise<string[]> {
    try {
      const months = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.PREFIX + 'attendance_')) {
          const month = key.replace(this.PREFIX + 'attendance_', '');
          months.add(month);
        }
        if (key?.startsWith(this.PREFIX + 'payroll_')) {
          const month = key.replace(this.PREFIX + 'payroll_', '');
          months.add(month);
        }
      }
      return Array.from(months);
    } catch {
      return [];
    }
  }

  async deletePayroll(month: string) {
    try {
      localStorage.removeItem(this.getKey('payroll', month));
    } catch {
      // ignore
    }
  }

  async deleteAttendance(month: string) {
    try {
      localStorage.removeItem(this.getKey('attendance', month));
    } catch {
      // ignore
    }
  }
}

let adapter: any = null;

export async function initPersistence() {
  if (adapter) return adapter;
  // If running under Jest or Node, use in-memory
  if (typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID) {
    adapter = new InMemoryStorage();
    await adapter.init();
    return adapter;
  }

  // Check if localStorage is available (web browser)
  if (typeof localStorage !== 'undefined') {
    adapter = new WebStorageAdapter();
    await adapter.init();
    return adapter;
  }

  // Try to use expo-sqlite at runtime
  try {
    // dynamic import to avoid requiring native module in tests
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require('expo-sqlite');
    const db = SQLite.openDatabase('payroll.db');

    adapter = {
      async init() {
        await new Promise<void>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, month TEXT, date TEXT, data TEXT);`,
              [],
              () => resolve(),
              () => resolve()
            );
          });
        });
      },
      async saveAttendance(month: string, rows: DayAttendance[]) {
        const validRows = rows
          .map(sanitizeDayAttendance)
          .filter((r): r is DayAttendance => r !== null);
        await new Promise<void>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`DELETE FROM attendance WHERE month = ?;`, [month]);
            for (let i = 0; i < validRows.length; i++) {
              const id = (validRows[i].date || '') + '_' + i;
              tx.executeSql(`INSERT OR REPLACE INTO attendance (id, month, date, data) values (?,?,?,?);`, [id, month, validRows[i].date, JSON.stringify(validRows[i])]);
            }
          }, () => resolve(), () => resolve());
        });
      },
      async loadAttendance(month: string) {
        return await new Promise<DayAttendance[]>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`SELECT data FROM attendance WHERE month = ?;`, [month], (_: any, result: any) => {
              const out: DayAttendance[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                try {
                  const item = JSON.parse(result.rows.item(i).data);
                  const sanitized = sanitizeDayAttendance(item);
                  if (sanitized) out.push(sanitized);
                } catch {
                  // ignore corrupt row
                }
              }
              resolve(out);
            }, () => resolve([]));
          });
        });
      },
      async saveConfig(cfg: SalaryConfig) {
        const sanitized = sanitizeSalaryConfig(cfg, DEFAULT_CONFIG);
        await new Promise<void>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, data TEXT);`, []);
            tx.executeSql(`INSERT OR REPLACE INTO config (key, data) values (?,?);`, ['current', JSON.stringify(sanitized)]);
          }, () => resolve(), () => resolve());
        });
      },
      async loadConfig() {
        return await new Promise<SalaryConfig | null>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`SELECT data FROM config WHERE key = ?;`, ['current'], (_: any, result: any) => {
              if (result.rows.length === 0) return resolve(null);
              try {
                const item = JSON.parse(result.rows.item(0).data);
                resolve(sanitizeSalaryConfig(item, DEFAULT_CONFIG));
              } catch {
                resolve(null);
              }
            }, () => resolve(null));
          });
        });
      },
      async savePayroll(month: string, payroll: PayrollBreakdown) {
        await new Promise<void>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`CREATE TABLE IF NOT EXISTS payroll (month TEXT PRIMARY KEY, data TEXT);`, []);
            tx.executeSql(`INSERT OR REPLACE INTO payroll (month, data) values (?,?);`, [month, JSON.stringify(payroll)]);
          }, () => resolve(), () => resolve());
        });
      },
      async loadPayroll(month: string) {
        return await new Promise<PayrollBreakdown | null>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`SELECT data FROM payroll WHERE month = ?;`, [month], (_: any, result: any) => {
              if (result.rows.length === 0) return resolve(null);
              try {
                resolve(JSON.parse(result.rows.item(0).data));
              } catch {
                resolve(null);
              }
            }, () => resolve(null));
          });
        });
      },
      async listMonths() {
        return await new Promise<string[]>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`SELECT DISTINCT month FROM attendance UNION SELECT month FROM payroll;`, [], (_: any, result: any) => {
              const out: string[] = [];
              for (let i = 0; i < result.rows.length; i++) out.push(result.rows.item(i).month);
              resolve(out);
            }, () => resolve([]));
          });
        });
      },
      async deletePayroll(month: string) {
        await new Promise<void>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`DELETE FROM payroll WHERE month = ?;`, [month]);
          }, () => resolve(), () => resolve());
        });
      },
      async deleteAttendance(month: string) {
        await new Promise<void>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`DELETE FROM attendance WHERE month = ?;`, [month]);
          }, () => resolve(), () => resolve());
        });
      },
    };
    await adapter.init();
    return adapter;
  } catch (e) {
    // Fallback: try localStorage for web environments
    if (typeof localStorage !== 'undefined') {
      adapter = new WebStorageAdapter();
      await adapter.init();
      return adapter;
    }
    // Last resort: in-memory (will lose data on reload)
    adapter = new InMemoryStorage();
    await adapter.init();
    return adapter;
  }
}

export async function saveAttendance(month: string, rows: DayAttendance[]) {
  const a = await initPersistence();
  return a.saveAttendance(month, rows);
}

export async function loadAttendance(month: string): Promise<DayAttendance[]> {
  const a = await initPersistence();
  return a.loadAttendance(month);
}

export async function saveConfig(cfg: SalaryConfig) {
  const a = await initPersistence();
  return a.saveConfig(cfg);
}

export async function loadConfig(): Promise<SalaryConfig | null> {
  const a = await initPersistence();
  return a.loadConfig();
}

export async function savePayroll(month: string, payroll: PayrollBreakdown) {
  const a = await initPersistence();
  return a.savePayroll(month, payroll);
}

export async function loadPayroll(month: string): Promise<PayrollBreakdown | null> {
  const a = await initPersistence();
  return a.loadPayroll(month);
}

export async function listMonths(): Promise<string[]> {
  const a = await initPersistence();
  return a.listMonths();
}

export async function deletePayroll(month: string) {
  const a = await initPersistence();
  return a.deletePayroll(month);
}

export async function deleteAttendance(month: string) {
  const a = await initPersistence();
  return a.deleteAttendance(month);
}

export default {
  initPersistence,
  saveAttendance,
  loadAttendance,
  saveConfig,
  loadConfig,
  savePayroll,
  loadPayroll,
  listMonths,
};

