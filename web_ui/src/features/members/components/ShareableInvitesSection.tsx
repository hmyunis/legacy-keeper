import type { FC, FormEvent } from 'react';
import { Ban, Copy, Link2, Trash, UserPlus } from 'lucide-react';
import DatePicker from '@/components/DatePicker';
import { Skeleton } from '@/components/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import type { ShareableInvite } from '@/services/membersApi';
import { UserRole } from '@/types';

interface ShareableInvitesText {
  title: string;
  subtitle: string;
  selectRole: string;
  roleContributor: string;
  roleViewer: string;
  selectExpiryDate: string;
  generating: string;
  generate: string;
  copy: string;
  copied: string;
  tableLink: string;
  tableRole: string;
  tableExpires: string;
  tableJoined: string;
  tableStatus: string;
  tableActions: string;
  tooltipCopy: string;
  tooltipDelete: string;
  tooltipRevoke: string;
  tooltipAlreadyRevoked: string;
  statusRevoked: string;
  statusExpired: string;
  statusActive: string;
  empty: string;
}

interface ShareableInvitesSectionProps {
  role: UserRole;
  expiry?: Date;
  onRoleChange: (role: UserRole) => void;
  onExpiryChange: (date?: Date) => void;
  onGenerate: (event: FormEvent) => void;
  isGenerating: boolean;
  latestGeneratedLink: string | null;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  links: ShareableInvite[];
  page: number;
  totalCount: number;
  totalPages: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFetching: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onRevokeLink: (link: ShareableInvite) => void;
  onDeleteLink: (link: ShareableInvite) => void;
  isRevoking: boolean;
  isDeleting: boolean;
  formatDateTime: (value: string) => string;
  text: ShareableInvitesText;
}

export const ShareableInvitesSection: FC<ShareableInvitesSectionProps> = ({
  role,
  expiry,
  onRoleChange,
  onExpiryChange,
  onGenerate,
  isGenerating,
  latestGeneratedLink,
  copiedKey,
  onCopy,
  isLoading,
  isError,
  errorMessage,
  links,
  page,
  totalCount,
  totalPages,
  pageSize,
  hasNextPage,
  hasPreviousPage,
  isFetching,
  onNextPage,
  onPreviousPage,
  onRevokeLink,
  onDeleteLink,
  isRevoking,
  isDeleting,
  formatDateTime,
  text,
}) => (
  <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col glow-card">
    <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
      <div className="flex items-center gap-2 mb-2">
        <Link2 size={16} className="text-primary" />
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
          {text.title}
        </h2>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{text.subtitle}</p>
    </div>

    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
      <form onSubmit={onGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select value={role} onValueChange={(value) => onRoleChange(value as UserRole)} className="w-full">
          <SelectTrigger className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20">
            <SelectValue placeholder={text.selectRole} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UserRole.CONTRIBUTOR}>{text.roleContributor}</SelectItem>
            <SelectItem value={UserRole.VIEWER}>{text.roleViewer}</SelectItem>
          </SelectContent>
        </Select>
        <DatePicker
          date={expiry}
          onChange={onExpiryChange}
          placeholder={text.selectExpiryDate}
          className="w-full"
        />
        <button
          type="submit"
          disabled={isGenerating}
          className="md:col-span-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 glow-primary active:scale-[0.99] transition-all disabled:opacity-50 uppercase tracking-widest"
        >
          <UserPlus size={14} />
          {isGenerating ? text.generating : text.generate}
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
                onClick={() => onCopy(latestGeneratedLink, `latest:${latestGeneratedLink}`)}
                className="inline-flex items-center gap-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
              >
                <Copy size={12} />
                {copiedKey === `latest:${latestGeneratedLink}` ? text.copied : text.copy}
              </button>
            </TooltipTrigger>
            <TooltipContent>{text.tooltipCopy}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>

    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 bg-slate-50/30 dark:bg-slate-950/20">
            <th className="px-6 py-4 w-16">#</th>
            <th className="px-6 py-4">{text.tableLink}</th>
            <th className="px-6 py-4">{text.tableRole}</th>
            <th className="px-6 py-4">{text.tableExpires}</th>
            <th className="px-6 py-4">{text.tableJoined}</th>
            <th className="px-6 py-4">{text.tableStatus}</th>
            <th className="px-6 py-4 text-right">{text.tableActions}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-8" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-44" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-20" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-28" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-10" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-16" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-24 ml-auto" />
                </td>
              </tr>
            ))
          ) : isError ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-rose-500 text-xs font-semibold">
                {errorMessage}
              </td>
            </tr>
          ) : links.length ? (
            links.map((link, index) => {
              const statusLabel = link.isRevoked
                ? text.statusRevoked
                : link.isExpired
                  ? text.statusExpired
                  : text.statusActive;
              const statusClass = link.isRevoked
                ? 'text-rose-600 dark:text-rose-400'
                : link.isExpired
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-emerald-600 dark:text-emerald-400';
              const rowNumber = (page - 1) * pageSize + index + 1;

              return (
                <tr
                  key={link.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {rowNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-70"
                        title={link.link}
                      >
                        {link.link}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onCopy(link.link, `row:${link.id}`)}
                            className="p-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 hover:text-primary hover:border-primary transition-all"
                          >
                            <Copy size={12} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{text.tooltipCopy}</TooltipContent>
                      </Tooltip>
                      {copiedKey === `row:${link.id}` && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {text.copied}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-200">{link.role}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                    {formatDateTime(link.expiresAt)}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                    {link.joinedCount}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onRevokeLink(link)}
                            disabled={link.isRevoked || isRevoking}
                            className="p-2 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-all disabled:opacity-40"
                          >
                            <Ban size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {link.isRevoked ? text.tooltipAlreadyRevoked : text.tooltipRevoke}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onDeleteLink(link)}
                            disabled={isDeleting}
                            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all disabled:opacity-40"
                          >
                            <Trash size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{text.tooltipDelete}</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-slate-400 uppercase text-[10px] font-bold tracking-widest">
                {text.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="px-6">
      <Pagination
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        isFetchingNextPage={isFetching}
        isFetchingPreviousPage={isFetching}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  </div>
);
