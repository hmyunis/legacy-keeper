import type { FC } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { InfiniteScroll } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/Skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import type { MemberRoleFilter } from '@/features/members/types';
import { MemberStatus, type FamilyMember, UserRole } from '@/types';

interface MembersTableSectionText {
  searchPlaceholder: string;
  identityHeader: string;
  clearanceHeader: string;
  statusHeader: string;
  dateHeader: string;
  actionsHeader: string;
  rolePlaceholder: string;
  roleContributor: string;
  roleViewer: string;
  revokeInviteTooltip: string;
  removeMemberTooltip: string;
  emptyLabel: string;
}

interface MembersTableSectionProps {
  searchQuery: string;
  roleFilter: MemberRoleFilter;
  onSearchQueryChange: (value: string) => void;
  onRoleFilterChange: (role: MemberRoleFilter) => void;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  members: FamilyMember[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  currentUserEmail?: string;
  isUpdatingRole: boolean;
  isRemovingMember: boolean;
  onRoleChange: (member: FamilyMember, role: UserRole) => void;
  onRemoveMember: (member: FamilyMember) => void;
  formatJoinedDate: (value: string) => string;
  getRoleBadgeClass: (role: UserRole) => string;
  text: MembersTableSectionText;
}

const ROLE_FILTERS: MemberRoleFilter[] = ['ALL', UserRole.CONTRIBUTOR, UserRole.VIEWER];

export const MembersTableSection: FC<MembersTableSectionProps> = ({
  searchQuery,
  roleFilter,
  onSearchQueryChange,
  onRoleFilterChange,
  isLoading,
  isError,
  errorMessage,
  members,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  currentUserEmail,
  isUpdatingRole,
  isRemovingMember,
  onRoleChange,
  onRemoveMember,
  formatJoinedDate,
  getRoleBadgeClass,
  text,
}) => (
  <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col glow-card">
    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50 dark:bg-slate-900/40">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder={text.searchPlaceholder}
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-200"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              onClick={() => onRoleFilterChange(role)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${
                roleFilter === role
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-primary'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    </div>

    <div className="overflow-x-auto no-scrollbar">
      <InfiniteScroll
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
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
              <th className="px-8 py-4">{text.identityHeader}</th>
              <th className="px-8 py-4">{text.clearanceHeader}</th>
              <th className="px-8 py-4">{text.statusHeader}</th>
              <th className="px-8 py-4">{text.dateHeader}</th>
              <th className="px-8 py-4 text-right">{text.actionsHeader}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-8 py-5">
                    <Skeleton className="h-10 w-40" />
                  </td>
                  <td className="px-8 py-5">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="px-8 py-5">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-8 py-5">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-8 py-5">
                    <Skeleton className="h-6 w-6 ml-auto" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center text-rose-500 text-xs font-semibold">
                  {errorMessage}
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const isSelf =
                  member.email.toLowerCase() === currentUserEmail?.toLowerCase();

                return (
                  <tr
                    key={member.id}
                    className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.profilePhoto}
                          className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                          alt=""
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {member.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(value) => {
                            if (isUpdatingRole || isSelf) return;
                            onRoleChange(member, value as UserRole);
                          }}
                          className={isUpdatingRole || isSelf ? 'pointer-events-none opacity-50' : ''}
                        >
                          <SelectTrigger
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase bg-transparent ${getRoleBadgeClass(member.role)}`}
                          >
                            <SelectValue placeholder={text.rolePlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.CONTRIBUTOR}>{text.roleContributor}</SelectItem>
                            <SelectItem value={UserRole.VIEWER}>{text.roleViewer}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            member.status === MemberStatus.ACTIVE ? 'bg-emerald-500' : 'bg-orange-400'
                          }`}
                        ></div>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            member.status === MemberStatus.ACTIVE
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-orange-500 dark:text-orange-400'
                          }`}
                        >
                          {member.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatJoinedDate(member.joinedDate)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all disabled:opacity-40"
                              disabled={isRemovingMember || isSelf}
                              onClick={() => onRemoveMember(member)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {member.status === MemberStatus.PENDING
                              ? text.revokeInviteTooltip
                              : text.removeMemberTooltip}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            {!isLoading && !isError && members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 uppercase text-[10px] font-bold tracking-widest">
                  {text.emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </InfiniteScroll>
    </div>
  </div>
);
