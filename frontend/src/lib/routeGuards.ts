import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';
import { getAccessibleVaults, getPostAuthRoute, shouldShowInvitationInbox } from './authRouting';

/** Redirect unauthenticated users to sign-in. */
export function requireAuth({ location }: { location: { pathname: string } }) {
  const { isAuthenticated, currentUser, activeVaultId, setActiveVaultId } = useAuthStore.getState();

  if (!isAuthenticated) {
    throw redirect({
      to: '/auth',
      search: { redirect: location.pathname },
    });
  }

  if (!currentUser?.is_verified) {
    throw redirect({ to: '/verify-email' });
  }

  if (shouldShowInvitationInbox(currentUser) && location.pathname !== '/invitation-inbox') {
    throw redirect({ to: '/invitation-inbox' });
  }

  const vaults = getAccessibleVaults(currentUser);
  const activeVaultIsValid = !!activeVaultId && vaults.some((vault) => vault.id === activeVaultId);

  if (vaults.length === 1 && !activeVaultIsValid) {
    setActiveVaultId(vaults[0].id);
    return;
  }

  if (vaults.length > 1 && !activeVaultIsValid && location.pathname !== '/vault-select') {
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
