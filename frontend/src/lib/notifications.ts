import axiosClient from "../services/axiosClient";
import { appEnv } from "../services/env";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const bytesEqual = (left: ArrayBuffer | null, right: Uint8Array) => {
  if (!left) return false;
  const leftBytes = new Uint8Array(left);
  if (leftBytes.length !== right.length) return false;
  return leftBytes.every((value, index) => value === right[index]);
};

export const subscribeToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by the browser.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const publicVapidKey = appEnv.vapidPublicKey;
  if (!publicVapidKey) throw new Error("VAPID Key is missing from environment.");
  const applicationServerKey = urlBase64ToUint8Array(publicVapidKey);

  let existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription && !bytesEqual(existingSubscription.options.applicationServerKey, applicationServerKey)) {
    await axiosClient.post('/auth/push-unsubscribe/', { endpoint: existingSubscription.endpoint });
    await existingSubscription.unsubscribe();
    existingSubscription = null;
  }

  const createdSubscription = !existingSubscription;
  const subscription = existingSubscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  });

  try {
    await axiosClient.post('/auth/push-subscribe/', subscription);
  } catch (error) {
    if (createdSubscription) {
      await subscription.unsubscribe();
    }
    throw error;
  }
};

export const unsubscribeFromPush = async () => {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await axiosClient.post('/auth/push-unsubscribe/', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
    return true;
  }
  await axiosClient.post('/auth/push-unsubscribe/', {});
  return false;
};

export const getPushState = async () => {
  const browserSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  const permission = browserSupported ? Notification.permission : 'denied';
  if (!browserSupported) {
    return { browserSupported: false, permission, enabled: false };
  }
  const registration = await navigator.serviceWorker.register('/sw.js');
  const localSubscription = await registration.pushManager.getSubscription();
  const serverRes = await axiosClient.get('/auth/push-status/');
  const serverEnabled = !!serverRes.data?.enabled;
  return {
    browserSupported: true,
    permission,
    enabled: !!localSubscription && serverEnabled,
  };
};
