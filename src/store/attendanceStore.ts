import { create } from 'zustand';

import { loadAttendance, saveAttendance } from '../utils/persistence';
import { DayAttendance as EngineDayAttendance } from '../engine/attendanceCalculator';
import { dateInMonth, getCurrentMonth, localDateKey, localTimeKey, weekdayForDateKey } from '../utils/monthUtils';

export type DayAttendance = EngineDayAttendance;

type AttendanceState = {
  month: string; // YYYY-MM
  items: DayAttendance[];
  setMonth: (m: string) => void;
  selectMonth: (m: string) => Promise<void>;
  loadMonth: (m?: string) => Promise<void>;
  saveMonth: () => Promise<void>;
  addOrUpdate: (item: DayAttendance) => void;
  remove: (date: string) => Promise<void>;
  // device/manual clock API
  clockIn: (now?: Date) => Promise<void>;
  clockOut: (now?: Date) => Promise<void>;
  addManual: (item: DayAttendance) => Promise<void>;
  editAttendance: (date: string, patch: Partial<DayAttendance>) => Promise<void>;
};

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  month: getCurrentMonth(),
  items: [],
  setMonth: (m) => set({ month: m }),
  selectMonth: async (month) => {
    // One transition owns both the selected key and its isolated data query.
    // An overnight record is stored with its start-date month and is therefore
    // counted exactly once by the payroll period containing that start date.
    const rows = await loadAttendance(month);
    set({ month, items: rows.filter((row) => dateInMonth(row.date, month)) });
  },
  loadMonth: async (m?: string) => {
    const month = m || get().month;
    const rows = await loadAttendance(month);
    set({ month, items: rows.filter((row) => dateInMonth(row.date, month)) });
  },
  saveMonth: async () => {
    const { month, items } = get();
    await saveAttendance(month, items as EngineDayAttendance[]);
  },
  // clock in: create or update today's attendance with start time
  clockIn: async (now?: Date) => {
    const n = now || new Date();
    const date = localDateKey(n);
    const hh = localTimeKey(n);
    const iso = n.toISOString();
    set((s) => {
      const idx = s.items.findIndex(it => it.date === date);
      if (idx >= 0) {
        // if already clocked in without clock out, ignore duplicate
        const existing = s.items[idx];
        if (existing.shift && existing.shift.start && (!existing.shift.end || existing.shift.end === '')) {
          return s; // no change
        }
        const updated: DayAttendance = { ...existing, shift: { ...(existing.shift||{}) , start: hh }, timeSource: 'DEVICE', createdAt: existing.createdAt || iso, updatedAt: iso };
        const arr = [...s.items]; arr[idx] = updated;
        // persist
        void saveAttendance(s.month, arr as EngineDayAttendance[]);
        return { items: arr };
      }
      const dayOfWeek = weekdayForDateKey(date);
      const newRec: DayAttendance = { date, dayOfWeek, dayType: 'NORMAL', shift: { start: hh, end: undefined }, timeSource: 'DEVICE', createdAt: iso, updatedAt: iso };
      const arr = [...s.items, newRec];
      void saveAttendance(s.month, arr as EngineDayAttendance[]);
      return { items: arr };
    });
  },
  // clock out: set end time for today's attendance if clocked in
  clockOut: async (now?: Date) => {
    const n = now || new Date();
    const date = localDateKey(n);
    const hh = localTimeKey(n);
    const iso = n.toISOString();
    const prev = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1, n.getHours(), n.getMinutes());
    const prevDate = localDateKey(prev);
    const current = get();
    // At a month boundary the open shift may live in the previous month, which
    // is not loaded in the October view. Update that start-date record in place
    // instead of creating a second attendance record for the clock-out date.
    if (date !== prevDate && prevDate.slice(0, 7) !== current.month && !current.items.some((item) => item.date === prevDate)) {
      const previousMonth = prevDate.slice(0, 7);
      const previousItems = await loadAttendance(previousMonth);
      const previousIndex = previousItems.findIndex((item) => item.date === prevDate && item.shift?.start && !item.shift.end);
      if (previousIndex >= 0) {
        const updated = { ...previousItems[previousIndex], shift: { ...previousItems[previousIndex].shift, end: hh }, updatedAt: iso } as DayAttendance;
        const rows = [...previousItems]; rows[previousIndex] = updated;
        await saveAttendance(previousMonth, rows);
        return;
      }
    }
    set((s) => {
      const idx = s.items.findIndex(it => it.date === date);
      if (idx >= 0) {
        const existing = s.items[idx];
        // if already has end, ignore duplicate
        if (existing.shift && existing.shift.end) return s;
        const updated: DayAttendance = { ...existing, shift: { ...(existing.shift||{}), end: hh }, timeSource: existing.timeSource || 'DEVICE', updatedAt: iso };
        const arr = [...s.items]; arr[idx] = updated;
        void saveAttendance(s.month, arr as EngineDayAttendance[]);
        return { items: arr };
      }

      // if no record for this date, check previous date for an open shift (overnight)
      const prevIdx = s.items.findIndex(it => it.date === prevDate);
      if (prevIdx >= 0) {
        const prevRec = s.items[prevIdx];
        if (prevRec.shift && prevRec.shift.start && !prevRec.shift.end) {
          const updated: DayAttendance = { ...prevRec, shift: { ...(prevRec.shift||{}), end: hh }, timeSource: prevRec.timeSource || 'DEVICE', updatedAt: iso };
          const arr = [...s.items]; arr[prevIdx] = updated;
          void saveAttendance(s.month, arr as EngineDayAttendance[]);
          return { items: arr };
        }
      }

      // create record with start undefined and end set
      const dayOfWeek = weekdayForDateKey(date);
      const newRec: DayAttendance = { date, dayOfWeek, dayType: 'NORMAL', shift: { start: undefined as any, end: hh }, timeSource: 'DEVICE', createdAt: iso, updatedAt: iso };
      const arr = [...s.items, newRec];
      void saveAttendance(s.month, arr as EngineDayAttendance[]);
      return { items: arr };
    });
  },
  addManual: async (item: DayAttendance) => {
    const iso = new Date().toISOString();
    set((s) => {
      const idx = s.items.findIndex(it => it.date === item.date);
      const leaveType = item.leaveType || item.leaveCode || null;
      const toSave: DayAttendance = { ...item, leaveType, leaveCode: leaveType, shift: leaveType ? null : item.shift, timeSource: 'MANUAL', originalTimeSource: item.timeSource || null, createdAt: iso, updatedAt: iso };
      let arr: DayAttendance[];
      if (idx >= 0) { arr = [...s.items]; arr[idx] = { ...arr[idx], ...toSave }; }
      else { arr = [...s.items, toSave]; }
      void saveAttendance(s.month, arr as EngineDayAttendance[]);
      return { items: arr };
    });
  },
  editAttendance: async (date: string, patch: Partial<DayAttendance>) => {
    const iso = new Date().toISOString();
    set((s) => {
      const idx = s.items.findIndex(it => it.date === date);
      if (idx < 0) return s;
      const existing = s.items[idx];
      const newSource = patch.timeSource === 'MANUAL' ? 'MANUAL' : patch.timeSource || existing.timeSource;
      const leaveType = patch.leaveType === undefined && patch.leaveCode === undefined ? existing.leaveType || existing.leaveCode || null : patch.leaveType || patch.leaveCode || null;
      const updated: DayAttendance = { ...existing, ...patch, leaveType, leaveCode: leaveType, shift: leaveType ? null : patch.shift === undefined ? existing.shift : patch.shift, updatedAt: iso, originalTimeSource: existing.timeSource === 'DEVICE' && newSource === 'MANUAL' ? existing.timeSource : existing.originalTimeSource };
      const arr = [...s.items]; arr[idx] = updated;
      void saveAttendance(s.month, arr as EngineDayAttendance[]);
      return { items: arr };
    });
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
  remove: async (date: string) => {
    const items = get().items.filter((it) => it.date !== date);
    set({ items });
    await saveAttendance(get().month, items as EngineDayAttendance[]);
  },
}));
