import { describe, it, expect } from 'vitest';
import {
  isDndActive,
  isDeadlineUrgent,
  buildBlockStartAlert,
  buildCommuteAlert,
  buildDeadlineAlerts,
  throttleNotifs,
  judgeNotifications,
} from './assistantNotif';
import type { AssistantSettings, AssistantDeadline, StudyBlock } from './assistantTypes';
import type { DndContext, WorkSlotInfo } from './assistantNotif';
import { defaultSettings } from './assistantTypes';

// ── Fixtures ──────────────────────────────────────────────────

const SETTINGS: AssistantSettings = {
  ...defaultSettings('서연'),
  speechStyle: '반말',
  blockStartWarningMin: 5,
  commuteWarningMin: 30,
  dailyNotifLimit: 20,
  dnd: {
    commuteDnd: true,
    classDnd: true,
    workDnd: true,
    sleepDnd: true,
    sleepStart: '23:30',
    sleepEnd: '07:00',
    customSlots: [],
  },
  urgent: { deadlineHours: 3, examMinutes: 60, conflictHours: 2, maxUrgentPerDay: 3 },
};

const WORK: WorkSlotInfo = { start: '15:00', end: '19:00', commuteMin: 30, returnMin: 30 };

function ctx(nowHHMM: string, extra?: Partial<DndContext>): DndContext {
  return {
    nowHHMM,
    weekday: '월',
    classTimes: [],
    workSlot: null,
    ...extra,
  };
}

