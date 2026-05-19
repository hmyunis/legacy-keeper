import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';

/** Redirect unauthenticated users to sign-in. */
export function requireAuth({ location }: { location: { pathname: string } }) {
  const { isAuthenticated, currentUser, activeVaultId } = useAuthStore.getState();

  if (!isAuthenticated) {
    throw redirect({
      to: '/auth',
      search: { redirect: location.pathname },
    });
  }

  if (!currentUser?.is_verified) {
    throw redirect({ to: '/verify-email' });
  }

  if (!activeVaultId && !currentUser?.vaultId && location.pathname !== '/onboarding') {
    throw redirect({ to: '/onboarding' });
  }
}

/** Keep signed-in users out of auth flows. */
export function redirectIfAuthenticated() {
  const { isAuthenticated, currentUser } = useAuthStore.getState();
  if (isAuthenticated) {
    if (!currentUser?.is_verified) {
      throw redirect({ to: '/verify-email' });
    }
    throw redirect({ to: currentUser?.vaultId ? '/dashboard' : '/onboarding' });
  }
}

/** Gate verify-email page to signed-in users pending verification. */
export function requirePendingVerification() {
  const { isAuthenticated, currentUser } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw redirect({ to: '/auth' });
  }
  if (currentUser?.is_verified) {
    throw redirect({ to: currentUser?.vaultId ? '/dashboard' : '/onboarding' });
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