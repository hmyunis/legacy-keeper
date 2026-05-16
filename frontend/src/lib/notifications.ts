import axiosClient from "../services/axiosClient";

export const subscribeToPush = async () => {
  const registration = await navigator.serviceWorker.ready;

  const publicVapidKey = 'YOUR_VAPID_PUBLIC_KEY';

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicVapidKey
  });

  await axiosClient.post('/auth/push-subscribe/', subscription);
};