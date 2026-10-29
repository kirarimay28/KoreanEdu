import { db } from './firebase';
import {
  collection, doc, setDoc, getDoc, deleteDoc, getDocs,
  onSnapshot, query, where,
} from 'firebase/firestore';
import type {
  AssistantSettings, ClassTimetable, WorkSchedule, ScheduleException,
  LectureSlot, AssistantDeadline, StudyConfig, StudyBlock, WeeklyCheckResult,
  CardCheckItem, MockScore, EssayGrade, CourseGrade, AssistantMemo, ASubject,
} from './assistantTypes';
import { defaultSettings, defaultStudyConfig, CARD_CHECKLIST_SEED } from './assistantTypes';

// ── Settings ──────────────────────────────────────────────────
export async function loadAssistantSettings(userId: string): Promise<AssistantSettings> {
  try {
    const snap = await getDoc(doc(db, 'assistantSettings', userId));
    return snap.exists() ? (snap.data() as AssistantSettings) : defaultSettings(userId);
  } catch (e) {
    console.warn('loadAssistantSettings', e);
    return defaultSettings(userId);
  }
}
export async function saveAssistantSettings(s: AssistantSettings): Promise<void> {
  try {
    await setDoc(doc(db, 'assistantSettings', s.userId), { ...s, updatedAt: new Date().toISOString() });
  } catch (e) { console.warn('saveAssistantSettings', e); }
}

// ── Class Timetable ───────────────────────────────────────────
export async function loadClassTimetable(userId: string): Promise<ClassTimetable | null> {
  try {
    const snap = await getDoc(doc(db, 'assistantSchedule', userId));
    return snap.exists() ? (snap.data() as ClassTimetable) : null;
  } catch (e) { console.warn('loadClassTimetable', e); return null; }
}
export async function saveClassTimetable(t: ClassTimetable): Promise<void> {
  try {
    await setDoc(doc(db, 'assistantSchedule', t.userId), { ...t, updatedAt: new Date().toISOString() });
  } catch (e) { console.warn('saveClassTimetable', e); }
}

// ── Work Schedule ─────────────────────────────────────────────
export async function loadWorkSchedule(userId: string): Promise<WorkSchedule | null> {
  try {
    const snap = await getDoc(doc(db, 'assistantWorkSchedule', userId));
    return snap.exists() ? (snap.data() as WorkSchedule) : null;
  } catch (e) { console.warn('loadWorkSchedule', e); return null; }
}
export async function saveWorkSchedule(w: WorkSchedule): Promise<void> {
  try {
    await setDoc(doc(db, 'assistantWorkSchedule', w.userId), { ...w, updatedAt: new Date().toISOString() });
  } catch (e) { console.warn('saveWorkSchedule', e); }
}

// ── Schedule Exceptions ───────────────────────────────────────
export function subscribeExceptions(userId: string, cb: (list: ScheduleException[]) => void): () => void {
  const q = query(collection(db, 'assistantScheduleExceptions'), where('userId', '==', userId));
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => d.data() as ScheduleException).sort((a, b) => a.date.localeCompare(b.date))),
    err => console.warn('subscribeExceptions', err),
  );
}
export async function saveException(e: ScheduleException): Promise<void> {
  try { await setDoc(doc(db, 'assistantScheduleExceptions', e.id), e); }
  catch (err) { console.warn('saveException', err); }
}
export async function deleteException(id: string): Promise<void> {
  try { await deleteDoc(doc(db, 'assistantScheduleExceptions', id)); }
  catch (e) { console.warn('deleteException', e); }
}

// ── Lecture Slots ─────────────────────────────────────────────
export function subscribeLectureSlots(userId: string, cb: (list: LectureSlot[]) => void): () => void {
  const q = query(collection(db, 'assistantLectures'), where('userId', '==', userId));
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => d.data() as LectureSlot)),
    err => console.warn('subscribeLectureSlots', err),
  );
}
export async function saveLectureSlot(s: LectureSlot): Promise<void> {
  try { await setDoc(doc(db, 'assistantLectures', s.id), { ...s, updatedAt: new Date().toISOString() }); }
  catch (e) { console.warn('saveLectureSlot', e); }
}
export async function deleteLectureSlot(id: string): Promise<void> {
  try { await deleteDoc(doc(db, 'assistantLectures', id)); }
  catch (e) { console.warn('deleteLectureSlot', e); }
}

