import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VaultInvitationSummary, VaultMembershipSummary } from '../features/auth/types';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  is_verified?: boolean;
  vaultId?: string;
  avatar?: string;
  vaults?: VaultMembershipSummary[];
  pendingInvitations?: VaultInvitationSummary[];
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

function resolveVaultSelection(user: User, preferredVaultId?: string | null) {
  const vaults = user.vaults || [];
  if (preferredVaultId && vaults.some((vault) => vault.id === preferredVaultId)) {
    return preferredVaultId;
  }
  if (vaults.length === 1) {
    return vaults[0].id;
  }
  return null;
}

function resolveMembershipRole(user: User, vaultId: string | null) {
  if (!vaultId) return user.role || 'CURATOR';
  const match = user.vaults?.find((vault) => vault.id === vaultId);
  return match?.role || user.role || 'CURATOR';
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
        set(() => {
          const selectedVaultId = resolveVaultSelection(user, activeVaultId);
          const selectedRole = resolveMembershipRole(user, selectedVaultId);
          return {
            currentUser: {
              ...user,
              vaultId: selectedVaultId || user.vaultId || undefined,
              role: selectedRole,
            },
            isAuthenticated: true,
            accessToken,
            refreshToken,
            activeVaultId: selectedVaultId,
          };
        }),
      setActiveVaultId: (vaultId) =>
        set((state) => ({
          activeVaultId: vaultId,
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                vaultId: vaultId || undefined,
                role: resolveMembershipRole(state.currentUser, vaultId),
              }
            : state.currentUser,
        })),
      logout: () => set({ currentUser: null, isAuthenticated: false, accessToken: null, refreshToken: null, activeVaultId: null }),
    }),
    {
      name: 'legacy_keeper_auth_v6',
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        if (!persistedState.activeVaultId && persistedState.currentUser?.vaultId) {
          persistedState.activeVaultId = persistedState.currentUser.vaultId;
        }
        if (persistedState.currentUser && !persistedState.currentUser.vaults) {
          persistedState.currentUser.vaults = persistedState.currentUser.vaultId
            ? [{
                id: persistedState.currentUser.vaultId,
                name: persistedState.currentUser.vaultName || 'Vault',
                role: persistedState.currentUser.role || 'CURATOR',
                joinedAt: persistedState.currentUser.joinedAt,
              }]
            : [];
        }
        if (persistedState.currentUser && !persistedState.currentUser.pendingInvitations) {
          persistedState.currentUser.pendingInvitations = [];
        }
        return persistedState;
      },
    }
  )
);
