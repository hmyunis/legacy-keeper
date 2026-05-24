import { Outlet } from '@tanstack/react-router';
import { MuseumLayout } from './MuseumLayout';
import { useDashboardSummary } from '../../features/dashboard/hooks/useDashboard';
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sileo } from 'sileo';
import { useAuthStore } from '../../stores/authStore';
import { useSearchStore } from '../../stores/searchStore';
import axiosClient from '../../services/axiosClient';
import { appEnv } from '../../services/env';
import { getDefaultVaultId } from '../../lib/authRouting';
import { getTaskStatus } from '../../lib/tasks';

export function AppLayout() {
  const { data: summary } = useDashboardSummary();
  const { currentUser, activeVaultId, setActiveVaultId, accessToken, refreshToken } = useAuthStore();
  const searchSession = useSearchStore((s) => s.session);
  const patchSearchSession = useSearchStore((s) => s.patchSession);
  const queryClient = useQueryClient();
  const searchToastIdRef = useRef<string | null>(null);

  useEffect(() => {
    const defaultVaultId = getDefaultVaultId(currentUser);
    if (!activeVaultId && defaultVaultId) {
      setActiveVaultId(defaultVaultId);
    }
  }, [activeVaultId, currentUser, setActiveVaultId]);

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
              activeVaultId,
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

  useEffect(() => {
    if (searchSession.status !== 'PROCESSING' || !searchSession.deep) {
      if (searchToastIdRef.current) {
        sileo.dismiss(searchToastIdRef.current);
        searchToastIdRef.current = null;
      }
      return;
    }

    if (!searchToastIdRef.current) {
      searchToastIdRef.current = String(sileo.show({
        type: 'loading',
        title: 'Deep search running...',
        description: searchSession.stage || 'Reading the archive.',
        duration: null,
      }));
    }
  }, [searchSession.deep, searchSession.stage, searchSession.status]);

  useEffect(() => {
    if (searchSession.status !== 'PROCESSING' || !searchSession.deep || !searchSession.taskId) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const task = await getTaskStatus(searchSession.taskId as string);
        if (cancelled) return;

        if (task.status === 'PROCESSING') {
          patchSearchSession({
            status: 'PROCESSING',
            progress: typeof task.progress === 'number' ? task.progress : searchSession.progress,
            stage: task.stage || searchSession.stage || 'Reading the archive...',
            error: null,
          });
          return;
        }

        if (task.status === 'READY') {
          const result = task.result && typeof task.result === 'object' && Array.isArray(task.result.results)
            ? task.result.results
            : [];
          patchSearchSession({
            status: 'READY',
            taskId: null,
            progress: 100,
            stage: 'Search complete',
            error: null,
            results: result,
          });
          if (searchToastIdRef.current) {
            sileo.dismiss(searchToastIdRef.current);
            searchToastIdRef.current = null;
          }
          sileo.success({ title: 'Deep Search Complete', description: 'The results are ready in Search.' });
          return;
        }

        patchSearchSession({
          status: task.status === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
          taskId: null,
          stage: task.status === 'CANCELLED' ? 'Search cancelled' : 'Search failed',
          error: task.error || (task.status === 'CANCELLED' ? 'Search cancelled.' : 'Deep search failed.'),
        });
        if (searchToastIdRef.current) {
          sileo.dismiss(searchToastIdRef.current);
          searchToastIdRef.current = null;
        }
        if (task.status === 'CANCELLED') {
          sileo.info({ title: 'Search Cancelled' });
        } else {
          sileo.error({ title: 'Deep Search Failed', description: task.error || 'The background search could not finish.' });
        }
      } catch {
        if (!cancelled) {
          patchSearchSession({
            status: 'FAILED',
            taskId: null,
            stage: 'Search failed',
            error: 'Could not check deep search progress.',
          });
        }
      }
    };

    void poll();
    const interval = window.setInterval(poll, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [patchSearchSession, searchSession.deep, searchSession.progress, searchSession.stage, searchSession.status, searchSession.taskId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const current = useSearchStore.getState().session;
      if (current.status !== 'PROCESSING' || !current.taskId) return;

      const token = useAuthStore.getState().accessToken;
      void fetch(`${appEnv.apiBaseUrl}tasks/${current.taskId}/cancel/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        keepalive: true,
      }).catch(() => undefined);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
