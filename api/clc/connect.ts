import { createCipheriv, randomBytes } from 'crypto';

const ALG = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;

function getKey(): Buffer {
  const raw = process.env.CLC_ENCRYPTION_KEY ?? '';
  if (!raw) throw new Error('CLC_ENCRYPTION_KEY env var not set');
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== KEY_LEN) throw new Error('CLC_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  return buf;
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), ct.toString('hex')].join(':');
}

async function getDb() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { uid, clcId, clcPwd } = req.body ?? {};
  if (!uid || !clcId || !clcPwd) return res.status(400).json({ error: 'missing fields' });
  try {
    const token = encrypt(JSON.stringify({ id: clcId, pwd: clcPwd }));
    const db = await getDb();
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
