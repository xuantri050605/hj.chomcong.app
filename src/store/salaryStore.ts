import { create } from 'zustand';
import { DEFAULT_CONFIG, SalaryConfig as EngineConfig } from '../engine/payrollCalculator';
import { loadConfig, saveConfig } from '../utils/persistence';
import { sanitizeSalaryConfig } from '../utils/securityValidator';

export type SalaryConfig = EngineConfig;

type SalaryState = {
  config: SalaryConfig;
  loadConfig: () => Promise<void>;
  setConfig: (c: SalaryConfig) => Promise<void>;
  resetDefaults: () => Promise<void>;
};

export const useSalaryStore = create<SalaryState>((set) => ({
  config: DEFAULT_CONFIG,
  loadConfig: async () => {
    const c = await loadConfig();
    if (c) {
      const sanitized = sanitizeSalaryConfig(c, DEFAULT_CONFIG);
      set({ config: sanitized });
    }
  },
  setConfig: async (c: SalaryConfig) => {
    const sanitized = sanitizeSalaryConfig(c, DEFAULT_CONFIG);
    set({ config: sanitized });
    await saveConfig(sanitized);
  },
  resetDefaults: async () => {
    set({ config: DEFAULT_CONFIG });
    await saveConfig(DEFAULT_CONFIG);
  },
}));

