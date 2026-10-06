import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) || 'BBeATcMUNmkXIHG4wE3R_POt4_l6cuVCFBWi_qf99B90ivyyi8al2E7K4UVWp9mw3RllPZ6z7pEoyODFh0LJOMQ';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export async function registerAndSubscribe(userId: string): Promise<{ ok: boolean; subscription?: PushSubscriptionJSON; error?: string }> {
  if (!VAPID_PUBLIC_KEY) return { ok: false, error: 'VAPID key missing' };
  if (!('serviceWorker' in navigator)) return { ok: false, error: 'ServiceWorker not supported' };
  if (!('PushManager' in window)) return { ok: false, error: 'PushManager not supported' };
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, error: 'Permission: ' + permission };
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const subJson = sub.toJSON();
    const docId = userId + '_' + String(Date.now());
    await setDoc(doc(db, 'pushSubscriptions', docId), {
      userId,
      subscription: subJson,
      createdAt: new Date().toISOString(),
    });
    return { ok: true, subscription: subJson };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

export async function getSubscriptionsForUsers(userIds: string[]): Promise<{ userId: string; subscription: PushSubscriptionJSON }[]> {
  if (!userIds.length) return [];
  const results: { userId: string; subscription: PushSubscriptionJSON }[] = [];
  for (const userId of userIds) {
    const q = query(collection(db, 'pushSubscriptions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.subscription) results.push({ userId, subscription: data.subscription });
    });
  }
  return results;
}

export async function removeSubscriptionsForUser(userId: string): Promise<void> {
  const q = query(collection(db, 'pushSubscriptions'), where('userId', '==', userId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}
