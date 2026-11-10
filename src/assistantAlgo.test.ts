import { describe, it, expect } from 'vitest';
import {
  addDays,
  getDayOfWeek,
  getWeekMonday,
  formatHHMM,
  getVacationWeekNum,
  generateVacationDayBlocks,
  generateVacationWeekBlocks,
  toMin,
  fromMin,
  getAvailableMinutes,
  generateSemesterDayBlocks,
  carryOverBlocks,
  applyWeeklyCheckAdjustment,
  detectConflicts,
} from './assistantAlgo';
import type { StudyConfig, StudyBlock } from './assistantTypes';

const BASE_CONFIG: StudyConfig = {
  userId: '서연',
  mode: '방학',
  minBlockMin: 45,
  defaultBlockMin: 90,
  bufferMinutes: 60,
  ratios: { '문법': 3, '문학': 2.5, '국교론': 2.5 },
  studyStartTime: '09:00',
  studyEndTime: '23:30',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ── Date utils ───────────────────────────────────────────────

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-01-01', 1)).toBe('2026-01-02');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });
  it('adds negative days', () => {
    expect(addDays('2026-02-01', -1)).toBe('2026-01-31');
  });
  it('adds 0 days', () => {
    expect(addDays('2026-06-15', 0)).toBe('2026-06-15');
  });
  it('crosses month boundary', () => {
    expect(addDays('2026-03-31', 1)).toBe('2026-04-01');
  });
});

describe('getDayOfWeek', () => {
  it('returns correct day', () => {
    expect(getDayOfWeek('2026-10-26')).toBe('월'); // Monday
    expect(getDayOfWeek('2026-10-31')).toBe('토'); // Saturday
    expect(getDayOfWeek('2026-11-01')).toBe('일'); // Sunday
  });
});

describe('getWeekMonday', () => {
  it('returns Monday for any day in that week', () => {
    const mon = '2026-10-26';
    expect(getWeekMonday('2026-10-26')).toBe(mon);
    expect(getWeekMonday('2026-10-28')).toBe(mon);
    expect(getWeekMonday('2026-11-01')).toBe(mon);
  });
});

describe('formatHHMM', () => {
  it('formats minutes only', () => expect(formatHHMM(30)).toBe('30분'));
  it('formats hours only', () => expect(formatHHMM(120)).toBe('2시간'));
  it('formats hours and minutes', () => expect(formatHHMM(90)).toBe('1시간 30분'));
});

// ── toMin / fromMin ──────────────────────────────────────────

describe('toMin / fromMin', () => {
  it('converts HH:MM to minutes and back', () => {
    expect(toMin('09:00')).toBe(540);
    expect(toMin('23:30')).toBe(1410);
    expect(toMin('00:00')).toBe(0);
    expect(fromMin(540)).toBe('09:00');
    expect(fromMin(1410)).toBe('23:30');
    expect(fromMin(0)).toBe('00:00');
  });
  it('round-trips', () => {
    expect(fromMin(toMin('14:45'))).toBe('14:45');
  });
});

// ── Vacation week number ─────────────────────────────────────

describe('getVacationWeekNum', () => {
  it('day 0 = week 1', () => {
    expect(getVacationWeekNum('2026-07-01', '2026-07-01')).toBe(1);
  });
  it('day 7 = week 2', () => {
    expect(getVacationWeekNum('2026-07-01', '2026-07-08')).toBe(2);
  });
  it('clamps to 1..8', () => {
    expect(getVacationWeekNum('2026-07-01', '2026-06-01')).toBe(1);
    expect(getVacationWeekNum('2026-07-01', '2026-12-01')).toBe(8);
  });
});

// ── Vacation day / week generator ────────────────────────────

describe('generateVacationDayBlocks', () => {
  it('weekday has 9 blocks', () => {
    const blocks = generateVacationDayBlocks('2026-10-26', 1, BASE_CONFIG); // Monday
    expect(blocks).toHaveLength(9);
  });
  it('saturday has at least 3 blocks', () => {
    const blocks = generateVacationDayBlocks('2026-10-31', 1, BASE_CONFIG);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });
  it('saturday week 4 has mock exam block', () => {
    const blocks = generateVacationDayBlocks('2026-10-31', 4, BASE_CONFIG);
    expect(blocks.some(b => b.blockType === '모의고사')).toBe(true);
  });
  it('saturday week 1 has no mock exam', () => {
    const blocks = generateVacationDayBlocks('2026-10-31', 1, BASE_CONFIG);
    expect(blocks.some(b => b.blockType === '모의고사')).toBe(false);
  });
  it('sunday has 3 blocks', () => {
    const blocks = generateVacationDayBlocks('2026-11-01', 1, BASE_CONFIG); // Sunday
    expect(blocks).toHaveLength(3);
  });
  it('all blocks have correct userId', () => {
    const blocks = generateVacationDayBlocks('2026-10-26', 1, BASE_CONFIG);
    expect(blocks.every(b => b.userId === '서연')).toBe(true);
  });
  it('all blocks have date set correctly', () => {
    const date = '2026-10-26';
    const blocks = generateVacationDayBlocks(date, 1, BASE_CONFIG);
    expect(blocks.every(b => b.date === date)).toBe(true);
  });
});

