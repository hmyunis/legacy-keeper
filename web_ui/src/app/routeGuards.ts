import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';

type RouterLocation = { href: string };
type BeforeLoadContext = { location: RouterLocation };

const buildRequestedPath = (location: RouterLocation) => location.href;

export const requireAuthenticated = ({ location }: BeforeLoadContext) => {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw redirect({
      to: '/login',
      search: { redirect: buildRequestedPath(location) },
    } as any);
  }
};

export const requireRoles =
  (allowedRoles: readonly UserRole[]) =>
  ({ location }: BeforeLoadContext) => {
    requireAuthenticated({ location });
    const role = useAuthStore.getState().currentUser?.role;
    if (!role || !allowedRoles.includes(role)) {
      throw redirect({
        to: '/unauthorized',
        search: { from: buildRequestedPath(location) },
      } as any);
    }
  };
