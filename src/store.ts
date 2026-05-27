import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import type {
  AppData, User, ClassicalLiteratureEntry, ModernLiteratureEntry,
  PersonalStudyEntry, ReflectionEntry, Feedback, AttendanceEntry, ResourceRequest,
} from './types';

const defaultData: AppData = {
  users: [],
  classicalEntries: [],
  modernEntries: [],
  personalStudyEntries: [],
  reflectionEntries: [],
  attendanceEntries: [],
  resourceRequests: [],
};

const CACHE_KEY = 'korean_edu_cache';

let mem: AppData = { ...defaultData };

function loadCache(): boolean {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) { mem = JSON.parse(raw); return true; }
  } catch {}
  return false;
}

function saveCache(): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(mem)); } catch {}
}

async function fetchFromFirestore(): Promise<void> {
  const [u, cl, mo, ps, re, at, rr] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'classicalEntries')),
    getDocs(collection(db, 'modernEntries')),
    getDocs(collection(db, 'personalStudyEntries')),
    getDocs(collection(db, 'reflectionEntries')),
    getDocs(collection(db, 'attendanceEntries')),
    getDocs(collection(db, 'resourceRequests')),
  ]);
  mem = {
    users:                u.docs.map(d => d.data() as User),
    classicalEntries:    cl.docs.map(d => d.data() as ClassicalLiteratureEntry),
    modernEntries:       mo.docs.map(d => d.data() as ModernLiteratureEntry),
    personalStudyEntries: ps.docs.map(d => d.data() as PersonalStudyEntry),
    reflectionEntries:   re.docs.map(d => d.data() as ReflectionEntry),
    attendanceEntries:   at.docs.map(d => d.data() as AttendanceEntry),
    resourceRequests:    rr.docs.map(d => d.data() as ResourceRequest),
  };
  saveCache();
}

// 캐시 있으면 즉시 반환, 없으면 Firestore 대기
export async function initializeData(): Promise<void> {
  const hasCache = loadCache();
  if (hasCache) {
    // 캐시로 즉시 로드, Firestore 동기화는 백그라운드
    fetchFromFirestore().catch(console.error);
  } else {
    // 첫 방문: Firestore 완료까지 대기 (최대 10초)
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

export function upsertReflectionEntry(entry: ReflectionEntry): void {
  const idx = mem.reflectionEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) mem.reflectionEntries[idx] = entry;
  else mem.reflectionEntries.push(entry);
  persist('reflectionEntries', entry.id, entry);
}

export function getReflectionEntryForDate(date: string, userId: string): ReflectionEntry | undefined {
  return mem.reflectionEntries.find(e => e.date === date && e.userId === userId);
}

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
