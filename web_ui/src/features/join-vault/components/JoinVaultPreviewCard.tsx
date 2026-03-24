import type { FC } from 'react';
import type { JoinInvitePreviewResponse } from '@/services/membersApi';

interface JoinVaultPreviewCardProps {
  preview: JoinInvitePreviewResponse;
  invitedVaultLabel: string;
  roleLabel: string;
  inviteEmailLabel: string;
}

export const JoinVaultPreviewCard: FC<JoinVaultPreviewCardProps> = ({
  preview,
  invitedVaultLabel,
  roleLabel,
  inviteEmailLabel,
}) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-1">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{invitedVaultLabel}</p>
    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{preview.vaultName}</p>
    <p className="text-xs text-slate-500 dark:text-slate-300">{roleLabel}: {preview.role}</p>
    {preview.inviteEmail && (
      <p className="text-xs text-slate-500 dark:text-slate-300">{inviteEmailLabel}: {preview.inviteEmail}</p>
    )}
  </div>
);
