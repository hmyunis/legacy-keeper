import { useCallback } from 'react';
import { appEnv } from '../services/env';
import { notificationApi } from '../services/notificationApi';

const SW_PATH = '/notification-sw.js';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(normalized);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer | null) => {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

const resolvePublicKey = async () => {
  try {
    const payload = await notificationApi.getPushPublicKey();
    if (payload.publicKey && payload.isAvailable) {
      return payload.publicKey;
    }
    if (!payload.isAvailable) {
      return null;
    }
  } catch {
    // Fall back to env key.
  }

  if (appEnv.vapidPublicKey) {
    return appEnv.vapidPublicKey;
  }

  return null;
};

const subscriptionToPayload = (subscription: PushSubscription) => ({
  endpoint: subscription.endpoint,
  p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
  auth: arrayBufferToBase64(subscription.getKey('auth')),
  userAgent: navigator.userAgent,
});

const hasSubscriptionCryptoKeys = (subscription: PushSubscription) =>
  Boolean(subscription.getKey('p256dh') && subscription.getKey('auth'));

const hasMatchingApplicationServerKey = (
  subscription: PushSubscription,
  expectedServerKey: Uint8Array
) => {
  const currentServerKey = subscription.options?.applicationServerKey;
  if (!currentServerKey) {
    return false;
  }

  const currentBytes = new Uint8Array(currentServerKey);
  if (currentBytes.length !== expectedServerKey.length) {
    return false;
  }

  for (let index = 0; index < currentBytes.length; index += 1) {
    if (currentBytes[index] !== expectedServerKey[index]) {
      return false;
    }
  }

  return true;
};

export type PushEnableResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'missing_key' | 'permission_denied' | 'subscribe_failed' };

let subscribeInFlight: Promise<PushEnableResult> | null = null;
let lastBackgroundSyncMs = 0;

export const usePushNotifications = () => {
  const enablePushNotifications = useCallback(
    async (requestPermission: boolean): Promise<PushEnableResult> => {
      if (subscribeInFlight) return subscribeInFlight;

      subscribeInFlight = (async (): Promise<PushEnableResult> => {
        if (!isPushSupported()) {
          return { ok: false, reason: 'unsupported' };
        }

        const publicKey = await resolvePublicKey();
        if (!publicKey) {
          return { ok: false, reason: 'missing_key' };
        }

        if (Notification.permission === 'denied') {
          return { ok: false, reason: 'permission_denied' };
        }

        if (Notification.permission !== 'granted' && requestPermission) {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            return { ok: false, reason: 'permission_denied' };
          }
        }

        if (Notification.permission !== 'granted') {
          return { ok: false, reason: 'permission_denied' };
        }

        try {
          const registration = await navigator.serviceWorker.register(SW_PATH);
          const applicationServerKey = urlBase64ToUint8Array(publicKey);
          let subscription = await registration.pushManager.getSubscription();

          if (
            subscription &&
            (!hasSubscriptionCryptoKeys(subscription) ||
              !hasMatchingApplicationServerKey(subscription, applicationServerKey))
          ) {
            await subscription.unsubscribe();
            subscription = null;
          }

          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey,
            });
          }

          if (!hasSubscriptionCryptoKeys(subscription)) {
            return { ok: false, reason: 'subscribe_failed' };
          }

          await notificationApi.subscribePush(subscriptionToPayload(subscription));
          return { ok: true };
        } catch {
          return { ok: false, reason: 'subscribe_failed' };
        }
      })().finally(() => {
        subscribeInFlight = null;
      });

      return subscribeInFlight;
    },
    []
  );

  const disablePushNotifications = useCallback(async () => {
    if (!isPushSupported()) return;

    try {
      const registration =
        (await navigator.serviceWorker.getRegistration(SW_PATH)) ||
        (await navigator.serviceWorker.ready);
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;

      if (subscription) {
        await subscription.unsubscribe();
      }

      await notificationApi.unsubscribePush(endpoint);
    } catch {
      // Explicitly silent; disable flow must be resilient.
    }
  }, []);

  const syncPushSubscriptionIfGranted = useCallback(async () => {
    if (!isPushSupported()) return;
    if (Notification.permission !== 'granted') return;
    const now = Date.now();
    if (now - lastBackgroundSyncMs < 5000) return;
    lastBackgroundSyncMs = now;
    await enablePushNotifications(false);
  }, [enablePushNotifications]);

  return {
    isSupported: isPushSupported(),
    enablePushNotifications,
    disablePushNotifications,
    syncPushSubscriptionIfGranted,
  };
};
