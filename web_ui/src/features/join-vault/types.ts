import type { JoinInvitePreviewResponse, JoinVaultResponse } from '@/services/membersApi';
import type { UserRole } from '@/types';

export interface JoinInvitationSources {
  accepted?: JoinVaultResponse | null;
  joined?: JoinVaultResponse | null;
  preview?: JoinInvitePreviewResponse | null;
}

export interface JoinViewStateParams {
  token?: string;
  hasPreview: boolean;
  isPreviewPending: boolean;
  hasPreviewError: boolean;
  isAuthenticated: boolean;
  isAccountExistsPath: boolean;
}

export interface JoinAutoAcceptParams {
  token?: string;
  isAuthenticated: boolean;
  hasPreview: boolean;
  isPreviewPending: boolean;
  isAccountExistsPath: boolean;
  isAcceptSuccess: boolean;
  isAcceptPending: boolean;
  joinStatus: 'idle' | 'pending' | 'success' | 'error';
}

export interface JoinViewState {
  missingToken: boolean;
  isPreviewLoading: boolean;
  showRegistrationForm: boolean;
  showLoginPath: boolean;
  showAuthenticatedJoinStatus: boolean;
}

export interface JoinedInvitationContext {
  role: UserRole | null;
  vaultName: string | null;
}
