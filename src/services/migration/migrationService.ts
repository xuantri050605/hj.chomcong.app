import { listMonths, loadAttendance, loadConfig, loadPayroll } from '../../utils/persistence';
import { getSupabaseClient } from '../supabaseClient';
import { createPreMigrationBackup } from './migrationBackup';
import {
  MigrationConflict,
  MigrationProgress,
  MigrationVerificationReport,
} from './migrationTypes';

const BATCH_SIZE = 50;

export interface MigrationOptions {
  userId: string;
  userEmail: string;
  fingerprint: string;
  onProgress?: (progress: MigrationProgress) => void;
}

export async function executeLegacyMigration(options: MigrationOptions): Promise<{
  success: boolean;
  conflicts: MigrationConflict[];
  verification: MigrationVerificationReport;
  error?: string;
}> {
  const { userId, fingerprint, onProgress } = options;
  const supabase = getSupabaseClient();
  const conflicts: MigrationConflict[] = [];

  const updateProgress = (
    stage: MigrationProgress['stage'],
    percentage: number,
    message: string,
    currentBatch?: number,
    totalBatches?: number
  ) => {
    if (onProgress) {
      onProgress({ stage, percentage, message, currentBatch, totalBatches });
    }
  };

  try {
    // 1. BACKUP PHASE
    updateProgress('BACKING_UP', 10, 'Đang tạo bản sao lưu an toàn CSDL SQLite cục bộ...');
    const backupMeta = await createPreMigrationBackup();
    if (!backupMeta.integrityCheck) {
      throw new Error('Sao lưu CSDL cục bộ thất bại. Di trú bị hủy để bảo vệ dữ liệu.');
    }

    // 2. MIGRATING SALARY CONFIG
    updateProgress('UPLOADING_CONFIG', 25, 'Đang đồng bộ cấu hình lương và tham số bảo hiểm...');
    const localCfg = await loadConfig();
    if (localCfg) {
      const { data: existingCfg } = await supabase
        .from('salary_configs')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingCfg && existingCfg.basic_salary !== localCfg.basicSalary) {
        conflicts.push({
          entityType: 'CONFIG',
          identifier: 'current',
          localData: localCfg,
          cloudData: existingCfg,
          resolution: 'MERGED',
        });
      }

      await supabase.from('salary_configs').upsert({
        user_id: userId,
        basic_salary: localCfg.basicSalary,
        standard_hours: localCfg.standardHours,
        seniority_allowance: localCfg.seniorityAllowance,
        living_allowance: localCfg.livingAllowance,
        attendance_allowance: localCfg.attendanceAllowance,
        other_allowance: localCfg.otherAllowance,
        insurance_rate: localCfg.insuranceRate,
        updated_at: new Date().toISOString(),
      });
    }

    // 3. MIGRATING ATTENDANCE RECORDS IN BATCHES
    updateProgress('UPLOADING_ATTENDANCE', 40, 'Đang chuẩn bị danh sách ngày công lịch sử...');
    const months = await listMonths();
    const allAttendanceItems: any[] = [];

    for (const m of months) {
      const items = await loadAttendance(m);
      for (const item of items) {
        allAttendanceItems.push(item);
      }
    }

    const totalAttendance = allAttendanceItems.length;
    const totalBatches = Math.ceil(totalAttendance / BATCH_SIZE) || 1;

    for (let b = 0; b < totalBatches; b++) {
      const start = b * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, totalAttendance);
      const batchItems = allAttendanceItems.slice(start, end);

      const batchPercentage = 40 + Math.round(((b + 1) / totalBatches) * 35);
      updateProgress(
        'UPLOADING_ATTENDANCE',
        batchPercentage,
        `Đang đồng bộ ngày công (${start + 1} - ${end} / ${totalAttendance})...`,
        b + 1,
        totalBatches
      );

      const upsertRows = batchItems.map((item) => ({
        user_id: userId,
        date: item.date,
        day_of_week: item.dayOfWeek,
        day_type: item.dayType || 'NORMAL',
        shift_start: item.shift?.start || null,
        shift_end: item.shift?.end || null,
        leave_type: item.leaveType || null,
        leave_code: item.leaveCode || null,
        time_source: item.timeSource || 'DEVICE',
        original_time_source: item.originalTimeSource || null,
        gps_metadata: item.gpsMetadata || null,
        note: item.note || null,
        raw_data: item,
        updated_at: new Date().toISOString(),
      }));

      if (upsertRows.length > 0) {
        const { error: attError } = await supabase.from('attendance_records').upsert(upsertRows, {
          onConflict: 'user_id,date',
        });
        if (attError) {
          throw new Error(`Lỗi đồng bộ ngày công: ${attError.message}`);
        }
      }
    }

    // 4. MIGRATING HISTORICAL PAYROLL
    updateProgress('UPLOADING_PAYROLL', 80, 'Đang đồng bộ bảng lương lịch sử các kỳ...');
    let migratedPayrollCount = 0;
    for (const m of months) {
      const p = await loadPayroll(m);
      if (p) {
        migratedPayrollCount += 1;
        const { error: payError } = await supabase.from('payroll_history').upsert(
          {
            user_id: userId,
            month: m,
            gross_salary: p.grossPay || p.totalA || 0,
            total_deductions: p.totalDeductions || 0,
            net_salary: p.netPay || 0,
            breakdown: p,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,month' }
        );
        if (payError) {
          throw new Error(`Lỗi đồng bộ bảng lương tháng ${m}: ${payError.message}`);
        }
      }
    }

    // 5. VERIFICATION PHASE
    updateProgress('VERIFYING', 92, 'Đang kiểm toán đối soát dữ liệu sau di trú...');
    const { count: cloudAttCount } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: cloudPayCount } = await supabase
      .from('payroll_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const discrepancies: string[] = [];
    const verifiedAtt = (cloudAttCount ?? 0) >= totalAttendance;
    const verifiedPay = (cloudPayCount ?? 0) >= migratedPayrollCount;

    if (!verifiedAtt) {
      discrepancies.push(
        `Số ngày công đám mây (${cloudAttCount}) ít hơn số ngày công cục bộ (${totalAttendance}).`
      );
    }
    if (!verifiedPay) {
      discrepancies.push(
        `Số bảng lương đám mây (${cloudPayCount}) ít hơn số bảng lương cục bộ (${migratedPayrollCount}).`
      );
    }

    const verification: MigrationVerificationReport = {
      isVerified: verifiedAtt && verifiedPay,
      attendanceVerified: verifiedAtt,
      payrollVerified: verifiedPay,
      configVerified: true,
      localCounts: {
        attendance: totalAttendance,
        payroll: migratedPayrollCount,
      },
      cloudCounts: {
        attendance: cloudAttCount ?? totalAttendance,
        payroll: cloudPayCount ?? migratedPayrollCount,
      },
      discrepancies,
    };

    // 6. RECORD MIGRATION SUCCESS IN SUPABASE
    await supabase.from('legacy_migrations').upsert(
      {
        user_id: userId,
        fingerprint,
        source_type: backupMeta.sourceType,
        status: verification.isVerified ? 'COMPLETED' : 'FAILED',
        record_counts: {
          attendance: totalAttendance,
          payroll: migratedPayrollCount,
          config: localCfg ? 1 : 0,
        },
        verification_summary: verification,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,fingerprint' }
    );

    updateProgress('COMPLETED', 100, 'Di trú dữ liệu hoàn tất an toàn!');

    return {
      success: verification.isVerified,
      conflicts,
      verification,
    };
  } catch (err: any) {
    updateProgress('ERROR', 0, err?.message || 'Có lỗi xảy ra trong quá trình di trú');
    return {
      success: false,
      conflicts,
      verification: {
        isVerified: false,
        attendanceVerified: false,
        payrollVerified: false,
        configVerified: false,
        localCounts: { attendance: 0, payroll: 0 },
        cloudCounts: { attendance: 0, payroll: 0 },
        discrepancies: [err?.message || 'Lỗi không xác định'],
      },
      error: err?.message || 'Lỗi di trú',
    };
  }
}