// ── Deadlines ─────────────────────────────────────────────────
export function subscribeDeadlines(userId: string, cb: (list: AssistantDeadline[]) => void): () => void {
  const q = query(collection(db, 'assistantDeadlines'), where('userId', '==', userId));
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => d.data() as AssistantDeadline).sort((a, b) => a.date.localeCompare(b.date))),
    err => console.warn('subscribeDeadlines', err),
  );
}
export async function saveDeadline(d: AssistantDeadline): Promise<void> {
  try { await setDoc(doc(db, 'assistantDeadlines', d.id), d); }
  catch (e) { console.warn('saveDeadline', e); }
}
export async function deleteDeadline(id: string): Promise<void> {
  try { await deleteDoc(doc(db, 'assistantDeadlines', id)); }
  catch (e) { console.warn('deleteDeadline', e); }
}
export async function completeDeadline(id: string): Promise<void> {
  try { await setDoc(doc(db, 'assistantDeadlines', id), { completed: true }, { merge: true }); }
  catch (e) { console.warn('completeDeadline', e); }
}

// ── Study Config ──────────────────────────────────────────────
export async function loadStudyConfig(userId: string): Promise<StudyConfig> {
  try {
    const snap = await getDoc(doc(db, 'assistantStudyConfig', userId));
    return snap.exists() ? (snap.data() as StudyConfig) : defaultStudyConfig(userId);
  } catch (e) { console.warn('loadStudyConfig', e); return defaultStudyConfig(userId); }
}
export async function saveStudyConfig(c: StudyConfig): Promise<void> {
  try {
    await setDoc(doc(db, 'assistantStudyConfig', c.userId), { ...c, updatedAt: new Date().toISOString() });
  } catch (e) { console.warn('saveStudyConfig', e); }
}

// ── Study Blocks ──────────────────────────────────────────────
export function subscribeStudyBlocks(
  userId: string,
  dateFrom: string,
  dateTo: string,
  cb: (list: StudyBlock[]) => void,
): () => void {
  const q = query(
    collection(db, 'assistantStudyBlocks'),
    where('userId', '==', userId),
    where('date', '>=', dateFrom),
    where('date', '<=', dateTo),
  );
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => d.data() as StudyBlock).sort((a, b) => a.start.localeCompare(b.start))),
    err => console.warn('subscribeStudyBlocks', err),
  );
}
export async function saveStudyBlock(b: StudyBlock): Promise<void> {
  try {
    await setDoc(doc(db, 'assistantStudyBlocks', b.id), { ...b, updatedAt: new Date().toISOString() });
  } catch (e) { console.warn('saveStudyBlock', e); }
}
export async function saveStudyBlocks(blocks: StudyBlock[]): Promise<void> {
  await Promise.all(blocks.map(b => saveStudyBlock(b)));
}
export async function deleteStudyBlocksForWeek(userId: string, weekStart: string, weekEnd: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'assistantStudyBlocks'),
      where('userId', '==', userId),
      where('date', '>=', weekStart),
      where('date', '<=', weekEnd),
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch (e) { console.warn('deleteStudyBlocksForWeek', e); }
}
export async function updateBlockStatus(
  id: string,
  status: StudyBlock['status'],
  actualMinutes?: number,
  skipReason?: string,
): Promise<void> {
  try {
    const data: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
    if (actualMinutes !== undefined) data.actualMinutes = actualMinutes;
    if (skipReason) data.skipReason = skipReason;
    await setDoc(doc(db, 'assistantStudyBlocks', id), data, { merge: true });
  } catch (e) { console.warn('updateBlockStatus', e); }
}

// ── Weekly Check ──────────────────────────────────────────────
export async function saveWeeklyCheck(r: WeeklyCheckResult): Promise<void> {
  try {
    await setDoc(doc(db, 'assistantWeeklyCheck', r.id), { ...r, updatedAt: new Date().toISOString() });
  } catch (e) { console.warn('saveWeeklyCheck', e); }
}
export async function loadWeeklyCheck(userId: string, weekKey: string): Promise<WeeklyCheckResult | null> {
  try {
    const snap = await getDoc(doc(db, 'assistantWeeklyCheck', `${weekKey}_${userId}`));
    return snap.exists() ? (snap.data() as WeeklyCheckResult) : null;
  } catch (e) { console.warn('loadWeeklyCheck', e); return null; }
}

