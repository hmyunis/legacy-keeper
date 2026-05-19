import { Outlet } from '@tanstack/react-router';
import { MuseumLayout } from './MuseumLayout';
import { useDashboardSummary } from '../../features/dashboard/hooks/useDashboard';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sileo } from 'sileo';
import { useAuthStore } from '../../stores/authStore';
import axiosClient from '../../services/axiosClient';

export function AppLayout() {
  const { data: summary } = useDashboardSummary();
  const { currentUser, activeVaultId, setActiveVaultId, accessToken, refreshToken } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!activeVaultId && currentUser?.vaultId) {
      setActiveVaultId(currentUser.vaultId);
    }
  }, [activeVaultId, currentUser?.vaultId, setActiveVaultId]);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser && accessToken && refreshToken) {
      axiosClient.get('/auth/profile/')
        .then((res) => {
          if (cancelled) return;
          const { login } = useAuthStore.getState();
          if (accessToken && refreshToken) {
            login({
              user: res.data,
              accessToken,
              refreshToken,
              activeVaultId: res.data?.vaultId || null,
            });
          }
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser, refreshToken]);

  useEffect(() => {
    const handleTaskComplete = () => {
      queryClient.invalidateQueries();
      sileo.info({ title: "Archive Updated", description: "AI has finished a background curation." });
    };

    window.addEventListener('AI_TASK_COMPLETE', handleTaskComplete);
    return () => window.removeEventListener('AI_TASK_COMPLETE', handleTaskComplete);
  }, [queryClient]);

  const dynamicStyles = {
    '--clr-gold': summary?.theme?.primaryHue || '#B88F5B',
    '--clr-gold-dark': summary?.theme?.primaryHue || '#9A7340',
    '--grain-display': summary?.theme?.grainEnabled === false ? 'none' : 'block'
  } as CSSProperties;

  return (
    <div style={dynamicStyles}>
      <MuseumLayout navMode="app">
        <Outlet />
      </MuseumLayout>
    </div>
  );
}
