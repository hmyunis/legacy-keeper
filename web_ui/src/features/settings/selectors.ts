import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedMembersResult } from '@/services/membersApi';
import type { FamilyMember, UserRole, VaultHealthReport, VaultSummary } from '@/types';
import { UserRole as UserRoleEnum } from '@/types';
import type {
  SettingsRoleContext,
  SettingsTab,
  SettingsTabCopy,
  SettingsTabItem,
  TransferCandidate,
  VaultSettings,
} from './types';
import { SETTINGS_TABS } from './types';

export const resolveSettingsTab = (value: unknown): SettingsTab =>
  SETTINGS_TABS.includes(value as SettingsTab) ? (value as SettingsTab) : 'profile';

export const withSettingsTabSearch = (
  previous: Record<string, unknown>,
  tab: SettingsTab,
): Record<string, unknown> => ({ ...previous, tab });

export const flattenSettingsMembers = (
  membersData?: InfiniteData<PaginatedMembersResult>,
): FamilyMember[] => {
  if (!membersData?.pages?.length) return [];
  return membersData.pages.flatMap((page) => page.items || []);
};

export const buildVaultSettings = (vault?: VaultSummary): VaultSettings => ({
  quality: (vault?.storageQuality || 'high') as VaultSettings['quality'],
  defaultVisibility: (vault?.defaultVisibility || 'family') as VaultSettings['defaultVisibility'],
  safetyWindowMinutes: Number(vault?.safetyWindowMinutes ?? 60),
});

export const buildTransferCandidates = (
  members: FamilyMember[],
  currentUserEmail?: string,
): TransferCandidate[] => {
  const currentEmail = currentUserEmail?.toLowerCase();
  return members
    .filter(
      (member) =>
        member.email.toLowerCase() !== currentEmail && member.role === UserRoleEnum.CONTRIBUTOR,
    )
    .map((member) => ({
      id: member.id,
      label: `${member.fullName} (${member.email})`,
    }));
};

export const resolveTransferMembershipSelection = (
  candidates: TransferCandidate[],
  selectedMembershipId: string,
): string => {
  if (!candidates.length) return '';
  if (candidates.some((candidate) => candidate.id === selectedMembershipId)) {
    return selectedMembershipId;
  }
  return candidates[0].id;
};

export const getIsAdminInVault = (params: SettingsRoleContext): boolean => {
  const { vaultRole, currentUserRole } = params;
  return (vaultRole || currentUserRole) === UserRoleEnum.ADMIN;
};

export const buildSettingsTabItems = (copy: SettingsTabCopy): SettingsTabItem[] => [
  {
    id: 'profile',
    label: copy.profileLabel,
    description: copy.profileDescription,
    iconKey: 'profile',
  },
  {
    id: 'vault',
    label: copy.vaultLabel,
    description: copy.vaultDescription,
    iconKey: 'vault',
  },
  {
    id: 'appearance',
    label: copy.appearanceLabel,
    description: copy.appearanceDescription,
    iconKey: 'appearance',
  },
  {
    id: 'notifications',
    label: copy.notificationsLabel,
    description: copy.notificationsDescription,
    iconKey: 'notifications',
  },
];

export const getVaultHealthSummary = (
  report?: VaultHealthReport | null,
): {
  duplicateGroupsCount: number;
  duplicateItemsCount: number;
  reclaimableBytes: number;
} | null => {
  if (!report) return null;
  return {
    duplicateGroupsCount: report.duplicateGroupsCount,
    duplicateItemsCount: report.duplicateItemsCount,
    reclaimableBytes: report.reclaimableBytes,
  };
};