describe('generateVacationWeekBlocks', () => {
  it('generates 7 days', () => {
    const blocks = generateVacationWeekBlocks('2026-10-26', 1, BASE_CONFIG);
    const dates = [...new Set(blocks.map(b => b.date))];
    expect(dates).toHaveLength(7);
  });
  it('total blocks > 0', () => {
    expect(generateVacationWeekBlocks('2026-10-26', 1, BASE_CONFIG).length).toBeGreaterThan(0);
  });
});

// ── getAvailableMinutes ───────────────────────────────────────

describe('getAvailableMinutes', () => {
  it('no constraints returns full time minus buffer', () => {
    // 09:00-23:30 = 870 min, buffer 60 → 810
    expect(getAvailableMinutes('09:00', '23:30', [], null, 60)).toBe(810);
  });
  it('subtracts class time', () => {
    // class 10:00-12:00 = 120 min removed
    const result = getAvailableMinutes('09:00', '23:30', [{ start: '10:00', end: '12:00' }], null, 60);
    expect(result).toBe(690);
  });
  it('subtracts work + commute', () => {
    const result = getAvailableMinutes(
      '09:00', '23:30', [],
      { start: '15:00', end: '19:00', commuteMin: 30, returnMin: 30 },
      60,
    );
    // Blocked: 14:30-19:30 = 300 min. 870 - 300 - 60 = 510
    expect(result).toBe(510);
  });
  it('never returns negative', () => {
    const result = getAvailableMinutes('09:00', '09:00', [], null, 999);
    expect(result).toBe(0);
  });
});

// ── generateSemesterDayBlocks ─────────────────────────────────

const SEMESTER_CONFIG: StudyConfig = { ...BASE_CONFIG, mode: '학기', bufferMinutes: 60 };

describe('generateSemesterDayBlocks', () => {
  it('returns empty array for Sunday', () => {
    expect(generateSemesterDayBlocks('2026-11-01', SEMESTER_CONFIG)).toHaveLength(0);
  });
  it('returns blocks on a weekday with no constraints', () => {
    const blocks = generateSemesterDayBlocks('2026-10-26', SEMESTER_CONFIG);
    expect(blocks.length).toBeGreaterThan(0);
  });
  it('blocks are sorted by start time', () => {
    const blocks = generateSemesterDayBlocks('2026-10-26', SEMESTER_CONFIG);
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].start >= blocks[i - 1].start).toBe(true);
    }
  });
  it('respects class time exclusion', () => {
    const classTimes = [{ name: '현대소설론', start: '09:00', end: '12:00' }];
    const blocks = generateSemesterDayBlocks('2026-10-26', SEMESTER_CONFIG, classTimes);
    expect(blocks.every(b => b.start >= '12:00')).toBe(true);
  });
  it('blocks are for timetable subjects', () => {
    const classTimes = [{ name: '현대소설론', start: '10:30', end: '13:00' }];
    const blocks = generateSemesterDayBlocks('2026-10-26', SEMESTER_CONFIG, classTimes);
    const semesterBlocks = blocks.filter(b => b.subject === '학기과목' && b.blockType !== '자투리');
    if (semesterBlocks.length > 0) {
      expect(semesterBlocks[0].start >= '13:00').toBe(true);
    }
  });
  it('no block starts before studyStartTime', () => {
    const blocks = generateSemesterDayBlocks('2026-10-26', SEMESTER_CONFIG);
    expect(blocks.every(b => b.start >= SEMESTER_CONFIG.studyStartTime)).toBe(true);
  });
  it('no block ends after studyEndTime minus buffer', () => {
    const blocks = generateSemesterDayBlocks('2026-10-26', SEMESTER_CONFIG);
    const limitMin = toMin(SEMESTER_CONFIG.studyEndTime) - SEMESTER_CONFIG.bufferMinutes;
    expect(blocks.every(b => toMin(b.end) <= limitMin)).toBe(true);
  });
});

// ── carryOverBlocks ───────────────────────────────────────────

