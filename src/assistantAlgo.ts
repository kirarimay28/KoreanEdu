import type { AssistantWeekday, StudyBlock, StudyBlockType, ASubject, StudyConfig } from './assistantTypes';

// ── Date utils ───────────────────────────────────────────────

export function addDays(date: string, n: number): string {
  const [y, mo, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function getDayOfWeek(date: string): AssistantWeekday {
  const [y, mo, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (['일', '월', '화', '수', '목', '금', '토'] as AssistantWeekday[])[dt.getUTCDay()];
}

export function getWeekMonday(date: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const dow = dt.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

export function formatHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

// ── Vacation week number ─────────────────────────────────────

export function getVacationWeekNum(vacationStartDate: string, targetDate: string): number {
  const [sy, sm, sd] = vacationStartDate.split('-').map(Number);
  const [ty, tm, td] = targetDate.split('-').map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const target = Date.UTC(ty, tm - 1, td);
  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
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

// ── Interval helpers ─────────────────────────────────────────

interface Interval { start: number; end: number }

function subtractIntervals(available: Interval[], blocked: Interval[]): Interval[] {
  let result = [...available];
  for (const b of blocked) {
    const next: Interval[] = [];
    for (const s of result) {
      if (b.end <= s.start || b.start >= s.end) { next.push(s); continue; }
      if (s.start < b.start) next.push({ start: s.start, end: b.start });
      if (b.end < s.end)     next.push({ start: b.end,   end: s.end });
    }
    result = next;
  }
  return result;
}

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
export function fromMin(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getAvailableMinutes(
  studyStart: string,
  studyEnd: string,
  classTimes: Array<{ start: string; end: string }>,
  workSlot: { start: string; end: string; commuteMin: number; returnMin: number } | null,
  bufferMinutes: number,
): number {
  let avail: Interval[] = [{ start: toMin(studyStart), end: toMin(studyEnd) }];
  for (const c of classTimes) avail = subtractIntervals(avail, [{ start: toMin(c.start), end: toMin(c.end) }]);
  if (workSlot) {
    avail = subtractIntervals(avail, [{
      start: toMin(workSlot.start) - workSlot.commuteMin,
      end: toMin(workSlot.end) + workSlot.returnMin,
    }]);
  }
  const total = avail.reduce((s, i) => s + (i.end - i.start), 0);
  return Math.max(0, total - bufferMinutes);
}

// ── Semester mode ─────────────────────────────────────────────

export function generateSemesterDayBlocks(
  date: string,
  config: StudyConfig,
  classTimes: Array<{ start: string; end: string }> = [],
  workSlot: { start: string; end: string; commuteMin: number; returnMin: number } | null = null,
): StudyBlock[] {
  const userId = config.userId;
  const dow = getDayOfWeek(date);

  // 일요일 저녁은 휴식
  if (dow === '일') return [];

  let avail: Interval[] = [{ start: toMin(config.studyStartTime), end: toMin(config.studyEndTime) }];
  for (const c of classTimes) avail = subtractIntervals(avail, [{ start: toMin(c.start), end: toMin(c.end) }]);
  if (workSlot) {
    avail = subtractIntervals(avail, [{
      start: toMin(workSlot.start) - workSlot.commuteMin,
      end: toMin(workSlot.end) + workSlot.returnMin,
    }]);
  }

  // Remove buffer from last slots
  let bufLeft = config.bufferMinutes;
  for (let i = avail.length - 1; i >= 0 && bufLeft > 0; i--) {
    const len = avail[i].end - avail[i].start;
    const cut = Math.min(len, bufLeft);
    avail[i] = { ...avail[i], end: avail[i].end - cut };
    bufLeft -= cut;
    if (avail[i].end <= avail[i].start) avail.splice(i, 1);
  }

  const usable = avail.filter(s => s.end - s.start >= config.minBlockMin);
  if (usable.length === 0) return [];

  const totalMin = usable.reduce((s, i) => s + (i.end - i.start), 0);
  const ratioSum = Object.values(config.ratios).reduce((s, r) => s + r, 0);
  const subjectMin: Record<ASubject, number> = {
    '문법':   Math.floor(totalMin * config.ratios['문법'] / ratioSum),
    '문학':   Math.floor(totalMin * config.ratios['문학'] / ratioSum),
    '국교론': Math.floor(totalMin * config.ratios['국교론'] / ratioSum),
  };

  const blocks: StudyBlock[] = [];
  const slots = usable.map(s => ({ ...s }));

  // Grammar → longest slot (집중 필요 = 가장 긴 연속 시간)
  const longestIdx = slots.reduce((bi, s, i) => (s.end - s.start) > (slots[bi].end - slots[bi].start) ? i : bi, 0);
  const gSlot = slots[longestIdx];
  const grammarSeq: Array<{ type: StudyBlockType; label: string; frac: number }> = [
    { type: '문법_정독',   label: '문법 정독',   frac: 0.5 },
    { type: '문법_카드',   label: '쟁점 카드',   frac: 0.25 },
    { type: '문법_서술형', label: '문법 서술형', frac: 0.25 },
  ];
  for (const g of grammarSeq) {
    const dur = Math.min(Math.ceil(subjectMin['문법'] * g.frac), gSlot.end - gSlot.start);
    if (dur < config.minBlockMin || gSlot.start >= gSlot.end) continue;
    blocks.push(makeBlock(userId, date, fromMin(gSlot.start), fromMin(gSlot.start + dur), '문법', g.type, g.label));
    gSlot.start += dur;
  }

  // Literature + KorEdu in remaining slots
  const afterSubjects: Array<{ subject: ASubject; seq: Array<{ type: StudyBlockType; label: string }> }> = [
    { subject: '문학', seq: [
      { type: '문학_강의복습', label: '문학 강의복습' },
      { type: '문학_작품분석', label: '문학 작품분석' },
      { type: '문학_기출',    label: '문학 기출' },
    ]},
    { subject: '국교론', seq: [
      { type: '국교론_강의복습', label: '국교론 강의복습' },
      { type: '국교론_단권화',   label: '국교론 단권화' },
      { type: '국교론_기출',    label: '국교론 기출' },
    ]},
  ];
  for (const subj of afterSubjects) {
    const perType = Math.floor(subjectMin[subj.subject] / subj.seq.length);
    for (const st of subj.seq) {
      for (const slot of slots) {
        const avLen = slot.end - slot.start;
        if (avLen < config.minBlockMin) continue;
        const dur = Math.min(perType, avLen, config.defaultBlockMin);
        if (dur < config.minBlockMin) continue;
        blocks.push(makeBlock(userId, date, fromMin(slot.start), fromMin(slot.start + dur), subj.subject, st.type, st.label));
        slot.start += dur;
        break;
      }
    }
  }

  // 자투리: [20, minBlockMin) 분 남은 슬롯
  for (const slot of slots) {
    const len = slot.end - slot.start;
    if (len >= 20 && len < config.minBlockMin) {
      blocks.push(makeBlock(userId, date, fromMin(slot.start), fromMin(slot.end), '문법', '자투리', '자투리 (카드 복습)'));
    }
  }

  return blocks.sort((a, b) => a.start.localeCompare(b.start));
}

// ── Carry-over ────────────────────────────────────────────────

export interface CarryOverResult {
  blocks: StudyBlock[];
  needsReschedule: boolean;
  rescheduleReason?: string;
}

export function carryOverBlocks(
  missed: StudyBlock[],
  targetDate: string,
  availableSlots: Array<{ start: string; end: string }>,
  minBlockMin: number,
): CarryOverResult {
  const overLimit = missed.length >= 3;
  const doubleCarried = missed.some(b => b.carriedFrom !== undefined);
  const needsReschedule = overLimit || doubleCarried;
  const rescheduleReason = overLimit
    ? `이월 블록 ${missed.length}개 — 이번 주 범위를 줄일까?`
    : doubleCarried ? '2회 이상 밀린 블록 있음 — 범위를 줄일까?' : undefined;

  const slots = availableSlots.map(s => ({ start: toMin(s.start), end: toMin(s.end) }));
  const now = new Date().toISOString();
  const carried: StudyBlock[] = [];

  for (const b of missed) {
    const dur = toMin(b.end) - toMin(b.start);
    for (const slot of slots) {
      if (slot.end - slot.start >= Math.max(dur, minBlockMin)) {
        carried.push({
          ...b,
          id: `${b.userId}_${targetDate}_${b.blockType}_${Math.random().toString(36).slice(2, 8)}`,
          date: targetDate,
          start: fromMin(slot.start),
          end: fromMin(slot.start + dur),
          status: '예정',
          carriedFrom: b.carriedFrom ?? b.date,
          createdAt: now,
          updatedAt: now,
        });
        slot.start += dur;
        break;
      }
    }
  }

  return { blocks: carried, needsReschedule, rescheduleReason };
}

// ── Weekly check adjustment ────────────────────────────────────

export function applyWeeklyCheckAdjustment(
  blocks: StudyBlock[],
  failedCheckIds: string[],
  extraMin = 30,
): StudyBlock[] {
  if (failedCheckIds.length < 2) return blocks;
  const now = new Date().toISOString();
  return blocks.map(b =>
    (b.subject === '문학' || b.subject === '국교론')
      ? { ...b, end: fromMin(toMin(b.end) + extraMin), updatedAt: now }
      : b,
  );
}

// ── Conflict detection ────────────────────────────────────────

export interface ScheduleConflict {
  slotA: { label: string; start: string; end: string };
  slotB: { label: string; start: string; end: string };
}

export function detectConflicts(
  slots: Array<{ label: string; start: string; end: string }>,
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (toMin(slots[i].start) < toMin(slots[j].end) && toMin(slots[i].end) > toMin(slots[j].start)) {
        conflicts.push({ slotA: slots[i], slotB: slots[j] });
      }
    }
  }
  return conflicts;
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
  _date: string,
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
