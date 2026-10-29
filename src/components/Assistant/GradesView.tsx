import { useState, useEffect, useCallback } from 'react';
import type { User } from '../../types';
import type { MockScore, EssayGrade, CourseGrade, ASubject, SubjectAreaTag } from '../../assistantTypes';
import { ASUBJECTS } from '../../assistantTypes';
import {
  subscribeMockScores, saveMockScore, deleteMockScore,
  subscribeEssayGrades, saveEssayGrade,
  subscribeCourseGrades, saveCourseGrade, deleteCourseGrade,
} from '../../assistantStore';
import {
  aggregateTagScores, getWeakTags, getMockTrend, getEssayStats,
  calcGPA, groupBySemester, buildGradeSummary,
} from '../../assistantGrades';
import { TrendingUp, TrendingDown, Minus, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  currentUser: User;
}

type GradeTab = 'mock' | 'essay' | 'tag' | 'gpa';

export default function GradesView({ currentUser }: Props) {
  const uid = currentUser.username;
  const [tab, setTab] = useState<GradeTab>('mock');
  const [mockScores, setMockScores] = useState<MockScore[]>([]);
  const [essayGrades, setEssayGrades] = useState<EssayGrade[]>([]);
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([]);

  useEffect(() => {
    const unsub1 = subscribeMockScores(uid, setMockScores);
    const unsub2 = subscribeEssayGrades(uid, setEssayGrades);
    const unsub3 = subscribeCourseGrades(uid, setCourseGrades);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [uid]);

  const summary = buildGradeSummary(mockScores, essayGrades, courseGrades);

  const TABS: { id: GradeTab; label: string }[] = [
    { id: 'mock',  label: '모의고사' },
    { id: 'essay', label: '서술형' },
    { id: 'tag',   label: '영역별' },
    { id: 'gpa',   label: '학점' },
  ];

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-2">
        <SumCard label="모의고사" value={summary.mockCount > 0 ? `${summary.latestMockPct}%` : '-'} sub={summary.mockCount > 0 ? `최근 ${summary.mockCount}회` : '기록 없음'} trend={summary.mockTrendUp} />
        <SumCard label="취약 영역" value={summary.weakTagCount > 0 ? `${summary.weakTagCount}개` : '없음'} sub="60% 미만" warn={summary.weakTagCount > 0} />
        <SumCard label="서술형" value={summary.essayPassRate !== null ? `${summary.essayPassRate}%` : '-'} sub="재작성 통과율" />
        <SumCard label="GPA" value={summary.gpa !== null ? String(summary.gpa) : '-'} sub="평균 학점" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >{t.label}</button>
        ))}
      </div>

      <div className="jade-enter" key={tab}>
        {tab === 'mock'  && <MockTab uid={uid} scores={mockScores} />}
        {tab === 'essay' && <EssayTab uid={uid} essays={essayGrades} />}
        {tab === 'tag'   && <TagTab scores={mockScores} />}
        {tab === 'gpa'   && <GPATab uid={uid} courses={courseGrades} />}
      </div>
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────

