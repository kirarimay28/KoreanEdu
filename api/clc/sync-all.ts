import * as admin from 'firebase-admin';
import { clcLogin, scrapeAll } from '../../lib/clc/scraper';
import { decrypt } from '../../lib/clc/crypto';

function initFirebase() {
  if (admin.apps.length > 0) return;
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? '{}')) });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CLC_CRON_SECRET) {
    return res.status(403).json({ error: 'forbidden' });
  }

  initFirebase();
  const db = admin.firestore();
  const cfg = await db.collection('adminConfig').doc('clc').get();
  if (cfg.exists && cfg.data()?.killSwitch === true) {
    return res.status(200).json({ ok: true, skipped: 'kill switch active' });
  }

  const snapshot = await db.collection('clcCredentials').where('enabled', '==', true).get();
  const results: { uid: string; status: string }[] = [];

  for (let i = 0; i < snapshot.docs.length; i++) {
    const doc = snapshot.docs[i];
    const uid = doc.id;

    if (i > 0) await sleep(2000);

    let creds: { id: string; pwd: string };
    try {
      creds = JSON.parse(decrypt(doc.data().token));
    } catch {
      results.push({ uid, status: 'decrypt_error' });
      continue;
    }

    try {
      const cookie = await clcLogin(creds.id, creds.pwd);
      const result = await scrapeAll(cookie);
      await db.collection('clcData').doc(uid).set({
        ...result,
        updatedAt: new Date().toISOString(),
      });
      results.push({ uid, status: 'ok' });
    } catch (e: any) {
      results.push({ uid, status: `error: ${e?.message ?? 'unknown'}` });
    }
  }

  res.status(200).json({ ok: true, count: snapshot.size, results });
}
