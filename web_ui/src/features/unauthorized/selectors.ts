import { UserRole, type VaultSummary } from '@/types';
import type { UnauthorizedRetryTarget } from './types';

export const DEFAULT_UNAUTHORIZED_ROLES = [
  UserRole.ADMIN,
  UserRole.CONTRIBUTOR,
  UserRole.VIEWER,
] as const;
export const ADMIN_ONLY_UNAUTHORIZED_ROLES = [UserRole.ADMIN] as const;

export const resolveAttemptedUnauthorizedPath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  return value.trim() ? value : null;
};

export const getUnauthorizedRequiredRoles = (attemptedPath: string | null): readonly UserRole[] => {
  if (!attemptedPath) return DEFAULT_UNAUTHORIZED_ROLES;
  if (attemptedPath.startsWith('/members') || attemptedPath.startsWith('/logs')) {
    return ADMIN_ONLY_UNAUTHORIZED_ROLES;
  }
  return DEFAULT_UNAUTHORIZED_ROLES;
};

export const getUnauthorizedCandidateVaults = (
  vaults: VaultSummary[] | undefined,
  requiredRoles: readonly UserRole[],
): VaultSummary[] => {
  if (!vaults?.length) return [];
  return vaults.filter((vault) => vault.myRole && requiredRoles.includes(vault.myRole));
};

export const resolveUnauthorizedSelectedVaultId = (params: {
  candidateVaults: VaultSummary[];
  selectedVaultId: string;
  activeVaultId?: string | null;
}): string => {
  const { candidateVaults, selectedVaultId, activeVaultId } = params;
  if (!candidateVaults.length) return '';
  if (candidateVaults.some((vault) => vault.id === selectedVaultId)) return selectedVaultId;

  const preferred = candidateVaults.find((vault) => vault.id === activeVaultId) || candidateVaults[0];
  return preferred.id;
};

export const parseUnauthorizedRetryTarget = (
  attemptedPath: string | null,
): UnauthorizedRetryTarget | null => {
  if (!attemptedPath) return null;
  const [path, query] = attemptedPath.split('?');
  const parsedSearch = query ? Object.fromEntries(new URLSearchParams(query).entries()) : undefined;
  return {
    to: path,
    search: parsedSearch,
  };
};
