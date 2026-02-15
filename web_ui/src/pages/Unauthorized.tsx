import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ShieldAlert } from 'lucide-react';
import { useVaults } from '../hooks/useVaults';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { from?: string };
  const { data: vaults } = useVaults();
  const { activeVaultId, setActiveVault, updateUser } = useAuthStore();
  const attemptedPath = typeof search.from === 'string' && search.from.trim() ? search.from : null;

  const requiredRoles = useMemo(() => {
    if (!attemptedPath) return [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] as const;
    if (attemptedPath.startsWith('/members') || attemptedPath.startsWith('/logs')) {
      return [UserRole.ADMIN] as const;
    }
    return [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.VIEWER] as const;
  }, [attemptedPath]);

  const candidateVaults = useMemo(() => {
    if (!vaults?.length) return [];
    return vaults.filter((vault) => vault.myRole && requiredRoles.includes(vault.myRole));
  }, [requiredRoles, vaults]);

  const [selectedVaultId, setSelectedVaultId] = useState('');

  useEffect(() => {
    if (!candidateVaults.length) {
      setSelectedVaultId('');
      return;
    }

    if (candidateVaults.some((vault) => vault.id === selectedVaultId)) return;

    const preferred = candidateVaults.find((vault) => vault.id === activeVaultId) || candidateVaults[0];
    setSelectedVaultId(preferred.id);
  }, [activeVaultId, candidateVaults, selectedVaultId]);

  const switchVaultAndRetry = () => {
    const targetVault = candidateVaults.find((vault) => vault.id === selectedVaultId);
    if (!targetVault) return;

    setActiveVault(targetVault.id);
    if (targetVault.myRole) {
      updateUser({ role: targetVault.myRole });
    }

    if (!attemptedPath) {
      navigate({ to: '/' });
      return;
    }

    const [path, query] = attemptedPath.split('?');
    const parsedSearch = query ? Object.fromEntries(new URLSearchParams(query).entries()) : undefined;
    navigate({ to: path as any, search: parsedSearch as any });
  };

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Access Restricted</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              You are signed in, but your role does not allow access to this page.
            </p>
            {attemptedPath && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Attempted route: <span className="font-mono">{attemptedPath}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {candidateVaults.length > 0 && (
            <div className="flex flex-1 flex-col sm:flex-row gap-2">
              <select
                value={selectedVaultId}
                onChange={(event) => setSelectedVaultId(event.target.value)}
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
                onClick={switchVaultAndRetry}
                className="inline-flex items-center justify-center rounded-2xl border border-primary/40 bg-primary/5 text-primary px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-primary/10 transition-colors"
              >
                Switch Vault & Retry
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="inline-flex items-center justify-center rounded-2xl bg-primary text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Go To Dashboard
          </button>
          <Link
            to="/help"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Open Help Center
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
