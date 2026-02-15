import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { notificationApi } from '../services/notificationApi';
import type { InAppNotification } from '../types';
import { getApiErrorMessage } from '../services/httpError';

const INITIAL_FETCH_LIMIT = 40;
const POLL_INTERVAL_MS = 20000;

const toEpochMs = (value: string | null | undefined): number => {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const sortByNewest = (items: InAppNotification[]) =>
  [...items].sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));

const mergeNotifications = (current: InAppNotification[], incoming: InAppNotification[]) => {
  const byId = new Map<string, InAppNotification>();
  for (const item of current) byId.set(item.id, item);
  for (const item of incoming) byId.set(item.id, item);
  return sortByNewest(Array.from(byId.values()));
};

const newestTimestamp = (items: InAppNotification[]) => {
  if (!items.length) return null;
  return items
    .map((item) => item.createdAt)
    .sort((a, b) => toEpochMs(b) - toEpochMs(a))[0];
};

export const useInAppNotifications = () => {
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const latestTimestampRef = useRef<string | null>(null);
  const pollingInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const payload = await notificationApi.getNotifications({ limit: INITIAL_FETCH_LIMIT });
      const next = sortByNewest(payload.items);
      setNotifications(next);
      setUnreadCount(payload.unreadCount);
      latestTimestampRef.current = newestTimestamp(next);
    } catch (error) {
      toast.error('Failed to load notifications', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const pollForNew = useCallback(async () => {
    if (!isAuthenticated) return;
    if (document.visibilityState !== 'visible') return;
    if (pollingInFlightRef.current) return;

    pollingInFlightRef.current = true;
    setIsPolling(true);
    try {
      const payload = await notificationApi.getNotifications({
        since: latestTimestampRef.current || undefined,
        limit: INITIAL_FETCH_LIMIT,
      });

      if (payload.items.length) {
        setNotifications((current) => {
          const merged = mergeNotifications(current, payload.items);
          latestTimestampRef.current = newestTimestamp(merged);
          return merged;
        });
      }

      setUnreadCount(payload.unreadCount);
    } catch {
      // Polling should fail silently and recover on the next cycle.
    } finally {
      pollingInFlightRef.current = false;
      setIsPolling(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      latestTimestampRef.current = null;
      return;
    }
    void refresh();
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = window.setInterval(() => {
      void pollForNew();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, pollForNew]);

  const dismissNotification = useCallback(async (notificationId: string) => {
    let removedNotification: InAppNotification | undefined;
    setNotifications((current) => {
      removedNotification = current.find((item) => item.id === notificationId);
      return current.filter((item) => item.id !== notificationId);
    });
    if (removedNotification && !removedNotification.isRead) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    try {
      await notificationApi.dismissNotification(notificationId);
    } catch (error) {
      toast.error('Failed to dismiss notification', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
      void refresh();
    }
  }, [refresh]);

  const clearNotifications = useCallback(async () => {
    const previous = notifications;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await notificationApi.clearNotifications();
    } catch (error) {
      setNotifications(previous);
      setUnreadCount(previous.filter((item) => !item.isRead).length);
      toast.error('Failed to clear notifications', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    }
  }, [notifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    let wasUnread = false;
    setNotifications((current) =>
      current.map((item) => {
        if (item.id !== notificationId) return item;
        if (!item.isRead) wasUnread = true;
        return { ...item, isRead: true };
      })
    );
    if (wasUnread) {
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    try {
      await notificationApi.markNotificationRead(notificationId);
    } catch {
      void refresh();
    }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    const previous = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      setNotifications(previous);
      setUnreadCount(previous.filter((item) => !item.isRead).length);
    }
  }, [notifications]);

  return useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isPolling,
      refresh,
      dismissNotification,
      clearNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [
      clearNotifications,
      dismissNotification,
      isLoading,
      isPolling,
      markAllAsRead,
      markAsRead,
      notifications,
      refresh,
      unreadCount,
    ]
  );
};
