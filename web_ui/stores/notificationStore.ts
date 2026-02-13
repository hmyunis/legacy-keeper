
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'upload' | 'comment' | 'security' | 'tree' | 'system';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: NotificationType;
  isRead: boolean;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [
        {
          id: '1',
          title: 'New Archival Upload',
          message: 'Ezio added "Summer in Tuscany 1954" to the vault.',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          type: 'upload',
          isRead: false,
        },
        {
          id: '2',
          title: 'Security Alert',
          message: 'New login detected from Safari on macOS.',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          type: 'security',
          isRead: true,
        }
      ],
      addNotification: (n) => set((state) => ({
        notifications: [
          {
            ...n,
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            isRead: false,
          },
          ...state.notifications,
        ],
      })),
      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
      })),
      markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      })),
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      })),
      clearAll: () => set({ notifications: [] }),
    }),
    {
      name: 'legacy_keeper_notifications_v1',
    }
  )
);
