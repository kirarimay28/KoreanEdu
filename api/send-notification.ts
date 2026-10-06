import * as admin from 'firebase-admin';
import { getDocs, collection } from 'firebase/firestore';

let initialized = false;

function initAdmin() {
  if (initialized || admin.apps.length > 0) { initialized = true; return; }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set');
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  initialized = true;
}

export const config = { api: { bodyParser: { sizeLimit: '256kb' } } };

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userIds, title, body, data } = req.body ?? {};
  if (!Array.isArray(userIds) || !title || !body) {
    res.status(400).json({ error: 'userIds, title, body required' });
    return;
  }

  try {
    initAdmin();
  } catch (e: any) {
    // FIREBASE_SERVICE_ACCOUNT not set — silently skip
    res.status(200).json({ sent: 0, skipped: true });
    return;
  }

  // Firestore Admin SDK으로 해당 유저들의 FCM 토큰 조회
  const db = admin.firestore();
  const snap = await db.collection('fcmTokens').get();
  const tokens: string[] = [];
  snap.forEach(doc => {
    const d = doc.data();
    if (userIds.includes(d.userId) && d.token) tokens.push(d.token);
  });

  if (tokens.length === 0) {
    res.status(200).json({ sent: 0 });
    return;
  }

  // 배치 전송 (최대 500개)
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));

  let sent = 0;
  for (const chunk of chunks) {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      data: data ?? {},
      webpush: {
        notification: { icon: '/icon-192.png', badge: '/icon-192.png' },
      },
    });
    sent += response.successCount;
  }

  res.status(200).json({ sent });
}
