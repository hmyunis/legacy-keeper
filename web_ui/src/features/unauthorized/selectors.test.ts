import { describe, expect, it } from 'vitest';
import { UserRole, type VaultSummary } from '@/types';
import {
  ADMIN_ONLY_UNAUTHORIZED_ROLES,
  DEFAULT_UNAUTHORIZED_ROLES,
  getUnauthorizedCandidateVaults,
  getUnauthorizedRequiredRoles,
  parseUnauthorizedRetryTarget,
  resolveAttemptedUnauthorizedPath,
  resolveUnauthorizedSelectedVaultId,
} from './selectors';

const buildVault = (overrides: Partial<VaultSummary>): VaultSummary => ({
  id: 'vault-1',
  name: 'Family Vault',
  familyName: 'Family',
  description: '',
  safetyWindowMinutes: 60,
  storageQuality: 'high',
  defaultVisibility: 'family',
  storageUsedBytes: 0,
  memberCount: 0,
  myRole: UserRole.ADMIN,
  isOwner: false,
  ...overrides,
});

describe('unauthorized selectors', () => {
  it('normalizes attempted path and resolves role requirements', () => {
    expect(resolveAttemptedUnauthorizedPath('/members')).toBe('/members');
    expect(resolveAttemptedUnauthorizedPath('   ')).toBeNull();
    expect(resolveAttemptedUnauthorizedPath(undefined)).toBeNull();

    expect(getUnauthorizedRequiredRoles('/members')).toEqual(ADMIN_ONLY_UNAUTHORIZED_ROLES);
    expect(getUnauthorizedRequiredRoles('/logs')).toEqual(ADMIN_ONLY_UNAUTHORIZED_ROLES);
    expect(getUnauthorizedRequiredRoles('/timeline')).toEqual(DEFAULT_UNAUTHORIZED_ROLES);
    expect(getUnauthorizedRequiredRoles(null)).toEqual(DEFAULT_UNAUTHORIZED_ROLES);
  });

  it('filters candidate vaults by required role', () => {
    const vaults = [
      buildVault({ id: 'admin-vault', myRole: UserRole.ADMIN }),
      buildVault({ id: 'contrib-vault', myRole: UserRole.CONTRIBUTOR }),
      buildVault({ id: 'viewer-vault', myRole: UserRole.VIEWER }),
      buildVault({ id: 'no-role-vault', myRole: null }),
    ];

    expect(
      getUnauthorizedCandidateVaults(vaults, [UserRole.ADMIN]).map((vault) => vault.id),
    ).toEqual(['admin-vault']);

    expect(
      getUnauthorizedCandidateVaults(vaults, [UserRole.ADMIN, UserRole.CONTRIBUTOR]).map(
        (vault) => vault.id,
      ),
    ).toEqual(['admin-vault', 'contrib-vault']);
  });

  it('resolves selected vault id using current selection and active vault preference', () => {
    const candidateVaults = [
      buildVault({ id: 'vault-a' }),
      buildVault({ id: 'vault-b' }),
    ];

    expect(
      resolveUnauthorizedSelectedVaultId({
        candidateVaults,
        selectedVaultId: 'vault-b',
        activeVaultId: 'vault-a',
      }),
    ).toBe('vault-b');

    expect(
      resolveUnauthorizedSelectedVaultId({
        candidateVaults,
        selectedVaultId: 'missing',
        activeVaultId: 'vault-a',
      }),
    ).toBe('vault-a');

    expect(
      resolveUnauthorizedSelectedVaultId({
        candidateVaults,
        selectedVaultId: 'missing',
        activeVaultId: 'none',
      }),
    ).toBe('vault-a');

    expect(
      resolveUnauthorizedSelectedVaultId({
        candidateVaults: [],
        selectedVaultId: 'missing',
        activeVaultId: 'vault-a',
      }),
    ).toBe('');
  });

  it('parses retry target path and query parameters', () => {
    expect(parseUnauthorizedRetryTarget(null)).toBeNull();
    expect(parseUnauthorizedRetryTarget('/vault')).toEqual({
      to: '/vault',
      search: undefined,
    });
    expect(parseUnauthorizedRetryTarget('/settings?tab=vault&mode=edit')).toEqual({
      to: '/settings',
      search: { tab: 'vault', mode: 'edit' },
    });
  });
});
