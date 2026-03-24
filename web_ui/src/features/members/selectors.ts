import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedMembersResult, PaginatedShareableInvitesResult } from '@/services/membersApi';
import { MemberStatus, UserRole, type FamilyMember } from '@/types';
import type { MemberRoleFilter, MembersStats } from './types';

export const resolveRoleFilter = (value: unknown): MemberRoleFilter =>
  value === UserRole.CONTRIBUTOR || value === UserRole.VIEWER ? value : 'ALL';

export const flattenMembers = (membersData?: InfiniteData<PaginatedMembersResult>): FamilyMember[] => {
  if (!membersData?.pages?.length) return [];
  return membersData.pages.flatMap((page) => page.items || []);
};

export const getMembersTotalCount = (
  membersData?: InfiniteData<PaginatedMembersResult>,
): number => {
  if (!membersData?.pages?.length) return 0;
  return membersData.pages[0]?.totalCount || 0;
};

export const getMembersStats = (members: FamilyMember[], total: number): MembersStats => {
  if (!members.length) {
    return { total, active: 0, pending: 0, contributors: 0 };
  }

  return {
    total,
    active: members.filter((member) => member.status === MemberStatus.ACTIVE).length,
    pending: members.filter((member) => member.status === MemberStatus.PENDING).length,
    contributors: members.filter((member) => member.role === UserRole.CONTRIBUTOR).length,
  };
};

export const withMembersSearchQuery = (params: {
  previous: Record<string, unknown>;
  value: string;
  roleFilter: MemberRoleFilter;
}): Record<string, unknown> => {
  const { previous, value, roleFilter } = params;
  const next: Record<string, unknown> = { ...previous, role: roleFilter };
  if (value.trim()) next.q = value;
  else delete next.q;
  return next;
};

export const withMembersRoleFilter = (
  previous: Record<string, unknown>,
  roleFilter: MemberRoleFilter,
): Record<string, unknown> => ({ ...previous, role: roleFilter });

export const getRoleBadgeClass = (role: UserRole): string => {
  if (role === UserRole.ADMIN) {
    return 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30';
  }
  if (role === UserRole.CONTRIBUTOR) {
    return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
};

const formatDate = (value: string, mode: 'date' | 'dateTime'): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return mode === 'date' ? parsed.toLocaleDateString() : parsed.toLocaleString();
};

export const formatJoinedDate = (value: string): string => formatDate(value, 'date');

export const formatDateTime = (value: string): string => formatDate(value, 'dateTime');

export const getShareablePaginationState = (params: {
  page: number;
  data?: PaginatedShareableInvitesResult;
}) => {
  const { page, data } = params;
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;
  const hasNextPage = data?.hasNextPage || false;
  const hasPreviousPage = data?.hasPreviousPage || page > 1;
  const pageSize = data?.pageSize || 10;

  return {
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    pageSize,
  };
};
