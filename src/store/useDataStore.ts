import { create } from 'zustand';

interface DataStore {
  data: any[];
  refreshFlag: number;
  setData: (newData: any[]) => void;
  refreshData: () => void;
}

export const useDataStore = create<DataStore>((set) => ({
  data: [],
  refreshFlag: 0,
  setData: (newData) => set({ data: newData }),
  refreshData: () => set((state) => ({ refreshFlag: state.refreshFlag + 1 })),
}));