function SumCard({ label, value, sub, trend, warn }: {
  label: string; value: string; sub: string; trend?: boolean | null; warn?: boolean;
}) {
  return (
    <div className="card p-2 space-y-0.5">
      <p className="text-[9px] text-gray-400 leading-none">{label}</p>
      <div className="flex items-center gap-1">
        <p className={`text-sm font-bold leading-none ${warn ? 'text-red-500' : 'text-gray-900'}`}>{value}</p>
        {trend === true  && <TrendingUp className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
        {trend === false && <TrendingDown className="w-3 h-3 text-red-400 flex-shrink-0" />}
        {trend === null  && mockScores_ok(value) && <Minus className="w-3 h-3 text-gray-300 flex-shrink-0" />}
      </div>
      <p className="text-[9px] text-gray-400 leading-none">{sub}</p>
    </div>
  );
}
function mockScores_ok(v: string) { return v !== '-'; }

// ── Mock tab ──────────────────────────────────────────────────

function MockTab({ uid, scores }: { uid: string; scores: MockScore[] }) {
  const [form, setForm] = useState(false);
  const trend = getMockTrend(scores);

  const handleDelete = useCallback((id: string) => {
    if (!confirm('삭제할까?')) return;
    deleteMockScore(id);
  }, []);

  return (
    <div className="space-y-3">
      {trend.length > 1 && <TrendChart points={trend} />}
      <button onClick={() => setForm(v => !v)} className="btn-outline w-full text-xs flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" /> 모의고사 점수 추가
      </button>
      {form && <MockForm uid={uid} onSaved={() => setForm(false)} />}
      <div className="space-y-2">
        {scores.length === 0 && <EmptyState label="모의고사 기록이 없어" />}
        {scores.map(s => (
          <div key={s.id} className="card p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-gray-800">{s.source} · {s.round}</p>
                <p className="text-[10px] text-gray-400">{s.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <ScoreBadge pct={s.totalMaxScore > 0 ? Math.round(s.totalScore / s.totalMaxScore * 100) : 0} />
                <button onClick={() => handleDelete(s.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              {s.subjectScores.map(ss => (
                <div key={ss.subject} className="text-[10px] text-gray-500">
                  <span className="text-gray-400">{ss.subject}</span> {ss.score}/{ss.maxScore}
                  {ss.tag && <span className="text-gray-300"> ({ss.tag})</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockForm({ uid, onSaved }: { uid: string; onSaved: () => void }) {
  const [source, setSource] = useState('');
  const [round, setRound] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Array<{ subject: ASubject; score: string; max: string; tag: string }>>([
    { subject: '문법', score: '', max: '100', tag: '' },
    { subject: '문학', score: '', max: '100', tag: '' },
    { subject: '국교론', score: '', max: '100', tag: '' },
  ]);

  const save = () => {
    const subjectScores = rows
      .filter(r => r.score !== '')
      .map(r => ({
        subject: r.subject,
        score: Number(r.score),
        maxScore: Number(r.max),
        tag: r.tag as SubjectAreaTag || undefined,
      }));
    if (!source || subjectScores.length === 0) return;
    const total = subjectScores.reduce((s, r) => s + r.score, 0);
    const totalMax = subjectScores.reduce((s, r) => s + r.maxScore, 0);
    const ms: MockScore = {
      id: `${uid}_mock_${Date.now()}`,
      userId: uid,
      source,
      round,
      date,
      subjectScores,
      totalScore: total,
      totalMaxScore: totalMax,
      createdAt: new Date().toISOString(),
    };
    saveMockScore(ms).then(onSaved);
  };

  return (
    <div className="card p-3 space-y-3 border border-primary-100">
      <div className="grid grid-cols-2 gap-2">
        <input className="input-sm" placeholder="출처 (예: 기타)" value={source} onChange={e => setSource(e.target.value)} />
        <input className="input-sm" placeholder="회차" value={round} onChange={e => setRound(e.target.value)} />
      </div>
      <input type="date" className="input-sm w-full" value={date} onChange={e => setDate(e.target.value)} />
      {rows.map((r, i) => (
        <div key={r.subject} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">{r.subject}</span>
          <input className="input-sm w-14" placeholder="점수" value={r.score}
            onChange={e => setRows(prev => prev.map((x, j) => j === i ? { ...x, score: e.target.value } : x))} />
          <span className="text-[10px] text-gray-400">/</span>
          <input className="input-sm w-14" placeholder="만점" value={r.max}
            onChange={e => setRows(prev => prev.map((x, j) => j === i ? { ...x, max: e.target.value } : x))} />
          <input className="input-sm flex-1 min-w-0" placeholder="영역 태그" value={r.tag}
            onChange={e => setRows(prev => prev.map((x, j) => j === i ? { ...x, tag: e.target.value } : x))} />
        </div>
      ))}
      <button onClick={save} className="btn-primary w-full text-xs">저장</button>
    </div>
  );
}

// ── Essay tab ─────────────────────────────────────────────────

function EssayTab({ uid, essays }: { uid: string; essays: EssayGrade[] }) {
  const [form, setForm] = useState(false);
  const stats = getEssayStats(essays);

  return (
    <div className="space-y-3">
      {essays.length > 0 && (
        <div className="card p-3 grid grid-cols-3 gap-3">
          <StatItem label="통과율" value={`${stats.passRate}%`} />
          <StatItem label="평균 시간" value={`${Math.floor(stats.avgTimeSec / 60)}분`} />
          <StatItem label="시간 초과" value={`${stats.overTimeCount}회`} warn={stats.overTimeCount > 0} />
        </div>
      )}
      {stats.topFailedElements.length > 0 && (
        <div className="card p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-500">자주 틀린 채점 요소</p>
          {stats.topFailedElements.map(el => (
            <div key={el.name} className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-300 rounded-full" style={{ width: `${Math.min(100, el.failCount * 20)}%` }} />
              </div>
              <span className="text-[10px] text-gray-600 w-32 truncate">{el.name}</span>
              <span className="text-[10px] text-red-400 font-mono w-6 text-right">{el.failCount}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setForm(v => !v)} className="btn-outline w-full text-xs flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" /> 서술형 채점 추가
      </button>
      {form && <EssayForm uid={uid} onSaved={() => setForm(false)} />}
      <div className="space-y-2">
        {essays.length === 0 && <EmptyState label="서술형 채점 기록이 없어" />}
        {essays.slice(0, 10).map(e => (
          <EssayRow key={e.id} essay={e} />
        ))}
      </div>
    </div>
  );
}

function EssayRow({ essay: e }: { essay: EssayGrade }) {
  const [open, setOpen] = useState(false);
  const passed = e.elements.filter(el => el.met).length;
  const total = e.elements.length;
  const overtime = e.actualSec > e.timeLimitSec;
  return (
    <div className="card p-3 space-y-2">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-2 text-left">
        <div>
          <p className="text-xs font-bold text-gray-800">{e.subject} · {e.tag}</p>
          <p className="text-[10px] text-gray-400">
            {e.source}{e.examYear ? ` ${e.examYear}` : ''}{e.examType ? ` ${e.examType}` : ''}
            {' · '}
            <span className={overtime ? 'text-red-400' : 'text-gray-400'}>
              {Math.floor(e.actualSec / 60)}분{e.actualSec % 60 > 0 ? ` ${e.actualSec % 60}초` : ''}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-bold ${e.rewritePassed ? 'text-emerald-500' : 'text-red-400'}`}>
            {e.rewritePassed ? '통과' : '미통과'}
          </span>
          <span className="text-[10px] text-gray-400">{passed}/{total}</span>
          {open ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="space-y-1 pt-1 border-t border-gray-50">
          {e.elements.map(el => (
            <div key={el.id} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${el.met ? 'bg-emerald-400' : 'bg-red-300'}`} />
              <span className="text-[10px] text-gray-600">{el.name}</span>
              {el.note && <span className="text-[9px] text-gray-400 truncate">{el.note}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EssayForm({ uid, onSaved }: { uid: string; onSaved: () => void }) {
  const [subject, setSubject] = useState<ASubject>('문법');
  const [tag, setTag] = useState('');
  const [timeLimitMin, setTimeLimitMin] = useState('10');
  const [actualMin, setActualMin] = useState('');
  const [rewritePassed, setRewritePassed] = useState(false);
  const [elements, setElements] = useState([{ name: '', met: false }]);
  const [newEl, setNewEl] = useState('');

  const addElement = () => {
    if (!newEl.trim()) return;
    setElements(prev => [...prev, { name: newEl.trim(), met: false }]);
    setNewEl('');
  };

  const save = () => {
    if (!actualMin) return;
    const eg: EssayGrade = {
      id: `${uid}_essay_${Date.now()}`,
      userId: uid,
      source: '기출',
      subject,
      tag: tag as SubjectAreaTag,
      timeLimitSec: Number(timeLimitMin) * 60,
      actualSec: Number(actualMin) * 60,
      elements: elements.filter(e => e.name).map((e, i) => ({ id: String(i), ...e })),
      rewritePassed,
      createdAt: new Date().toISOString(),
    };
    saveEssayGrade(eg).then(onSaved);
  };

  return (
    <div className="card p-3 space-y-3 border border-primary-100">
      <div className="grid grid-cols-2 gap-2">
        <select className="input-sm" value={subject} onChange={e => setSubject(e.target.value as ASubject)}>
          {ASUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <input className="input-sm" placeholder="영역 태그" value={tag} onChange={e => setTag(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="input-sm" type="number" placeholder="제한 시간(분)" value={timeLimitMin} onChange={e => setTimeLimitMin(e.target.value)} />
        <input className="input-sm" type="number" placeholder="실제 시간(분)" value={actualMin} onChange={e => setActualMin(e.target.value)} />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] text-gray-500">채점 요소</p>
        {elements.map((el, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="checkbox" checked={el.met} onChange={e => setElements(prev => prev.map((x, j) => j === i ? { ...x, met: e.target.checked } : x))} className="w-3.5 h-3.5 rounded flex-shrink-0" />
            <span className="text-[10px] text-gray-600 flex-1">{el.name || '(이름 없음)'}</span>
          </div>
        ))}
        <div className="flex gap-1">
          <input className="input-sm flex-1 min-w-0" placeholder="요소 추가" value={newEl} onChange={e => setNewEl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addElement()} />
          <button onClick={addElement} className="btn-outline text-xs px-2">+</button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={rewritePassed} onChange={e => setRewritePassed(e.target.checked)} className="w-3.5 h-3.5 rounded" />
        재작성 통과
      </label>
      <button onClick={save} className="btn-primary w-full text-xs">저장</button>
    </div>
  );
}

// ── Tag tab ───────────────────────────────────────────────────

function TagTab({ scores }: { scores: MockScore[] }) {
  const stats = aggregateTagScores(scores);
  const weak = getWeakTags(stats);

  if (stats.length === 0) return <EmptyState label="모의고사 기록이 없어서 영역별 분석을 할 수 없어" />;

  return (
    <div className="space-y-3">
      {weak.length > 0 && (
        <div className="card p-3 space-y-1.5 border border-red-100">
          <p className="text-[10px] font-bold text-red-500">취약 영역 ({weak.length}개)</p>
          <div className="flex flex-wrap gap-1.5">
            {weak.map(w => (
              <span key={w.tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-medium">
                {w.tag} {w.pct}%
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="card p-3 space-y-2">
        <p className="text-[10px] font-bold text-gray-500">영역별 정답률</p>
        {stats.map(s => (
          <TagBar key={s.tag} tag={s.tag} pct={s.pct} />
        ))}
      </div>
    </div>
  );
}

function TagBar({ tag, pct }: { tag: SubjectAreaTag; pct: number }) {
  const weak = pct < 60;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-20 truncate flex-shrink-0">{tag}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${weak ? 'bg-red-300' : pct >= 80 ? 'bg-emerald-400' : 'bg-primary-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono w-8 text-right ${weak ? 'text-red-400' : 'text-gray-500'}`}>{pct}%</span>
    </div>
  );
}

// ── GPA tab ───────────────────────────────────────────────────

function GPATab({ uid, courses }: { uid: string; courses: CourseGrade[] }) {
  const [form, setForm] = useState(false);
  const groups = groupBySemester(courses);
  const total = calcGPA(courses);

  const handleDelete = useCallback((id: string) => {
    if (!confirm('삭제할까?')) return;
    deleteCourseGrade(id);
  }, []);

  return (
    <div className="space-y-3">
      {courses.length > 0 && (
        <div className="card p-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">전체 평균</span>
          <span className="text-lg font-bold text-gray-900">{total.toFixed(2)}</span>
        </div>
      )}
      <button onClick={() => setForm(v => !v)} className="btn-outline w-full text-xs flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" /> 학점 추가
      </button>
      {form && <GPAForm uid={uid} onSaved={() => setForm(false)} />}
      {courses.length === 0 && <EmptyState label="학점 기록이 없어" />}
      {groups.map(g => (
        <div key={g.semester} className="card px-3 py-2 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-700">{g.semester}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-900">GPA {g.gpa.toFixed(2)}</span>
            <button onClick={() => g.courses.forEach(c => handleDelete(c.id))} className="text-gray-200 hover:text-red-400 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function GPAForm({ uid, onSaved }: { uid: string; onSaved: () => void }) {
  const [semester, setSemester] = useState('2026-1');
  const [gradePoint, setGradePoint] = useState('4.0');

  const save = () => {
    if (!semester.trim()) return;
    const cg: CourseGrade = {
      id: `${uid}_gpa_${Date.now()}`,
      userId: uid,
      semester,
      courseName: '학기평균',
      credits: 1,
      grade: '-',
      gradePoint: Number(gradePoint),
      createdAt: new Date().toISOString(),
    };
    saveCourseGrade(cg).then(onSaved);
  };

  return (
    <div className="card p-3 space-y-2 border border-primary-100">
      <div className="grid grid-cols-2 gap-2">
        <input className="input-sm" placeholder="학기 (예: 2026-1)" value={semester} onChange={e => setSemester(e.target.value)} />
        <input className="input-sm" type="number" step="0.01" min="0" max="4.5" placeholder="평점 (예: 4.2)" value={gradePoint} onChange={e => setGradePoint(e.target.value)} />
      </div>
      <button onClick={save} className="btn-primary w-full text-xs">저장</button>
    </div>
  );
}

// ── Trend chart (SVG sparkline) ───────────────────────────────

function TrendChart({ points }: { points: ReturnType<typeof getMockTrend> }) {
  const W = 280, H = 48, PAD = 4;
  const pcts = points.map(p => p.pct);
  const minP = Math.max(0, Math.min(...pcts) - 10);
  const maxP = Math.min(100, Math.max(...pcts) + 10);
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (p: number) => H - PAD - ((p - minP) / (maxP - minP)) * (H - PAD * 2);

  const polyline = points.map((p, i) => `${x(i)},${y(p.pct)}`).join(' ');

  return (
    <div className="card p-3">
      <p className="text-[10px] font-bold text-gray-500 mb-2">추세 ({points.length}회)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <polyline points={polyline} fill="none" stroke="var(--color-primary-400, #818cf8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.pct)} r="2.5" fill="var(--color-primary-500, #6366f1)" />
        ))}
        {/* Reference line 60% */}
        {minP < 60 && maxP > 60 && (
          <line x1={PAD} x2={W - PAD} y1={y(60)} y2={y(60)} stroke="#fca5a5" strokeWidth="1" strokeDasharray="3,3" />
        )}
      </svg>
      <div className="flex justify-between mt-1">
        {points.map((p, i) => (
          <span key={i} className={`text-[8px] font-mono ${p.pct < 60 ? 'text-red-400' : 'text-gray-400'}`}>{p.pct}%</span>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function StatItem({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-xs font-bold text-gray-800" style={{ color: warn ? 'rgb(239,68,68)' : undefined }}>{value}</p>
      <p className="text-[9px] text-gray-400">{label}</p>
    </div>
  );
}

function ScoreBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{pct}%</span>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-xs text-gray-300">{label}</p>
    </div>
  );
}
