const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && !!VAPID_PUBLIC_KEY;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

export async function requestPushPermission() {
  if (!isPushSupported()) return false;
  if (Notification.permission === 'granted') {
    await subscribeToPush();
    return true;
  }
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  await subscribeToPush();
  return true;
}

export async function subscribeToPush() {
  if (!isPushSupported()) return null;

  const registration = await registerServiceWorker();
  if (!registration) return null;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const { invokeFunction } = await import('./supabaseFunctions');
  await invokeFunction('sendPushNotification', {
    action: 'subscribe',
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  });

  return subscription;
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { invokeFunction } = await import('./supabaseFunctions');
  await invokeFunction('sendPushNotification', { action: 'unsubscribe', endpoint }).catch(() => {});
}
