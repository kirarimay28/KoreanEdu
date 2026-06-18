import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import type {
  AppData, User, UserRole, UserRestrictions, ClassicalLiteratureEntry, ModernLiteratureEntry,
  PersonalStudyEntry, ReflectionEntry, Feedback, AttendanceEntry, ResourceRequest,
  Announcement, Warning, VacationRequest, EducationAnswer, QnAPost, QnAComment, Message,
  AssignmentCheck, CheckStatus, CalendarEvent, LibraryItem,
  VocabTestScore, PeerFeedback, StudyLog, LocationNotice, AssignmentNotice,
  VocabExamRecord,
} from './types';

const ADMIN_USERNAME = '서연';

const defaultData: AppData = {
  users: [],
  classicalEntries: [],
  modernEntries: [],
  personalStudyEntries: [],
  reflectionEntries: [],
  attendanceEntries: [],
  resourceRequests: [],
  announcements: [],
  warnings: [],
  vacations: [],
  educationAnswers: [],
  qnaPosts: [],
  qnaComments: [],
  messages: [],
  assignmentChecks: [],
  calendarEvents: [],
  libraryItems: [],
  vocabTestScores: [],
  peerFeedbacks: [],
  studyLogs: [],
  locationNotice: null,
  assignmentNotice: null,
  vocabExamRecords: [],
};

const CACHE_KEY = 'korean_edu_cache';

let mem: AppData = { ...defaultData };

function loadCache(): boolean {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      mem = { ...defaultData, ...parsed };
      // 캐시가 오염된 경우(users가 비어있음) → 무효화하고 Firestore에서 재로드
      if (mem.users.length === 0) {
        localStorage.removeItem(CACHE_KEY);
        mem = { ...defaultData };
        return false;
      }
      return true;
    }
  } catch {}
  return false;
}

function saveCache(): void {
  // users가 비어있으면 저장하지 않음 — 오염된 캐시 방지
  if (mem.users.length === 0) return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(mem)); } catch {}
}

function bootstrapAdmin(): void {
  const adminUser = mem.users.find(u => u.username === ADMIN_USERNAME);
  if (adminUser && adminUser.role !== 'admin') {
    adminUser.role = 'admin';
    persist('users', adminUser.id, adminUser);
    saveCache();
  }
}

const EMPTY_SNAP = { docs: [] as { data: () => unknown }[] };

async function safeGet(name: string) {
  try { return await getDocs(collection(db, name)); }
  catch (e) { console.warn(`Firestore [${name}] fetch failed:`, e); return EMPTY_SNAP; }
}

async function fetchFromFirestore(): Promise<void> {
  const [u, cl, mo, ps, re, at, rr, an, wa, va, ea, qp, qc, ms, ac, ce, li, vt, pf, sl, ln, an2, ver] = await Promise.all([
    safeGet('users'),
    safeGet('classicalEntries'),
    safeGet('modernEntries'),
    safeGet('personalStudyEntries'),
    safeGet('reflectionEntries'),
    safeGet('attendanceEntries'),
    safeGet('resourceRequests'),
    safeGet('announcements'),
    safeGet('warnings'),
    safeGet('vacations'),
    safeGet('educationAnswers'),
    safeGet('qnaPosts'),
    safeGet('qnaComments'),
    safeGet('messages'),
    safeGet('assignmentChecks'),
    safeGet('calendarEvents'),
    safeGet('libraryItems'),
    safeGet('vocabTestScores'),
    safeGet('peerFeedbacks'),
    safeGet('studyLogs'),
    safeGet('locationNotice'),
    safeGet('assignmentNotice'),
    safeGet('vocabExamRecords'),
  ]);
  mem = {
    users:                u.docs.map(d => d.data() as User),
    classicalEntries:    cl.docs.map(d => d.data() as ClassicalLiteratureEntry),
    modernEntries:       mo.docs.map(d => d.data() as ModernLiteratureEntry),
    personalStudyEntries: ps.docs.map(d => d.data() as PersonalStudyEntry),
    reflectionEntries:   re.docs.map(d => d.data() as ReflectionEntry),
    attendanceEntries:   at.docs.map(d => d.data() as AttendanceEntry),
    resourceRequests:    rr.docs.map(d => d.data() as ResourceRequest),
    announcements:       an.docs.map(d => d.data() as Announcement),
    warnings:            wa.docs.map(d => d.data() as Warning),
    vacations:           va.docs.map(d => d.data() as VacationRequest),
    educationAnswers:    ea.docs.map(d => d.data() as EducationAnswer),
    qnaPosts:            qp.docs.map(d => d.data() as QnAPost),
    qnaComments:         qc.docs.map(d => d.data() as QnAComment),
    messages:            ms.docs.map(d => d.data() as Message),
    assignmentChecks:    ac.docs.map(d => d.data() as AssignmentCheck),
    calendarEvents:      ce.docs.map(d => d.data() as CalendarEvent),
    libraryItems:        li.docs.map(d => d.data() as LibraryItem),
    vocabTestScores:     vt.docs.map(d => d.data() as VocabTestScore),
    peerFeedbacks:       pf.docs.map(d => d.data() as PeerFeedback),
    studyLogs:           sl.docs.map(d => d.data() as StudyLog),
    locationNotice:      (ln.docs[0]?.data() as LocationNotice) ?? null,
    assignmentNotice:    (an2.docs[0]?.data() as AssignmentNotice) ?? null,
    vocabExamRecords:    ver.docs.map(d => d.data() as VocabExamRecord),
  };
  bootstrapAdmin();
  saveCache();
}

