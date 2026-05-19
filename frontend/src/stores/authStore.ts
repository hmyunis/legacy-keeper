import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  is_verified?: boolean;
  vaultId?: string;
  avatar?: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  activeVaultId: string | null;
  login: (payload: { user: User; accessToken: string; refreshToken: string; activeVaultId?: string | null }) => void;
  setActiveVaultId: (vaultId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      activeVaultId: null,
      login: ({ user, accessToken, refreshToken, activeVaultId }) =>
        set((state) => ({
          currentUser: user,
          isAuthenticated: true,
          accessToken,
          refreshToken,
          activeVaultId: activeVaultId || user.vaultId || state.activeVaultId || null,
        })),
      setActiveVaultId: (vaultId) => set({ activeVaultId: vaultId }),
      logout: () => set({ currentUser: null, isAuthenticated: false, accessToken: null, refreshToken: null, activeVaultId: null }),
    }),
    {
      name: 'legacy_keeper_auth_v5',
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        if (!persistedState.activeVaultId && persistedState.currentUser?.vaultId) {
          persistedState.activeVaultId = persistedState.currentUser.vaultId;
        }
        return persistedState;
      },
    }
  )
);
