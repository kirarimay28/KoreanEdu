/**
 * 아침 브리핑 (07:00 KST) + 저녁 체크인 (21:00 KST)
 * Vercel Cron: "0 22,12 * * *" (UTC) = 07:00 & 21:00 Asia/Seoul
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import webpush from 'web-push';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) });
}

webpush.setVapidDetails(
  'mailto:lil146588@gmail.com',
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const db = getFirestore();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const OWNER = '서연';

// ── Seoul time helpers ────────────────────────────────────────

function seoulNow() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\. /g, '-').replace('.', '');
  const hour = parseInt(now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', hour12: false }), 10);
  return { now, dateStr, hour };
}

// ── Push sender ───────────────────────────────────────────────

async function pushToOwner(title: string, body: string): Promise<void> {
  const subsSnap = await db.collection('pushSubscriptions').where('userId', '==', OWNER).get();
  for (const doc of subsSnap.docs) {
    try {
      await webpush.sendNotification(doc.data().subscription, JSON.stringify({ title, body }));
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await doc.ref.delete();
      }
    }
  }
}

// ── LLM message generator ─────────────────────────────────────

async function generateMessage(system: string, user: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return res.content.map(b => b.type === 'text' ? b.text : '').join('').trim();
}

// ── Morning brief ─────────────────────────────────────────────

async function morningBrief(today: string): Promise<void> {
  // Load today's blocks
  const blocksSnap = await db.collection('assistantStudyBlocks')
    .where('userId', '==', OWNER).where('date', '==', today).get();
  const blocks = blocksSnap.docs.map(d => d.data()).sort((a, b) => a.start.localeCompare(b.start));

  // Load urgent deadlines (3 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 3);
  const dlSnap = await db.collection('assistantDeadlines')
    .where('userId', '==', OWNER).where('completed', '==', false).get();
  const urgent = dlSnap.docs.map(d => d.data())
    .filter(d => d.date <= cutoff.toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date));

  const blockList = blocks.length > 0
    ? blocks.map((b: any) => `${b.start} ${b.label}`).join(', ')
    : '오늘 블록 없음';
  const deadlineStr = urgent.length > 0
    ? urgent.map((d: any) => d.title).join(', ')
    : '';

  const system = '임용 준비생의 AI 비서. 반말로 아주 짧게(2~3줄) 아침 브리핑 메시지를 써. 오늘 할 일과 마감이 있으면 챙겨 알려주고, 간단히 응원해.';
  const userMsg = `오늘 블록: ${blockList}${deadlineStr ? `\n마감 임박: ${deadlineStr}` : ''}`;

  const body = await generateMessage(system, userMsg);
  await pushToOwner('☀️ 아침 브리핑', body);

  await db.collection('assistantNotifLog').add({
    userId: OWNER, date: today, type: 'morning_brief', sentAt: new Date().toISOString(),
  });
}

// ── Evening check-in ──────────────────────────────────────────

async function eveningCheckIn(today: string): Promise<void> {
  const blocksSnap = await db.collection('assistantStudyBlocks')
    .where('userId', '==', OWNER).where('date', '==', today).get();
  const blocks = blocksSnap.docs.map(d => d.data());

  const done   = blocks.filter((b: any) => b.status === '완료').length;
  const partial = blocks.filter((b: any) => b.status === '부분').length;
  const missed = blocks.filter((b: any) => b.status === '미완' || b.status === '예정').length;
  const total  = blocks.length;

  const system = '임용 준비생의 AI 비서. 반말로 아주 짧게(2~3줄) 저녁 체크인 메시지를 써. 오늘 실적을 보고 칭찬하거나 부드럽게 독려해.';
  const userMsg = `오늘 결과: 전체 ${total}개 중 완료 ${done}, 부분 ${partial}, 미완/예정 ${missed}`;

  const body = await generateMessage(system, userMsg);
  const emoji = missed === 0 ? '🎉' : partial > 0 ? '📝' : '💪';
  await pushToOwner(`${emoji} 저녁 체크인`, body);

  await db.collection('assistantNotifLog').add({
    userId: OWNER, date: today, type: 'evening_checkin', sentAt: new Date().toISOString(),
  });
}

// ── Handler ───────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  try {
    const { dateStr, hour } = seoulNow();

    if (hour === 7) {
      await morningBrief(dateStr);
      return res.status(200).json({ type: 'morning_brief', date: dateStr });
    }

    if (hour === 21) {
      await eveningCheckIn(dateStr);
      return res.status(200).json({ type: 'evening_checkin', date: dateStr });
    }

    return res.status(200).json({ skipped: true, hour });
  } catch (err: any) {
    console.error('assistant/daily error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
