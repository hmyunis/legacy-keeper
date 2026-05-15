import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';

/** Redirect unauthenticated users to sign-in. */
export function requireAuth({ location }: { location: { pathname: string } }) {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw redirect({
      to: '/auth',
      search: { redirect: location.pathname },
    });
  }
}

/** Keep signed-in users out of auth flows. */
export function redirectIfAuthenticated() {
  const { isAuthenticated } = useAuthStore.getState();
  if (isAuthenticated) {
    throw redirect({ to: '/dashboard' });
  }
}
