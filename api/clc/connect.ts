// POST /api/clc/connect
// Body: { uid, clcId, clcPwd }
// Tests CLC credentials, stores AES-256-GCM encrypted credentials in Firestore
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { clcLogin } from './scraper';
import { encrypt } from './crypto';

function initFirebase() {
  if (getApps().length > 0) return;
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? '{}')) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { uid, clcId, clcPwd } = req.body ?? {};
  if (!uid || !clcId || !clcPwd) return res.status(400).json({ error: 'missing fields' });

  try {
    // Verify credentials work
    await clcLogin(clcId, clcPwd);

    // Store encrypted — password never leaves server in plain text
    const token = encrypt(JSON.stringify({ id: clcId, pwd: clcPwd }));

    initFirebase();
    const db = getFirestore();
    await db.collection('clcCredentials').doc(uid).set({
      token,
      connectedAt: new Date().toISOString(),
      enabled: true,
    });

    res.status(200).json({ ok: true });
  } catch (e: any) {
    // Never expose raw error which might contain credentials
    const msg = String(e?.message ?? '').includes('로그인 실패')
      ? e.message
      : 'CLC 연결 실패';
    res.status(400).json({ error: msg });
  }
}
