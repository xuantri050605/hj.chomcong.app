import create from 'zustand';

export type SalaryConfig = {
  baseSalary: number;
  allowances: Record<string, number>;
  standardHoursPerMonth: number;
  rates: Record<string, number>;
};

type SalaryState = {
  config: SalaryConfig;
  setConfig: (c: SalaryConfig) => void;
};

export const useSalaryStore = create<SalaryState>((set) => ({
  config: {
    baseSalary: 0,
    allowances: {},
    standardHoursPerMonth: 208,
    rates: {},
  },
  setConfig: (c) => set({ config: c }),
}));