function makeDeadline(overrides: Partial<AssistantDeadline> = {}): AssistantDeadline {
  return {
    id: 'd1',
    userId: '서연',
    title: '모의고사',
    date: '2026-11-05',
    type: '모의고사',
    urgentHoursBefore: 3,
    reminderDaysBefore: [7, 3, 1],
    completed: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeBlock(overrides: Partial<StudyBlock> = {}): StudyBlock {
  const now = '2026-01-01T00:00:00Z';
  return {
    id: 'b1',
    userId: '서연',
    date: '2026-10-29',
    start: '09:00',
    end: '10:30',
    subject: '문법',
    blockType: '문법_정독',
    label: '문법 정독',
    status: '예정',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ── isDndActive ───────────────────────────────────────────────

describe('isDndActive - sleep DND', () => {
  it('blocks at 23:30', () => {
    expect(isDndActive(SETTINGS, ctx('23:30'))).toBe(true);
  });
  it('blocks at 06:59 (overnight)', () => {
    expect(isDndActive(SETTINGS, ctx('06:59'))).toBe(true);
  });
  it('allows at 07:01', () => {
    expect(isDndActive(SETTINGS, ctx('07:01'))).toBe(false);
  });
  it('sleep DND off → wakes at 23:30', () => {
    const s = { ...SETTINGS, dnd: { ...SETTINGS.dnd, sleepDnd: false } };
    expect(isDndActive(s, ctx('23:30'))).toBe(false);
  });
});

describe('isDndActive - commute DND', () => {
  it('blocks during commute (14:30-15:00)', () => {
    expect(isDndActive(SETTINGS, ctx('14:35', { workSlot: WORK }))).toBe(true);
  });
  it('blocks during return commute (19:00-19:30)', () => {
    expect(isDndActive(SETTINGS, ctx('19:15', { workSlot: WORK }))).toBe(true);
  });
  it('allows before commute starts', () => {
    expect(isDndActive(SETTINGS, ctx('14:00', { workSlot: WORK }))).toBe(false);
  });
});

describe('isDndActive - work DND', () => {
  it('blocks during work hours', () => {
    expect(isDndActive(SETTINGS, ctx('16:00', { workSlot: WORK }))).toBe(true);
  });
  it('work DND off → allows during work', () => {
    const s = { ...SETTINGS, dnd: { ...SETTINGS.dnd, workDnd: false } };
    expect(isDndActive(s, ctx('16:00', { workSlot: WORK }))).toBe(false);
  });
});

describe('isDndActive - class DND', () => {
  const classTimes = [{ start: '09:00', end: '10:30' }];
  it('blocks during class', () => {
    expect(isDndActive(SETTINGS, ctx('09:30', { classTimes }))).toBe(true);
  });
  it('allows after class', () => {
    expect(isDndActive(SETTINGS, ctx('10:30', { classTimes }))).toBe(false);
  });
  it('class DND off → allows during class', () => {
    const s = { ...SETTINGS, dnd: { ...SETTINGS.dnd, classDnd: false } };
    expect(isDndActive(s, ctx('09:30', { classTimes }))).toBe(false);
  });
});

describe('isDndActive - custom slots', () => {
  const settings: AssistantSettings = {
    ...SETTINGS,
    dnd: {
      ...SETTINGS.dnd,
      customSlots: [{
        id: 'c1',
        label: '점심',
        days: ['월', '화'],
        start: '12:00',
        end: '13:00',
        enabled: true,
      }],
    },
  };
  it('blocks on matching day and time', () => {
    expect(isDndActive(settings, ctx('12:30', { weekday: '월' }))).toBe(true);
  });
  it('allows on non-matching day', () => {
    expect(isDndActive(settings, ctx('12:30', { weekday: '수' }))).toBe(false);
  });
  it('disabled slot is ignored', () => {
    const s = {
      ...settings,
      dnd: { ...settings.dnd, customSlots: [{ ...settings.dnd.customSlots[0], enabled: false }] },
    };
    expect(isDndActive(s, ctx('12:30', { weekday: '월' }))).toBe(false);
  });
});

// ── isDeadlineUrgent ──────────────────────────────────────────

describe('isDeadlineUrgent', () => {
  it('urgent when within 3 hours', () => {
    const d = makeDeadline({ date: '2026-11-05', time: '10:00' });
    const nowISO = '2026-11-05T08:00:00+09:00'; // 2h before
    expect(isDeadlineUrgent(d, nowISO, 3)).toBe(true);
  });
  it('not urgent when 4 hours away', () => {
    const d = makeDeadline({ date: '2026-11-05', time: '14:00' });
    const nowISO = '2026-11-05T09:00:00+09:00'; // 5h before
    expect(isDeadlineUrgent(d, nowISO, 3)).toBe(false);
  });
  it('not urgent when deadline passed', () => {
    const d = makeDeadline({ date: '2026-11-05', time: '08:00' });
    const nowISO = '2026-11-05T10:00:00+09:00'; // 2h after
    expect(isDeadlineUrgent(d, nowISO, 3)).toBe(false);
  });
  it('no time field defaults to 23:59', () => {
    const d = makeDeadline({ date: '2026-11-05' }); // no time
    const nowISO = '2026-11-05T22:00:00+09:00'; // ~2h before midnight
    expect(isDeadlineUrgent(d, nowISO, 3)).toBe(true);
  });
});

// ── buildBlockStartAlert ──────────────────────────────────────

describe('buildBlockStartAlert', () => {
  it('returns payload when block starts in warnMin', () => {
    const block = makeBlock({ start: '09:05' });
    const result = buildBlockStartAlert(block, '09:00', 5, '반말');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('block_start');
    expect(result!.body).toContain('5분');
  });
  it('returns null when too far ahead', () => {
    const block = makeBlock({ start: '10:00' });
    expect(buildBlockStartAlert(block, '09:00', 5, '반말')).toBeNull();
  });
  it('returns null when block already started', () => {
    const block = makeBlock({ start: '08:55' });
    expect(buildBlockStartAlert(block, '09:00', 5, '반말')).toBeNull();
  });
  it('uses 존댓말 when configured', () => {
    const block = makeBlock({ start: '09:05' });
    const result = buildBlockStartAlert(block, '09:00', 5, '존댓말');
    expect(result!.body).toContain('됩니다');
  });
  it('says 시작할 시간 when diff is 0', () => {
    const block = makeBlock({ start: '09:00' });
    const result = buildBlockStartAlert(block, '09:00', 5, '반말');
    expect(result!.body).toContain('시작할 시간');
  });
});

// ── buildCommuteAlert ─────────────────────────────────────────

describe('buildCommuteAlert', () => {
  const workSlot: WorkSlotInfo = { start: '15:00', end: '19:00', commuteMin: 30, returnMin: 30 };

  it('alerts when departure time is in warnMin', () => {
    // Need to leave by 14:30; 30 min warn → alerts from 14:00
    const result = buildCommuteAlert(workSlot, '14:20', 30, '반말');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('commute');
    expect(result!.body).toContain('10분');
  });
  it('returns null when too early', () => {
    expect(buildCommuteAlert(workSlot, '12:00', 30, '반말')).toBeNull();
  });
  it('returns null after departure time passed', () => {
    expect(buildCommuteAlert(workSlot, '14:35', 30, '반말')).toBeNull();
  });
});

// ── buildDeadlineAlerts ───────────────────────────────────────

describe('buildDeadlineAlerts', () => {
  it('returns urgent alert inside urgentHours', () => {
    const d = makeDeadline({ date: '2026-10-29', time: '11:00' });
    const alerts = buildDeadlineAlerts([d], '2026-10-29', '09:00', SETTINGS, '반말');
    expect(alerts.some(a => a.type === 'deadline_urgent')).toBe(true);
    expect(alerts.find(a => a.type === 'deadline_urgent')!.urgentOverride).toBe(true);
  });
  it('returns reminder alert on exact daysLeft at 09:00', () => {
    // today=2026-10-29, deadline=2026-11-05, daysLeft=7
    const d = makeDeadline({ date: '2026-11-05', reminderDaysBefore: [7] });
    const alerts = buildDeadlineAlerts([d], '2026-10-29', '09:00', SETTINGS, '반말');
    expect(alerts.some(a => a.type === 'deadline_reminder')).toBe(true);
  });
  it('does not fire reminder at wrong time', () => {
    const d = makeDeadline({ date: '2026-11-05', reminderDaysBefore: [7] });
    const alerts = buildDeadlineAlerts([d], '2026-10-29', '10:00', SETTINGS, '반말');
    expect(alerts.some(a => a.type === 'deadline_reminder')).toBe(false);
  });
  it('skips completed deadlines', () => {
    const d = makeDeadline({ date: '2026-11-05', completed: true });
    expect(buildDeadlineAlerts([d], '2026-10-29', '09:00', SETTINGS, '반말')).toHaveLength(0);
  });
});

// ── throttleNotifs ────────────────────────────────────────────

describe('throttleNotifs', () => {
  function pay(urgent = false) {
    return { title: 't', body: 'b', type: 'block_start' as const, urgentOverride: urgent };
  }
  it('passes all when under limit', () => {
    expect(throttleNotifs([pay(), pay()], 20, 0)).toHaveLength(2);
  });
  it('caps normals by remaining quota', () => {
    const result = throttleNotifs([pay(), pay(), pay()], 20, 18);
    expect(result).toHaveLength(2); // 2 remaining
  });
  it('urgents always pass even over limit', () => {
    const result = throttleNotifs([pay(true), pay(), pay()], 20, 20);
    expect(result).toHaveLength(1);
    expect(result[0].urgentOverride).toBe(true);
  });
  it('empty list returns empty', () => {
    expect(throttleNotifs([], 20, 0)).toHaveLength(0);
  });
});

// ── judgeNotifications (integration) ─────────────────────────

describe('judgeNotifications', () => {
  const base = {
    settings: SETTINGS,
    ctx: ctx('08:55'),
    blocks: [makeBlock({ date: '2026-10-29', start: '09:00', end: '10:30' })],
    deadlines: [],
    today: '2026-10-29',
    nowHHMM: '08:55',
    nowISO: '2026-10-29T08:55:00+09:00',
    sentCountToday: 0,
  };

  it('fires block start alert in clear time', () => {
    const result = judgeNotifications(base);
    expect(result.some(p => p.type === 'block_start')).toBe(true);
  });
  it('blocks notification during sleep DND', () => {
    const input = { ...base, ctx: ctx('23:45'), nowHHMM: '23:45' };
    const result = judgeNotifications(input);
    expect(result.filter(p => !p.urgentOverride)).toHaveLength(0);
  });
  it('urgent deadline passes even in sleep DND', () => {
    const urgentDeadline = makeDeadline({ date: '2026-10-30', time: '01:00' }); // 1h from 23:45 → urgent
    const input = {
      ...base,
      ctx: ctx('23:45'),
      nowHHMM: '23:45',
      nowISO: '2026-10-29T23:45:00+09:00',
      deadlines: [urgentDeadline],
    };
    const result = judgeNotifications(input);
    expect(result.some(p => p.urgentOverride)).toBe(true);
  });
  it('skips completed blocks', () => {
    const input = {
      ...base,
      blocks: [makeBlock({ date: '2026-10-29', start: '09:00', status: '완료' })],
    };
    expect(judgeNotifications(input).some(p => p.type === 'block_start')).toBe(false);
  });
});
