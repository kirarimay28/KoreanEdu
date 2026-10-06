import { collection, addDoc, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { getSubscriptionsForUsers } from './pushSubscription';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

async function sendWebPush(userIds: string[], title: string, body: string) {
  try {
    const subs = await getSubscriptionsForUsers(userIds);
    await Promise.all(
      subs.map(({ subscription }) =>
        fetch('/api/send-push-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, title, body }),
        }).catch(() => null)
      )
    );
  } catch {
    // web push is best-effort
  }
}

export async function sendPush(params: {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all([
    ...params.userIds.map(userId =>
      addDoc(collection(db, 'notifications'), {
        userId,
        title: params.title,
        body: params.body,
        read: false,
        createdAt: now,
      })
    ),
    sendWebPush(params.userIds, params.title, params.body),
  ]);
}

export function subscribeNotifications(
  userId: string,
  callback: (notifs: AppNotification[]) => void
): () => void {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  return onSnapshot(q, snap => {
    const notifs = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as AppNotification))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
    callback(notifs);
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', id), { read: true });
}

export async function markAllNotificationsRead(notifs: AppNotification[]): Promise<void> {
  await Promise.all(
    notifs.filter(n => !n.read).map(n => markNotificationRead(n.id))
  );
}
