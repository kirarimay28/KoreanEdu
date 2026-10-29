/**
 * 주간 리포트 — 일요일 저녁
 * Vercel Cron: "0 10 * * 0" (UTC) = 19:00 KST Sunday
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import webpush from 'web-push';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
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
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const OWNER = '서연';

function getWeekRange(): { monday: string; sunday: string } {
  const now = new Date();
  const nowSeoul = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const dow = nowSeoul.getDay(); // 0=Sunday
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(nowSeoul);
  mon.setDate(nowSeoul.getDate() + diffToMon);
  const sun = new Date(nowSeoul);
  sun.setDate(nowSeoul.getDate() + (dow === 0 ? 0 : 7 - dow));

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { monday: fmt(mon), sunday: fmt(sun) };
}

async function pushToOwner(title: string, body: string): Promise<void> {
  const subsSnap = await db.collection('pushSubscriptions').where('userId', '==', OWNER).get();
  for (const doc of subsSnap.docs) {
    try {
      await webpush.sendNotification(doc.data().subscription, JSON.stringify({ title, body }));
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) await doc.ref.delete();
    }
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  try {
    const { monday, sunday } = getWeekRange();
    const today = sunday;

    // Load week's study blocks
    const blocksSnap = await db.collection('assistantStudyBlocks')
      .where('userId', '==', OWNER)
      .where('date', '>=', monday)
      .where('date', '<=', sunday)
      .get();
    const blocks = blocksSnap.docs.map(d => d.data());

    const totalBlocks  = blocks.length;
    const doneBlocks   = blocks.filter((b: any) => b.status === '완료').length;
    const partialBlocks = blocks.filter((b: any) => b.status === '부분').length;
    const missedBlocks = blocks.filter((b: any) => b.status === '미완').length;
    const studyMinutes = blocks
      .filter((b: any) => b.actualMinutes)
      .reduce((s: number, b: any) => s + (b.actualMinutes ?? 0), 0);

    // Load weekly check result
    const weekKey = monday;
    const checkSnap = await db.collection('assistantWeeklyCheck')
      .doc(`${weekKey}_${OWNER}`).get();
    const checks = checkSnap.exists ? checkSnap.data()!.checks as Record<string, boolean> : {};
    const checkPassed = Object.values(checks).filter(Boolean).length;
    const checkTotal  = Object.keys(checks).length;

    // Load this week's essay grades
    const essaySnap = await db.collection('assistantEssayGrades')
      .where('userId', '==', OWNER)
      .where('createdAt', '>=', monday + 'T00:00:00Z')
      .get();
    const essayCount = essaySnap.size;
    const essayPassed = essaySnap.docs.filter(d => d.data().rewritePassed).length;

    // Load upcoming deadlines for next week
    const cutoff = new Date(sunday + 'T00:00:00+09:00');
    cutoff.setDate(cutoff.getDate() + 7);
    const dlSnap = await db.collection('assistantDeadlines')
      .where('userId', '==', OWNER).where('completed', '==', false).get();
    const nextWeekDl = dlSnap.docs.map(d => d.data())
      .filter(d => d.date > sunday && d.date <= cutoff.toISOString().slice(0, 10))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3)
      .map((d: any) => d.title);

    const completionPct = totalBlocks > 0 ? Math.round((doneBlocks + partialBlocks * 0.5) / totalBlocks * 100) : 0;

    const contextStr = [
      `이번 주(${monday}~${sunday}) 결과:`,
      `블록 완료율 ${completionPct}% (완료 ${doneBlocks}/${totalBlocks}, 부분 ${partialBlocks}, 미완 ${missedBlocks})`,
      studyMinutes > 0 ? `총 공부 ${Math.floor(studyMinutes / 60)}시간 ${studyMinutes % 60}분` : '',
      checkTotal > 0 ? `주간 점검 ${checkPassed}/${checkTotal} 통과` : '',
      essayCount > 0 ? `서술형 ${essayCount}문항 (재작성 통과 ${essayPassed}/${essayCount})` : '',
      nextWeekDl.length > 0 ? `다음 주 마감: ${nextWeekDl.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const system = '임용 준비생의 AI 비서. 반말로 3~4줄로 이번 주 요약과 다음 주 조언을 써. 수고했다고 격려하되 부족한 점도 간단히 짚어줘.';
    const weeklyModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: system });
    const body = await weeklyModel.generateContent(contextStr).then(r => r.response.text().trim());

    await pushToOwner('📊 주간 리포트', body);

    await db.collection('assistantNotifLog').add({
      userId: OWNER, date: today, type: 'weekly_report', sentAt: new Date().toISOString(),
      stats: { completionPct, doneBlocks, totalBlocks, studyMinutes, checkPassed, checkTotal, essayCount },
    });

    return res.status(200).json({
      type: 'weekly_report', week: `${monday}~${sunday}`,
      completionPct, doneBlocks, totalBlocks, studyMinutes,
    });
  } catch (err: any) {
    console.error('assistant/weekly error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
