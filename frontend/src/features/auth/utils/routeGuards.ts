import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';

export function requireAuth({ location }: { location: { pathname: string } }) {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw redirect({
      to: '/auth',
      search: { redirect: location.pathname },
    });
  }
}

export function redirectIfAuthenticated() {
  const { isAuthenticated } = useAuthStore.getState();
  if (isAuthenticated) {
    throw redirect({ to: '/dashboard' });
  }
}