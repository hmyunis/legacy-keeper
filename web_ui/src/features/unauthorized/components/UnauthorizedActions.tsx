import type { FC } from 'react';
import { Link } from '@tanstack/react-router';
import type { UnauthorizedVaultOption } from '@/features/unauthorized/types';

interface UnauthorizedActionsProps {
  candidateVaults: UnauthorizedVaultOption[];
  selectedVaultId: string;
  switchVaultAndRetryLabel: string;
  goToDashboardLabel: string;
  openHelpCenterLabel: string;
  onSelectedVaultChange: (vaultId: string) => void;
  onSwitchVaultAndRetry: () => void;
  onGoToDashboard: () => void;
}

export const UnauthorizedActions: FC<UnauthorizedActionsProps> = ({
  candidateVaults,
  selectedVaultId,
  switchVaultAndRetryLabel,
  goToDashboardLabel,
  openHelpCenterLabel,
  onSelectedVaultChange,
  onSwitchVaultAndRetry,
  onGoToDashboard,
}) => (
  <div className="flex flex-col sm:flex-row gap-3 pt-2">
    {candidateVaults.length > 0 && (
      <div className="flex flex-1 flex-col sm:flex-row gap-2">
        <select
          value={selectedVaultId}
          onChange={(event) => onSelectedVaultChange(event.target.value)}
          className="flex-1 rounded-2xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        >
          {candidateVaults.map((vault) => (
            <option key={vault.id} value={vault.id}>
              {vault.name} ({vault.myRole})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onSwitchVaultAndRetry}
          className="inline-flex items-center justify-center rounded-2xl border border-primary/40 bg-primary/5 text-primary px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-primary/10 transition-colors"
        >
          {switchVaultAndRetryLabel}
        </button>
      </div>
    )}
    <button
      type="button"
      onClick={onGoToDashboard}
      className="inline-flex items-center justify-center rounded-2xl bg-primary text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
    >
      {goToDashboardLabel}
    </button>
    <Link
      to="/help"
      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {openHelpCenterLabel}
    </Link>
  </div>
);
