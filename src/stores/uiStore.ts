import { create } from 'zustand';

export type ActiveTab = '3d' | 'character' | 'inventory' | 'world' | 'notes';
export type Theme = 'green' | 'amber';

interface UIState {
  activeTab: ActiveTab;
  isSidebarOpen: boolean;
  theme: Theme;
  setActiveTab: (tab: ActiveTab) => void;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: '3d', // Default as per likely usage, though 'world' or 'sheet' might be valid too.
  isSidebarOpen: false,
  theme: 'green',
  setActiveTab: (activeTab) => set({ activeTab }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));