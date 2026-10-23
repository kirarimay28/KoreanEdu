// POST /api/clc/sync-all
// Called by cron-job.org 3x/day (07:00, 13:00, 21:00 KST)
// Header: x-cron-secret must match CLC_CRON_SECRET env var
// Syncs all enabled users with staggered timing
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { clcLogin, scrapeAll } from './scraper';
import { decrypt } from './crypto';

function initFirebase() {
  if (getApps().length > 0) return;
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? '{}')) });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Verify cron secret
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CLC_CRON_SECRET) {
    return res.status(403).json({ error: 'forbidden' });
  }

  // Check kill switch
  initFirebase();
  const db = getFirestore();
  const cfg = await db.collection('adminConfig').doc('clc').get();
  if (cfg.exists && cfg.data()?.killSwitch === true) {
    return res.status(200).json({ ok: true, skipped: 'kill switch active' });
  }

  const snapshot = await db.collection('clcCredentials').where('enabled', '==', true).get();
  const results: { uid: string; status: string }[] = [];

  for (let i = 0; i < snapshot.docs.length; i++) {
    const doc = snapshot.docs[i];
    const uid = doc.id;

    // Stagger: 2s between users to avoid hammering CLC server
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
