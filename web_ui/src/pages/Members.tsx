import React, { useState, useMemo, useEffect } from 'react';
import { Users, UserPlus, Search, Shield, Trash2, Clock, UserCheck, Link2, Copy, Ban, Trash } from 'lucide-react';
import { FamilyMember, UserRole, MemberStatus } from '../types';
import InviteModal from '../components/members/InviteModal';
import { CardSkeleton, Skeleton } from '../components/Skeleton';
import {
  useMembers,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
  useShareableInvites,
  useCreateShareableInvite,
  useRevokeShareableInvite,
  useDeleteShareableInvite,
} from '../hooks/useMembers';
import { useTranslation } from '../i18n/LanguageContext';
import { InfiniteScroll, Pagination } from '../components/ui/Pagination';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import ConfirmModal from '../components/ui/ConfirmModal';
import DatePicker from '../components/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/Tooltip';
import { getApiErrorMessage } from '../services/httpError';
import { toast } from 'sonner';
import type { ShareableInvite } from '../services/membersApi';

type MembersConfirmState =
  | { kind: 'remove'; member: FamilyMember; title: string; message: string; confirmLabel: string }
  | { kind: 'role'; member: FamilyMember; role: UserRole; title: string; message: string; confirmLabel: string }
  | { kind: 'revokeLink'; link: ShareableInvite; title: string; message: string; confirmLabel: string }
  | { kind: 'deleteLink'; link: ShareableInvite; title: string; message: string; confirmLabel: string }
  | { kind: 'generateLink'; role: UserRole; expiresAt: Date; title: string; message: string; confirmLabel: string };

const SHAREABLE_PAGE_SIZE = 10;

