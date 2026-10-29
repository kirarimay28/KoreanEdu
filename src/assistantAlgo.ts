import type { AssistantWeekday, StudyBlock, StudyBlockType, ASubject, StudyConfig } from './assistantTypes';

// ── Date utils ───────────────────────────────────────────────

export function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00+09:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDayOfWeek(date: string): AssistantWeekday {
  const d = new Date(date + 'T00:00:00+09:00');
  return (['일', '월', '화', '수', '목', '금', '토'] as AssistantWeekday[])[d.getDay()];
}

export function getWeekMonday(date: string): string {
  const d = new Date(date + 'T00:00:00+09:00');
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

// Returns minutes from midnight
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fromMin(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Vacation week number ─────────────────────────────────────

export function getVacationWeekNum(vacationStartDate: string, targetDate: string): number {
  const start = new Date(vacationStartDate + 'T00:00:00+09:00');
  const target = new Date(targetDate + 'T00:00:00+09:00');
  const diffMs = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(8, Math.floor(diffDays / 7) + 1));
}

// ── Block factory ────────────────────────────────────────────

function makeBlock(
  userId: string,
  date: string,
  start: string,
  end: string,
  subject: ASubject,
  blockType: StudyBlockType,
  label: string,
  weekNum?: number,
): StudyBlock {
  const now = new Date().toISOString();
  const id = `${userId}_${date}_${blockType}_${Math.random().toString(36).slice(2, 8)}`;
  return { id, userId, date, start, end, subject, blockType, label, weekNum, status: '예정', createdAt: now, updatedAt: now };
}

// ── Weekday blocks (Mon-Fri) ─────────────────────────────────

function makeWeekdayBlocks(userId: string, date: string, weekNum: number, _config: StudyConfig): StudyBlock[] {
  const blocks: StudyBlock[] = [];
  // 문법 오전 (09:00-12:00 = 180분)
  blocks.push(makeBlock(userId, date, '09:00', '10:30', '문법', '문법_정독',   `${weekNum}주차 문법 정독`, weekNum));
  blocks.push(makeBlock(userId, date, '10:30', '11:15', '문법', '문법_카드',   `${weekNum}주차 쟁점 카드`, weekNum));
  blocks.push(makeBlock(userId, date, '11:15', '12:00', '문법', '문법_서술형', `${weekNum}주차 문법 서술형`, weekNum));
  // 문학 오후1 (13:00-15:30 = 150분)
  blocks.push(makeBlock(userId, date, '13:00', '13:50', '문학', '문학_강의복습', `${weekNum}주차 문학 강의복습`, weekNum));
  blocks.push(makeBlock(userId, date, '13:50', '14:45', '문학', '문학_작품분석', `${weekNum}주차 문학 작품분석`, weekNum));
  blocks.push(makeBlock(userId, date, '14:45', '15:30', '문학', '문학_기출',    `${weekNum}주차 문학 기출`, weekNum));
  // 국교론 오후2 (15:30-18:00 = 150분)
  blocks.push(makeBlock(userId, date, '15:30', '16:20', '국교론', '국교론_강의복습', `${weekNum}주차 국교론 강의복습`, weekNum));
  blocks.push(makeBlock(userId, date, '16:20', '17:10', '국교론', '국교론_단권화',   `${weekNum}주차 국교론 단권화`, weekNum));
  blocks.push(makeBlock(userId, date, '17:10', '18:00', '국교론', '국교론_기출',    `${weekNum}주차 국교론 기출`, weekNum));
  return blocks;
}

// ── Saturday blocks ──────────────────────────────────────────

function makeSaturdayBlocks(userId: string, date: string, weekNum: number): StudyBlock[] {
  const blocks: StudyBlock[] = [];
  blocks.push(makeBlock(userId, date, '09:00', '11:00', '문학',  '주말강의', `이환 문학 키워드 인강`, weekNum));
  blocks.push(makeBlock(userId, date, '11:30', '13:30', '국교론', '주말강의', `이환 국교론 키워드 인강`, weekNum));
  blocks.push(makeBlock(userId, date, '14:00', '16:00', '문학',  '주간복습', `토요일 정리`, weekNum));
  if (weekNum === 4 || weekNum === 8) {
    blocks.push(makeBlock(userId, date, '16:30', '20:00', '문법', '모의고사', `${weekNum}주차 누적 모의고사`, weekNum));
  }
  return blocks;
}

// ── Sunday blocks ────────────────────────────────────────────

function makeSundayBlocks(userId: string, date: string, weekNum: number): StudyBlock[] {
  const blocks: StudyBlock[] = [];
  // 오전: 지식구조 강의
  blocks.push(makeBlock(userId, date, '09:00', '11:00', '문학',  '주말강의', `이환 문학 지식구조 강의`, weekNum));
  blocks.push(makeBlock(userId, date, '11:00', '13:00', '국교론', '주말강의', `이환 국교론 지식구조 강의`, weekNum));
  // 오후: 주간 복습 + 점검
  blocks.push(makeBlock(userId, date, '14:00', '18:00', '문법', '주간복습', `${weekNum}주차 주간 복습·점검`, weekNum));
  // 저녁 휴식 → 블록 없음
  return blocks;
}

// ── Day dispatcher ───────────────────────────────────────────

export function generateVacationDayBlocks(date: string, weekNum: number, config: StudyConfig): StudyBlock[] {
  const userId = config.userId;
  const dow = getDayOfWeek(date);
  if (['월', '화', '수', '목', '금'].includes(dow)) return makeWeekdayBlocks(userId, date, weekNum, config);
  if (dow === '토') return makeSaturdayBlocks(userId, date, weekNum);
  if (dow === '일') return makeSundayBlocks(userId, date, weekNum);
  return [];
}

// ── Week generator ───────────────────────────────────────────

export function generateVacationWeekBlocks(
  weekStart: string,
  weekNum: number,
  config: StudyConfig,
): StudyBlock[] {
  const blocks: StudyBlock[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    blocks.push(...generateVacationDayBlocks(date, weekNum, config));
  }
  return blocks;
}

// ── Semester mode stub (Phase 3) ─────────────────────────────

export function generateSemesterDayBlocks(
  _date: string,
  _config: StudyConfig,
  _classTimetableSubjects?: Array<{ start: string; end: string }>,
  _workStart?: string,
  _workEnd?: string,
  _commuteMin?: number,
  _returnMin?: number,
): StudyBlock[] {
  return [];
}

// ── Timeline helpers ─────────────────────────────────────────

export interface TimelineSlot {
  start: string;
  end: string;
  type: 'class' | 'work' | 'commute' | 'return' | 'lecture' | 'study' | 'deadline';
  label: string;
  color: string;
  meta?: Record<string, unknown>;
}

export function buildDayTimeline(
  date: string,
  classSlots: Array<{ start: string; end: string; name: string }>,
  workSlot: { start: string; end: string; commuteMin: number; returnMin: number } | null,
  lectureSlots: Array<{ start: string; end: string; source: string }>,
  studyBlocks: StudyBlock[],
): TimelineSlot[] {
  const slots: TimelineSlot[] = [];

  // Commute
  if (workSlot) {
    const commuteEnd = fromMin(toMin(workSlot.start));
    const commuteStart = fromMin(toMin(workSlot.start) - workSlot.commuteMin);
    if (workSlot.commuteMin > 0) {
      slots.push({ start: commuteStart, end: commuteEnd, type: 'commute', label: '출근 이동', color: 'gray' });
    }
    slots.push({ start: workSlot.start, end: workSlot.end, type: 'work', label: '근무', color: 'gray' });
    const returnStart = fromMin(toMin(workSlot.end));
    const returnEnd = fromMin(toMin(workSlot.end) + workSlot.returnMin);
    if (workSlot.returnMin > 0) {
      slots.push({ start: returnStart, end: returnEnd, type: 'return', label: '퇴근 이동', color: 'gray' });
    }
  }

  // Classes
  for (const c of classSlots) {
    slots.push({ start: c.start, end: c.end, type: 'class', label: c.name, color: 'blue' });
  }

  // Lectures
  for (const l of lectureSlots) {
    slots.push({ start: l.start, end: l.end, type: 'lecture', label: l.source.replace(/_/g, ' '), color: 'amber' });
  }

  // Study blocks
  for (const b of studyBlocks) {
    slots.push({ start: b.start, end: b.end, type: 'study', label: b.label, color: getBlockColor(b.subject), meta: { blockId: b.id, status: b.status, subject: b.subject } });
  }

  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

function getBlockColor(subject: ASubject): string {
  if (subject === '문법') return 'violet';
  if (subject === '문학') return 'emerald';
  return 'primary';
}
