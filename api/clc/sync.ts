import * as admin from 'firebase-admin';
import { clcLogin, scrapeAll } from '../../lib/clc/scraper';
import { decrypt } from '../../lib/clc/crypto';

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

  const credDoc = await db.collection('clcCredentials').doc(uid).get();
  if (!credDoc.exists || !credDoc.data()?.enabled) {
    return res.status(404).json({ error: 'CLC 연동이 설정되지 않았습니다' });
  }

  let creds: { id: string; pwd: string };
  try {
    creds = JSON.parse(decrypt(credDoc.data()!.token));
  } catch {
    return res.status(500).json({ error: '자격증명 복호화 실패' });
  }

  try {
    const cookie = await clcLogin(creds.id, creds.pwd);
    const result = await scrapeAll(cookie);

    await db.collection('clcData').doc(uid).set({
      ...result,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ ok: true, scrapedAt: result.scrapedAt });
  } catch (e: any) {
    const msg = String(e?.message ?? '').includes('로그인 실패')
      ? e.message
      : '동기화 실패';
    res.status(500).json({ error: msg });
  }
}
