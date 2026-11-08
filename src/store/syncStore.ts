import { create } from 'zustand';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabaseClient';
import { useSalaryStore } from './salaryStore';
import { useAttendanceStore } from './attendanceStore';
import { useAuthStore } from './authStore';

export type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  syncStatus: SyncStatusType;
  lastSyncedAt: Date | null;
  isOnline: boolean;
  errorMessage: string | null;
  isModalOpen: boolean;

  // Actions
  setSyncStatus: (status: SyncStatusType, error?: string | null) => void;
  setOnline: (online: boolean) => void;
  openSyncModal: () => void;
  closeSyncModal: () => void;
  syncNow: () => Promise<boolean>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  syncStatus: isSupabaseConfigured ? 'synced' : 'offline',
  lastSyncedAt: new Date(),
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  errorMessage: null,
  isModalOpen: false,

  setSyncStatus: (status, error = null) => {
    set({
      syncStatus: status,
      errorMessage: error,
      lastSyncedAt: status === 'synced' ? new Date() : get().lastSyncedAt,
    });
  },

  setOnline: (online) => {
    set({
      isOnline: online,
      syncStatus: online ? 'synced' : 'offline',
    });
  },

  openSyncModal: () => set({ isModalOpen: true }),
  closeSyncModal: () => set({ isModalOpen: false }),

  syncNow: async () => {
    const user = useAuthStore.getState().user;
    if (!isSupabaseConfigured) {
      set({
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
        errorMessage: null,
      });
      return true;
    }

    try {
      set({ syncStatus: 'syncing', errorMessage: null });
      const supabase = getSupabaseClient();

      // Ping Supabase to verify connectivity
      const { error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });

      if (error) {
        throw new Error(error.message);
      }

      // If user is authenticated, sync salary config and attendance records
      if (user?.id) {
        const config = useSalaryStore.getState().config;
        await supabase.from('salary_configs').upsert({
          user_id: user.id,
          basic_salary: config.basicSalary,
          standard_hours: config.standardHours,
          seniority_allowance: config.seniorityAllowance,
          living_allowance: config.livingAllowance,
          attendance_allowance: config.attendanceAllowance,
          other_allowance: config.otherAllowance,
          insurance_rate: config.insuranceRate,
          updated_at: new Date().toISOString(),
        });

        const attendanceItems = useAttendanceStore.getState().items;
        if (attendanceItems.length > 0) {
          const recordsToSync = attendanceItems.map((item) => ({
            user_id: user.id,
            date: item.date,
            day_of_week: item.dayOfWeek,
            day_type: item.dayType,
            shift_start: item.shift?.start,
            shift_end: item.shift?.end,
            time_source: item.timeSource || 'DEVICE',
            gps_metadata: item.gpsMetadata || null,
            note: item.note || null,
            updated_at: new Date().toISOString(),
          }));

          await supabase.from('attendance_records').upsert(recordsToSync);
        }
      }

      set({
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
        errorMessage: null,
      });
      return true;
    } catch (err: any) {
      set({
        syncStatus: 'error',
        errorMessage: err?.message || 'Không thể đồng bộ với máy chủ Supabase',
      });
      return false;
    }
  },
}));
