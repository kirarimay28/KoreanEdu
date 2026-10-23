// POST /api/clc/disconnect
// Body: { uid }
// Deletes CLC credentials and cached data for this user
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initFirebase() {
  if (getApps().length > 0) return;
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? '{}')) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { uid } = req.body ?? {};
  if (!uid) return res.status(400).json({ error: 'missing uid' });

  initFirebase();
  const db = getFirestore();

  await Promise.all([
    db.collection('clcCredentials').doc(uid).delete(),
    db.collection('clcData').doc(uid).delete(),
  ]);

  res.status(200).json({ ok: true });
}
