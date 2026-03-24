import { AxiosError } from 'axios';
import type { JoinedInvitationContext, JoinAutoAcceptParams, JoinInvitationSources, JoinViewState, JoinViewStateParams } from '@/features/join-vault/types';

export const extractJoinErrorCode = (error: unknown): string | undefined => {
  if (!(error instanceof AxiosError)) {
    return undefined;
  }
  return typeof error.response?.data?.code === 'string' ? error.response.data.code : undefined;
};

export const buildJoinLoginSearch = (token: string) => ({
  joinToken: token,
  redirect: `/join/${token}`,
});

export const getJoinedInvitationContext = (sources: JoinInvitationSources): JoinedInvitationContext => ({
  role: sources.accepted?.role || sources.joined?.role || sources.preview?.role || null,
  vaultName: sources.accepted?.vaultName || sources.joined?.vaultName || sources.preview?.vaultName || null,
});

export const getJoinViewState = (params: JoinViewStateParams): JoinViewState => {
  const { token, hasPreview, isPreviewPending, hasPreviewError, isAuthenticated, isAccountExistsPath } = params;
  const missingToken = !token;
  const isPreviewLoading = !missingToken && isPreviewPending;
  const showRegistrationForm =
    !missingToken && !isPreviewLoading && !hasPreviewError && hasPreview && !isAuthenticated && !isAccountExistsPath;
  const showLoginPath =
    !missingToken && !isPreviewLoading && !hasPreviewError && hasPreview && !isAuthenticated && isAccountExistsPath;
  const showAuthenticatedJoinStatus = !missingToken && hasPreview && isAuthenticated;

  return {
    missingToken,
    isPreviewLoading,
    showRegistrationForm,
    showLoginPath,
    showAuthenticatedJoinStatus,
  };
};

export const shouldAutoAcceptJoinInvite = (params: JoinAutoAcceptParams): boolean => {
  const {
    token,
    isAuthenticated,
    hasPreview,
    isPreviewPending,
    isAccountExistsPath,
    isAcceptSuccess,
    isAcceptPending,
    joinStatus,
  } = params;

  if (!token) return false;
  if (!isAuthenticated) return false;
  if (!hasPreview || isPreviewPending) return false;
  if (isAccountExistsPath) return false;
  if (isAcceptSuccess || isAcceptPending) return false;
  return joinStatus === 'idle';
};
