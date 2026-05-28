import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import type {
  AppData, User, UserRole, ClassicalLiteratureEntry, ModernLiteratureEntry,
  PersonalStudyEntry, ReflectionEntry, Feedback, AttendanceEntry, ResourceRequest,
  Announcement, Warning,
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
};

const CACHE_KEY = 'korean_edu_cache';

let mem: AppData = { ...defaultData };

function loadCache(): boolean {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old cache that may not have new fields
      mem = { ...defaultData, ...parsed };
      return true;
    }
  } catch {}
  return false;
}

function saveCache(): void {
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

async function fetchFromFirestore(): Promise<void> {
  const [u, cl, mo, ps, re, at, rr, an, wa] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'classicalEntries')),
    getDocs(collection(db, 'modernEntries')),
    getDocs(collection(db, 'personalStudyEntries')),
    getDocs(collection(db, 'reflectionEntries')),
    getDocs(collection(db, 'attendanceEntries')),
    getDocs(collection(db, 'resourceRequests')),
    getDocs(collection(db, 'announcements')),
    getDocs(collection(db, 'warnings')),
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
  };
  bootstrapAdmin();
  saveCache();
}

export async function initializeData(): Promise<void> {
  const hasCache = loadCache();
  if (hasCache) {
    fetchFromFirestore().catch(console.error);
  } else {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10000)
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
  return mem.announcements.slice().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function createAnnouncement(ann: Announcement): void {
  mem.announcements.push(ann);
  persist('announcements', ann.id, ann);
  saveCache();
}

export function deleteAnnouncement(id: string): void {
  mem.announcements = mem.announcements.filter(a => a.id !== id);
  remove('announcements', id);
  saveCache();
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
