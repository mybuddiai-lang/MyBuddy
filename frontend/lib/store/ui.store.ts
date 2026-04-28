import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  examBannerHidden: boolean;
  setExamBannerHidden: (hidden: boolean) => void;
  notificationPanelOpen: boolean;
  notificationPanelTab: 'notifications' | 'due-today';
  openNotificationPanel: (tab?: 'notifications' | 'due-today') => void;
  setNotificationPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      examBannerHidden: false,
      setExamBannerHidden: (examBannerHidden) => set({ examBannerHidden }),
      notificationPanelOpen: false,
      notificationPanelTab: 'notifications',
      openNotificationPanel: (tab = 'notifications') =>
        set({ notificationPanelOpen: true, notificationPanelTab: tab }),
      setNotificationPanelOpen: (notificationPanelOpen) => set({ notificationPanelOpen }),
    }),
    {
      name: 'buddi-ui-prefs',
      partialize: (state) => ({ examBannerHidden: state.examBannerHidden }),
    }
  )
);
