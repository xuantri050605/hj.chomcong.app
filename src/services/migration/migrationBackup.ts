import { Platform } from 'react-native';
import { listMonths, loadAttendance, loadConfig, loadPayroll } from '../../utils/persistence';
import { universalStorage } from '../universalStorage';
import { BackupMetadata } from './migrationTypes';

const BACKUP_INDEX_KEY = 'hojeong_migration_backups_registry';

/**
 * Creates a complete snapshot of local SQLite/LocalStorage data prior to migration.
 * Verifies data integrity and never deletes or alters the original local database.
 */
export async function createPreMigrationBackup(): Promise<BackupMetadata> {
  const timestamp = new Date().toISOString();
  const backupId = `backup_${Date.now()}`;

  const months = await listMonths();
  const attendanceData: Record<string, any[]> = {};
  let attendanceCount = 0;

  for (const m of months) {
    const items = await loadAttendance(m);
    attendanceData[m] = items;
    attendanceCount += items.length;
  }

  const payrollData: Record<string, any> = {};
  let payrollCount = 0;
  for (const m of months) {
    const p = await loadPayroll(m);
    if (p) {
      payrollData[m] = p;
      payrollCount += 1;
    }
  }

  const config = await loadConfig();
  const configCount = config ? 1 : 0;

  const payload = {
    backupId,
    timestamp,
    platform: Platform.OS,
    counts: {
      attendance: attendanceCount,
      payroll: payrollCount,
      config: configCount,
    },
    data: {
      months,
      attendance: attendanceData,
      payroll: payrollData,
      config,
    },
  };

  const backupKey = `hojeong_backup_${backupId}`;
  await universalStorage.setItem(backupKey, JSON.stringify(payload));

  // Update backup index registry
  let registry: string[] = [];
  try {
    const regRaw = await universalStorage.getItem(BACKUP_INDEX_KEY);
    if (regRaw) registry = JSON.parse(regRaw);
  } catch {
    registry = [];
  }
  registry.unshift(backupId);
  await universalStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(registry.slice(0, 10))); // keep 10 latest

  // Verify backup integrity
  const readBack = await universalStorage.getItem(backupKey);
  const integrityCheck = Boolean(readBack && readBack.length > 50);

  return {
    backupId,
    sourceType: Platform.OS === 'web' ? 'LOCAL_STORAGE' : 'SQLITE',
    timestamp,
    recordCounts: {
      attendance: attendanceCount,
      payroll: payrollCount,
      config: configCount,
    },
    integrityCheck,
  };
}
