// Persistence adapter: uses expo-sqlite at runtime, falls back to in-memory for tests/node.
import type { DayAttendance } from '../engine/attendanceCalculator';
import type { PayrollBreakdown, SalaryConfig } from '../engine/payrollCalculator';

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
    this.attendances.set(month, rows.map((r, i) => ({ ...r, id: (r.date || '') + '_' + i })));
  }

  async loadAttendance(month: string): Promise<DayAttendance[]> {
    return (this.attendances.get(month) || []).map(({ id, ...r }) => r as DayAttendance);
  }

  async saveConfig(cfg: SalaryConfig) {
    this.configs.set('current', cfg);
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
        await new Promise<void>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`DELETE FROM attendance WHERE month = ?;`, [month]);
            for (let i = 0; i < rows.length; i++) {
              const id = (rows[i].date || '') + '_' + i;
              tx.executeSql(`INSERT OR REPLACE INTO attendance (id, month, date, data) values (?,?,?,?);`, [id, month, rows[i].date, JSON.stringify(rows[i])]);
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
                out.push(JSON.parse(result.rows.item(i).data));
              }
              resolve(out);
            }, () => resolve([]));
          });
        });
      },
      async saveConfig(cfg: SalaryConfig) {
        await new Promise<void>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, data TEXT);`, []);
            tx.executeSql(`INSERT OR REPLACE INTO config (key, data) values (?,?);`, ['current', JSON.stringify(cfg)]);
          }, () => resolve(), () => resolve());
        });
      },
      async loadConfig() {
        return await new Promise<SalaryConfig | null>((resolve) => {
          db.transaction((tx: any) => {
            tx.executeSql(`SELECT data FROM config WHERE key = ?;`, ['current'], (_: any, result: any) => {
              if (result.rows.length === 0) return resolve(null);
              resolve(JSON.parse(result.rows.item(0).data));
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
              resolve(JSON.parse(result.rows.item(0).data));
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
    };
    await adapter.init();
    return adapter;
  } catch (e) {
    // fallback
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
