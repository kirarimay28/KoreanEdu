import type {
  PlannerProfile, PlannerSubject, PlannerFixedSchedule, PlannerTag,
  Phase, GeneratedDayPlan, DayStudyBlock, ChecklistItem,
  Weekday,
} from './plannerTypes';

// ── Semester config ─────────────────────────────────────────
export const SEMESTER = {
  finalPrepStart: '2026-10-27',
  phase0End:       '2026-11-01',
  phase1End:       '2026-11-15',
  phase2End:       '2026-11-29',
  phase3End:       '2026-12-14',
  makeupStart:    '2026-12-08',
  makeupEnd:      '2026-12-14',
  examStart:      '2026-12-15',
  examEnd:        '2026-12-21',
  phase2LateStart:'2026-11-23',
};

export const PHASE_LABELS: Record<Phase, { name: string; range: string; goal: string }> = {
  0: { name: '0. 세팅',      range: '10/27 ~ 11/1',  goal: '범위 확인, 자료 양식 만들기, 루틴 시작' },
  1: { name: '1. 1회독',     range: '11/2 ~ 11/15',  goal: '정리 자료 완성' },
  2: { name: '2. 2회독·인출', range: '11/16 ~ 11/29', goal: '안 보고 쓰기. 11/23부터 교직·교양 비중 증가' },
  3: { name: '3. 마무리',    range: '11/30 ~ 12/14', goal: '교직·교양 집중, 전공 3회독, 과목별 요약 1장' },
  4: { name: '시험 기간',    range: '12/15 ~ 12/21', goal: '시험 모드 (7장)' },
};

// ── Common major subjects (seed data) ──────────────────────
export const COMMON_SUBJECTS: PlannerSubject[] = [
  {
    id: 'common-이해교육론',
    name: '이해교육론',
    type: 'major',
    isCommon: true,
    classTimes: [{ day: '월', start: '10:00', end: '11:00' }, { day: '수', start: '09:00', end: '11:00' }],
    noExam: false, isOnline: false,
    tags: ['통암기·분량 많음', '강조 부분 출제'],
    notes: '통암기 과목, 분량 많음, 교수님 강조한 데서 출제',
  },
  {
    id: 'common-현대소설론',
    name: '현대소설론',
    type: 'major',
    isCommon: true,
    classTimes: [{ day: '월', start: '11:00', end: '13:00' }, { day: '화', start: '13:00', end: '14:00' }],
    noExam: false, isOnline: false,
    tags: ['다른 작품·자료 출제'],
    notes: '수업 작품은 안 나오고 같은 작가 다른 작품으로 출제',
  },
  {
    id: 'common-국어의미론',
    name: '국어의미론',
    type: 'major',
    isCommon: true,
    classTimes: [{ day: '월', start: '15:00', end: '17:00' }, { day: '화', start: '16:00', end: '17:00' }],
    noExam: false, isOnline: false,
    tags: ['예시 중요', '강조 부분 출제'],
    notes: '개념과 예시 연결이 중요, 강조한 데서 출제',
  },
  {
    id: 'common-중세국어',
    name: '중세국어의 이해',
    type: 'major',
    isCommon: true,
    classTimes: [{ day: '화', start: '14:00', end: '16:00' }, { day: '수', start: '14:00', end: '15:00' }],
    noExam: false, isOnline: false,
    tags: ['예시 중요', '서술형'],
    notes: '예시 암기 중요, 전체 서술형',
  },
];

// ── Tag metadata ────────────────────────────────────────────
export const ALL_TAGS: PlannerTag[] = [
  '통암기·분량 많음', '강조 부분 출제', '예시 중요', '서술형',
  '다른 작품·자료 출제', '문제 풀이형', '특이사항 없음',
];

export const TAG_WEIGHT_MIN: Record<PlannerTag, number> = {
  '통암기·분량 많음':  180,
  '강조 부분 출제':    60,
  '예시 중요':         60,
  '서술형':            60,
  '다른 작품·자료 출제': 60,
  '문제 풀이형':       60,
  '특이사항 없음':     0,
};

