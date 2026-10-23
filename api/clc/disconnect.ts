import * as admin from 'firebase-admin';

function initFirebase() {
  if (admin.apps.length > 0) return;
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? '{}')) });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { uid } = req.body ?? {};
  if (!uid) return res.status(400).json({ error: 'missing uid' });

  initFirebase();
  const db = admin.firestore();

  await Promise.all([
    db.collection('clcCredentials').doc(uid).delete(),
    db.collection('clcData').doc(uid).delete(),
  ]);

  res.status(200).json({ ok: true });
}