export async function initializeData(onSynced?: () => void): Promise<void> {
  const hasCache = loadCache();
  if (hasCache) {
    fetchFromFirestore()
      .then(() => onSynced?.())
      .catch(console.error);
  } else {
    const timeout = new Promise<void>(resolve =>
      setTimeout(() => resolve(), 20000)
    );
    await Promise.race([fetchFromFirestore(), timeout]);
  }
}

export async function refreshData(): Promise<void> {
  await fetchFromFirestore();
}

function persist(coll: string, id: string, data: object): void {
  setDoc(doc(db, coll, id), data).catch(err => console.error('Firestore write error:', err));
}

function remove(coll: string, id: string): void {
  deleteDoc(doc(db, coll, id)).catch(err => console.error('Firestore delete error:', err));
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// ── Users ────────────────────────────────────────────────
export function registerUser(username: string, password: string, resolution: string): { ok: boolean; error?: string; user?: User } {
  if (mem.users.find(u => u.username === username)) {
    return { ok: false, error: '이미 사용 중인 아이디입니다.' };
  }
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: simpleHash(password),
    resolution,
    createdAt: new Date().toISOString(),
  };
  mem.users.push(user);
  persist('users', user.id, user);
  saveCache();
  return { ok: true, user };
}

export function loginUser(username: string, password: string): { ok: boolean; error?: string; user?: User } {
  const user = mem.users.find(u => u.username === username);
  if (!user) return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  if (user.passwordHash !== simpleHash(password)) return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  return { ok: true, user };
}

export function getUsers(): User[] {
  return mem.users;
}

export function getUserByName(username: string): User | undefined {
  return mem.users.find(u => u.username === username);
}

export function getUserById(id: string): User | undefined {
  return mem.users.find(u => u.id === id);
}

export function setUserRole(userId: string, role: UserRole): void {
  const user = mem.users.find(u => u.id === userId);
  if (user) {
    user.role = role;
    persist('users', userId, user);
    saveCache();
  }
}

export function deleteUser(userId: string): void {
  mem.users = mem.users.filter(u => u.id !== userId);
  remove('users', userId);
  saveCache();
}

export function setUserRestrictions(userId: string, restrictions: UserRestrictions): void {
  const user = mem.users.find(u => u.id === userId);
  if (!user) return;
  user.restrictions = restrictions;
  persist('users', userId, { ...user });
  saveCache();
}

// ── Classical ────────────────────────────────────────────
export function upsertClassicalEntry(entry: ClassicalLiteratureEntry): void {
  const idx = mem.classicalEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) mem.classicalEntries[idx] = entry;
  else mem.classicalEntries.push(entry);
  persist('classicalEntries', entry.id, entry);
}

export function getClassicalEntriesForDate(date: string): ClassicalLiteratureEntry[] {
  return mem.classicalEntries.filter(e => e.date === date);
}

export function addFeedbackToClassical(entryId: string, feedback: Feedback): void {
  const entry = mem.classicalEntries.find(e => e.id === entryId);
  if (entry) {
    entry.feedbacks.push(feedback);
    persist('classicalEntries', entryId, entry);
  }
}

export function deleteFeedbackFromClassical(entryId: string, feedbackId: string): void {
  const entry = mem.classicalEntries.find(e => e.id === entryId);
  if (entry) {
    entry.feedbacks = entry.feedbacks.filter(f => f.id !== feedbackId);
    persist('classicalEntries', entryId, entry);
  }
}

