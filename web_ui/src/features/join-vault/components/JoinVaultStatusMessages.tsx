import type { FC } from 'react';
import { CheckCircle2, CircleX, Loader2 } from 'lucide-react';

interface JoinVaultStatusMessagesProps {
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuccess: boolean;
  successMessage: string;
  joinedVaultName: string | null;
  previewError: string | null;
  authenticatedJoinError: string | null;
  validatingInvitationLabel: string;
  processingInvitationLabel: string;
  vaultLabel: string;
}

export const JoinVaultStatusMessages: FC<JoinVaultStatusMessagesProps> = ({
  isLoading,
  isAuthenticated,
  isSuccess,
  successMessage,
  joinedVaultName,
  previewError,
  authenticatedJoinError,
  validatingInvitationLabel,
  processingInvitationLabel,
  vaultLabel,
}) => (
  <>
    {isLoading && (
      <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
        <Loader2 size={20} className="animate-spin mt-0.5" />
        <p className="text-sm font-medium">
          {isAuthenticated ? processingInvitationLabel : validatingInvitationLabel}
        </p>
      </div>
    )}

    {isSuccess && (
      <div className="flex items-start gap-3 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 size={20} className="mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{successMessage}</p>
          {joinedVaultName && <p className="text-xs opacity-80">{vaultLabel}: {joinedVaultName}</p>}
        </div>
      </div>
    )}

    {previewError && (
      <div className="flex items-start gap-3 text-rose-700 dark:text-rose-400">
        <CircleX size={20} className="mt-0.5" />
        <p className="text-sm font-medium">{previewError}</p>
      </div>
    )}

    {authenticatedJoinError && (
      <div className="flex items-start gap-3 text-rose-700 dark:text-rose-400">
        <CircleX size={20} className="mt-0.5" />
        <p className="text-sm font-medium">{authenticatedJoinError}</p>
      </div>
    )}
  </>
);