const Members: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const searchParams = useSearch({ strict: false }) as { q?: string; role?: string };
  const searchQuery = searchParams.q || '';
  const debouncedSearch = useDebouncedValue(searchQuery, { delay: 400 });
  const normalizedSearch = debouncedSearch.trim();
  const roleFilter: UserRole | 'ALL' =
    searchParams.role === UserRole.CONTRIBUTOR ||
    searchParams.role === UserRole.VIEWER
      ? searchParams.role
      : 'ALL';
  const [inviteState, setInviteState] = useState({ open: false, email: '', role: UserRole.VIEWER });
  const [confirmState, setConfirmState] = useState<MembersConfirmState | null>(null);
  const [shareableRole, setShareableRole] = useState<UserRole>(UserRole.VIEWER);
  const [shareableExpiry, setShareableExpiry] = useState<Date | undefined>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [shareablePage, setShareablePage] = useState(1);
  const [latestGeneratedLink, setLatestGeneratedLink] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);


  const { 
    data: membersData, 
    isLoading, 
    isError: isMembersError,
    error: membersError,
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useMembers({ 
    search: normalizedSearch || undefined,
    role: roleFilter !== 'ALL' ? roleFilter : undefined 
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

  const allMembers = useMemo(() => {
    if (!membersData) return [];
    return membersData.pages.flatMap(page => page.items);
  }, [membersData]);

  const totalCount = useMemo(() => {
    if (!membersData) return 0;
    return membersData.pages[0]?.totalCount || 0;
  }, [membersData]);

  const stats = useMemo(() => { 
    if (!allMembers.length) return { total: totalCount, active: 0, pending: 0, contributors: 0 }; 
    return { 
      total: totalCount, 
      active: allMembers.filter(m => m.status === MemberStatus.ACTIVE).length, 
      pending: allMembers.filter(m => m.status === MemberStatus.PENDING).length, 
      contributors: allMembers.filter(m => m.role === UserRole.CONTRIBUTOR).length 
    }; 
  }, [allMembers, totalCount]);

  const getRoleBadge = (role: UserRole) => {
    if (role === UserRole.ADMIN) return 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30';
    if (role === UserRole.CONTRIBUTOR) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800';
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ 
      email: inviteState.email, 
      role: inviteState.role 
    }, {
      onSuccess: () => setInviteState(s => ({ ...s, open: false, email: '' }))
    });
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
      toast.success('Copied link to clipboard');
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      toast.error('Unable to copy link', { description: 'Please copy it manually.' });
    }
  };

  const handleGenerateShareableLink = (event: React.FormEvent) => {
    event.preventDefault();
    if (!shareableExpiry) {
      toast.error('Please select an expiry date');
      return;
    }

    const expiresAtDate = new Date(shareableExpiry);
    expiresAtDate.setHours(23, 59, 59, 999);
    if (Number.isNaN(expiresAtDate.getTime())) {
      toast.error('Invalid expiry date');
      return;
    }
    if (expiresAtDate.getTime() <= Date.now()) {
      toast.error('Expiry must be in the future');
      return;
    }

    setConfirmState({
      kind: 'generateLink',
      role: shareableRole,
      expiresAt: expiresAtDate,
      title: 'Generate Shareable Link?',
      message: `This will create a shareable invite link with ${shareableRole} role that expires on ${expiresAtDate.toLocaleDateString()}.`,
      confirmLabel: 'Generate Link',
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
          if (link) {
            setLatestGeneratedLink(link);
          }
        },
      },
    );
  };

  const handleRevokeLink = (link: ShareableInvite) => {
    setConfirmState({
      kind: 'revokeLink',
      link,
      title: 'Revoke Shareable Link?',
      message: 'People will no longer be able to use this link.',
      confirmLabel: 'Revoke Link',
    });
  };

  const handleDeleteLink = (link: ShareableInvite) => {
    setConfirmState({
      kind: 'deleteLink',
      link,
      title: 'Delete Shareable Link?',
      message: 'This link record will be permanently removed.',
      confirmLabel: 'Delete Link',
    });
  };

  const handleRemoveMember = (member: FamilyMember) => {
    const isPending = member.status === MemberStatus.PENDING;
    setConfirmState({
      kind: 'remove',
      member,
      title: isPending ? 'Revoke Pending Invite?' : 'Remove Member?',
      message: isPending
        ? `Revoke pending invite for ${member.email}?`
        : `Remove ${member.fullName} from this vault?`,
      confirmLabel: isPending ? 'Revoke Invite' : 'Remove Member',
    });
  };

  const handleRoleChange = (member: FamilyMember, role: UserRole) => {
    if (member.role === role) return;

    const isSelf = member.email.toLowerCase() === currentUser?.email?.toLowerCase();
    if (isSelf) {
      return;
    }

    const isPending = member.status === MemberStatus.PENDING;
    setConfirmState({
      kind: 'role',
      member,
      role,
      title: 'Confirm Role Change',
      message: isPending
        ? `Update pending invite role for ${member.email} to ${role}?`
        : `Change ${member.fullName}'s role to ${role}?`,
      confirmLabel: 'Update Role',
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

  const formatJoinedDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
  };

  const formatDateTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  const shareableLinks = shareableLinksQuery.data?.items || [];
  const shareableTotalCount = shareableLinksQuery.data?.totalCount || 0;
  const shareableTotalPages = shareableLinksQuery.data?.totalPages || 1;
  const shareableHasNextPage = shareableLinksQuery.data?.hasNextPage || false;
  const shareableHasPreviousPage = shareableLinksQuery.data?.hasPreviousPage || shareablePage > 1;

  useEffect(() => {
    if (shareablePage > shareableTotalPages) {
      setShareablePage(shareableTotalPages);
    }
  }, [shareablePage, shareableTotalPages]);

  return (
    <TooltipProvider>
      <div className="space-y-8 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">{t.members.title}</h1><p className="text-slate-500 dark:text-slate-400 text-sm">{t.members.subtitle}</p></div>
        <button onClick={() => setInviteState(s => ({ ...s, open: true }))} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:opacity-90 glow-primary active:scale-95 shadow-lg shadow-primary/20"><UserPlus size={18} />{t.members.invite}</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading 
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : [
            { label: t.members.stats.total, value: stats.total, icon: <Users className="text-primary" />, color: 'bg-primary/10' },
            { label: t.members.stats.active, value: stats.active, icon: <UserCheck className="text-emerald-600 dark:text-emerald-400" />, color: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: t.members.stats.pending, value: stats.pending, icon: <Clock className="text-orange-600 dark:text-orange-400" />, color: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: t.members.stats.contributors, value: stats.contributors, icon: <Shield className="text-purple-600 dark:text-purple-400" />, color: 'bg-purple-50 dark:bg-purple-900/20' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 glow-card">
              <div className={`p-3 rounded-2xl ${s.color}`}>{(s.icon as any)}</div>
              <div><p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p></div>
            </div>
          ))
        }
      </div>

      <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col glow-card">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.members.searchPlaceholder} 
              value={searchQuery} 
              onChange={(e) =>
                navigate({
                  to: '/members',
                  search: (prev: Record<string, unknown>) => {
                    const next = { ...prev, role: roleFilter };
                    const value = e.target.value;
                    if (value.trim()) next.q = value;
                    else delete next.q;
                    return next;
                  },
                } as any)
              } 
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-200" 
            />
          </div>
          <div className="flex gap-2">
            <div className="flex p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              {(['ALL', UserRole.CONTRIBUTOR, UserRole.VIEWER] as const).map((r) => (
                <button 
                  key={r} 
                  onClick={() =>
                    navigate({
                      to: '/members',
                      search: (prev: Record<string, unknown>) => ({ ...prev, role: r }),
                    } as any)
                  } 
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${roleFilter === r ? 'bg-primary text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <InfiniteScroll
            hasNextPage={hasNextPage || false}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            loader={
              <tr>
                <td colSpan={5} className="px-8 py-4">
                  <div className="flex justify-center">
                    <Skeleton className="h-8 w-32" />
                  </div>
                </td>
              </tr>
            }
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 bg-slate-50/30 dark:bg-slate-950/20">
                  <th className="px-8 py-4">{t.members.table.identity}</th>
                  <th className="px-8 py-4">{t.members.table.clearance}</th>
                  <th className="px-8 py-4">{t.members.table.status}</th>
                  <th className="px-8 py-4">{t.members.table.date}</th>
                  <th className="px-8 py-4 text-right">{t.members.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-8 py-5"><Skeleton className="h-10 w-40" /></td>
                      <td className="px-8 py-5"><Skeleton className="h-6 w-20" /></td>
                      <td className="px-8 py-5"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-8 py-5"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-8 py-5"><Skeleton className="h-6 w-6 ml-auto" /></td>
                    </tr>
                  ))
                ) : isMembersError ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-rose-500 text-xs font-semibold">
                      {getApiErrorMessage(membersError, 'Failed to load members.')}
                    </td>
                  </tr>
                ) : allMembers.map((m) => (
	                  <tr key={m.id} className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <img src={m.profilePhoto} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" alt="" />
                        <div><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{m.fullName}</p><p className="text-[11px] text-slate-400 dark:text-slate-500">{m.email}</p></div>
                      </div>
                    </td>
	                    <td className="px-8 py-5">
	                      <div className="flex items-center gap-2">
	                        <Select
	                          value={m.role}
	                          onValueChange={(value) => {
	                            const isDisabled =
	                              updateRoleMutation.isPending ||
	                              m.email.toLowerCase() === currentUser?.email?.toLowerCase();
	                            if (isDisabled) return;
	                            handleRoleChange(m, value as UserRole);
	                          }}
	                          className={
	                            updateRoleMutation.isPending ||
	                            m.email.toLowerCase() === currentUser?.email?.toLowerCase()
	                              ? 'pointer-events-none opacity-50'
	                              : ''
	                          }
	                        >
	                          <SelectTrigger className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase bg-transparent ${getRoleBadge(m.role)}`}>
	                            <SelectValue placeholder="Role" />
	                          </SelectTrigger>
	                          <SelectContent>
	                            <SelectItem value={UserRole.CONTRIBUTOR}>CONTRIBUTOR</SelectItem>
	                            <SelectItem value={UserRole.VIEWER}>VIEWER</SelectItem>
	                          </SelectContent>
	                        </Select>
	                      </div>
	                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${m.status === MemberStatus.ACTIVE ? 'bg-emerald-500' : 'bg-orange-400'}`}></div>
                        <span className={`text-[10px] font-bold uppercase ${m.status === MemberStatus.ACTIVE ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500 dark:text-orange-400'}`}>{m.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5"><span className="text-xs text-slate-500 dark:text-slate-400">{formatJoinedDate(m.joinedDate)}</span></td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all disabled:opacity-40"
                              disabled={removeMutation.isPending || m.email.toLowerCase() === currentUser?.email?.toLowerCase()}
                              onClick={() => handleRemoveMember(m)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{m.status === MemberStatus.PENDING ? 'Revoke invite' : 'Remove member'}</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && allMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 uppercase text-[10px] font-bold tracking-widest">No matching members found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </InfiniteScroll>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col glow-card">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={16} className="text-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Shareable Invite Links</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate reusable links with role and expiry. Recipients will follow the same join flow.
          </p>
        </div>

	        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
	          <form onSubmit={handleGenerateShareableLink} className="grid grid-cols-1 md:grid-cols-4 gap-3">
	            <Select value={shareableRole} onValueChange={(value) => setShareableRole(value as UserRole)} className="w-full">
	              <SelectTrigger className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20">
	                <SelectValue placeholder="Select role" />
	              </SelectTrigger>
	              <SelectContent>
	                <SelectItem value={UserRole.CONTRIBUTOR}>CONTRIBUTOR</SelectItem>
	                <SelectItem value={UserRole.VIEWER}>VIEWER</SelectItem>
	              </SelectContent>
	            </Select>
	            <DatePicker
	              date={shareableExpiry}
	              onChange={setShareableExpiry}
	              placeholder="Select expiry date"
	              className="w-full"
	            />
	            <button
	              type="submit"
              disabled={createShareableMutation.isPending}
              className="md:col-span-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 glow-primary active:scale-[0.99] transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              <UserPlus size={14} />
              {createShareableMutation.isPending ? 'Generating...' : 'Generate Shareable Link'}
            </button>
          </form>

          {latestGeneratedLink && (
            <div className="mt-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
              <input
                readOnly
                value={latestGeneratedLink}
                className="flex-1 bg-transparent text-xs text-slate-600 dark:text-slate-300 outline-none"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(latestGeneratedLink, `latest:${latestGeneratedLink}`)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
                  >
                    <Copy size={12} />
                    {copiedKey === `latest:${latestGeneratedLink}` ? 'Copied' : 'Copy'}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy link</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 bg-slate-50/30 dark:bg-slate-950/20">
                <th className="px-6 py-4 w-16">#</th>
                <th className="px-6 py-4">Link</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Expires</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shareableLinksQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-6 py-4"><Skeleton className="h-6 w-8" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-44" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-28" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-10" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : shareableLinksQuery.isError ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-rose-500 text-xs font-semibold">
                    {getApiErrorMessage(shareableLinksQuery.error, 'Failed to load shareable links.')}
                  </td>
                </tr>
              ) : shareableLinks.length ? (
                shareableLinks.map((link, idx) => {
                  const statusLabel = link.isRevoked ? 'Revoked' : link.isExpired ? 'Expired' : 'Active';
                  const statusClass = link.isRevoked
                    ? 'text-rose-600 dark:text-rose-400'
                    : link.isExpired
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-emerald-600 dark:text-emerald-400';
                  const rowNumber =
                    (shareablePage - 1) * (shareableLinksQuery.data?.pageSize || SHAREABLE_PAGE_SIZE) + idx + 1;
                  return (
                    <tr key={link.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">{rowNumber}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-70" title={link.link}>{link.link}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(link.link, `row:${link.id}`)}
                                className="p-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 hover:text-primary hover:border-primary transition-all"
                              >
                                <Copy size={12} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Copy link</TooltipContent>
                          </Tooltip>
                          {copiedKey === `row:${link.id}` && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-200">{link.role}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(link.expiresAt)}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-200">{link.joinedCount}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${statusClass}`}>{statusLabel}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleRevokeLink(link)}
                                disabled={link.isRevoked || revokeShareableMutation.isPending}
                                className="p-2 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-all disabled:opacity-40"
                              >
                                <Ban size={14} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{link.isRevoked ? 'Already revoked' : 'Revoke link'}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(link)}
                                disabled={deleteShareableMutation.isPending}
                                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all disabled:opacity-40"
                              >
                                <Trash size={14} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Delete link</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 uppercase text-[10px] font-bold tracking-widest">
                    No shareable links generated yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6">
          <Pagination
            hasNextPage={shareableHasNextPage}
            hasPreviousPage={shareableHasPreviousPage}
            isFetchingNextPage={shareableLinksQuery.isFetching}
            isFetchingPreviousPage={shareableLinksQuery.isFetching}
            onNextPage={() => setShareablePage((prev) => prev + 1)}
            onPreviousPage={() => setShareablePage((prev) => Math.max(1, prev - 1))}
            currentPage={shareablePage}
            totalPages={shareableTotalPages}
            totalCount={shareableTotalCount}
            pageSize={shareableLinksQuery.data?.pageSize || SHAREABLE_PAGE_SIZE}
          />
        </div>
      </div>

      {inviteState.open && (
        <InviteModal 
          email={inviteState.email} 
          role={inviteState.role} 
          isPending={inviteMutation.isPending} 
          onEmailChange={e => setInviteState(s => ({ ...s, email: e }))} 
          onRoleChange={r => setInviteState(s => ({ ...s, role: r }))} 
          onClose={() => setInviteState(s => ({ ...s, open: false }))} 
          onSubmit={handleInviteSubmit} 
        />
      )}
      <ConfirmModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
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