export function deleteClassicalEntry(id: string): void {
  mem.classicalEntries = mem.classicalEntries.filter(e => e.id !== id);
  remove('classicalEntries', id);
}

// ── Modern ───────────────────────────────────────────────
export function upsertModernEntry(entry: ModernLiteratureEntry): void {
  const idx = mem.modernEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) mem.modernEntries[idx] = entry;
  else mem.modernEntries.push(entry);
  persist('modernEntries', entry.id, entry);
}

export function getModernEntriesForDate(date: string): ModernLiteratureEntry[] {
  return mem.modernEntries.filter(e => e.date === date);
}

export function addFeedbackToModern(entryId: string, feedback: Feedback): void {
  const entry = mem.modernEntries.find(e => e.id === entryId);
  if (entry) {
    entry.feedbacks.push(feedback);
    persist('modernEntries', entryId, entry);
  }
}

export function deleteFeedbackFromModern(entryId: string, feedbackId: string): void {
  const entry = mem.modernEntries.find(e => e.id === entryId);
  if (entry) {
    entry.feedbacks = entry.feedbacks.filter(f => f.id !== feedbackId);
    persist('modernEntries', entryId, entry);
  }
}

export function deleteModernEntry(id: string): void {
  mem.modernEntries = mem.modernEntries.filter(e => e.id !== id);
  remove('modernEntries', id);
}

// ── Personal Study ───────────────────────────────────────
export function upsertPersonalStudyEntry(entry: PersonalStudyEntry): void {
  const idx = mem.personalStudyEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) mem.personalStudyEntries[idx] = entry;
  else mem.personalStudyEntries.push(entry);
  persist('personalStudyEntries', entry.id, entry);
}

export function getPersonalStudyEntriesForDate(date: string): PersonalStudyEntry[] {
  return mem.personalStudyEntries.filter(e => e.date === date);
}

export function deletePersonalStudyEntry(id: string): void {
  mem.personalStudyEntries = mem.personalStudyEntries.filter(e => e.id !== id);
  remove('personalStudyEntries', id);
}

// ── Reflection ───────────────────────────────────────────
export function upsertReflectionEntry(entry: ReflectionEntry): void {
  const idx = mem.reflectionEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) mem.reflectionEntries[idx] = entry;
  else mem.reflectionEntries.push(entry);
  persist('reflectionEntries', entry.id, entry);
}

export function getReflectionEntryForDate(date: string, userId: string): ReflectionEntry | undefined {
  return mem.reflectionEntries.find(e => e.date === date && e.userId === userId);
}

export function deleteReflectionEntry(id: string): void {
  mem.reflectionEntries = mem.reflectionEntries.filter(e => e.id !== id);
  remove('reflectionEntries', id);
}

// ── Attendance ───────────────────────────────────────────
export function markAttendance(date: string, userId: string, username: string): void {
  const exists = mem.attendanceEntries.find(e => e.date === date && e.userId === userId);
  if (!exists) {
    const entry: AttendanceEntry = {
      id: crypto.randomUUID(),
      date,
      userId,
      username,
      markedAt: new Date().toISOString(),
    };
    mem.attendanceEntries.push(entry);
    persist('attendanceEntries', entry.id, entry);
  }
}

export function getAttendanceEntries(): AttendanceEntry[] {
  return mem.attendanceEntries;
}

export function hasStudyRecordOnDate(date: string): boolean {
  return (
    mem.classicalEntries.some(e => e.date === date) ||
    mem.modernEntries.some(e => e.date === date) ||
    mem.personalStudyEntries.some(e => e.date === date) ||
    mem.reflectionEntries.some(e => e.date === date)
  );
}

// ── Resource Requests ────────────────────────────────────
export function createResourceRequest(request: ResourceRequest): void {
  mem.resourceRequests.push(request);
  persist('resourceRequests', request.id, request);
}

export function getPendingRequestsForUser(userId: string): ResourceRequest[] {
  return mem.resourceRequests.filter(r => r.recipientId === userId && r.status === '대기중');
}

export function getSentRequests(userId: string): ResourceRequest[] {
  return mem.resourceRequests.filter(r => r.requesterId === userId);
}

export function completeResourceRequest(id: string): void {
  const req = mem.resourceRequests.find(r => r.id === id);
  if (req) { req.status = '완료'; persist('resourceRequests', id, req); }
}

