import { create } from "zustand";

type PageStore = {
  pageName: string;
  setPageName: (name: string) => void;
};

export const usePageStore = create<PageStore>((set) => ({
  pageName: "",
  setPageName: (name: string) => set({ pageName: name }),
}));
