import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { PaginatedMembersResult, PaginatedShareableInvitesResult } from '@/services/membersApi';
import {
  MemberStatus,
  UserRole,
  type FamilyMember,
} from '@/types';
import {
  flattenMembers,
  formatDateTime,
  formatJoinedDate,
  getMembersStats,
  getMembersTotalCount,
  getRoleBadgeClass,
  getShareablePaginationState,
  resolveRoleFilter,
  withMembersRoleFilter,
  withMembersSearchQuery,
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

describe('members selectors', () => {
  it('resolves role filter from search values', () => {
    expect(resolveRoleFilter(UserRole.CONTRIBUTOR)).toBe(UserRole.CONTRIBUTOR);
    expect(resolveRoleFilter(UserRole.VIEWER)).toBe(UserRole.VIEWER);
    expect(resolveRoleFilter('anything')).toBe('ALL');
  });

  it('flattens paginated members and reads total count', () => {
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

    expect(flattenMembers(data).map((item) => item.id)).toEqual(['1', '2', '3']);
    expect(getMembersTotalCount(data)).toBe(3);
  });

  it('summarizes member stats', () => {
    const stats = getMembersStats(
      [
        buildMember({ id: '1', status: MemberStatus.ACTIVE, role: UserRole.CONTRIBUTOR }),
        buildMember({ id: '2', status: MemberStatus.PENDING, role: UserRole.VIEWER }),
      ],
      2,
    );

    expect(stats).toEqual({
      total: 2,
      active: 1,
      pending: 1,
      contributors: 1,
    });
  });

  it('updates search params for query and role filter', () => {
    expect(
      withMembersSearchQuery({
        previous: { role: 'ALL', q: 'old' },
        value: '  ',
        roleFilter: 'ALL',
      }),
    ).toEqual({ role: 'ALL' });

    expect(
      withMembersSearchQuery({
        previous: {},
        value: 'Ada',
        roleFilter: UserRole.CONTRIBUTOR,
      }),
    ).toEqual({ role: UserRole.CONTRIBUTOR, q: 'Ada' });

    expect(withMembersRoleFilter({ q: 'Ada' }, UserRole.VIEWER)).toEqual({
      q: 'Ada',
      role: UserRole.VIEWER,
    });
  });

  it('formats date labels and role badge classes', () => {
    expect(formatJoinedDate('2025-02-03T00:00:00.000Z')).not.toBe('2025-02-03T00:00:00.000Z');
    expect(formatDateTime('invalid')).toBe('invalid');
    expect(getRoleBadgeClass(UserRole.ADMIN)).toContain('text-primary');
    expect(getRoleBadgeClass(UserRole.CONTRIBUTOR)).toContain('text-purple');
    expect(getRoleBadgeClass(UserRole.VIEWER)).toContain('text-slate');
  });

  it('reads shareable pagination state', () => {
    const data: PaginatedShareableInvitesResult = {
      items: [],
      totalCount: 24,
      hasNextPage: true,
      hasPreviousPage: true,
      currentPage: 2,
      totalPages: 3,
      pageSize: 10,
    };

    expect(getShareablePaginationState({ page: 2, data })).toEqual({
      totalCount: 24,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
      pageSize: 10,
    });
  });
});
