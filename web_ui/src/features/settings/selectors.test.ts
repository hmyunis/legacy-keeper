import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { PaginatedMembersResult } from '@/services/membersApi';
import { MemberStatus, UserRole, type FamilyMember, type VaultHealthReport, type VaultSummary } from '@/types';
import {
  buildSettingsTabItems,
  buildTransferCandidates,
  buildVaultSettings,
  flattenSettingsMembers,
  getIsAdminInVault,
  getVaultHealthSummary,
  resolveSettingsTab,
  resolveTransferMembershipSelection,
  withSettingsTabSearch,
} from './selectors';

const buildMember = (overrides: Partial<FamilyMember>): FamilyMember => ({
  id: 'member-1',
  fullName: 'Member One',
  email: 'member@example.com',
  role: UserRole.VIEWER,
  profilePhoto: 'https://example.com/avatar.jpg',
  status: MemberStatus.ACTIVE,
  joinedDate: '2025-01-01T00:00:00.000Z',
  subscriptionTier: 'BASIC',
  storageUsed: 0,
  ...overrides,
});

const buildVaultSummary = (overrides: Partial<VaultSummary> = {}): VaultSummary => ({
  id: 'vault-1',
  name: 'Vault',
  familyName: 'Legacy',
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

const buildHealthReport = (overrides: Partial<VaultHealthReport> = {}): VaultHealthReport => ({
  vaultId: 'vault-1',
  generatedAt: '2026-01-01T00:00:00.000Z',
  totalItems: 10,
  duplicateGroupsCount: 2,
  duplicateItemsCount: 4,
  reclaimableBytes: 2048,
  groups: [],
  ...overrides,
});

describe('settings selectors', () => {
  it('resolves settings tab and updates tab search params', () => {
    expect(resolveSettingsTab('vault')).toBe('vault');
    expect(resolveSettingsTab('unknown')).toBe('profile');
    expect(withSettingsTabSearch({ q: 'x' }, 'appearance')).toEqual({
      q: 'x',
      tab: 'appearance',
    });
  });

  it('flattens paginated member results', () => {
    const data: InfiniteData<PaginatedMembersResult> = {
      pages: [
        {
          items: [buildMember({ id: '1' }), buildMember({ id: '2' })],
          totalCount: 3,
          hasNextPage: true,
          hasPreviousPage: false,
        },
        {
          items: [buildMember({ id: '3' })],
          totalCount: 3,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      ],
      pageParams: [1, 2],
    };

    expect(flattenSettingsMembers(data).map((member) => member.id)).toEqual(['1', '2', '3']);
    expect(flattenSettingsMembers(undefined)).toEqual([]);
  });

  it('builds vault settings defaults and admin role status', () => {
    expect(buildVaultSettings(buildVaultSummary())).toEqual({
      quality: 'high',
      defaultVisibility: 'family',
      safetyWindowMinutes: 60,
    });

    expect(
      buildVaultSettings(
        buildVaultSummary({
          storageQuality: 'original',
          defaultVisibility: 'private',
          safetyWindowMinutes: 15,
        }),
      ),
    ).toEqual({
      quality: 'original',
      defaultVisibility: 'private',
      safetyWindowMinutes: 15,
    });

    expect(getIsAdminInVault({ vaultRole: UserRole.ADMIN, currentUserRole: UserRole.VIEWER })).toBe(
      true,
    );
    expect(getIsAdminInVault({ vaultRole: null, currentUserRole: UserRole.CONTRIBUTOR })).toBe(false);
  });

  it('builds transfer candidates and resolves selected target', () => {
    const candidates = buildTransferCandidates(
      [
        buildMember({
          id: 'contrib-1',
          fullName: 'Ada',
          email: 'ada@example.com',
          role: UserRole.CONTRIBUTOR,
        }),
        buildMember({
          id: 'viewer-1',
          fullName: 'Linus',
          email: 'linus@example.com',
          role: UserRole.VIEWER,
        }),
        buildMember({
          id: 'contrib-2',
          fullName: 'Grace',
          email: 'owner@example.com',
          role: UserRole.CONTRIBUTOR,
        }),
      ],
      'owner@example.com',
    );

    expect(candidates).toEqual([{ id: 'contrib-1', label: 'Ada (ada@example.com)' }]);
    expect(resolveTransferMembershipSelection(candidates, 'contrib-1')).toBe('contrib-1');
    expect(resolveTransferMembershipSelection(candidates, 'missing')).toBe('contrib-1');
    expect(resolveTransferMembershipSelection([], 'missing')).toBe('');
  });

  it('builds settings tab metadata and health summary', () => {
    const items = buildSettingsTabItems({
      profileLabel: 'Identity',
      profileDescription: 'Profile settings',
      vaultLabel: 'Vault Prefs',
      vaultDescription: 'Vault rules',
      appearanceLabel: 'Appearance',
      appearanceDescription: 'Theme setup',
      notificationsLabel: 'Alerts',
      notificationsDescription: 'Notification setup',
    });

    expect(items.map((item) => item.id)).toEqual([
      'profile',
      'vault',
      'appearance',
      'notifications',
    ]);
    expect(items[0].iconKey).toBe('profile');

    expect(getVaultHealthSummary(null)).toBeNull();
    expect(getVaultHealthSummary(buildHealthReport())).toEqual({
      duplicateGroupsCount: 2,
      duplicateItemsCount: 4,
      reclaimableBytes: 2048,
    });
  });
});
