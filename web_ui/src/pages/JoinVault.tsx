import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, CircleX } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useJoinVault } from '../hooks/useMembers';
import { getApiErrorMessage } from '../services/httpError';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

const JoinVault: React.FC = () => {
  const { token } = useParams({ strict: false }) as { token?: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, setActiveVault, updateUser } = useAuthStore();
  const [joinedVaultRole, setJoinedVaultRole] = useState<UserRole | null>(null);
  const [joinedVaultName, setJoinedVaultName] = useState<string | null>(null);

  const joinMutation = useJoinVault();

  const runJoin = (joinToken: string) => {
    joinMutation.mutate(joinToken, {
      onSuccess: (response) => {
        const joinedVaultId = response.vaultId ? String(response.vaultId) : null;
        if (joinedVaultId) {
          setActiveVault(joinedVaultId);
        }

        if (response.role) {
          setJoinedVaultRole(response.role);
          updateUser({ role: response.role });
        }

        if (response.vaultName) {
          setJoinedVaultName(response.vaultName);
        }

        queryClient.invalidateQueries({ queryKey: ['vaults'] });
        queryClient.invalidateQueries({ queryKey: ['media'] });
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
        queryClient.invalidateQueries({ queryKey: ['relationships'] });
        queryClient.invalidateQueries({ queryKey: ['treeData'] });
        queryClient.invalidateQueries({ queryKey: ['members'] });
        queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      },
    });
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    if (!isAuthenticated) {
      navigate({ to: '/login', search: { joinToken: token } as Record<string, string> });
      return;
    }

    if (joinMutation.status !== 'idle') {
      return;
    }

    runJoin(token);
  }, [isAuthenticated, joinMutation.status, navigate, token]);

  const missingToken = !token;
  const isLoading = !missingToken && (joinMutation.isIdle || joinMutation.isPending);
  const isSuccess = joinMutation.isSuccess;
  const isError = missingToken || joinMutation.isError;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-8 space-y-5">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Join Family Vault</h1>

        {isLoading && (
          <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
            <Loader2 size={20} className="animate-spin mt-0.5" />
            <p className="text-sm font-medium">Processing your invitation...</p>
          </div>
        )}

        {isSuccess && (
          <div className="flex items-start gap-3 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={20} className="mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{joinMutation.data?.message || 'You have joined the vault.'}</p>
              {joinedVaultName && <p className="text-xs opacity-80">Vault: {joinedVaultName}</p>}
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-3 text-rose-700 dark:text-rose-400">
            <CircleX size={20} className="mt-0.5" />
            <p className="text-sm font-medium">
              {missingToken
                ? 'The invitation token is missing from this link.'
                : getApiErrorMessage(joinMutation.error, 'Could not process this invite.')}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {isSuccess ? (
            <>
              <button
                onClick={() => navigate({ to: '/vault' })}
                className="flex-1 bg-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
              >
                Open Vault
              </button>
              {joinedVaultRole === UserRole.ADMIN ? (
                <button
                  onClick={() => navigate({ to: '/members' })}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
                >
                  Manage Members
                </button>
              ) : (
                <button
                  onClick={() => navigate({ to: '/' })}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
                >
                  Go To Dashboard
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex-1 bg-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
            >
              Go To Dashboard
            </button>
          )}
          {isError && !missingToken && (
            <button
              onClick={() => {
                joinMutation.reset();
                if (token) runJoin(token);
              }}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-primary transition-all"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinVault;