// ── Card Checklist ────────────────────────────────────────────
export function subscribeCardChecklists(userId: string, cb: (list: CardCheckItem[]) => void): () => void {
  const q = query(collection(db, 'assistantCardChecklist'), where('userId', '==', userId));
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => d.data() as CardCheckItem)),
    err => console.warn('subscribeCardChecklists', err),
  );
}
export async function saveCardCheckItem(item: CardCheckItem): Promise<void> {
  try {
    await setDoc(doc(db, 'assistantCardChecklist', item.id), { ...item, updatedAt: new Date().toISOString() });
  } catch (e) { console.warn('saveCardCheckItem', e); }
}
export async function initCardChecklist(
  userId: string,
  seed: Array<{ subject: ASubject; chapter: string }>,
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await Promise.all(
      seed.map((s, i) => {
        const item: CardCheckItem = {
          id: `${userId}_card_${i}`,
          userId,
          subject: s.subject,
          chapter: s.chapter,
          items: [],
          completedItems: [],
          updatedAt: now,
        };
        return setDoc(doc(db, 'assistantCardChecklist', item.id), item);
      }),
    );
  } catch (e) { console.warn('initCardChecklist', e); }
}

// ── Mock Scores ───────────────────────────────────────────────
export function subscribeMockScores(userId: string, cb: (list: MockScore[]) => void): () => void {
  const q = query(collection(db, 'assistantMockScores'), where('userId', '==', userId));
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => d.data() as MockScore).sort((a, b) => b.date.localeCompare(a.date))),
    err => console.warn('subscribeMockScores', err),
  );
}
export async function saveMockScore(s: MockScore): Promise<void> {
  try { await setDoc(doc(db, 'assistantMockScores', s.id), s); }
  catch (e) { console.warn('saveMockScore', e); }
}
export async function deleteMockScore(id: string): Promise<void> {
  try { await deleteDoc(doc(db, 'assistantMockScores', id)); }
  catch (e) { console.warn('deleteMockScore', e); }
}

// ── Essay Grades ──────────────────────────────────────────────
export function subscribeEssayGrades(userId: string, cb: (list: EssayGrade[]) => void): () => void {
  const q = query(collection(db, 'assistantEssayGrades'), where('userId', '==', userId));
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => d.data() as EssayGrade).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    err => console.warn('subscribeEssayGrades', err),
  );
}
export async function saveEssayGrade(g: EssayGrade): Promise<void> {
  try { await setDoc(doc(db, 'assistantEssayGrades', g.id), g); }
  catch (e) { console.warn('saveEssayGrade', e); }
}

// ── Course Grades ─────────────────────────────────────────────
export function subscribeCourseGrades(userId: string, cb: (list: CourseGrade[]) => void): () => void {
  const q = query(collection(db, 'assistantCourseGrades'), where('userId', '==', userId));
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => d.data() as CourseGrade)),
    err => console.warn('subscribeCourseGrades', err),
  );
}
export async function saveCourseGrade(g: CourseGrade): Promise<void> {
  try { await setDoc(doc(db, 'assistantCourseGrades', g.id), g); }
  catch (e) { console.warn('saveCourseGrade', e); }
}
export async function deleteCourseGrade(id: string): Promise<void> {
  try { await deleteDoc(doc(db, 'assistantCourseGrades', id)); }
  catch (e) { console.warn('deleteCourseGrade', e); }
}

// ── Memos ─────────────────────────────────────────────────────
export function subscribeMemos(userId: string, cb: (list: AssistantMemo[]) => void): () => void {
  const q = query(collection(db, 'assistantMemos'), where('userId', '==', userId));
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => d.data() as AssistantMemo).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    err => console.warn('subscribeMemos', err),
  );
}
export async function saveMemo(m: AssistantMemo): Promise<void> {
  try { await setDoc(doc(db, 'assistantMemos', m.id), m); }
  catch (e) { console.warn('saveMemo', e); }
}
export async function deleteMemo(id: string): Promise<void> {
  try { await deleteDoc(doc(db, 'assistantMemos', id)); }
  catch (e) { console.warn('deleteMemo', e); }
}

export { CARD_CHECKLIST_SEED };
