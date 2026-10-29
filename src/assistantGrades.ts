import type {
  MockScore, EssayGrade, CourseGrade, SubjectAreaTag, ASubject,
} from './assistantTypes';

// ── Tag aggregation ───────────────────────────────────────────

export interface TagStat {
  tag: SubjectAreaTag;
  correct: number;
  total: number;
  pct: number;
}

export function aggregateTagScores(scores: MockScore[]): TagStat[] {
  const map = new Map<SubjectAreaTag, { correct: number; total: number }>();
  for (const s of scores) {
    for (const sub of s.subjectScores) {
      if (!sub.tag) continue;
      const prev = map.get(sub.tag) ?? { correct: 0, total: 0 };
      map.set(sub.tag, {
        correct: prev.correct + sub.score,
        total: prev.total + sub.maxScore,
      });
    }
  }
  return Array.from(map.entries())
    .map(([tag, { correct, total }]) => ({
      tag,
      correct,
      total,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct);
}

export function getWeakTags(stats: TagStat[], threshold = 60): TagStat[] {
  return stats.filter(s => s.total >= 1 && s.pct < threshold);
}

// ── Subject averages ──────────────────────────────────────────

export interface SubjectStat {
  subject: ASubject;
  avgScore: number;
  avgMax: number;
  pct: number;
  count: number;
}

export function getSubjectStats(scores: MockScore[]): SubjectStat[] {
  const map = new Map<ASubject, { sumScore: number; sumMax: number; count: number }>();
  for (const s of scores) {
    for (const sub of s.subjectScores) {
      const prev = map.get(sub.subject) ?? { sumScore: 0, sumMax: 0, count: 0 };
      map.set(sub.subject, {
        sumScore: prev.sumScore + sub.score,
        sumMax: prev.sumMax + sub.maxScore,
        count: prev.count + 1,
      });
    }
  }
  return Array.from(map.entries()).map(([subject, { sumScore, sumMax, count }]) => ({
    subject,
    avgScore: count > 0 ? Math.round(sumScore / count) : 0,
    avgMax: count > 0 ? Math.round(sumMax / count) : 0,
    pct: sumMax > 0 ? Math.round((sumScore / sumMax) * 100) : 0,
    count,
  }));
}

// ── Mock trend ────────────────────────────────────────────────

export interface TrendPoint {
  date: string;
  label: string;
  totalScore: number;
  totalMax: number;
  pct: number;
}

export function getMockTrend(scores: MockScore[]): TrendPoint[] {
  return [...scores]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      date: s.date,
      label: `${s.source.replace(/_/g, ' ')} ${s.round}`,
      totalScore: s.totalScore,
      totalMax: s.totalMaxScore,
      pct: s.totalMaxScore > 0 ? Math.round((s.totalScore / s.totalMaxScore) * 100) : 0,
    }));
}

// ── Essay stats ───────────────────────────────────────────────

export interface EssayStats {
  total: number;
  passCount: number;
  passRate: number;
  avgTimeSec: number;
  overTimeCount: number;
  topFailedElements: Array<{ name: string; failCount: number }>;
}

export function getEssayStats(essays: EssayGrade[]): EssayStats {
  if (essays.length === 0) {
    return { total: 0, passCount: 0, passRate: 0, avgTimeSec: 0, overTimeCount: 0, topFailedElements: [] };
  }

  const failMap = new Map<string, number>();
  let passCount = 0;
  let sumTime = 0;
  let overTimeCount = 0;

  for (const e of essays) {
    if (e.rewritePassed) passCount++;
    sumTime += e.actualSec;
    if (e.actualSec > e.timeLimitSec) overTimeCount++;
    for (const el of e.elements) {
      if (!el.met) failMap.set(el.name, (failMap.get(el.name) ?? 0) + 1);
    }
  }

  const topFailedElements = Array.from(failMap.entries())
    .map(([name, failCount]) => ({ name, failCount }))
    .sort((a, b) => b.failCount - a.failCount)
    .slice(0, 5);

  return {
    total: essays.length,
    passCount,
    passRate: Math.round((passCount / essays.length) * 100),
    avgTimeSec: Math.round(sumTime / essays.length),
    overTimeCount,
    topFailedElements,
  };
}

// ── GPA ───────────────────────────────────────────────────────

export function calcGPA(courses: CourseGrade[]): number {
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  if (totalCredits === 0) return 0;
  const weightedSum = courses.reduce((s, c) => s + c.gradePoint * c.credits, 0);
  return Math.round((weightedSum / totalCredits) * 100) / 100;
}

export function groupBySemester(
  courses: CourseGrade[],
): Array<{ semester: string; courses: CourseGrade[]; gpa: number }> {
  const map = new Map<string, CourseGrade[]>();
  for (const c of courses) {
    const prev = map.get(c.semester) ?? [];
    map.set(c.semester, [...prev, c]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([semester, cs]) => ({ semester, courses: cs, gpa: calcGPA(cs) }));
}

// ── Overall summary ───────────────────────────────────────────

export interface GradeSummary {
  mockCount: number;
  latestMockPct: number | null;
  mockTrendUp: boolean | null; // null = insufficient data
  weakTagCount: number;
  essayPassRate: number | null;
  gpa: number | null;
}

export function buildGradeSummary(
  mockScores: MockScore[],
  essayGrades: EssayGrade[],
  courseGrades: CourseGrade[],
): GradeSummary {
  const trend = getMockTrend(mockScores);
  const latestMockPct = trend.length > 0 ? trend[trend.length - 1].pct : null;
  const mockTrendUp = trend.length >= 2
    ? trend[trend.length - 1].pct > trend[trend.length - 2].pct
    : null;
  const weakTagCount = getWeakTags(aggregateTagScores(mockScores)).length;
  const essayStats = getEssayStats(essayGrades);
  const gpa = courseGrades.length > 0 ? calcGPA(courseGrades) : null;

  return {
    mockCount: mockScores.length,
    latestMockPct,
    mockTrendUp,
    weakTagCount,
    essayPassRate: essayGrades.length > 0 ? essayStats.passRate : null,
    gpa,
  };
}
