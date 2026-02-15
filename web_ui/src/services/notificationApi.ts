import axiosClient from './axiosClient';
import type {
  ApiNotificationPreferences,
  ApiNotificationsResponse,
  ApiPushPublicKeyResponse,
} from '../types/api.types';
import type { InAppNotification, NotificationPreferences } from '../types';

const NOTIFICATIONS_BASE = 'notifications/';

const normalizeType = (value: string): InAppNotification['type'] => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'upload') return 'upload';
  if (normalized === 'comment') return 'comment';
  if (normalized === 'security') return 'security';
  if (normalized === 'tree') return 'tree';
  if (normalized === 'member') return 'member';
  return 'system';
};

const normalizeCreatedAt = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const mapApiNotification = (notification: any): InAppNotification => ({
  id: String(notification.id),
  title: notification.title || 'Notification',
  message: notification.message || '',
  type: normalizeType(notification.type || notification.notificationType || 'system'),
  isRead: Boolean(notification.isRead),
  createdAt: normalizeCreatedAt(notification.createdAt ?? notification.created_at),
  route: notification.route || '/',
  actorName: notification.actorName || undefined,
  vaultId: notification.vaultId || null,
  metadata: notification.metadata || {},
});

const mapPreferences = (payload: ApiNotificationPreferences): NotificationPreferences => ({
  inAppEnabled: Boolean(payload.inAppEnabled),
  pushEnabled: Boolean(payload.pushEnabled),
  newUploads: Boolean(payload.newUploads),
  comments: Boolean(payload.comments),
  treeUpdates: Boolean(payload.treeUpdates),
  securityAlerts: Boolean(payload.securityAlerts),
  memberJoins: Boolean(payload.memberJoins),
  pushAvailable: Boolean(payload.pushAvailable),
});

export interface NotificationsQueryParams {
  since?: string;
  limit?: number;
}

export interface NotificationsPayload {
  items: InAppNotification[];
  unreadCount: number;
  serverTime: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

export const notificationApi = {
  getNotifications: async (params?: NotificationsQueryParams): Promise<NotificationsPayload> => {
    const queryParams: Record<string, unknown> = {};
    if (params?.since) queryParams.since = params.since;
    if (params?.limit) queryParams.limit = params.limit;

    const response = await axiosClient.get<ApiNotificationsResponse>(NOTIFICATIONS_BASE, {
      params: queryParams,
    });

    return {
      items: (response.data.items || []).map(mapApiNotification),
      unreadCount: response.data.unreadCount || 0,
      serverTime: response.data.serverTime,
    };
  },

  dismissNotification: async (notificationId: string): Promise<void> => {
    await axiosClient.delete(`${NOTIFICATIONS_BASE}${notificationId}/`);
  },

  clearNotifications: async (): Promise<void> => {
    await axiosClient.delete(NOTIFICATIONS_BASE);
  },

  markNotificationRead: async (notificationId: string): Promise<void> => {
    await axiosClient.post(`${NOTIFICATIONS_BASE}${notificationId}/read/`);
  },

  markAllRead: async (): Promise<void> => {
    await axiosClient.post(`${NOTIFICATIONS_BASE}read-all/`);
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await axiosClient.get<ApiNotificationPreferences>(`${NOTIFICATIONS_BASE}preferences/`);
    return mapPreferences(response.data);
  },

  updatePreferences: async (
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> => {
    const payload: Record<string, unknown> = {};
    if (updates.inAppEnabled !== undefined) payload.inAppEnabled = updates.inAppEnabled;
    if (updates.pushEnabled !== undefined) payload.pushEnabled = updates.pushEnabled;
    if (updates.newUploads !== undefined) payload.newUploads = updates.newUploads;
    if (updates.comments !== undefined) payload.comments = updates.comments;
    if (updates.treeUpdates !== undefined) payload.treeUpdates = updates.treeUpdates;
    if (updates.securityAlerts !== undefined) payload.securityAlerts = updates.securityAlerts;
    if (updates.memberJoins !== undefined) payload.memberJoins = updates.memberJoins;

    const response = await axiosClient.patch<ApiNotificationPreferences>(
      `${NOTIFICATIONS_BASE}preferences/`,
      payload
    );
    return mapPreferences(response.data);
  },

  getPushPublicKey: async (): Promise<ApiPushPublicKeyResponse> => {
    const response = await axiosClient.get<ApiPushPublicKeyResponse>(`${NOTIFICATIONS_BASE}push/public-key/`);
    return response.data;
  },

  subscribePush: async (payload: PushSubscriptionPayload): Promise<void> => {
    await axiosClient.post(`${NOTIFICATIONS_BASE}push/subscribe/`, payload);
  },

  unsubscribePush: async (endpoint?: string): Promise<void> => {
    await axiosClient.post(`${NOTIFICATIONS_BASE}push/unsubscribe/`, endpoint ? { endpoint } : {});
  },

  triggerTestNotification: async (): Promise<void> => {
    await axiosClient.post(`${NOTIFICATIONS_BASE}test-trigger/`);
  },
};
