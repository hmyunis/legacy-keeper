import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SubscriptionTier, User } from '../types';

interface LoginPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
  activeVaultId?: string | null;
}

interface SetTokensPayload {
  accessToken: string;
  refreshToken?: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  activeVaultId: string | null;
  login: (payload: LoginPayload) => void;
  setTokens: (payload: SetTokensPayload) => void;
  setActiveVault: (vaultId: string | null) => void;
  updateUser: (updates: Partial<User>) => void;
  upgradePlan: (tier: SubscriptionTier) => void;
  logout: () => void;
}

export const STORAGE_LIMITS: Record<SubscriptionTier, number> = {
  BASIC: 10,
  HERITAGE: 50,
  DYNASTY: 500,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      activeVaultId: null,
      login: ({ user, accessToken, refreshToken, activeVaultId }) =>
        set({
          currentUser: user,
          isAuthenticated: true,
          accessToken,
          refreshToken,
          activeVaultId: activeVaultId ?? null,
        }),
      setTokens: ({ accessToken, refreshToken }) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
          isAuthenticated: Boolean(state.currentUser && accessToken),
        })),
      setActiveVault: (vaultId) =>
        set({
          activeVaultId: vaultId,
        }),
      logout: () => {
        set({
          currentUser: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          activeVaultId: null,
        });

        if ((window as any).router) {
          (window as any).router.navigate({ to: '/' });
        }
      },
      updateUser: (updates) =>
        set((state) => ({
          currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null,
        })),
      upgradePlan: (tier) =>
        set((state) => ({
          currentUser: state.currentUser ? { ...state.currentUser, subscriptionTier: tier } : null,
        })),
    }),
    {
      name: 'legacy_keeper_auth_v4',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        activeVaultId: state.activeVaultId,
      }),
    }
  )
);
