import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export async function registerAndSubscribe(userId: string): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await setDoc(doc(db, 'pushSubscriptions', userId + '_' + btoa(sub.endpoint).slice(0, 24)), {
      userId,
      subscription: sub.toJSON(),
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
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