function makeTestBlock(overrides: Partial<StudyBlock> = {}): StudyBlock {
  const now = '2026-01-01T00:00:00Z';
  return {
    id: 'test_1',
    userId: '서연',
    date: '2026-10-26',
    start: '09:00',
    end: '10:30',
    subject: '문법',
    blockType: '문법_정독',
    label: '문법 정독',
    status: '미완',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('carryOverBlocks', () => {
  it('carries a single missed block', () => {
    const missed = [makeTestBlock()];
    const slots = [{ start: '14:00', end: '18:00' }];
    const result = carryOverBlocks(missed, '2026-10-27', slots, 45);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].date).toBe('2026-10-27');
    expect(result.blocks[0].carriedFrom).toBe('2026-10-26');
    expect(result.needsReschedule).toBe(false);
  });
  it('flags needsReschedule when 3+ missed', () => {
    const missed = [makeTestBlock({ id: '1' }), makeTestBlock({ id: '2' }), makeTestBlock({ id: '3' })];
    const result = carryOverBlocks(missed, '2026-10-27', [{ start: '09:00', end: '23:00' }], 45);
    expect(result.needsReschedule).toBe(true);
  });
  it('flags needsReschedule when block already carried', () => {
    const missed = [makeTestBlock({ carriedFrom: '2026-10-25' })];
    const result = carryOverBlocks(missed, '2026-10-27', [{ start: '09:00', end: '23:00' }], 45);
    expect(result.needsReschedule).toBe(true);
  });
  it('does not carry if no slot is large enough', () => {
    const missed = [makeTestBlock({ start: '09:00', end: '10:30' })]; // 90min
    const slots = [{ start: '09:00', end: '09:30' }]; // only 30min
    const result = carryOverBlocks(missed, '2026-10-27', slots, 45);
    expect(result.blocks).toHaveLength(0);
  });
  it('preserves carriedFrom if already set', () => {
    const orig = makeTestBlock({ carriedFrom: '2026-10-24' });
    const result = carryOverBlocks([orig], '2026-10-27', [{ start: '14:00', end: '18:00' }], 45);
    expect(result.blocks[0].carriedFrom).toBe('2026-10-24');
  });
});

// ── applyWeeklyCheckAdjustment ────────────────────────────────

describe('applyWeeklyCheckAdjustment', () => {
  const litBlock = makeTestBlock({ subject: '문학', start: '13:00', end: '14:30' });
  const gramBlock = makeTestBlock({ subject: '문법', start: '09:00', end: '10:30' });

  it('does nothing when < 2 checks failed', () => {
    const result = applyWeeklyCheckAdjustment([litBlock, gramBlock], ['check_1'], 30);
    expect(result[0].end).toBe('14:30');
  });
  it('extends 문학/국교론 blocks when 2+ checks failed', () => {
    const result = applyWeeklyCheckAdjustment([litBlock, gramBlock], ['c1', 'c2'], 30);
    const lit = result.find(b => b.subject === '문학')!;
    expect(lit.end).toBe('15:00'); // 14:30 + 30min
  });
  it('does not extend 문법 blocks', () => {
    const result = applyWeeklyCheckAdjustment([litBlock, gramBlock], ['c1', 'c2'], 30);
    const gram = result.find(b => b.subject === '문법')!;
    expect(gram.end).toBe('10:30'); // unchanged
  });
  it('handles empty block list', () => {
    expect(applyWeeklyCheckAdjustment([], ['c1', 'c2'], 30)).toHaveLength(0);
  });
});

// ── detectConflicts ───────────────────────────────────────────

describe('detectConflicts', () => {
  it('returns empty for non-overlapping slots', () => {
    const slots = [
      { label: 'A', start: '09:00', end: '10:00' },
      { label: 'B', start: '10:00', end: '11:00' },
    ];
    expect(detectConflicts(slots)).toHaveLength(0);
  });
  it('detects overlapping slots', () => {
    const slots = [
      { label: 'A', start: '09:00', end: '10:30' },
      { label: 'B', start: '10:00', end: '11:00' },
    ];
    const result = detectConflicts(slots);
    expect(result).toHaveLength(1);
    expect(result[0].slotA.label).toBe('A');
    expect(result[0].slotB.label).toBe('B');
  });
  it('detects fully contained overlap', () => {
    const slots = [
      { label: 'A', start: '09:00', end: '12:00' },
      { label: 'B', start: '10:00', end: '11:00' },
    ];
    expect(detectConflicts(slots)).toHaveLength(1);
  });
  it('detects multiple conflicts', () => {
    const slots = [
      { label: 'A', start: '09:00', end: '11:00' },
      { label: 'B', start: '09:30', end: '10:30' },
      { label: 'C', start: '10:00', end: '12:00' },
    ];
    expect(detectConflicts(slots).length).toBeGreaterThanOrEqual(2);
  });
  it('empty list returns empty', () => {
    expect(detectConflicts([])).toHaveLength(0);
  });
});
