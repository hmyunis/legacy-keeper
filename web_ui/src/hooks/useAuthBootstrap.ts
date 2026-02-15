import { useEffect } from 'react';
import { authApi, mapApiUserToUser } from '../services/authApi';
import { useAuthStore } from '../stores/authStore';

let bootstrapRequest: Promise<Awaited<ReturnType<typeof authApi.getMe>>> | null = null;

const getBootstrapUser = () => {
  if (!bootstrapRequest) {
    bootstrapRequest = authApi.getMe().finally(() => {
      bootstrapRequest = null;
    });
  }
  return bootstrapRequest;
};

export const useAuthBootstrap = () => {
  const { isAuthenticated, updateUser, setActiveVault } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isMounted = true;

    getBootstrapUser()
      .then((user) => {
        if (!isMounted) return;

        const nextVaultId = user.activeVaultId ? String(user.activeVaultId) : null;
        const currentVaultId = useAuthStore.getState().activeVaultId;
        if (nextVaultId !== currentVaultId) {
          setActiveVault(nextVaultId);
        }

        const mappedUser = mapApiUserToUser(user);
        updateUser(mappedUser);
      })
      .catch(() => {
        // Session errors are handled centrally by axios interceptors.
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, setActiveVault, updateUser]);
};
