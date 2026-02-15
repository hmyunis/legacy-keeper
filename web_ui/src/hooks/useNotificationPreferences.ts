import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationApi } from '../services/notificationApi';
import type { NotificationPreferences } from '../types';
import { getApiErrorMessage } from '../services/httpError';

export const NOTIFICATION_PREFERENCES_QUERY_KEY = ['notificationPreferences'] as const;

export const useNotificationPreferences = (enabled = true) =>
  useQuery({
    queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
    queryFn: () => notificationApi.getPreferences(),
    enabled,
  });

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<NotificationPreferences>) => notificationApi.updatePreferences(updates),
    onSuccess: (next) => {
      queryClient.setQueryData(NOTIFICATION_PREFERENCES_QUERY_KEY, next);
    },
    onError: (error) => {
      toast.error('Unable to update notification preferences', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
};

export const useTriggerNotificationTest = () =>
  useMutation({
    mutationFn: () => notificationApi.triggerTestNotification(),
    onSuccess: () => {
      toast.success('Test notification sent');
    },
    onError: (error) => {
      toast.error('Unable to send test notification', {
        description: getApiErrorMessage(error, 'Please try again.'),
      });
    },
  });
