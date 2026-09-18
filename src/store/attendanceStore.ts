import create from 'zustand';

import { loadAttendance, saveAttendance } from '../utils/persistence';
import { DayAttendance as EngineDayAttendance } from '../engine/attendanceCalculator';

export type DayAttendance = EngineDayAttendance;

type AttendanceState = {
  month: string; // YYYY-MM
  items: DayAttendance[];
  setMonth: (m: string) => void;
  loadMonth: (m?: string) => Promise<void>;
  saveMonth: () => Promise<void>;
  addOrUpdate: (item: DayAttendance) => void;
  remove: (date: string) => void;
};

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  month: new Date().toISOString().slice(0,7),
  items: [],
  setMonth: (m) => set({ month: m }),
  loadMonth: async (m?: string) => {
    const month = m || get().month;
    const rows = await loadAttendance(month);
    set({ month, items: rows });
  },
  saveMonth: async () => {
    const { month, items } = get();
    await saveAttendance(month, items as EngineDayAttendance[]);
  },
  addOrUpdate: (item: DayAttendance) => {
    set((s) => {
      const idx = s.items.findIndex((it) => it.date === item.date);
      if (idx >= 0) {
        const arr = [...s.items];
        arr[idx] = { ...arr[idx], ...item };
        return { items: arr };
      }
      return { items: [...s.items, item] };
    });
  },
  remove: (date: string) => {
    set((s) => ({ items: s.items.filter((it) => it.date !== date) }));
  },
}));
