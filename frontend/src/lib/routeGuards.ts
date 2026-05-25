import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';
import { getAccessibleVaults, getPostAuthRoute, shouldShowInvitationInbox } from './authRouting';

/** Redirect unauthenticated users to sign-in. */
export function requireAuth({ location }: { location: { pathname: string } }) {
  const { isAuthenticated, currentUser, activeVaultId, setActiveVaultId } = useAuthStore.getState();
  const requestedVaultId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('vaultId')
    : null;

  if (!isAuthenticated) {
    throw redirect({
      to: '/auth',
      search: { redirect: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : location.pathname },
    });
  }

  if (!currentUser?.is_verified) {
    throw redirect({ to: '/verify-email' });
  }

  if (shouldShowInvitationInbox(currentUser) && location.pathname !== '/invitation-inbox') {
    throw redirect({ to: '/invitation-inbox' });
  }

  const vaults = getAccessibleVaults(currentUser);
  const vaultFromLink = requestedVaultId && vaults.some((vault) => vault.id === requestedVaultId) ? requestedVaultId : null;
  if (vaultFromLink && activeVaultId !== vaultFromLink) {
    setActiveVaultId(vaultFromLink);
  }

  const activeVaultIsValid = !!activeVaultId && vaults.some((vault) => vault.id === activeVaultId);
  const effectiveActiveVaultIsValid = activeVaultIsValid || !!vaultFromLink;

  if (vaults.length === 1 && !effectiveActiveVaultIsValid) {
    setActiveVaultId(vaults[0].id);
    return;
  }

  if (vaults.length > 1 && !effectiveActiveVaultIsValid && location.pathname !== '/vault-select') {
    throw redirect({ to: '/vault-select' });
  }

  if (vaults.length === 0 && location.pathname !== '/onboarding' && location.pathname !== '/invitation-inbox') {
    throw redirect({ to: '/onboarding' });
  }
}

/** Keep signed-in users out of auth flows. */
export function redirectIfAuthenticated() {
  const { isAuthenticated, currentUser, activeVaultId, setActiveVaultId } = useAuthStore.getState();
  if (isAuthenticated) {
    if (!currentUser?.is_verified) {
      throw redirect({ to: '/verify-email' });
    }
    const destination = getPostAuthRoute(currentUser);
    const vaults = getAccessibleVaults(currentUser);
    if (vaults.length === 1 && !activeVaultId) {
      setActiveVaultId(vaults[0].id);
    }
    throw redirect({ to: destination as any });
  }
}

/** Gate verify-email page to signed-in users pending verification. */
export function requirePendingVerification() {
  const { isAuthenticated, currentUser } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw redirect({ to: '/auth' });
  }
  if (currentUser?.is_verified) {
    const destination = getPostAuthRoute(currentUser);
    throw redirect({ to: destination as any });
  }
}

/** Require admin role for governance routes. */
export function requireAdmin({ location }: { location: { pathname: string } }) {
  requireAuth({ location });
  const { currentUser } = useAuthStore.getState();
  if (currentUser?.role !== 'ADMIN') {
    throw redirect({ to: '/dashboard' });
  }
}
