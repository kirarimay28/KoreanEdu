import { supabase } from './supabase';
import type {
  AppData, User, ClassicalLiteratureEntry, ModernLiteratureEntry,
  PersonalStudyEntry, ReflectionEntry, Feedback, AttendanceEntry,
} from './types';

const defaultData: AppData = {
  users: [],
  classicalEntries: [],
  modernEntries: [],
  personalStudyEntries: [],
  reflectionEntries: [],
  attendanceEntries: [],
};

let mem: AppData = { ...defaultData };

export async function initializeData(): Promise<void> {
  const [u, cl, mo, ps, re, at] = await Promise.all([
    supabase.from('users').select('data'),
    supabase.from('classical_entries').select('data'),
    supabase.from('modern_entries').select('data'),
    supabase.from('personal_study_entries').select('data'),
    supabase.from('reflection_entries').select('data'),
    supabase.from('attendance_entries').select('data'),
  ]);
  mem = {
    users:                (u.data  ?? []).map(r => r.data as User),
    classicalEntries:    (cl.data  ?? []).map(r => r.data as ClassicalLiteratureEntry),
    modernEntries:       (mo.data  ?? []).map(r => r.data as ModernLiteratureEntry),
    personalStudyEntries:(ps.data  ?? []).map(r => r.data as PersonalStudyEntry),
    reflectionEntries:   (re.data  ?? []).map(r => r.data as ReflectionEntry),
    attendanceEntries:   (at.data  ?? []).map(r => r.data as AttendanceEntry),
  };
}

export async function refreshData(): Promise<void> {
  return initializeData();
}

function persist(table: string, id: string, data: object): void {
  supabase.from(table).upsert({ id, data }).then(({ error }) => {
    if (error) console.error('Supabase write error:', error);
  });
}

function remove(table: string, id: string): void {
  supabase.from(table).delete().eq('id', id).then(({ error }) => {
    if (error) console.error('Supabase delete error:', error);
  });
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
  supabase.from('users').upsert({ id: user.id, username: user.username, data: user })
    .then(({ error }) => { if (error) console.error('Supabase write error:', error); });
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
  persist('classical_entries', entry.id, entry);
}

export function getClassicalEntriesForDate(date: string): ClassicalLiteratureEntry[] {
  return mem.classicalEntries.filter(e => e.date === date);
}

export function addFeedbackToClassical(entryId: string, feedback: Feedback): void {
  const entry = mem.classicalEntries.find(e => e.id === entryId);
  if (entry) {
    entry.feedbacks.push(feedback);
    persist('classical_entries', entryId, entry);
  }
}

export function upsertModernEntry(entry: ModernLiteratureEntry): void {
  const idx = mem.modernEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) mem.modernEntries[idx] = entry;
  else mem.modernEntries.push(entry);
  persist('modern_entries', entry.id, entry);
}

export function getModernEntriesForDate(date: string): ModernLiteratureEntry[] {
  return mem.modernEntries.filter(e => e.date === date);
}

export function addFeedbackToModern(entryId: string, feedback: Feedback): void {
  const entry = mem.modernEntries.find(e => e.id === entryId);
  if (entry) {
    entry.feedbacks.push(feedback);
    persist('modern_entries', entryId, entry);
  }
}

export function upsertPersonalStudyEntry(entry: PersonalStudyEntry): void {
  const idx = mem.personalStudyEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) mem.personalStudyEntries[idx] = entry;
  else mem.personalStudyEntries.push(entry);
  persist('personal_study_entries', entry.id, entry);
}

export function getPersonalStudyEntriesForDate(date: string): PersonalStudyEntry[] {
  return mem.personalStudyEntries.filter(e => e.date === date);
}

export function deletePersonalStudyEntry(id: string): void {
  mem.personalStudyEntries = mem.personalStudyEntries.filter(e => e.id !== id);
  remove('personal_study_entries', id);
}

export function upsertReflectionEntry(entry: ReflectionEntry): void {
  const idx = mem.reflectionEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) mem.reflectionEntries[idx] = entry;
  else mem.reflectionEntries.push(entry);
  persist('reflection_entries', entry.id, entry);
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
    persist('attendance_entries', entry.id, entry);
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
