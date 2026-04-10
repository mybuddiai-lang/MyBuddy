import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  examBannerHidden: boolean;
  setExamBannerHidden: (hidden: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      examBannerHidden: false,
      setExamBannerHidden: (examBannerHidden) => set({ examBannerHidden }),
    }),
    { name: 'buddi-ui-prefs' }
  )
);
