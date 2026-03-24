import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';
import InviteModal from '@/components/members/InviteModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { MembersHeader } from '@/features/members/components/MembersHeader';
import { MembersStatsGrid } from '@/features/members/components/MembersStatsGrid';
import { MembersTableSection } from '@/features/members/components/MembersTableSection';
import { ShareableInvitesSection } from '@/features/members/components/ShareableInvitesSection';
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
} from '@/features/members/selectors';
import type { MemberRoleFilter, MembersConfirmState } from '@/features/members/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useCreateShareableInvite,
  useDeleteShareableInvite,
  useInviteMember,
  useMembers,
  useRemoveMember,
  useRevokeShareableInvite,
  useShareableInvites,
  useUpdateMemberRole,
} from '@/hooks/useMembers';
import { useTranslation } from '@/i18n/LanguageContext';
import { getApiErrorMessage } from '@/services/httpError';
import type { ShareableInvite } from '@/services/membersApi';
import { useAuthStore } from '@/stores/authStore';
import { MemberStatus, UserRole, type FamilyMember } from '@/types';

const SHAREABLE_PAGE_SIZE = 10;

const Members = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const searchParams = useSearch({ strict: false }) as { q?: string; role?: string };
  const searchQuery = searchParams.q || '';
  const debouncedSearch = useDebouncedValue(searchQuery, { delay: 400 });
  const normalizedSearch = debouncedSearch.trim();
  const roleFilter = resolveRoleFilter(searchParams.role);

  const [inviteState, setInviteState] = useState({
    open: false,
    email: '',
    role: UserRole.VIEWER,
  });
  const [confirmState, setConfirmState] = useState<MembersConfirmState | null>(null);
  const [shareableRole, setShareableRole] = useState<UserRole>(UserRole.VIEWER);
  const [shareableExpiry, setShareableExpiry] = useState<Date | undefined>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const [shareablePage, setShareablePage] = useState(1);
  const [latestGeneratedLink, setLatestGeneratedLink] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const formatConfirmMessage = (template: string, values: Record<string, string>) =>
    Object.entries(values).reduce(
      (message, [key, value]) => message.replace(`{${key}}`, value),
      template,
    );

  const {
    data: membersData,
    isLoading,
    isError: isMembersError,
    error: membersError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMembers({
    search: normalizedSearch || undefined,
    role: roleFilter !== 'ALL' ? roleFilter : undefined,
  });

  const inviteMutation = useInviteMember();
  const removeMutation = useRemoveMember();
  const updateRoleMutation = useUpdateMemberRole();
  const shareableLinksQuery = useShareableInvites({
    page: shareablePage,
    pageSize: SHAREABLE_PAGE_SIZE,
  });
  const createShareableMutation = useCreateShareableInvite();
  const revokeShareableMutation = useRevokeShareableInvite();
  const deleteShareableMutation = useDeleteShareableInvite();

  const allMembers = useMemo(() => flattenMembers(membersData), [membersData]);
  const totalCount = useMemo(() => getMembersTotalCount(membersData), [membersData]);
  const stats = useMemo(() => getMembersStats(allMembers, totalCount), [allMembers, totalCount]);

  const handleSearchQueryChange = (value: string) => {
    navigate({
      to: '/members',
      search: (previous: Record<string, unknown>) =>
        withMembersSearchQuery({
          previous,
          value,
          roleFilter,
        }),
    } as any);
  };

  const handleRoleFilterChange = (nextRole: MemberRoleFilter) => {
    navigate({
      to: '/members',
      search: (previous: Record<string, unknown>) => withMembersRoleFilter(previous, nextRole),
    } as any);
  };

  const handleInviteSubmit = (event: FormEvent) => {
    event.preventDefault();
    inviteMutation.mutate(
      {
        email: inviteState.email,
        role: inviteState.role,
      },
      {
        onSuccess: () => setInviteState((state) => ({ ...state, open: false, email: '' })),
      },
    );
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedKey(key);
      toast.success(t.members.feedback.copiedLink);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      toast.error(t.members.feedback.copyFailed, {
        description: t.members.feedback.copyManually,
      });
    }
  };

  const handleGenerateShareableLink = (event: FormEvent) => {
    event.preventDefault();
    if (!shareableExpiry) {
      toast.error(t.members.feedback.selectExpiryDate);
      return;
    }

    const expiresAtDate = new Date(shareableExpiry);
    expiresAtDate.setHours(23, 59, 59, 999);
    if (Number.isNaN(expiresAtDate.getTime())) {
      toast.error(t.members.feedback.invalidExpiryDate);
      return;
    }
    if (expiresAtDate.getTime() <= Date.now()) {
      toast.error(t.members.feedback.expiryMustBeFuture);
      return;
    }

    setConfirmState({
      kind: 'generateLink',
      role: shareableRole,
      expiresAt: expiresAtDate,
      title: t.members.confirm.generateLinkTitle,
      message: formatConfirmMessage(t.members.confirm.generateLinkMessageTemplate, {
        role: shareableRole,
        date: expiresAtDate.toLocaleDateString(),
      }),
      confirmLabel: t.members.confirm.generateLinkConfirmLabel,
    });
  };

  const executeGenerateLink = () => {
    if (!confirmState || confirmState.kind !== 'generateLink') return;

    const { role, expiresAt } = confirmState;
    setConfirmState(null);
    setShareablePage(1);
    createShareableMutation.mutate(
      {
        role,
        expiresAt: expiresAt.toISOString(),
      },
      {
        onSuccess: (payload) => {
          const link = payload.invite?.link;
          if (link) setLatestGeneratedLink(link);
        },
      },
    );
  };

  const handleRevokeLink = (link: ShareableInvite) => {
    setConfirmState({
      kind: 'revokeLink',
      link,
      title: t.members.confirm.revokeLinkTitle,
      message: t.members.confirm.revokeLinkMessage,
      confirmLabel: t.members.confirm.revokeLinkConfirmLabel,
    });
  };

  const handleDeleteLink = (link: ShareableInvite) => {
    setConfirmState({
      kind: 'deleteLink',
      link,
      title: t.members.confirm.deleteLinkTitle,
      message: t.members.confirm.deleteLinkMessage,
      confirmLabel: t.members.confirm.deleteLinkConfirmLabel,
    });
  };

  const handleRemoveMember = (member: FamilyMember) => {
    const isPending = member.status === MemberStatus.PENDING;
    setConfirmState({
      kind: 'remove',
      member,
      title: isPending ? t.members.confirm.removePendingTitle : t.members.confirm.removeMemberTitle,
      message: isPending
        ? formatConfirmMessage(t.members.confirm.removePendingMessageTemplate, {
            email: member.email,
          })
        : formatConfirmMessage(t.members.confirm.removeMemberMessageTemplate, {
            name: member.fullName,
          }),
      confirmLabel: isPending
        ? t.members.confirm.removePendingConfirmLabel
        : t.members.confirm.removeMemberConfirmLabel,
    });
  };

  const handleRoleChange = (member: FamilyMember, role: UserRole) => {
    if (member.role === role) return;
    const isSelf = member.email.toLowerCase() === currentUser?.email?.toLowerCase();
    if (isSelf) return;

    const isPending = member.status === MemberStatus.PENDING;
    setConfirmState({
      kind: 'role',
      member,
      role,
      title: t.members.confirm.roleChangeTitle,
      message: isPending
        ? formatConfirmMessage(t.members.confirm.roleChangePendingMessageTemplate, {
            email: member.email,
            role,
          })
        : formatConfirmMessage(t.members.confirm.roleChangeMemberMessageTemplate, {
            name: member.fullName,
            role,
          }),
      confirmLabel: t.members.confirm.roleChangeConfirmLabel,
    });
  };

  const handleConfirmAction = () => {
    if (!confirmState) return;

    if (confirmState.kind === 'remove') {
      removeMutation.mutate(confirmState.member.id);
      setConfirmState(null);
      return;
    }

    if (confirmState.kind === 'revokeLink') {
      revokeShareableMutation.mutate(confirmState.link.id);
      setConfirmState(null);
      return;
    }

    if (confirmState.kind === 'deleteLink') {
      deleteShareableMutation.mutate(confirmState.link.id, {
        onSuccess: () => {
          if (shareableLinks.length <= 1 && shareablePage > 1) {
            setShareablePage((prev) => Math.max(1, prev - 1));
          }
        },
      });
      setConfirmState(null);
      return;
    }

    if (confirmState.kind === 'generateLink') {
      executeGenerateLink();
      return;
    }

    updateRoleMutation.mutate({
      membershipId: confirmState.member.id,
      role: confirmState.role,
    });
    setConfirmState(null);
  };

  const shareableLinks = shareableLinksQuery.data?.items || [];
  const shareablePagination = useMemo(
    () => getShareablePaginationState({ page: shareablePage, data: shareableLinksQuery.data }),
    [shareableLinksQuery.data, shareablePage],
  );

  useEffect(() => {
    if (shareablePage > shareablePagination.totalPages) {
      setShareablePage(shareablePagination.totalPages);
    }
  }, [shareablePage, shareablePagination.totalPages]);

  const membersErrorMessage = getApiErrorMessage(membersError, t.members.feedback.membersLoadFailed);
  const shareableErrorMessage = getApiErrorMessage(
    shareableLinksQuery.error,
    t.members.feedback.shareableLoadFailed,
  );

  return (
    <TooltipProvider>
      <div className="space-y-8 animate-in fade-in pb-20">
        <MembersHeader
          title={t.members.title}
          subtitle={t.members.subtitle}
          inviteLabel={t.members.invite}
          onInvite={() => setInviteState((state) => ({ ...state, open: true }))}
        />

        <MembersStatsGrid
          isLoading={isLoading}
          stats={stats}
          labels={{
            total: t.members.stats.total,
            active: t.members.stats.active,
            pending: t.members.stats.pending,
            contributors: t.members.stats.contributors,
          }}
        />

        <MembersTableSection
          searchQuery={searchQuery}
          roleFilter={roleFilter}
          onSearchQueryChange={handleSearchQueryChange}
          onRoleFilterChange={handleRoleFilterChange}
          isLoading={isLoading}
          isError={isMembersError}
          errorMessage={membersErrorMessage}
          members={allMembers}
          hasNextPage={hasNextPage || false}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => {
            void fetchNextPage();
          }}
          currentUserEmail={currentUser?.email}
          isUpdatingRole={updateRoleMutation.isPending}
          isRemovingMember={removeMutation.isPending}
          onRoleChange={handleRoleChange}
          onRemoveMember={handleRemoveMember}
          formatJoinedDate={formatJoinedDate}
          getRoleBadgeClass={getRoleBadgeClass}
          text={{
            searchPlaceholder: t.members.searchPlaceholder,
            identityHeader: t.members.table.identity,
            clearanceHeader: t.members.table.clearance,
            statusHeader: t.members.table.status,
            dateHeader: t.members.table.date,
            actionsHeader: t.members.table.actions,
            rolePlaceholder: t.members.role.placeholder,
            roleContributor: t.members.role.contributor,
            roleViewer: t.members.role.viewer,
            revokeInviteTooltip: t.members.shareable.tooltips.revokeInvite,
            removeMemberTooltip: t.members.shareable.tooltips.removeMember,
            emptyLabel: t.members.shareable.noMatchingMembers,
          }}
        />

        <ShareableInvitesSection
          role={shareableRole}
          expiry={shareableExpiry}
          onRoleChange={setShareableRole}
          onExpiryChange={setShareableExpiry}
          onGenerate={handleGenerateShareableLink}
          isGenerating={createShareableMutation.isPending}
          latestGeneratedLink={latestGeneratedLink}
          copiedKey={copiedKey}
          onCopy={copyToClipboard}
          isLoading={shareableLinksQuery.isLoading}
          isError={shareableLinksQuery.isError}
          errorMessage={shareableErrorMessage}
          links={shareableLinks}
          page={shareablePage}
          totalCount={shareablePagination.totalCount}
          totalPages={shareablePagination.totalPages}
          pageSize={shareablePagination.pageSize}
          hasNextPage={shareablePagination.hasNextPage}
          hasPreviousPage={shareablePagination.hasPreviousPage}
          isFetching={shareableLinksQuery.isFetching}
          onNextPage={() => setShareablePage((prev) => prev + 1)}
          onPreviousPage={() => setShareablePage((prev) => Math.max(1, prev - 1))}
          onRevokeLink={handleRevokeLink}
          onDeleteLink={handleDeleteLink}
          isRevoking={revokeShareableMutation.isPending}
          isDeleting={deleteShareableMutation.isPending}
          formatDateTime={formatDateTime}
          text={{
            title: t.members.shareable.title,
            subtitle: t.members.shareable.subtitle,
            selectRole: t.members.role.selectRole,
            roleContributor: t.members.role.contributor,
            roleViewer: t.members.role.viewer,
            selectExpiryDate: t.members.shareable.selectExpiryDate,
            generating: t.members.shareable.generating,
            generate: t.members.shareable.generate,
            copy: t.members.feedback.copy,
            copied: t.members.feedback.copied,
            tableLink: t.members.shareable.table.link,
            tableRole: t.members.shareable.table.role,
            tableExpires: t.members.shareable.table.expires,
            tableJoined: t.members.shareable.table.joined,
            tableStatus: t.members.shareable.table.status,
            tableActions: t.members.shareable.table.actions,
            tooltipCopy: t.members.shareable.tooltips.copyLink,
            tooltipDelete: t.members.shareable.tooltips.deleteLink,
            tooltipRevoke: t.members.shareable.tooltips.revokeLink,
            tooltipAlreadyRevoked: t.members.shareable.tooltips.alreadyRevoked,
            statusRevoked: t.members.shareable.status.revoked,
            statusExpired: t.members.shareable.status.expired,
            statusActive: t.members.shareable.status.active,
            empty: t.members.shareable.empty,
          }}
        />

        {inviteState.open && (
          <InviteModal
            email={inviteState.email}
            role={inviteState.role}
            isPending={inviteMutation.isPending}
            onEmailChange={(email) => setInviteState((state) => ({ ...state, email }))}
            onRoleChange={(role) => setInviteState((state) => ({ ...state, role }))}
            onClose={() => setInviteState((state) => ({ ...state, open: false }))}
            onSubmit={handleInviteSubmit}
          />
        )}

        <ConfirmModal
          isOpen={Boolean(confirmState)}
          title={confirmState?.title || ''}
          message={confirmState?.message || ''}
          confirmLabel={confirmState?.confirmLabel || t.common.actions.confirm}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmState(null)}
          isPending={
            removeMutation.isPending ||
            updateRoleMutation.isPending ||
            revokeShareableMutation.isPending ||
            deleteShareableMutation.isPending ||
            createShareableMutation.isPending
          }
        />
      </div>
    </TooltipProvider>
  );
};

export default Members;
