import { Platform } from 'react-native';
import { initPersistence, listMonths, loadAttendance, loadConfig, loadPayroll } from '../../utils/persistence';
import { getSupabaseClient } from '../supabaseClient';
import { LocalDataSummary } from './migrationTypes';

/**
 * Computes a deterministic SHA-like fingerprint from local record dates and counts.
 */
function generateFingerprint(sourceType: string, months: string[], totalAttendance: number): string {
  const sortedMonths = [...months].sort().join(',');
  const str = `${sourceType}:${sortedMonths}:${totalAttendance}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `fp_${Math.abs(hash).toString(16)}_${totalAttendance}`;
}

/**
 * Detects legacy local data stored in SQLite (Mobile) or LocalStorage (Web)
 * and checks whether it has already been migrated to Supabase.
 */
export async function detectLegacyData(userId?: string): Promise<LocalDataSummary> {
  try {
    const adapter = await initPersistence();
    const months = await listMonths();
    const cfg = await loadConfig();

    let totalAttendance = 0;
    const sampleDates: string[] = [];

    for (const m of months) {
      const items = await loadAttendance(m);
      totalAttendance += items.length;
      if (sampleDates.length < 5 && items.length > 0) {
        sampleDates.push(...items.slice(0, 5 - sampleDates.length).map((it) => it.date));
      }
    }

    let totalPayroll = 0;
    for (const m of months) {
      const p = await loadPayroll(m);
      if (p) totalPayroll += 1;
    }

    let sourceType: 'SQLITE' | 'LOCAL_STORAGE' | 'MEMORY' | 'NONE' = 'NONE';
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      sourceType = 'LOCAL_STORAGE';
    } else if (Platform.OS !== 'web') {
      sourceType = 'SQLITE';
    } else {
      sourceType = 'MEMORY';
    }

    const hasLegacyData = totalAttendance > 0 || totalPayroll > 0 || cfg !== null;
    const fingerprint = generateFingerprint(sourceType, months, totalAttendance);

    let alreadyMigrated = false;
    let lastMigratedAt: string | null = null;

    if (userId && hasLegacyData) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('legacy_migrations')
          .select('id, status, migrated_at, created_at')
          .eq('user_id', userId)
          .eq('fingerprint', fingerprint)
          .maybeSingle();

        if (!error && data && data.status === 'COMPLETED') {
          alreadyMigrated = true;
          lastMigratedAt = data.migrated_at || data.created_at || null;
        }
      } catch {
        // If offline or network check fails, fallback safely
        alreadyMigrated = false;
      }
    }

    return {
      hasLegacyData,
      sourceType,
      fingerprint,
      counts: {
        attendance: totalAttendance,
        payroll: totalPayroll,
        config: cfg ? 1 : 0,
        employees: 0,
        companyLocation: 1,
        pendingEvents: 0,
      },
      sampleDates,
      alreadyMigrated,
      lastMigratedAt,
    };
  } catch (err) {
    return {
      hasLegacyData: false,
      sourceType: 'NONE',
      fingerprint: 'none',
      counts: {
        attendance: 0,
        payroll: 0,
        config: 0,
        employees: 0,
        companyLocation: 0,
        pendingEvents: 0,
      },
      sampleDates: [],
      alreadyMigrated: false,
      lastMigratedAt: null,
    };
  }
}
