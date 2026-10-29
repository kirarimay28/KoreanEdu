import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { judgeNotifications } from '../../src/assistantNotif';
import type { AssistantSettings, AssistantDeadline, StudyBlock } from '../../src/assistantTypes';
import type { DndContext, WorkSlotInfo } from '../../src/assistantNotif';
import type { AssistantWeekday } from '../../src/assistantTypes';

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) });
}

webpush.setVapidDetails(
  'mailto:lil146588@gmail.com',
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow Vercel Cron (GET) and direct POST calls
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const OWNER = '서연';
  const now = new Date();
  const nowHHMM = now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
  const today = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '-').replace('.', '');
  const weekday = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short' }).slice(0, 1) as AssistantWeekday;
  const nowISO = now.toISOString();

  try {
    // Load settings
    const settingsSnap = await db.collection('assistantSettings').doc(OWNER).get();
    if (!settingsSnap.exists) return res.status(200).json({ skipped: 'no settings' });
    const settings = settingsSnap.data() as AssistantSettings;

    // Load today's blocks
    const blocksSnap = await db.collection('assistantStudyBlocks')
      .where('userId', '==', OWNER)
      .where('date', '==', today)
      .get();
    const blocks = blocksSnap.docs.map(d => d.data() as StudyBlock);

    // Load active deadlines
    const deadlinesSnap = await db.collection('assistantDeadlines')
      .where('userId', '==', OWNER)
      .where('completed', '==', false)
      .get();
    const deadlines = deadlinesSnap.docs.map(d => d.data() as AssistantDeadline);

    // Load work schedule
    const workSnap = await db.collection('assistantWorkSchedule').doc(OWNER).get();
    let workSlot: WorkSlotInfo | null = null;
    if (workSnap.exists) {
      const w = workSnap.data()!;
      if (w.workDays?.includes(weekday)) {
        workSlot = { start: w.workStart, end: w.workEnd, commuteMin: w.commuteMinutes, returnMin: w.returnMinutes };
      }
    }

    // Load today's class times
    const classTimetableSnap = await db.collection('assistantSchedule').doc(OWNER).get();
    const classTimes: Array<{ start: string; end: string }> = [];
    if (classTimetableSnap.exists) {
      const ct = classTimetableSnap.data()!;
      for (const subj of (ct.subjects ?? [])) {
        for (const t of (subj.times ?? [])) {
          if (t.day === weekday) classTimes.push({ start: t.start, end: t.end });
        }
      }
    }

    // Count today's sent notifications
    const countSnap = await db.collection('assistantNotifLog')
      .where('userId', '==', OWNER)
      .where('date', '==', today)
      .count()
      .get();
    const sentCountToday = countSnap.data().count;

    const dndCtx: DndContext = { nowHHMM, weekday, classTimes, workSlot };
    const payloads = judgeNotifications({ settings, ctx: dndCtx, blocks, deadlines, today, nowHHMM, nowISO, sentCountToday });

    if (payloads.length === 0) return res.status(200).json({ sent: 0 });

    // Load push subscriptions
    const subsSnap = await db.collection('pushSubscriptions').where('userId', '==', OWNER).get();
    const subs = subsSnap.docs.map(d => d.data().subscription as webpush.PushSubscription);

    let sent = 0;
    for (const payload of payloads) {
      const msg = JSON.stringify({ title: payload.title, body: payload.body });
      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub, msg);
          sent++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Expired subscription — skip silently; cleanup handled separately
          }
        }
      }
      // Log sent notification
      await db.collection('assistantNotifLog').add({
        userId: OWNER, date: today, type: payload.type, sentAt: nowISO,
      });
    }

    return res.status(200).json({ sent, payloads: payloads.length });
  } catch (err: any) {
    console.error('assistant/notify error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
