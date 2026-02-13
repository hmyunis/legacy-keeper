
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, SubscriptionTier } from '../types';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  upgradePlan: (tier: SubscriptionTier) => void;
}

export const STORAGE_LIMITS: Record<SubscriptionTier, number> = {
  BASIC: 10,
  HERITAGE: 50,
  DYNASTY: 500
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      token: null,
      login: (userData, token) => set({ 
        currentUser: userData, 
        isAuthenticated: true, 
        token 
      }),
      logout: () => {
        set({ currentUser: null, isAuthenticated: false, token: null });
        if ((window as any).router) {
          (window as any).router.navigate({ to: '/landing' });
        }
      },
      updateUser: (updates) => set((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null
      })),
      upgradePlan: (tier) => set((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, subscriptionTier: tier } : null
      })),
    }),
    {
      name: 'legacy_keeper_auth_v3',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