// ── Announcements ────────────────────────────────────────
export function getAnnouncements(): Announcement[] {
  return mem.announcements.slice().sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function createAnnouncement(ann: Announcement): void {
  mem.announcements.push(ann);
  persist('announcements', ann.id, ann);
  saveCache();
}

export function updateAnnouncement(ann: Announcement): void {
  const idx = mem.announcements.findIndex(a => a.id === ann.id);
  if (idx >= 0) {
    mem.announcements[idx] = ann;
    persist('announcements', ann.id, ann);
    saveCache();
  }
}

export function deleteAnnouncement(id: string): void {
  mem.announcements = mem.announcements.filter(a => a.id !== id);
  remove('announcements', id);
  saveCache();
}

// ── Q&A ──────────────────────────────────────────────────
export function getQnAPosts(): QnAPost[] {
  return mem.qnaPosts.slice().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function createQnAPost(post: QnAPost): void {
  mem.qnaPosts.push(post);
  persist('qnaPosts', post.id, post);
}

export function deleteQnAPost(id: string): void {
  mem.qnaPosts = mem.qnaPosts.filter(p => p.id !== id);
  remove('qnaPosts', id);
  mem.qnaComments = mem.qnaComments.filter(c => c.postId !== id);
}

export function getQnAComments(postId: string): QnAComment[] {
  return mem.qnaComments
    .filter(c => c.postId === postId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function createQnAComment(comment: QnAComment): void {
  mem.qnaComments.push(comment);
  persist('qnaComments', comment.id, comment);
}

export function deleteQnAComment(id: string): void {
  mem.qnaComments = mem.qnaComments.filter(c => c.id !== id);
  remove('qnaComments', id);
}

// ── Messages ──────────────────────────────────────────────
export function sendMessage(msg: Message): void {
  mem.messages.push(msg);
  persist('messages', msg.id, msg);
}

export function getReceivedMessages(userId: string): Message[] {
  return mem.messages
    .filter(m => m.receiverId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getSentMessages(userId: string): Message[] {
  return mem.messages
    .filter(m => m.senderId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markMessageRead(id: string): void {
  const msg = mem.messages.find(m => m.id === id);
  if (msg && !msg.read) {
    msg.read = true;
    persist('messages', id, msg);
  }
}

export function deleteMessage(id: string): void {
  mem.messages = mem.messages.filter(m => m.id !== id);
  remove('messages', id);
}

export function getUnreadCount(userId: string): number {
  return mem.messages.filter(m => m.receiverId === userId && !m.read).length;
}

// ── Warnings ─────────────────────────────────────────────
export function getWarningsForUser(userId: string): Warning[] {
  return mem.warnings.filter(w => w.targetUserId === userId);
}

export function issueWarning(warning: Warning): void {
  mem.warnings.push(warning);
  persist('warnings', warning.id, warning);
  saveCache();
}

export function clearWarning(id: string): void {
  mem.warnings = mem.warnings.filter(w => w.id !== id);
  remove('warnings', id);
  saveCache();
}

// ── Vacations ─────────────────────────────────────────────
export function createVacationRequest(req: VacationRequest): void {
  mem.vacations.push(req);
  persist('vacations', req.id, req);
}

export function getVacationRequests(): VacationRequest[] {
  return mem.vacations;
}

export function getApprovedVacations(): VacationRequest[] {
  return mem.vacations.filter(v => v.status === '승인').sort(
    (a, b) => a.vacationDate.localeCompare(b.vacationDate)
  );
}

export function reviewVacation(id: string, status: '승인' | '거절', reviewerId: string, reviewerName: string): void {
  const req = mem.vacations.find(v => v.id === id);
  if (req) {
    req.status = status;
    req.reviewedAt = new Date().toISOString();
    req.reviewedById = reviewerId;
    req.reviewedByName = reviewerName;
    persist('vacations', id, req);
  }
}

// ── Education Answers ──────────────────────────────────────
export function upsertEducationAnswer(answer: EducationAnswer): void {
  const idx = mem.educationAnswers.findIndex(
    a => a.weekKey === answer.weekKey && a.userId === answer.userId
  );
  if (idx >= 0) mem.educationAnswers[idx] = answer;
  else mem.educationAnswers.push(answer);
  persist('educationAnswers', answer.id, answer);
}

export function toggleReaction(answerId: string, userId: string, type: 'like' | 'dislike'): EducationAnswer | undefined {
  const answer = mem.educationAnswers.find(a => a.id === answerId);
  if (!answer) return;
  if (!answer.likes) answer.likes = [];
  if (!answer.dislikes) answer.dislikes = [];

  const same = type === 'like' ? answer.likes : answer.dislikes;
  const other = type === 'like' ? answer.dislikes : answer.likes;

  const otherIdx = other.indexOf(userId);
  if (otherIdx >= 0) other.splice(otherIdx, 1);

  const sameIdx = same.indexOf(userId);
  if (sameIdx >= 0) same.splice(sameIdx, 1);
  else same.push(userId);

  persist('educationAnswers', answerId, answer);
  return answer;
}

export function getEducationAnswersForWeek(weekKey: string): EducationAnswer[] {
  return mem.educationAnswers.filter(a => a.weekKey === weekKey);
}

export function getMyEducationAnswer(weekKey: string, userId: string): EducationAnswer | undefined {
  return mem.educationAnswers.find(a => a.weekKey === weekKey && a.userId === userId);
}

export function hasVacationInWeek(userId: string, vacationDate: string): boolean {
  const d = new Date(vacationDate + 'T00:00:00');
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = new Date(monday.getTime() + 6 * 86400000).toISOString().split('T')[0];

  return mem.vacations.some(v =>
    v.requesterId === userId &&
    (v.status === '승인' || v.status === '대기중') &&
    v.vacationDate >= weekStart &&
    v.vacationDate <= weekEnd
  );
}

// ── Assignment Checks ────────────────────────────────────────────
export function getAssignmentCheck(userId: string, weekKey: string): AssignmentCheck | undefined {
  return mem.assignmentChecks.find(c => c.userId === userId && c.weekKey === weekKey);
}

export function getAssignmentChecksForWeek(weekKey: string): AssignmentCheck[] {
  return mem.assignmentChecks.filter(c => c.weekKey === weekKey);
}

export function upsertAssignmentCheck(
  userId: string, username: string, weekKey: string, checks: Record<string, CheckStatus>
): void {
  const id = `${userId}_${weekKey}`;
  const entry: AssignmentCheck = { id, userId, username, weekKey, checks, updatedAt: new Date().toISOString() };
  const idx = mem.assignmentChecks.findIndex(c => c.id === id);
  if (idx >= 0) mem.assignmentChecks[idx] = entry;
  else mem.assignmentChecks.push(entry);
  persist('assignmentChecks', id, entry);
  saveCache();
}

// ── Calendar Events ──────────────────────────────────────────────
export function getCalendarEventsForMonth(year: number, month: number): CalendarEvent[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return mem.calendarEvents.filter(e => e.date.startsWith(prefix));
}

export function getCalendarEventsForDate(date: string): CalendarEvent[] {
  return mem.calendarEvents.filter(e => e.date === date);
}

export function createCalendarEvent(event: CalendarEvent): void {
  mem.calendarEvents.push(event);
  persist('calendarEvents', event.id, event);
  saveCache();
}

export function deleteCalendarEvent(id: string): void {
  mem.calendarEvents = mem.calendarEvents.filter(e => e.id !== id);
  remove('calendarEvents', id);
  saveCache();
}

// ── Library Items ────────────────────────────────────────────────
export function getLibraryItems(): LibraryItem[] {
  return mem.libraryItems.slice().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function addLibraryItem(item: LibraryItem): void {
  mem.libraryItems.push(item);
  persist('libraryItems', item.id, item);
  saveCache();
}

export function removeLibraryItem(id: string): void {
  mem.libraryItems = mem.libraryItems.filter(i => i.id !== id);
  remove('libraryItems', id);
  saveCache();
}

// ── Vocab Test Scores ─────────────────────────────────────────────
export function getVocabTestScore(userId: string, date: string): VocabTestScore | undefined {
  return mem.vocabTestScores.find(s => s.userId === userId && s.date === date);
}

export function getVocabTestScoresForDate(date: string): VocabTestScore[] {
  return mem.vocabTestScores.filter(s => s.date === date);
}

export function upsertVocabTestScore(userId: string, username: string, date: string, score: number): void {
  const id = `${userId}_${date}`;
  const entry: VocabTestScore = { id, userId, username, date, score, submittedAt: new Date().toISOString() };
  const idx = mem.vocabTestScores.findIndex(s => s.id === id);
  if (idx >= 0) mem.vocabTestScores[idx] = entry;
  else mem.vocabTestScores.push(entry);
  persist('vocabTestScores', id, entry);

  // Attendance = score submission
  markAttendance(date, userId, username);

  // Auto-issue warning for score 1–9
  if (score >= 1 && score <= 9) {
    const alreadyWarned = mem.warnings.some(
      w => w.targetUserId === userId && w.reason.includes(`[고어 시험] ${date}`)
    );
    if (!alreadyWarned) {
      const warning: Warning = {
        id: crypto.randomUUID(),
        targetUserId: userId,
        targetUsername: username,
        reason: `[고어 시험] ${date} — ${score}/20점 (전체 재시험 대상)`,
        issuedAt: new Date().toISOString(),
        issuedById: 'system',
        issuedByName: '시스템',
      };
      mem.warnings.push(warning);
      persist('warnings', warning.id, warning);
    }
  }
  saveCache();
}

// ── Peer Feedbacks ────────────────────────────────────────────────
export function getPeerFeedbacksForDate(date: string): PeerFeedback[] {
  return mem.peerFeedbacks.filter(f => f.date === date);
}

export function addPeerFeedback(feedback: PeerFeedback): void {
  mem.peerFeedbacks.push(feedback);
  persist('peerFeedbacks', feedback.id, feedback);
  saveCache();
}

export function deletePeerFeedback(id: string): void {
  mem.peerFeedbacks = mem.peerFeedbacks.filter(f => f.id !== id);
  remove('peerFeedbacks', id);
  saveCache();
}

// ── Study Logs ────────────────────────────────────────────────────
export function getStudyLog(userId: string, date: string): StudyLog | undefined {
  return mem.studyLogs.find(l => l.userId === userId && l.date === date);
}

export function getStudyLogsForDate(date: string): StudyLog[] {
  return mem.studyLogs.filter(l => l.date === date);
}

export function upsertStudyLog(log: StudyLog): void {
  const idx = mem.studyLogs.findIndex(l => l.id === log.id);
  if (idx >= 0) mem.studyLogs[idx] = log;
  else mem.studyLogs.push(log);
  persist('studyLogs', log.id, log);
  saveCache();
}

// ── Location Notice ───────────────────────────────────────────────
export function getLocationNotice(): LocationNotice | null {
  return mem.locationNotice;
}

export function setLocationNotice(notice: Omit<LocationNotice, 'id'>): void {
  const full: LocationNotice = { ...notice, id: 'current' };
  mem.locationNotice = full;
  persist('locationNotice', 'current', full);
  saveCache();
}

export function clearLocationNotice(): void {
  mem.locationNotice = null;
  remove('locationNotice', 'current');
  saveCache();
}

// ── Assignment Notice ──────────────────────────────────────
export function getAssignmentNotice(): AssignmentNotice | null {
  return mem.assignmentNotice;
}

export function setAssignmentNotice(notice: Omit<AssignmentNotice, 'id'>): void {
  const full: AssignmentNotice = { ...notice, id: 'current' };
  mem.assignmentNotice = full;
  persist('assignmentNotice', 'current', full);
  saveCache();
}

export function clearAssignmentNotice(): void {
  mem.assignmentNotice = null;
  remove('assignmentNotice', 'current');
  saveCache();
}

// ── Vocab Exam Records ─────────────────────────────────────
export function getVocabExamRecords(userId: string): VocabExamRecord[] {
  return mem.vocabExamRecords
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllVocabExamRecords(): VocabExamRecord[] {
  return mem.vocabExamRecords
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveVocabExamRecord(record: VocabExamRecord): void {
  mem.vocabExamRecords.push(record);
  persist('vocabExamRecords', record.id, record);
  saveCache();
}

export function deleteVocabExamRecord(id: string): void {
  const record = mem.vocabExamRecords.find(r => r.id === id);
  mem.vocabExamRecords = mem.vocabExamRecords.filter(r => r.id !== id);
  remove('vocabExamRecords', id);

  if (record) {
    // 연동된 고어 시험 점수도 삭제
    const scoreId = `${record.userId}_${record.date}`;
    mem.vocabTestScores = mem.vocabTestScores.filter(s => s.id !== scoreId);
    remove('vocabTestScores', scoreId);

    // 시스템이 자동 부여한 경고도 삭제
    const autoWarning = mem.warnings.find(
      w => w.targetUserId === record.userId &&
           w.issuedById === 'system' &&
           w.reason.includes(`[고어 시험] ${record.date}`)
    );
    if (autoWarning) {
      mem.warnings = mem.warnings.filter(w => w.id !== autoWarning.id);
      remove('warnings', autoWarning.id);
    }
  }

  saveCache();
}
