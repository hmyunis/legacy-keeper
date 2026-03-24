import type { FC } from 'react';

interface JoinVaultActionBarProps {
  isSuccess: boolean;
  isAdmin: boolean;
  canRetry: boolean;
  openVaultLabel: string;
  manageMembersLabel: string;
  goBackLabel: string;
  retryLabel: string;
  onOpenVault: () => void;
  onManageMembers: () => void;
  onGoBack: () => void;
  onRetry: () => void;
}

export const JoinVaultActionBar: FC<JoinVaultActionBarProps> = ({
  isSuccess,
  isAdmin,
  canRetry,
  openVaultLabel,
  manageMembersLabel,
  goBackLabel,
  retryLabel,
  onOpenVault,
  onManageMembers,
  onGoBack,
  onRetry,
}) => (
  <div className="flex gap-3 pt-2">
    {isSuccess ? (
      <>
        <button
          onClick={onOpenVault}
          className="flex-1 bg-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
        >
          {openVaultLabel}
        </button>
        {isAdmin ? (
          <button
            onClick={onManageMembers}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
          >
            {manageMembersLabel}
          </button>
        ) : (
          <button
            onClick={onGoBack}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
          >
            {goBackLabel}
          </button>
        )}
      </>
    ) : (
      <button
        onClick={onGoBack}
        className="flex-1 bg-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
      >
        {goBackLabel}
      </button>
    )}
    {canRetry && (
      <button
        onClick={onRetry}
        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
      >
        {retryLabel}
      </button>
    )}
  </div>
);
