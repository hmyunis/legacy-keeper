import type { User } from '../stores/authStore';

export function getAccessibleVaults(user: User | null | undefined) {
  if (!user) return [];
  if (user.vaults && user.vaults.length > 0) return user.vaults;
  if (user.vaultId) {
    return [{
      id: user.vaultId,
      name: 'Vault',
      role: user.role || 'CURATOR',
      joinedAt: undefined,
    }];
  }
  return [];
}

export function getPendingInvitations(user: User | null | undefined) {
  return (user?.pendingInvitations || []).filter((invitation) => invitation.status === 'PENDING');
}

export function getDefaultVaultId(user: User | null | undefined) {
  const vaults = getAccessibleVaults(user);
  return vaults.length === 1 ? vaults[0].id : null;
}

export function shouldShowVaultPicker(user: User | null | undefined) {
  return getAccessibleVaults(user).length > 1;
}

export function shouldShowOnboarding(user: User | null | undefined) {
  return getAccessibleVaults(user).length === 0;
}

export function shouldShowInvitationInbox(user: User | null | undefined) {
  return getPendingInvitations(user).length > 0 && getAccessibleVaults(user).length > 0;
}

export function getPostAuthRoute(user: User | null | undefined, redirectTo?: string | null) {
  if (!user?.is_verified) return '/verify-email';

  const vaults = getAccessibleVaults(user);
  const pendingInvitations = getPendingInvitations(user);

  if (pendingInvitations.length > 0 && vaults.length > 0) {
    return '/invitation-inbox';
  }

  if (vaults.length > 1) {
    return '/vault-select';
  }

  if (vaults.length === 1) {
    return redirectTo || '/dashboard';
  }

  return '/onboarding';
}

export function getPostInvitationRoute(user: User | null | undefined, redirectTo?: string | null) {
  const vaults = getAccessibleVaults(user);

  if (redirectTo) return redirectTo;
  if (vaults.length > 1) return '/vault-select';
  if (vaults.length === 1) return '/dashboard';
  return '/onboarding';
}
