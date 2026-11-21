import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) || 'BIE7KHBN5_nfWTXfdhP9cH4rApmvjhYhUyLRlq7fZMSIwBbVzuVxg-8JSHnxUyq5WwOxYptvH873786dDWX9i3A';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export async function registerAndSubscribe(userId: string): Promise<{ ok: boolean; subscription?: PushSubscriptionJSON; error?: string }> {
  if (!('serviceWorker' in navigator)) return { ok: false, error: 'ServiceWorker not supported' };
  if (!('PushManager' in window)) return { ok: false, error: 'PushManager not supported' };
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, error: 'Permission: ' + permission };
    // 서버에서 직접 VAPID 키 조회 → 빌드 타임 키 불일치 방지
    let vapidKey = VAPID_PUBLIC_KEY;
    try {
      const r = await fetch('/api/vapid-key');
      if (r.ok) { const j = await r.json(); if (j.key) vapidKey = j.key; }
    } catch {}
    const appKey = urlBase64ToUint8Array(vapidKey);
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
    const subJson = sub.toJSON();
    const endpointTail = subJson.endpoint!.split('/').pop()?.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) ?? String(Date.now());
    const docId = `${userId}_${endpointTail}`;
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
