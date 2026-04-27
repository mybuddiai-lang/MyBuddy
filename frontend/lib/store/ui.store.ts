import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  examBannerHidden: boolean;
  setExamBannerHidden: (hidden: boolean) => void;
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      examBannerHidden: false,
      setExamBannerHidden: (examBannerHidden) => set({ examBannerHidden }),
      notificationPanelOpen: false,
      setNotificationPanelOpen: (notificationPanelOpen) => set({ notificationPanelOpen }),
    }),
    {
      name: 'buddi-ui-prefs',
      // Only persist exam banner preference — panel open state is ephemeral
      partialize: (state) => ({ examBannerHidden: state.examBannerHidden }),
    }
  )
);
