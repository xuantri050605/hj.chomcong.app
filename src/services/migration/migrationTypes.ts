import { DayAttendance } from '../../engine/attendanceCalculator';
import { PayrollBreakdown, SalaryConfig } from '../../engine/payrollCalculator';
import { Employee } from '../../screens/Employees';

export interface LocalDataSummary {
  hasLegacyData: boolean;
  sourceType: 'SQLITE' | 'LOCAL_STORAGE' | 'MEMORY' | 'NONE';
  fingerprint: string;
  counts: {
    attendance: number;
    payroll: number;
    config: number;
    employees: number;
    companyLocation: number;
    pendingEvents: number;
  };
  sampleDates: string[];
  alreadyMigrated: boolean;
  lastMigratedAt?: string | null;
}

export interface BackupMetadata {
  backupId: string;
  sourceType: string;
  timestamp: string;
  recordCounts: {
    attendance: number;
    payroll: number;
    config: number;
  };
  integrityCheck: boolean;
}

export interface MigrationConflict {
  entityType: 'ATTENDANCE' | 'PAYROLL' | 'CONFIG';
  identifier: string; // date (YYYY-MM-DD) or month (YYYY-MM)
  localData: any;
  cloudData: any;
  resolution: 'PRESERVE_LOCAL' | 'KEEP_CLOUD' | 'MERGED';
}

export interface MigrationVerificationReport {
  isVerified: boolean;
  attendanceVerified: boolean;
  payrollVerified: boolean;
  configVerified: boolean;
  localCounts: {
    attendance: number;
    payroll: number;
  };
  cloudCounts: {
    attendance: number;
    payroll: number;
  };
  discrepancies: string[];
}

export interface MigrationProgress {
  stage: 'IDLE' | 'BACKING_UP' | 'UPLOADING_CONFIG' | 'UPLOADING_ATTENDANCE' | 'UPLOADING_PAYROLL' | 'VERIFYING' | 'COMPLETED' | 'ERROR';
  percentage: number;
  message: string;
  currentBatch?: number;
  totalBatches?: number;
}
