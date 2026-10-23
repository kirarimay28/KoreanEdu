import * as admin from 'firebase-admin';
import { clcLogin } from './scraper';
import { encrypt } from './crypto';

function initFirebase() {
  if (admin.apps.length > 0) return;
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? '{}')) });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { uid, clcId, clcPwd } = req.body ?? {};
  if (!uid || !clcId || !clcPwd) return res.status(400).json({ error: 'missing fields' });

  try {
    await clcLogin(clcId, clcPwd);

    const token = encrypt(JSON.stringify({ id: clcId, pwd: clcPwd }));

    initFirebase();
    await admin.firestore().collection('clcCredentials').doc(uid).set({
      token,
      connectedAt: new Date().toISOString(),
      enabled: true,
    });

    res.status(200).json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message ?? '').includes('로그인 실패')
      ? e.message
      : 'CLC 연결 실패';
    res.status(400).json({ error: msg });
  }
}