export const TAG_KEYWORDS: [PlannerTag, string[]][] = [
  ['통암기·분량 많음',     ['암기', '외우', '분량']],
  ['강조 부분 출제',       ['강조', '교수님']],
  ['예시 중요',            ['예시', '예문']],
  ['서술형',               ['서술', '논술']],
  ['다른 작품·자료 출제',  ['작품', '작가', '안 나온']],
  ['문제 풀이형',          ['문제', '계산', '풀이']],
];

export function suggestTags(notes: string): PlannerTag[] {
  const lower = notes.toLowerCase();
  const out: PlannerTag[] = [];
  for (const [tag, kws] of TAG_KEYWORDS) {
    if (kws.some(k => lower.includes(k))) out.push(tag);
  }
  return out;
}

// ── Time utilities ──────────────────────────────────────────
export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function fromMin(n: number): string {
  const h = Math.floor(Math.max(0, Math.min(n, 23 * 60 + 59)) / 60);
  const m = Math.floor(Math.max(0, Math.min(n, 23 * 60 + 59)) % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function addMin(t: string, n: number) { return fromMin(toMin(t) + n); }
function subMin(t: string, n: number) { return fromMin(Math.max(0, toMin(t) - n)); }

export function getDayOfWeek(dateStr: string): Weekday {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  return (['일', '월', '화', '수', '목', '금', '토'] as Weekday[])[d.getDay()];
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

export function getCurrentPhase(today: string): Phase {
  if (today < SEMESTER.finalPrepStart) return 0;
  if (today <= SEMESTER.phase0End) return 0;
  if (today <= SEMESTER.phase1End) return 1;
  if (today <= SEMESTER.phase2End) return 2;
  if (today <= SEMESTER.phase3End) return 3;
  return 4;
}

// ── Interval arithmetic ─────────────────────────────────────
interface Iv { s: number; e: number; }

function mergeBusy(blocks: Array<{ start: string; end: string }>): Iv[] {
  const sorted = blocks
    .map(b => ({ s: toMin(b.start), e: toMin(b.end) }))
    .filter(b => b.e > b.s)
    .sort((a, b) => a.s - b.s);
  const out: Iv[] = [];
  for (const b of sorted) {
    if (!out.length || b.s > out[out.length - 1].e) out.push({ ...b });
    else out[out.length - 1].e = Math.max(out[out.length - 1].e, b.e);
  }
  return out;
}

function freeSlots(dayS: number, dayE: number, busy: Iv[]): Iv[] {
  const out: Iv[] = [];
  let cur = dayS;
  for (const b of busy) {
    if (b.s > cur) out.push({ s: cur, e: Math.min(b.s, dayE) });
    cur = Math.max(cur, b.e);
  }
  if (cur < dayE) out.push({ s: cur, e: dayE });
  return out.filter(iv => iv.e - iv.s >= 30);
}

// ── Weekly target minutes ───────────────────────────────────
export function getWeeklyTarget(s: PlannerSubject, phase: Phase): number {
  if (s.noExam) return 0;
  if (s.type === 'teaching') return phase <= 1 ? 60 : phase === 2 ? (phase >= 2 ? 120 : 60) : 240;
  if (s.type === 'elective') return phase <= 1 ? 60 : phase === 2 ? 90 : 180;
  // major
  let base = 240;
  for (const tag of s.tags) base += TAG_WEIGHT_MIN[tag];
  if (phase >= 3 && s.tags.includes('다른 작품·자료 출제')) base -= 60;
  return base;
}

// ── Block labels ────────────────────────────────────────────
function reviewLabel(s: PlannerSubject): string {
  const parts = [`${s.name}: 당일 정리`];
  if (s.tags.includes('강조 부분 출제')) parts.push('강조 별표');
  if (s.tags.includes('예시 중요')) parts.push('예시 카드');
  if (s.tags.includes('통암기·분량 많음')) parts.push('분산 암기');
  if (s.tags.includes('서술형')) parts.push('서술 요점');
  if (s.tags.includes('다른 작품·자료 출제')) parts.push('작가 메모');
  if (s.type === 'teaching' || s.type === 'elective') return `${s.name}: 당일 요약`;
  return parts.join(' · ');
}

function studyLabel(s: PlannerSubject, phase: Phase, isLate = false): string {
  if (isLate) return `${s.name}: 오늘 복습 (간단히)`;
  if (phase <= 1) {
    if (s.tags.includes('통암기·분량 많음')) return `${s.name}: 1회독 + 강조 암기`;
    if (s.tags.includes('예시 중요'))        return `${s.name}: 개념–예시 표 만들기`;
    if (s.tags.includes('다른 작품·자료 출제')) return `${s.name}: 작가별 1장 정리`;
    return `${s.name}: 1회독`;
  }
  if (phase === 2) {
    if (s.tags.includes('통암기·분량 많음')) return `${s.name}: 백지 쓰기 → 재암기`;
    if (s.tags.includes('서술형'))           return `${s.name}: 예상 문제 답안 쓰기`;
    if (s.tags.includes('예시 중요'))        return `${s.name}: 예시 보고 개념 맞히기`;
    return `${s.name}: 2회독`;
  }
  if (s.tags.includes('통암기·분량 많음')) return `${s.name}: 3회독 (강조만)`;
  if (s.tags.includes('서술형'))           return `${s.name}: 최종 요약 1장`;
  return `${s.name}: 마무리 복습`;
}

function satReviewLabel(s: PlannerSubject): string {
  return `${s.name}: 백지 복습`;
}

function transitLabel(s: PlannerSubject): string {
  if (s.tags.includes('통암기·분량 많음') || s.tags.includes('예시 중요'))
    return `이동 중 · ${s.name}: 암기 카드`;
  if (s.tags.includes('다른 작품·자료 출제'))
    return `이동 중 · ${s.name}: 단편 읽기`;
  return `이동 중 · ${s.name}: 요약 훑기`;
}

// ── Main plan generation ────────────────────────────────────
export function generateWeekPlan(
  profile: PlannerProfile,
  weekMonday: string,
  today: string,
): GeneratedDayPlan[] {
  const phase = getCurrentPhase(today);
  const active = profile.subjects.filter(s => !s.noExam);

  const weeklyRem: Record<string, number> = {};
  for (const s of active) weeklyRem[s.id] = getWeeklyTarget(s, phase);

  const plans: GeneratedDayPlan[] = [];

  for (let di = 0; di < 7; di++) {
    const date = addDays(weekMonday, di);
    const dow = getDayOfWeek(date);

    // ── Busy blocks ──
    const busy: Array<{ start: string; end: string }> = [];

    // Classes
    const classesToday: PlannerSubject[] = [];
    for (const s of active) {
      for (const ct of s.classTimes) {
        if (ct.day === dow) {
          busy.push({ start: ct.start, end: ct.end });
          classesToday.push(s);
        }
      }
    }

    // Fixed schedules (effective = sched ± travel)
    const fixedToday: PlannerFixedSchedule[] = [];
    for (const fs of profile.fixedSchedules) {
      if (fs.day === dow) {
        busy.push({
          start: fs.travelMinutes > 0 ? subMin(fs.start, fs.travelMinutes) : fs.start,
          end:   fs.travelMinutes > 0 ? addMin(fs.end,   fs.travelMinutes) : fs.end,
        });
        fixedToday.push(fs);
      }
    }

    // Meals
    busy.push({ start: profile.settings.lunchStart, end: profile.settings.lunchEnd });
    busy.push({ start: profile.settings.dinnerStart, end: profile.settings.dinnerEnd });
    // Sunday rest
    if (dow === '일') busy.push({ start: profile.settings.sundayRestAfter, end: '23:59' });

    const dayS = toMin(profile.settings.studyStart);
    const dayE = toMin(profile.settings.studyEnd);
    const merged = mergeBusy(busy);
    const avail: Iv[] = freeSlots(dayS, dayE, merged);

    const blocks: DayStudyBlock[] = [];
    let totalMin = 0;

    // ── Helper: take `want` minutes from earliest block (optionally after `afterMin`) ──
    function take(want: number, afterMin = 0): Iv | null {
      for (let i = 0; i < avail.length; i++) {
        const s = Math.max(avail[i].s, afterMin);
        if (s >= avail[i].e) continue;
        const dur = avail[i].e - s;
        if (dur < 30 && dur < want) continue;
        const got = Math.min(dur, want);
        const taken: Iv = { s, e: s + got };
        // Remove / shrink avail[i]
        if (s === avail[i].s) {
          if (got === dur) avail.splice(i, 1);
          else { avail[i] = { s: s + got, e: avail[i].e }; }
        } else {
          const before = { s: avail[i].s, e: s };
          if (s + got >= avail[i].e) avail[i] = before;
          else avail.splice(i, 1, before, { s: s + got, e: avail[i].e });
        }
        return taken;
      }
      return null;
    }

    function takeLongest(max: number): Iv | null {
      if (!avail.length) return null;
      let bi = 0;
      for (let i = 1; i < avail.length; i++) {
        if (avail[i].e - avail[i].s > avail[bi].e - avail[bi].s) bi = i;
      }
      const iv = avail[bi];
      const got = Math.min(iv.e - iv.s, max);
      if (got < 30) return null;
      const taken: Iv = { s: iv.s, e: iv.s + got };
      if (got === iv.e - iv.s) avail.splice(bi, 1);
      else avail[bi] = { s: iv.s + got, e: iv.e };
      return taken;
    }

    function addBlock(iv: Iv, subj: PlannerSubject | null, label: string, type: DayStudyBlock['blockType']) {
      blocks.push({
        start: fromMin(iv.s), end: fromMin(iv.e),
        subjectId: subj?.id ?? type,
        subjectName: subj?.name ?? type,
        label, blockType: type,
      });
      totalMin += iv.e - iv.s;
      if (subj) weeklyRem[subj.id] = Math.max(0, (weeklyRem[subj.id] ?? 0) - (iv.e - iv.s));
    }

    // ── P1: class-day reviews ──
    for (const s of classesToday) {
      const classEndMin = Math.max(...s.classTimes
        .filter(ct => ct.day === dow)
        .map(ct => toMin(ct.end)));
      const dur = s.type !== 'major' ? 20 : Math.min(120, 60 + s.tags.filter(t => t !== '특이사항 없음').length * 15);
      const iv = take(dur, classEndMin) ?? take(dur);
      if (iv) addBlock(iv, s, reviewLabel(s), 'class_review');
    }

    // ── P2: Sunday supplement block (2h, morning) ──
    if (dow === '일') {
      const morning = avail.find(iv => iv.s <= toMin('12:00') && iv.e - iv.s >= 60);
      if (morning) {
        const got = Math.min(120, morning.e - morning.s);
        const iv: Iv = { s: morning.s, e: morning.s + got };
        const idx = avail.indexOf(morning);
        if (got === morning.e - morning.s) avail.splice(idx, 1);
        else avail[idx] = { s: morning.s + got, e: morning.e };
        addBlock(iv, null, '주간 보충: 밀린 것 정리 + 다음 주 계획', 'supplement');
      }
    }

    // ── P3: Saturday blank-test (longest block, 90min, memorize subjects) ──
    if (dow === '토') {
      const memSubjs = active.filter(s => s.tags.includes('통암기·분량 많음') || s.tags.includes('서술형'));
      if (memSubjs.length) {
        const iv = takeLongest(90);
        if (iv) addBlock(iv, memSubjs[0], satReviewLabel(memSubjs[0]), 'memorize');
      }
    }

    // ── P4: transit blocks ──
    for (const fs of fixedToday) {
      if (fs.travelMinutes < 30) continue;
      const transitSubj = active.find(s =>
        s.tags.includes('통암기·분량 많음') || s.tags.includes('예시 중요') || s.tags.includes('다른 작품·자료 출제')
      );
      if (!transitSubj) continue;
      for (const [ts, te] of [[fs.start, addMin(fs.end, fs.travelMinutes)], [subMin(fs.start, fs.travelMinutes), fs.start]] as const) {
        const dur = toMin(te) - toMin(ts);
        if (dur >= 20 && toMin(te) > toMin(ts)) {
          blocks.push({
            start: ts, end: te,
            subjectId: transitSubj.id, subjectName: transitSubj.name,
            label: transitLabel(transitSubj), blockType: 'transit',
          });
          totalMin += dur;
        }
      }
    }

    // ── P5: fill remaining with study blocks ──
    const daySubjCount: Record<string, number> = {};
    let lastId: string | null = null;

    const fillOrder = [...active]
      .filter(s => (weeklyRem[s.id] ?? 0) >= 30)
      .sort((a, b) => {
        if (a.type === 'major' && b.type !== 'major') return -1;
        if (a.type !== 'major' && b.type === 'major') return 1;
        return (weeklyRem[b.id] ?? 0) - (weeklyRem[a.id] ?? 0);
      });

    for (const s of fillOrder) {
      if (!avail.length) break;
      if ((daySubjCount[s.id] ?? 0) >= 2) continue;
      if (s.id === lastId) continue;

      const last = avail[avail.length - 1];
      const isLate = last && last.s >= toMin('22:00') && avail.length === 1;
      const want = Math.min(isLate ? 30 : 120, weeklyRem[s.id] ?? 0);
      if (want < 30) continue;

      const preferLong = s.tags.includes('통암기·분량 많음') || s.tags.includes('서술형');
      const iv = preferLong ? takeLongest(want) : take(want);
      if (iv) {
        addBlock(iv, s, studyLabel(s, phase, isLate), 'study');
        daySubjCount[s.id] = (daySubjCount[s.id] ?? 0) + 1;
        lastId = s.id;
      }
    }

    blocks.sort((a, b) => toMin(a.start) - toMin(b.start));
    plans.push({ date, dayOfWeek: dow, studyBlocks: blocks, totalStudyMinutes: totalMin });
  }

  return plans;
}

// ── Checklist generation ────────────────────────────────────
export function generateChecklist(subjects: PlannerSubject[]): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const active = subjects.filter(s => !s.noExam);
  let seq = 0;

  function add(phase: Phase, s: PlannerSubject, text: string): ChecklistItem {
    const item: ChecklistItem = {
      id: `cl-${phase}-${s.id}-${seq++}`,
      phase, subjectId: s.id, subjectName: s.name, isCommon: s.isCommon, text,
    };
    items.push(item);
    return item;
  }

  // Phase 0
  for (const s of active) {
    add(0, s, `기말 범위·시험 형식 확인`);
    if (s.tags.includes('강조 부분 출제'))         add(0, s, `필기에 강조 표시`);
    if (s.tags.includes('다른 작품·자료 출제'))    add(0, s, `작가 명단 + 읽을 작품 목록 만들기`);
    if (s.tags.includes('예시 중요'))              add(0, s, `예시 카드 양식 정하기`);
  }

  // Phase 1
  for (const s of active) {
    if (s.tags.includes('통암기·분량 많음'))       add(1, s, `강조 부분 1회 암기`);
    else if (s.tags.includes('예시 중요'))         add(1, s, `개념–예시 표(카드) 완성`);
    else if (s.tags.includes('다른 작품·자료 출제')) add(1, s, `작가별 1장 + 작품 1편씩`);
    else                                           add(1, s, `1회독 완성`);
  }

  // Phase 2
  for (const s of active) {
    if (s.tags.includes('통암기·분량 많음'))       add(2, s, `백지 쓰기 → 틀린 곳 재암기`);
    if (s.tags.includes('서술형'))                 add(2, s, `예상 문제 5~10개 답안 작성`);
    if (s.tags.includes('예시 중요'))              add(2, s, `예시 보고 개념 맞히기`);
    if (s.type === 'teaching' || s.type === 'elective') add(2, s, `11/23부터 정리 시작`);
  }

  // Phase 3
  for (const s of active) {
    add(3, s, `과목별 최종 요약 1장`);
    if (s.tags.includes('통암기·분량 많음'))       add(3, s, `3회독 (강조 부분만)`);
    if (s.tags.includes('문제 풀이형'))            add(3, s, `문제 유형 정리`);
    if (s.type === 'teaching')                     add(3, s, `핵심 비교표 + 2회 복습`);
  }

  return items;
}

// ── Default profile for seed user A ────────────────────────
export function makeSeedProfileA(userId: string, _username: string): PlannerProfile {
  return {
    userId,
    subjects: [
      ...COMMON_SUBJECTS,
      {
        id: `${userId}-특수교육`,
        name: '특수교육학개론',
        type: 'teaching',
        isCommon: false,
        classTimes: [{ day: '목', start: '11:00', end: '13:00' }],
        noExam: false, isOnline: false,
        tags: ['특이사항 없음'], notes: '',
      },
      {
        id: `${userId}-교육과정`,
        name: '교육과정',
        type: 'teaching',
        isCommon: false,
        classTimes: [{ day: '월', start: '18:00', end: '20:00' }],
        noExam: false, isOnline: false,
        tags: ['특이사항 없음'], notes: '',
      },
      {
        id: `${userId}-논리와사고`,
        name: '논리와 사고',
        type: 'elective',
        isCommon: false,
        classTimes: [
          { day: '화', start: '09:00', end: '11:00' },
          { day: '목', start: '10:00', end: '11:00' },
        ],
        noExam: false, isOnline: false,
        tags: ['특이사항 없음'], notes: '',
      },
      {
        id: `${userId}-AI디지털`,
        name: 'AI기반디지털학습환경설계',
        type: 'elective',
        isCommon: false,
        classTimes: [],
        noExam: true, isOnline: true,
        tags: ['특이사항 없음'], notes: '',
      },
    ],
    fixedSchedules: [
      { id: `${userId}-fs1`, name: '스터디', day: '월', start: '20:00', end: '22:00', travelMinutes: 0, duringExam: true },
      { id: `${userId}-fs2`, name: '알바', day: '목', start: '18:00', end: '22:00', travelMinutes: 30, duringExam: true },
      { id: `${userId}-fs3`, name: '알바', day: '금', start: '14:30', end: '22:00', travelMinutes: 60, duringExam: true },
      { id: `${userId}-fs4`, name: '알바', day: '토', start: '15:30', end: '20:00', travelMinutes: 30, duringExam: true },
      { id: `${userId}-fs5`, name: '알바', day: '일', start: '12:30', end: '19:00', travelMinutes: 30, duringExam: true },
    ],
    settings: {
      studyStart: '09:00', studyEnd: '23:30',
      lunchStart: '12:30', lunchEnd: '13:30',
      dinnerStart: '18:30', dinnerEnd: '19:30',
      sundayRestAfter: '19:30',
    },
    updatedAt: new Date().toISOString(),
  };
}

// Seed profile B (different from A)
export function makeSeedProfileB(userId: string, _username: string): PlannerProfile {
  return {
    userId,
    subjects: [
      ...COMMON_SUBJECTS,
      {
        id: `${userId}-교육심리`,
        name: '교육심리학',
        type: 'teaching',
        isCommon: false,
        classTimes: [{ day: '화', start: '09:00', end: '11:00' }],
        noExam: false, isOnline: false,
        tags: ['특이사항 없음'], notes: '',
      },
      {
        id: `${userId}-글쓰기`,
        name: '글쓰기와 표현',
        type: 'elective',
        isCommon: false,
        classTimes: [{ day: '목', start: '13:00', end: '15:00' }],
        noExam: false, isOnline: false,
        tags: ['서술형'], notes: '에세이형 기말 과제',
      },
    ],
    fixedSchedules: [
      { id: `${userId}-fs1`, name: '알바', day: '수', start: '14:00', end: '22:00', travelMinutes: 30, duringExam: true },
      { id: `${userId}-fs2`, name: '요가', day: '토', start: '10:00', end: '11:30', travelMinutes: 0, duringExam: false },
    ],
    settings: {
      studyStart: '09:00', studyEnd: '23:30',
      lunchStart: '12:00', lunchEnd: '13:00',
      dinnerStart: '18:00', dinnerEnd: '19:00',
      sundayRestAfter: '20:00',
    },
    updatedAt: new Date().toISOString(),
  };
}
