import type { UserRole, VaultSummary } from '@/types';

export interface UnauthorizedSearchState {
  from?: string;
}

export interface UnauthorizedRetryTarget {
  to: string;
  search?: Record<string, string>;
}

export interface UnauthorizedRoleOption {
  roles: readonly UserRole[];
}

export interface UnauthorizedVaultOption extends Pick<VaultSummary, 'id' | 'name' | 'myRole'> {}
