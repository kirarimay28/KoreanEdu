import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALG = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.CLC_ENCRYPTION_KEY ?? '';
  if (!raw) throw new Error('CLC_ENCRYPTION_KEY env var not set');
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== KEY_LEN) throw new Error('CLC_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  return buf;
}

// Returns "iv:tag:ciphertext" all hex
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), ct.toString('hex')].join(':');
}

export function decrypt(token: string): string {
  const key = getKey();
  const parts = token.split(':');
  if (parts.length !== 3) throw new Error('invalid token format');
  const [ivHex, tagHex, ctHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString('utf8');
}
