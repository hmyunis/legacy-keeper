import { describe, expect, it } from 'vitest';
import {
  buildJoinLoginSearch,
  getJoinedInvitationContext,
  getJoinViewState,
  shouldAutoAcceptJoinInvite,
} from '@/features/join-vault/selectors';
import { UserRole } from '@/types';

describe('join-vault selectors', () => {
  it('builds login search params from token', () => {
    expect(buildJoinLoginSearch('abc123')).toEqual({
      joinToken: 'abc123',
      redirect: '/join/abc123',
    });
  });

  it('resolves joined invitation context with accepted response precedence', () => {
    const context = getJoinedInvitationContext({
      accepted: { message: 'ok', role: UserRole.ADMIN, vaultName: 'Accepted Vault' },
      joined: { message: 'ok', role: UserRole.VIEWER, vaultName: 'Joined Vault' },
      preview: {
        message: 'ok',
        vaultId: '1',
        vaultName: 'Preview Vault',
        role: UserRole.CONTRIBUTOR,
        requiresEmail: false,
        accountExists: false,
        alreadyMember: false,
        canSelfRegister: true,
      },
    });

    expect(context).toEqual({
      role: UserRole.ADMIN,
      vaultName: 'Accepted Vault',
    });
  });

  it('derives registration path for unauthenticated valid invite', () => {
    const state = getJoinViewState({
      token: 'token-1',
      hasPreview: true,
      isPreviewPending: false,
      hasPreviewError: false,
      isAuthenticated: false,
      isAccountExistsPath: false,
    });

    expect(state).toEqual({
      missingToken: false,
      isPreviewLoading: false,
      showRegistrationForm: true,
      showLoginPath: false,
      showAuthenticatedJoinStatus: false,
    });
  });

  it('blocks auto-accept unless all conditions are met', () => {
    expect(
      shouldAutoAcceptJoinInvite({
        token: 'token-1',
        isAuthenticated: true,
        hasPreview: true,
        isPreviewPending: false,
        isAccountExistsPath: false,
        isAcceptSuccess: false,
        isAcceptPending: false,
        joinStatus: 'idle',
      }),
    ).toBe(true);

    expect(
      shouldAutoAcceptJoinInvite({
        token: 'token-1',
        isAuthenticated: true,
        hasPreview: true,
        isPreviewPending: false,
        isAccountExistsPath: true,
        isAcceptSuccess: false,
        isAcceptPending: false,
        joinStatus: 'idle',
      }),
    ).toBe(false);

    expect(
      shouldAutoAcceptJoinInvite({
        token: 'token-1',
        isAuthenticated: true,
        hasPreview: true,
        isPreviewPending: false,
        isAccountExistsPath: false,
        isAcceptSuccess: false,
        isAcceptPending: false,
        joinStatus: 'success',
      }),
    ).toBe(false);
  });
});
