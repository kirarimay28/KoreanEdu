import type { AppData, User, ClassicalLiteratureEntry, ModernLiteratureEntry, PersonalStudyEntry, ReflectionEntry, Feedback, AttendanceEntry } from './types';

const STORAGE_KEY = 'korean_edu_data';

const defaultData: AppData = {
  users: [],
  classicalEntries: [],
  modernEntries: [],
  personalStudyEntries: [],
  reflectionEntries: [],
  attendanceEntries: [],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw) as AppData;
    return { ...defaultData, ...parsed };
  } catch {
    return { ...defaultData };
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
  const data = loadData();
  if (data.users.find(u => u.username === username)) {
    return { ok: false, error: '이미 사용 중인 아이디입니다.' };
  }
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: simpleHash(password),
    resolution,
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  saveData(data);
  return { ok: true, user };
}

export function loginUser(username: string, password: string): { ok: boolean; error?: string; user?: User } {
  const data = loadData();
  const user = data.users.find(u => u.username === username);
  if (!user) return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  if (user.passwordHash !== simpleHash(password)) return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  return { ok: true, user };
}

export function getUsers(): User[] {
  return loadData().users;
}

export function upsertClassicalEntry(entry: ClassicalLiteratureEntry): void {
  const data = loadData();
  const idx = data.classicalEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) data.classicalEntries[idx] = entry;
  else data.classicalEntries.push(entry);
  saveData(data);
}

export function getClassicalEntriesForDate(date: string): ClassicalLiteratureEntry[] {
  return loadData().classicalEntries.filter(e => e.date === date);
}

export function addFeedbackToClassical(entryId: string, feedback: Feedback): void {
  const data = loadData();
  const entry = data.classicalEntries.find(e => e.id === entryId);
  if (entry) {
    entry.feedbacks.push(feedback);
    saveData(data);
  }
}

export function upsertModernEntry(entry: ModernLiteratureEntry): void {
  const data = loadData();
  const idx = data.modernEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) data.modernEntries[idx] = entry;
  else data.modernEntries.push(entry);
  saveData(data);
}

export function getModernEntriesForDate(date: string): ModernLiteratureEntry[] {
  return loadData().modernEntries.filter(e => e.date === date);
}

export function addFeedbackToModern(entryId: string, feedback: Feedback): void {
  const data = loadData();
  const entry = data.modernEntries.find(e => e.id === entryId);
  if (entry) {
    entry.feedbacks.push(feedback);
    saveData(data);
  }
}

export function upsertPersonalStudyEntry(entry: PersonalStudyEntry): void {
  const data = loadData();
  const idx = data.personalStudyEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) data.personalStudyEntries[idx] = entry;
  else data.personalStudyEntries.push(entry);
  saveData(data);
}

export function getPersonalStudyEntriesForDate(date: string): PersonalStudyEntry[] {
  return loadData().personalStudyEntries.filter(e => e.date === date);
}

export function deletePersonalStudyEntry(id: string): void {
  const data = loadData();
  data.personalStudyEntries = data.personalStudyEntries.filter(e => e.id !== id);
  saveData(data);
}

export function upsertReflectionEntry(entry: ReflectionEntry): void {
  const data = loadData();
  const idx = data.reflectionEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) data.reflectionEntries[idx] = entry;
  else data.reflectionEntries.push(entry);
  saveData(data);
}

export function getReflectionEntryForDate(date: string, userId: string): ReflectionEntry | undefined {
  return loadData().reflectionEntries.find(e => e.date === date && e.userId === userId);
}

export function markAttendance(date: string, userId: string, username: string): void {
  const data = loadData();
  const exists = data.attendanceEntries.find(e => e.date === date && e.userId === userId);
  if (!exists) {
    data.attendanceEntries.push({
      id: crypto.randomUUID(),
      date,
      userId,
      username,
      markedAt: new Date().toISOString(),
    });
    saveData(data);
  }
}

export function getAttendanceEntries(): AttendanceEntry[] {
  return loadData().attendanceEntries;
}

export function hasStudyRecordOnDate(date: string): boolean {
  const data = loadData();
  return (
    data.classicalEntries.some(e => e.date === date) ||
    data.modernEntries.some(e => e.date === date) ||
    data.personalStudyEntries.some(e => e.date === date) ||
    data.reflectionEntries.some(e => e.date === date)
  );
}
