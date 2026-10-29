import { describe, it, expect } from 'vitest';
import {
  aggregateTagScores,
  getWeakTags,
  getSubjectStats,
  getMockTrend,
  getEssayStats,
  calcGPA,
  groupBySemester,
  buildGradeSummary,
} from './assistantGrades';
import type { MockScore, EssayGrade, CourseGrade } from './assistantTypes';

// ── Fixtures ──────────────────────────────────────────────────

function makeMock(overrides: Partial<MockScore> = {}): MockScore {
  return {
    id: 'm1',
    userId: '서연',
    source: '기타',
    round: '1차',
    date: '2026-10-01',
    subjectScores: [
      { subject: '문법', score: 70, maxScore: 100, tag: '음운' },
      { subject: '문학', score: 50, maxScore: 100, tag: '고전시가' },
      { subject: '국교론', score: 60, maxScore: 100, tag: '화법' },
    ],
    totalScore: 180,
    totalMaxScore: 300,
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

function makeEssay(overrides: Partial<EssayGrade> = {}): EssayGrade {
  return {
    id: 'e1',
    userId: '서연',
    source: '기출',
    subject: '문법',
    tag: '음운',
    timeLimitSec: 600,
    actualSec: 550,
    elements: [
      { id: 'el1', name: '핵심 개념 서술', met: true },
      { id: 'el2', name: '예시 제시', met: false },
    ],
    rewritePassed: true,
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

function makeCourse(overrides: Partial<CourseGrade> = {}): CourseGrade {
  return {
    id: 'c1',
    userId: '서연',
    semester: '2026-1',
    courseName: '국어교육론',
    credits: 3,
    grade: 'A+',
    gradePoint: 4.5,
    createdAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

// ── aggregateTagScores ────────────────────────────────────────

describe('aggregateTagScores', () => {
  it('returns empty for no scores', () => {
    expect(aggregateTagScores([])).toHaveLength(0);
  });
  it('aggregates single mock correctly', () => {
    const stats = aggregateTagScores([makeMock()]);
    const 음운 = stats.find(s => s.tag === '음운')!;
    expect(음운.correct).toBe(70);
    expect(음운.total).toBe(100);
    expect(음운.pct).toBe(70);
  });
  it('sums across multiple mocks for same tag', () => {
    const m1 = makeMock({ id: 'm1', subjectScores: [{ subject: '문법', score: 60, maxScore: 100, tag: '음운' }], totalScore: 60, totalMaxScore: 100 });
    const m2 = makeMock({ id: 'm2', subjectScores: [{ subject: '문법', score: 80, maxScore: 100, tag: '음운' }], totalScore: 80, totalMaxScore: 100 });
    const stats = aggregateTagScores([m1, m2]);
    const 음운 = stats.find(s => s.tag === '음운')!;
    expect(음운.correct).toBe(140);
    expect(음운.total).toBe(200);
    expect(음운.pct).toBe(70);
  });
  it('skips scores with no tag', () => {
    const m = makeMock({ subjectScores: [{ subject: '문법', score: 70, maxScore: 100 }] });
    expect(aggregateTagScores([m])).toHaveLength(0);
  });
  it('sorts by pct ascending (lowest first)', () => {
    const stats = aggregateTagScores([makeMock()]); // 음운 70, 고전시가 50, 화법 60
    expect(stats[0].pct).toBeLessThanOrEqual(stats[1].pct);
    expect(stats[1].pct).toBeLessThanOrEqual(stats[2].pct);
  });
});

// ── getWeakTags ───────────────────────────────────────────────

describe('getWeakTags', () => {
  it('returns tags below threshold', () => {
    const stats = aggregateTagScores([makeMock()]);
    const weak = getWeakTags(stats, 65);
    // 고전시가 50 and 화법 60 are below 65
    expect(weak.map(s => s.tag)).toContain('고전시가');
    expect(weak.map(s => s.tag)).toContain('화법');
    expect(weak.map(s => s.tag)).not.toContain('음운'); // 70 >= 65
  });
  it('returns empty when all pass', () => {
    const stats = aggregateTagScores([makeMock()]);
    expect(getWeakTags(stats, 40)).toHaveLength(0);
  });
  it('uses default threshold 60', () => {
    const stats = aggregateTagScores([makeMock()]); // 고전시가 50 < 60
    const weak = getWeakTags(stats);
    expect(weak.some(s => s.tag === '고전시가')).toBe(true);
  });
});

// ── getSubjectStats ───────────────────────────────────────────

describe('getSubjectStats', () => {
  it('returns empty for no scores', () => {
    expect(getSubjectStats([])).toHaveLength(0);
  });
  it('calculates averages correctly', () => {
    const m1 = makeMock({ id: 'm1', subjectScores: [{ subject: '문법', score: 60, maxScore: 100 }], totalScore: 60, totalMaxScore: 100 });
    const m2 = makeMock({ id: 'm2', subjectScores: [{ subject: '문법', score: 80, maxScore: 100 }], totalScore: 80, totalMaxScore: 100 });
    const stats = getSubjectStats([m1, m2]);
    const g = stats.find(s => s.subject === '문법')!;
    expect(g.avgScore).toBe(70);
    expect(g.count).toBe(2);
    expect(g.pct).toBe(70);
  });
});

// ── getMockTrend ──────────────────────────────────────────────

describe('getMockTrend', () => {
  it('returns empty for no scores', () => {
    expect(getMockTrend([])).toHaveLength(0);
  });
  it('sorts by date ascending', () => {
    const m1 = makeMock({ id: 'm1', date: '2026-11-01', totalScore: 180, totalMaxScore: 300 });
    const m2 = makeMock({ id: 'm2', date: '2026-10-01', totalScore: 200, totalMaxScore: 300 });
    const trend = getMockTrend([m1, m2]);
    expect(trend[0].date).toBe('2026-10-01');
    expect(trend[1].date).toBe('2026-11-01');
  });
  it('calculates pct correctly', () => {
    const m = makeMock({ totalScore: 240, totalMaxScore: 300 });
    const trend = getMockTrend([m]);
    expect(trend[0].pct).toBe(80);
  });
});

// ── getEssayStats ─────────────────────────────────────────────

describe('getEssayStats', () => {
  it('returns zeros for empty list', () => {
    const s = getEssayStats([]);
    expect(s.total).toBe(0);
    expect(s.passRate).toBe(0);
  });
  it('counts pass rate correctly', () => {
    const e1 = makeEssay({ id: 'e1', rewritePassed: true });
    const e2 = makeEssay({ id: 'e2', rewritePassed: false });
    const s = getEssayStats([e1, e2]);
    expect(s.passRate).toBe(50);
    expect(s.passCount).toBe(1);
  });
  it('detects overtime', () => {
    const e = makeEssay({ actualSec: 700, timeLimitSec: 600 });
    expect(getEssayStats([e]).overTimeCount).toBe(1);
  });
  it('aggregates failed elements', () => {
    const e1 = makeEssay({ id: 'e1', elements: [{ id: '1', name: '예시 제시', met: false }] });
    const e2 = makeEssay({ id: 'e2', elements: [{ id: '2', name: '예시 제시', met: false }] });
    const s = getEssayStats([e1, e2]);
    const el = s.topFailedElements.find(e => e.name === '예시 제시')!;
    expect(el.failCount).toBe(2);
  });
  it('top 5 limit on failed elements', () => {
    const elements = Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: `요소${i}`, met: false }));
    const e = makeEssay({ elements });
    expect(getEssayStats([e]).topFailedElements).toHaveLength(5);
  });
  it('calculates avg time', () => {
    const e1 = makeEssay({ id: 'e1', actualSec: 400 });
    const e2 = makeEssay({ id: 'e2', actualSec: 600 });
    expect(getEssayStats([e1, e2]).avgTimeSec).toBe(500);
  });
});

// ── calcGPA ───────────────────────────────────────────────────

describe('calcGPA', () => {
  it('returns 0 for empty list', () => {
    expect(calcGPA([])).toBe(0);
  });
  it('single course', () => {
    const c = makeCourse({ credits: 3, gradePoint: 4.5 });
    expect(calcGPA([c])).toBe(4.5);
  });
  it('weighted average across courses', () => {
    const c1 = makeCourse({ id: 'c1', credits: 3, gradePoint: 4.5 });
    const c2 = makeCourse({ id: 'c2', credits: 1, gradePoint: 3.0 });
    // (4.5*3 + 3.0*1) / 4 = 16.5 / 4 = 4.125
    expect(calcGPA([c1, c2])).toBe(4.13);
  });
});

// ── groupBySemester ───────────────────────────────────────────

describe('groupBySemester', () => {
  it('groups by semester', () => {
    const c1 = makeCourse({ id: 'c1', semester: '2026-1' });
    const c2 = makeCourse({ id: 'c2', semester: '2025-2' });
    const groups = groupBySemester([c1, c2]);
    expect(groups).toHaveLength(2);
    expect(groups[0].semester).toBe('2026-1'); // sorted descending
  });
  it('includes per-semester GPA', () => {
    const c = makeCourse({ credits: 3, gradePoint: 4.0 });
    const groups = groupBySemester([c]);
    expect(groups[0].gpa).toBe(4.0);
  });
});

// ── buildGradeSummary ─────────────────────────────────────────

describe('buildGradeSummary', () => {
  it('handles all-empty inputs', () => {
    const s = buildGradeSummary([], [], []);
    expect(s.mockCount).toBe(0);
    expect(s.latestMockPct).toBeNull();
    expect(s.mockTrendUp).toBeNull();
    expect(s.gpa).toBeNull();
    expect(s.essayPassRate).toBeNull();
  });
  it('detects trend up', () => {
    const m1 = makeMock({ id: 'm1', date: '2026-09-01', totalScore: 150, totalMaxScore: 300 });
    const m2 = makeMock({ id: 'm2', date: '2026-10-01', totalScore: 200, totalMaxScore: 300 });
    const s = buildGradeSummary([m1, m2], [], []);
    expect(s.mockTrendUp).toBe(true);
  });
  it('detects trend down', () => {
    const m1 = makeMock({ id: 'm1', date: '2026-09-01', totalScore: 200, totalMaxScore: 300 });
    const m2 = makeMock({ id: 'm2', date: '2026-10-01', totalScore: 150, totalMaxScore: 300 });
    const s = buildGradeSummary([m1, m2], [], []);
    expect(s.mockTrendUp).toBe(false);
  });
  it('includes latest mock pct', () => {
    const m = makeMock({ totalScore: 240, totalMaxScore: 300 });
    const s = buildGradeSummary([m], [], []);
    expect(s.latestMockPct).toBe(80);
  });
  it('counts weak tags', () => {
    const s = buildGradeSummary([makeMock()], [], []); // 고전시가 50 is weak
    expect(s.weakTagCount).toBeGreaterThanOrEqual(1);
  });
});
