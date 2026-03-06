import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  theme: 'light' | 'dark';
  primaryColor: string;
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  globalSearch: string;
  // State for the AI assistant
  isAssistantOpen: boolean;
  assistantQuery: string;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setPrimaryColor: (color: string) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
  toggleMobileMenu: () => void;
  setGlobalSearch: (query: string) => void;
  // Actions for the AI assistant
  setAssistantOpen: (isOpen: boolean) => void;
  setAssistantQuery: (query: string) => void;
  clearAssistantQuery: () => void;
}

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '59, 130, 246';
};

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const parseHexColor = (hex: string) => {
  const normalized = String(hex || '').trim();
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  if (!result) return { r: 59, g: 130, b: 246 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
};

const toHexColor = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('')}`;

const darkenHex = (hex: string, amount = 0.22) => {
  const color = parseHexColor(hex);
  const ratio = Math.max(0, Math.min(1, 1 - amount));
  return toHexColor(color.r * ratio, color.g * ratio, color.b * ratio);
};

export const applyPrimaryColor = (color: string) => {
  const strongerColor = darkenHex(color, 0.22);
  document.documentElement.style.setProperty('--color-primary', color);
  document.documentElement.style.setProperty('--color-primary-rgb', hexToRgb(color));
  document.documentElement.style.setProperty('--color-primary-strong', strongerColor);
  document.documentElement.style.setProperty('--color-primary-strong-rgb', hexToRgb(strongerColor));
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      primaryColor: '#2563eb',
      isSidebarOpen: true,
      isMobileMenuOpen: false,
      globalSearch: '',
      isAssistantOpen: false,
      assistantQuery: '',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),
      toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      setGlobalSearch: (globalSearch) => set({ globalSearch }),
      setAssistantOpen: (isAssistantOpen) => set({ isAssistantOpen }),
      setAssistantQuery: (assistantQuery) => set({ assistantQuery, isAssistantOpen: true }),
      clearAssistantQuery: () => set({ assistantQuery: '' }),
    }),
    {
      name: 'legacy_keeper_ui_v5_no_ai',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        theme: state.theme, 
        isSidebarOpen: state.isSidebarOpen, 
        primaryColor: state.primaryColor 
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.theme === 'dark');
          applyPrimaryColor(state.primaryColor);
        }
      }
    }
  )
);
