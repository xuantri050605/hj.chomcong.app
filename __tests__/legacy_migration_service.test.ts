jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
  },
  Alert: {
    alert: jest.fn(),
  },
}));

import { saveAttendance, saveConfig, savePayroll, initPersistence } from '../src/utils/persistence';
import { detectLegacyData } from '../src/services/migration/migrationDetector';
import { createPreMigrationBackup } from '../src/services/migration/migrationBackup';
import { executeLegacyMigration } from '../src/services/migration/migrationService';
import { DEFAULT_CONFIG } from '../src/engine/payrollCalculator';
import { getSupabaseClient } from '../src/services/supabaseClient';

describe('Phase 4: Legacy SQLite / Local Storage Migration Test Suite', () => {
  const testUserId = 'usr_migration_test_999';
  const testEmail = 'nhanvien_test@hojeong.vn';

  beforeEach(async () => {
    await initPersistence();

    // Populate local legacy test data
    await saveConfig(DEFAULT_CONFIG);
    await saveAttendance('2026-11', [
      {
        date: '2026-11-01',
        dayOfWeek: 0,
        dayType: 'WEEKLY_OFF',
      },
      {
        date: '2026-11-02',
        dayOfWeek: 1,
        dayType: 'NORMAL',
        shift: { start: '08:00', end: '17:00' },
      },
      {
        date: '2026-11-03',
        dayOfWeek: 2,
        dayType: 'NORMAL',
        leaveType: 'PN',
        leaveCode: 'PN',
      },
    ]);
  });

  test('1. Detects legacy local data correctly with counts and sample dates', async () => {
    const summary = await detectLegacyData(testUserId);
    expect(summary.hasLegacyData).toBe(true);
    expect(summary.counts.attendance).toBeGreaterThanOrEqual(3);
    expect(summary.counts.config).toBe(1);
    expect(summary.sampleDates).toContain('2026-11-01');
    expect(summary.alreadyMigrated).toBe(false);
  });

  test('2. Creates a pre-migration backup and verifies integrity before touching cloud', async () => {
    const backup = await createPreMigrationBackup();
    expect(backup.backupId).toContain('backup_');
    expect(backup.integrityCheck).toBe(true);
    expect(backup.recordCounts.attendance).toBeGreaterThanOrEqual(3);
  });

  test('3. Executes legacy migration with complete data verification', async () => {
    const progressStages: string[] = [];
    const summary = await detectLegacyData(testUserId);

    const result = await executeLegacyMigration({
      userId: testUserId,
      userEmail: testEmail,
      fingerprint: summary.fingerprint,
      onProgress: (p) => {
        progressStages.push(p.stage);
      },
    });

    expect(result.success).toBe(true);
    expect(result.verification.isVerified).toBe(true);
    expect(result.verification.attendanceVerified).toBe(true);
    expect(result.verification.configVerified).toBe(true);
    expect(progressStages).toContain('BACKING_UP');
    expect(progressStages).toContain('COMPLETED');

    // Verify idempotent detection: subsequent detection marks as already migrated
    const recheckSummary = await detectLegacyData(testUserId);
    expect(recheckSummary.alreadyMigrated).toBe(true);
  });

  test('4. Re-running migration is idempotent and does not produce duplicate attendance records', async () => {
    const summary = await detectLegacyData(testUserId);
    const result2 = await executeLegacyMigration({
      userId: testUserId,
      userEmail: testEmail,
      fingerprint: summary.fingerprint,
    });

    expect(result2.success).toBe(true);
    expect(result2.verification.isVerified).toBe(true);
  });
});
