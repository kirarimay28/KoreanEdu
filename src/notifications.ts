import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getMessagingInstance, firebaseConfig, db } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined;

export async function requestNotificationPermission(userId: string): Promise<boolean> {
  if (!VAPID_KEY) {
    console.warn('VITE_FCM_VAPID_KEY not set');
    return false;
  }

  const messaging = await getMessagingInstance();
  if (!messaging) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  // config를 서비스 워커로 전달
  const swReg = await navigator.serviceWorker.ready;
  swReg.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });

  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    if (token) {
      await setDoc(doc(db, 'fcmTokens', `${userId}_web`), {
        userId,
        token,
        platform: 'web',
        updatedAt: new Date().toISOString(),
      });
      return true;
    }
  } catch (e) {
    console.error('FCM token error:', e);
  }
  return false;
}

export async function removeFCMToken(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'fcmTokens', `${userId}_web`));
  } catch { /* ignore */ }
}

export function listenForegroundMessages(onReceive: (title: string, body: string) => void) {
  getMessagingInstance().then(messaging => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? '나랏말';
      const body = payload.notification?.body ?? '';
      onReceive(title, body);
    });
  });
}

export async function sendPush(params: {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  try {
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (e) {
    console.error('sendPush error:', e);
  }
}
