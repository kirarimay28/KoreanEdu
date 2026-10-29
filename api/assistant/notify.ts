import webpush from 'web-push';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) });
}

webpush.setVapidDetails(
  'mailto:lil146588@gmail.com',
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const db = admin.firestore();
const OWNER = '서연';

function isDndActive(settings: any, nowHHMM: string, weekday: string, classTimes: any[], workSlot: any): boolean {
  if (!settings?.dnd?.enabled) return false;
  const dnd = settings.dnd;

  // Sleep DND
  if (dnd.sleepStart && dnd.sleepEnd) {
    const s = dnd.sleepStart, e = dnd.sleepEnd;
    if (s > e) { if (nowHHMM >= s || nowHHMM < e) return true; }
    else if (nowHHMM >= s && nowHHMM < e) return true;
  }

  // Commute DND
  if (dnd.commuteEnabled && workSlot) {
    const cStart = toTimeStr(toMin(workSlot.start) - (workSlot.commuteMin ?? 0));
    const cEnd = workSlot.start;
    if (nowHHMM >= cStart && nowHHMM < cEnd) return true;
    const rStart = workSlot.end;
    const rEnd = toTimeStr(toMin(workSlot.end) + (workSlot.returnMin ?? 0));
    if (nowHHMM >= rStart && nowHHMM < rEnd) return true;
  }

  // Work DND
  if (dnd.workEnabled && workSlot && nowHHMM >= workSlot.start && nowHHMM < workSlot.end) return true;

  // Class DND
  if (dnd.classEnabled) {
    for (const ct of classTimes) {
      if (nowHHMM >= ct.start && nowHHMM < ct.end) return true;
    }
  }

  // Custom slots
  for (const slot of (dnd.customSlots ?? [])) {
    if (!slot.days?.includes(weekday)) continue;
    if (nowHHMM >= slot.start && nowHHMM < slot.end) return true;
  }
  return false;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toTimeStr(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const now = new Date();
  const nowHHMM = now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
  const today = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '-').replace('.', '');
  const weekday = now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short' }).slice(0, 1);

  try {
    const settingsSnap = await db.collection('assistantSettings').doc(OWNER).get();
    if (!settingsSnap.exists) return res.status(200).json({ skipped: 'no settings' });
    const settings = settingsSnap.data();

    const blocksSnap = await db.collection('assistantStudyBlocks')
      .where('userId', '==', OWNER).where('date', '==', today).get();
    const blocks = blocksSnap.docs.map(d => d.data());

    const deadlinesSnap = await db.collection('assistantDeadlines')
      .where('userId', '==', OWNER).where('completed', '==', false).get();
    const deadlines = deadlinesSnap.docs.map(d => d.data());

    const workSnap = await db.collection('assistantWorkSchedule').doc(OWNER).get();
    let workSlot: any = null;
    if (workSnap.exists) {
      const w = workSnap.data()!;
      if (w.workDays?.includes(weekday)) {
        workSlot = { start: w.workStart, end: w.workEnd, commuteMin: w.commuteMinutes, returnMin: w.returnMinutes };
      }
    }

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

    if (isDndActive(settings, nowHHMM, weekday, classTimes, workSlot)) {
      return res.status(200).json({ sent: 0, reason: 'dnd' });
    }

    const payloads: Array<{ title: string; body: string }> = [];

    // Blocks starting in next 10 min
    for (const b of blocks) {
      if (b.status !== '예정') continue;
      const diff = toMin(b.start) - toMin(nowHHMM);
      if (diff >= 0 && diff <= 10) {
        payloads.push({ title: '⏰ 블록 시작', body: `곧 시작해야 해 — ${b.start} ${b.label}` });
      }
    }

    // Urgent deadlines
    for (const d of deadlines) {
      const daysLeft = Math.ceil((new Date(d.date + 'T00:00:00+09:00').getTime() - now.getTime()) / 86400000);
      if (daysLeft <= 1) {
        payloads.push({ title: '🔔 마감 임박', body: `${d.title} — D-${daysLeft}` });
      }
    }

    if (payloads.length === 0) return res.status(200).json({ sent: 0 });

    const subsSnap = await db.collection('pushSubscriptions').where('userId', '==', OWNER).get();
    let sent = 0;
    for (const payload of payloads) {
      const msg = JSON.stringify(payload);
      for (const doc of subsSnap.docs) {
        try {
          await webpush.sendNotification(doc.data().subscription, msg);
          sent++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) await doc.ref.delete();
        }
      }
      await db.collection('assistantNotifLog').add({ userId: OWNER, date: today, type: 'notify', sentAt: now.toISOString() });
    }

    return res.status(200).json({ sent });
  } catch (err: any) {
    console.error('assistant/notify error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
