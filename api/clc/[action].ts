// 최상위 import 없음 — 모듈 로딩 실패가 try/catch에 걸리도록 동적 import 사용

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function getFirebaseDb() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

async function handleConnect(req: any, res: any) {
  const { uid, clcId, clcPwd } = req.body ?? {};
  if (!uid || !clcId || !clcPwd) return res.status(400).json({ error: 'missing fields' });

  try {
    const { encrypt } = await import('../../lib/clc/crypto');
    const db = await getFirebaseDb();
    const token = encrypt(JSON.stringify({ id: clcId, pwd: clcPwd }));
    await db.collection('clcCredentials').doc(uid).set({
      token,
      connectedAt: new Date().toISOString(),
      enabled: true,
    });
    res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[clc/connect]', e?.message ?? e);
    res.status(500).json({ error: 'CLC 연동 저장 실패: ' + String(e?.message ?? '') });
  }
}

async function handleSync(req: any, res: any) {
  const { uid } = req.body ?? {};
  if (!uid) return res.status(400).json({ error: 'missing uid' });

  try {
    const { decrypt } = await import('../../lib/clc/crypto');
    const { clcLogin, scrapeAll } = await import('../../lib/clc/scraper');
    const db = await getFirebaseDb();

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

    const cookie = await clcLogin(creds.id, creds.pwd);
    const result = await scrapeAll(cookie);
    await db.collection('clcData').doc(uid).set({
      ...result,
      updatedAt: new Date().toISOString(),
    });
    res.status(200).json({ ok: true, scrapedAt: result.scrapedAt });
  } catch (e: any) {
    console.error('[clc/sync]', e?.message ?? e);
    const msg = String(e?.message ?? '').includes('로그인 실패') ? e.message : '동기화 실패: ' + String(e?.message ?? '');
    res.status(500).json({ error: msg });
  }
}

async function handleDisconnect(req: any, res: any) {
  const { uid } = req.body ?? {};
  if (!uid) return res.status(400).json({ error: 'missing uid' });

  try {
    const db = await getFirebaseDb();
    await Promise.all([
      db.collection('clcCredentials').doc(uid).delete(),
      db.collection('clcData').doc(uid).delete(),
    ]);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[clc/disconnect]', e?.message ?? e);
    res.status(500).json({ error: '연동 해제 실패: ' + String(e?.message ?? '') });
  }
}

async function handleSyncAll(req: any, res: any) {
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CLC_CRON_SECRET) {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const { decrypt } = await import('../../lib/clc/crypto');
    const { clcLogin, scrapeAll } = await import('../../lib/clc/scraper');
    const db = await getFirebaseDb();

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
  } catch (e: any) {
    console.error('[clc/sync-all]', e?.message ?? e);
    res.status(500).json({ error: String(e?.message ?? 'sync-all 실패') });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const action = req.query.action as string;

  try {
    switch (action) {
      case 'connect':    return await handleConnect(req, res);
      case 'sync':       return await handleSync(req, res);
      case 'disconnect': return await handleDisconnect(req, res);
      case 'sync-all':   return await handleSyncAll(req, res);
      default:           return res.status(404).json({ error: 'unknown action' });
    }
  } catch (e: any) {
    console.error('[clc/handler]', e?.message ?? e);
    if (!res.headersSent) res.status(500).json({ error: String(e?.message ?? '서버 오류') });
  }
}
