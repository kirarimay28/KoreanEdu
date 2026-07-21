import { useState, useEffect, useRef } from 'react';
import type { PersonalStudyEntry, User } from '../../types';
import {
  getPersonalStudyEntriesForDate,
  upsertPersonalStudyEntry,
  markAttendance,
} from '../../store';
import {
  Plus, Trash2, Play, Pause, CheckCircle2,
  AlertTriangle, XCircle, X,
  Sparkles, TrendingUp, ThumbsUp, Target,
  Lock, BookOpen,
} from 'lucide-react';

interface Props { date: string; currentUser: User; }

interface PlanTask {
  id: string;
  subject: string;
  customSubject: string;
  category: string;
  customCategory: string;
  detail: string;
  estimatedMinutes: number;
}

interface ActiveTimer {
  taskId: string;
  startedAt: number;
  breakSecs: number;
  pausedAt: number | null;
}

type CompletedMap = Record<string, number>;

/* ── Constants ───────────────────────────────────────────── */

const SUBJECTS = ['국교론', '교육학', '중세문법', '현대문법', '한능검', '기타'] as const;
const CATEGORIES = ['회독', '단권화', '문제풀이', '오답정리', '강의수강', '기타'] as const;

const SUBJECT_COLORS: Record<string, { border: string; bg: string; badge: string; bar: string; text: string; sector: string }> = {
  '국교론':  { border:'border-l-blue-400',   bg:'bg-blue-50',    badge:'bg-blue-100 text-blue-700',       bar:'bg-blue-500',   text:'text-blue-700',   sector:'#3b82f6' },
  '교육학':  { border:'border-l-emerald-400', bg:'bg-emerald-50', badge:'bg-emerald-100 text-emerald-700', bar:'bg-emerald-500', text:'text-emerald-700', sector:'#10b981' },
  '중세문법': { border:'border-l-primary-400',  bg:'bg-primary-50',  badge:'bg-primary-100 text-primary-700',   bar:'bg-primary-500',  text:'text-primary-700',  sector:'#61b5a7' },
  '현대문법': { border:'border-l-orange-400',  bg:'bg-orange-50',  badge:'bg-orange-100 text-orange-700',   bar:'bg-orange-500',  text:'text-orange-700',  sector:'#f97316' },
  '한능검':  { border:'border-l-teal-400',   bg:'bg-teal-50',    badge:'bg-teal-100 text-teal-700',       bar:'bg-teal-500',   text:'text-teal-700',   sector:'#14b8a6' },
};
const CUSTOM_PALETTES = [
  { border:'border-l-rose-400',    bg:'bg-rose-50',    badge:'bg-rose-100 text-rose-700',       bar:'bg-rose-500',    text:'text-rose-700',    sector:'#f43f5e' },
  { border:'border-l-pink-400',    bg:'bg-pink-50',    badge:'bg-pink-100 text-pink-700',       bar:'bg-pink-500',    text:'text-pink-700',    sector:'#ec4899' },
  { border:'border-l-fuchsia-400', bg:'bg-fuchsia-50', badge:'bg-fuchsia-100 text-fuchsia-700', bar:'bg-fuchsia-500', text:'text-fuchsia-700', sector:'#d946ef' },
  { border:'border-l-sky-400',     bg:'bg-sky-50',     badge:'bg-sky-100 text-sky-700',         bar:'bg-sky-500',     text:'text-sky-700',     sector:'#0ea5e9' },
  { border:'border-l-lime-400',    bg:'bg-lime-50',    badge:'bg-lime-100 text-lime-700',       bar:'bg-lime-500',    text:'text-lime-700',    sector:'#84cc16' },
  { border:'border-l-amber-400',   bg:'bg-amber-50',   badge:'bg-amber-100 text-amber-700',     bar:'bg-amber-500',   text:'text-amber-700',   sector:'#f59e0b' },
  { border:'border-l-primary-400',  bg:'bg-primary-50',  badge:'bg-primary-100 text-primary-700',   bar:'bg-primary-500',  text:'text-primary-700',  sector:'#3a7d73' },
];

function getColor(subject: string, customSubject?: string) {
  if (SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject];
  const name = customSubject?.trim() || subject;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h * 31) + name.charCodeAt(i)) & 0xffff;
  return CUSTOM_PALETTES[h % CUSTOM_PALETTES.length];
}

/* ── Helpers ─────────────────────────────────────────────── */

function formatTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function formatMins(t: number): string {
  if (!t) return '—';
  const h = Math.floor(t / 60), m = t % 60;
  if (!h) return `${m}분`; if (!m) return `${h}시간`; return `${h}시간 ${m}분`;
}
function formatKoreanDate(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  const days = ['일','월','화','수','목','금','토'];
  return `${dt.getFullYear()}년 ${dt.getMonth()+1}월 ${dt.getDate()}일 (${days[dt.getDay()]})`;
}
function displaySubjectName(task: PlanTask) {
  return task.subject === '기타' ? (task.customSubject || '기타') : task.subject;
}
function displayCategoryName(task: PlanTask) {
  return task.category === '기타' ? (task.customCategory || '기타') : task.category;
}

/* ── LocalStorage ────────────────────────────────────────── */

function loadPlanTasks(uid: string, date: string): PlanTask[] {
  try { return JSON.parse(localStorage.getItem(`plan_v2_${uid}_${date}`) ?? '[]'); } catch { return []; }
}
function savePlanTasks(uid: string, date: string, tasks: PlanTask[]) {
  localStorage.setItem(`plan_v2_${uid}_${date}`, JSON.stringify(tasks));
}
function loadStudyStarted(uid: string, date: string) {
  return localStorage.getItem(`plan_started_${uid}_${date}`) === '1';
}
function saveStudyStarted(uid: string, date: string, v: boolean) {
  if (v) localStorage.setItem(`plan_started_${uid}_${date}`, '1');
  else localStorage.removeItem(`plan_started_${uid}_${date}`);
}
function loadActiveTimer(uid: string, date: string): ActiveTimer | null {
  try { const r = localStorage.getItem(`plan_timer_${uid}_${date}`); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveActiveTimer(uid: string, date: string, t: ActiveTimer | null) {
  if (t) localStorage.setItem(`plan_timer_${uid}_${date}`, JSON.stringify(t));
  else localStorage.removeItem(`plan_timer_${uid}_${date}`);
}
function loadCompletedMap(uid: string, date: string): CompletedMap {
  try { return JSON.parse(localStorage.getItem(`plan_done_${uid}_${date}`) ?? '{}'); } catch { return {}; }
}
function saveCompletedMap(uid: string, date: string, m: CompletedMap) {
  localStorage.setItem(`plan_done_${uid}_${date}`, JSON.stringify(m));
}

/* ── SVG Circular Timer ──────────────────────────────────── */

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function sectorPath(cx: number, cy: number, r: number, pct: number): string {
  if (pct <= 0) return '';
  if (pct >= 0.9999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const deg = pct * 360;
  const end = polarToCartesian(cx, cy, r, deg);
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
}

function CircularTimer({ elapsed, estimatedSecs, sectorColor }: {
  elapsed: number; estimatedSecs: number; sectorColor: string;
}) {
  const cx = 100, cy = 100, r = 80, inner = 54;
  const pct = estimatedSecs > 0 ? elapsed / estimatedSecs : 0;
  const over = pct > 1;
  const mainPath = sectorPath(cx, cy, r, Math.min(pct, 1));
  const overPath = over ? sectorPath(cx, cy, r, Math.min(pct - 1, 1)) : '';
  const overtimeSecs = over ? elapsed - estimatedSecs : 0;

  return (
    <svg viewBox="0 0 200 200" className="w-52 h-52 mx-auto drop-shadow-sm">
      {/* Background */}
      <circle cx={cx} cy={cy} r={r} fill="#e2e8f0" />
      {/* Main sector */}
      {mainPath && <path d={mainPath} fill={over ? '#bbf7d0' : sectorColor} opacity={0.9} />}
      {/* Overtime sector (second lap in red) */}
      {overPath && <path d={overPath} fill="#ef4444" opacity={0.75} />}
      {/* Inner white */}
      <circle cx={cx} cy={cy} r={inner} fill="white" />
      {/* Tick marks */}
      {Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        const op = polarToCartesian(cx, cy, r - 1, i * 6);
        const ip = polarToCartesian(cx, cy, r - (major ? 11 : 5), i * 6);
        return <line key={i} x1={op.x} y1={op.y} x2={ip.x} y2={ip.y}
          stroke="white" strokeWidth={major ? 2.5 : 1} opacity={major ? 0.9 : 0.55} />;
      })}
      {/* Center time */}
      <text x={cx} y={over ? cy - 10 : cy - 2} textAnchor="middle"
        fontSize={over ? '18' : '22'} fontWeight="900" fill="#0f172a"
        style={{ fontFamily: 'ui-monospace, monospace' }}>
        {formatTime(elapsed)}
      </text>
      {over && (
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fontWeight="800" fill="#ef4444">
          +{formatTime(overtimeSecs)} 초과
        </text>
      )}
      {!over && estimatedSecs > 0 && (
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="600">
          {Math.round(pct * 100)}%
        </text>
      )}
      <text x={cx} y={cy + (over ? 26 : 26)} textAnchor="middle" fontSize="8" fill="#cbd5e1">
        {estimatedSecs > 0 ? `목표 ${formatMins(estimatedSecs / 60)}` : '경과 시간'}
      </text>
    </svg>
  );
}

/* ── Status Badge ────────────────────────────────────────── */

type Status = 'O' | '△' | 'X' | null;
function computeStatus(entry: PersonalStudyEntry, secs: number): Status {
  const planned = (entry.estimatedMinutes ?? 0) * 60;
  if (secs === 0 && !entry.studySeconds) return 'X';
  const s = secs || entry.studySeconds || 0;
  if (planned > 0 && s >= planned) return 'O';
  if (entry.manuallyCompleted) return planned > 0 ? '△' : 'O';
  return null;
}

function StatusBadge({ status }: { status: Status }) {
  if (!status) return null;
  if (status === 'O') return <span className="flex items-center gap-1 text-[11px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />완료</span>;
  if (status === '△') return <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />미달</span>;
  return <span className="flex items-center gap-1 text-[11px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />누락</span>;
}

/* ── Analysis ────────────────────────────────────────────── */

interface StudyAnalysis {
  totalPlannedMins: number; totalActualSecs: number; achievementPct: number;
  subjectBreakdown: { name: string; plannedMins: number; actualSecs: number; status: Status }[];
  completedCount: number; partialCount: number; missedCount: number;
  summary: string; strengths: string[]; improvements: string[]; tomorrowRecs: string[];
}

function analyzeStudy(entries: PersonalStudyEntry[]): StudyAnalysis {
  const totalPlannedMins = entries.reduce((s, e) => s + (e.estimatedMinutes ?? 0), 0);
  const totalActualSecs  = entries.reduce((s, e) => s + (e.studySeconds || 0), 0);
  const achievementPct   = totalPlannedMins > 0 ? Math.min(200, Math.round((totalActualSecs / (totalPlannedMins * 60)) * 100)) : 0;
  const subjectBreakdown = entries.map(e => ({
    name: e.subject === '기타' ? (e.customSubject || '기타') : e.subject,
    plannedMins: e.estimatedMinutes ?? 0, actualSecs: e.studySeconds || 0,
    status: computeStatus(e, e.studySeconds || 0),
  }));
  const completedCount = subjectBreakdown.filter(r => r.status === 'O').length;
  const partialCount   = subjectBreakdown.filter(r => r.status === '△').length;
  const missedCount    = subjectBreakdown.filter(r => r.status === 'X').length;
  const totalH = Math.floor(totalActualSecs / 3600), totalM = Math.floor((totalActualSecs % 3600) / 60);
  const ts = totalH > 0 ? `${totalH}시간 ${totalM}분` : `${totalM}분`;
  let summary = entries.length === 0 ? '오늘 등록된 학습 기록이 없습니다.'
    : completedCount === entries.length ? `계획한 ${entries.length}개 과목을 모두 완료! 총 ${ts}의 알찬 학습이었습니다.`
    : achievementPct >= 80 ? `총 ${ts}을 공부하며 목표의 ${achievementPct}%를 달성했습니다. 매우 성실한 하루였어요.`
    : achievementPct >= 60 ? `총 ${ts}을 공부하며 목표의 ${achievementPct}%를 달성했습니다.`
    : achievementPct >= 30 ? `총 ${ts}을 공부했지만 목표의 ${achievementPct}%에 그쳤어요.`
    : totalActualSecs > 0 ? `총 ${ts}을 공부했지만 목표 대비 많이 부족했어요.`
    : '오늘 공부한 시간이 기록되지 않았습니다.';
  const strengths: string[] = [];
  const cn = subjectBreakdown.filter(r => r.status === 'O').map(r => r.name);
  if (cn.length > 0) strengths.push(`${cn.join(', ')} — 목표 시간 달성`);
  if (achievementPct > 100) strengths.push(`목표를 ${achievementPct - 100}% 초과 달성`);
  if (totalActualSecs >= 4 * 3600) strengths.push(`${Math.floor(totalActualSecs/3600)}시간 이상의 충실한 학습량`);
  else if (totalActualSecs >= 2 * 3600) strengths.push('2시간 이상의 꾸준한 학습 유지');
  if (entries.length >= 3 && completedCount >= 2) strengths.push('다과목 균형 학습');
  if (strengths.length === 0 && totalActualSecs > 0) strengths.push('학습 기록을 꾸준히 남김');
  const improvements: string[] = [];
  const mn = subjectBreakdown.filter(r => r.status === 'X').map(r => r.name);
  const pn = subjectBreakdown.filter(r => r.status === '△').map(r => r.name);
  if (mn.length > 0) improvements.push(`${mn.join(', ')} — 학습 누락`);
  if (pn.length > 0) improvements.push(`${pn.join(', ')} — 목표 미달`);
  const gapped = subjectBreakdown.filter(r => r.plannedMins > 0 && r.actualSecs > 0 && r.actualSecs < r.plannedMins * 60 * 0.6);
  if (gapped.length > 0) improvements.push('예상 시간과 실제 시간 격차 큼 — 시간 계획 재설정 권장');
  if (improvements.length === 0) improvements.push('전반적으로 완벽한 달성! 다음 목표를 설정해 보세요.');
  const tomorrowRecs: string[] = [];
  const priority = [...new Set([...mn, ...pn])];
  if (priority.length > 0) tomorrowRecs.push(`우선 보충: ${priority.join(', ')}`);
  priority.forEach(name => {
    if (name === '중세문법') tomorrowRecs.push('중세문법: 핵심 항목 예시 정리 + 기출 확인');
    else if (name === '현대문법') tomorrowRecs.push('현대문법: 개념 단권화 후 기출 적용 연습');
    else if (name === '국교론') tomorrowRecs.push('국교론: 최신 출제 경향 + 주요 논점 정리');
    else if (name === '교육학') tomorrowRecs.push('교육학: 핵심 키워드 암기 + 서술형 구성 연습');
    else if (name === '한능검') tomorrowRecs.push('한능검: 시대별 핵심 사건 정리 + 기출 문제 풀이');
  });
  if (tomorrowRecs.length === 0) {
    tomorrowRecs.push('오늘 학습 내용 간단 복습 후 다음 단계로');
    tomorrowRecs.push('학습 목표 시간을 조금씩 늘려보는 도전');
  }
  return { totalPlannedMins, totalActualSecs, achievementPct, subjectBreakdown, completedCount, partialCount, missedCount, summary, strengths, improvements, tomorrowRecs };
}

function AnalysisModal({ analysis, date, onClose }: { analysis: StudyAnalysis; date: string; onClose: () => void }) {
  const emoji = analysis.achievementPct >= 100 ? '🏆' : analysis.achievementPct >= 80 ? '🌟' : analysis.achievementPct >= 60 ? '👍' : analysis.achievementPct >= 30 ? '💪' : '🌱';
  const totalH = Math.floor(analysis.totalActualSecs / 3600), totalM = Math.floor((analysis.totalActualSecs % 3600) / 60);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 px-5 pt-5 pb-4"
          style={{ background: 'linear-gradient(135deg,#2b6460 0%,#52988c 55%,#79b3a8 100%)' }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-white/80" />
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">학습 분석 리포트</p>
              </div>
              <p className="text-white font-bold text-base">{formatKoreanDate(date)}</p>
            </div>
            <button onClick={onClose} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-xl transition">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-4 bg-white/15 rounded-2xl px-4 py-3">
            <div className="text-4xl">{emoji}</div>
            <p className="flex-1 text-white text-sm font-medium leading-relaxed">{analysis.summary}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[{ label:'달성률', value:`${analysis.achievementPct}%` },
              { label:'학습 시간', value: totalH > 0 ? `${totalH}h${totalM}m` : `${totalM}m` },
              { label:'완료', value:String(analysis.completedCount) },
              { label:'누락', value:String(analysis.missedCount) }
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/15 rounded-xl px-2 py-2 text-center">
                <p className="text-[9px] opacity-70 font-semibold">{label}</p>
                <p className="text-sm font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4" style={{ maxHeight:'calc(90vh - 260px)' }}>
          {analysis.subjectBreakdown.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">과목별 현황</p>
              <div className="space-y-2">
                {analysis.subjectBreakdown.map((r, i) => {
                  const pct = r.plannedMins > 0 ? Math.min(200, Math.round((r.actualSecs / (r.plannedMins * 60)) * 100)) : 0;
                  const aH = Math.floor(r.actualSecs/3600), aM = Math.floor((r.actualSecs%3600)/60), aS = r.actualSecs%60;
                  const td = aH > 0 ? `${aH}h ${aM}m` : aM > 0 ? `${aM}m ${aS}s` : `${aS}s`;
                  const bar = r.status === 'O' ? 'bg-green-500' : r.status === '△' ? 'bg-amber-400' : 'bg-red-300';
                  const c = getColor(r.name);
                  return (
                    <div key={i} className={`bg-gray-50 rounded-xl p-3 border-l-4 ${c.border}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{r.name}</span>
                          {r.status && <StatusBadge status={r.status} />}
                        </div>
                        <span className="text-xs font-bold font-mono text-gray-600">{td}</span>
                      </div>
                      {r.plannedMins > 0 && (
                        <div className="space-y-0.5">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${bar}`} style={{ width:`${Math.min(100,pct)}%` }} />
                          </div>
                          <p className="text-[10px] text-gray-400 text-right">목표 {formatMins(r.plannedMins)} · {pct}%</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {analysis.strengths.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2"><ThumbsUp className="w-3.5 h-3.5 text-green-500" /><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">잘한 점</p></div>
              <div className="space-y-1.5">{analysis.strengths.map((s,i) => (
                <div key={i} className="flex items-start gap-2 bg-green-50 rounded-xl px-3 py-2.5">
                  <span className="text-green-500 text-xs font-black mt-0.5">✓</span>
                  <p className="text-xs text-green-800 font-medium">{s}</p>
                </div>
              ))}</div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-3.5 h-3.5 text-amber-500" /><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">보완할 점</p></div>
            <div className="space-y-1.5">{analysis.improvements.map((s,i) => (
              <div key={i} className="flex items-start gap-2 bg-amber-50 rounded-xl px-3 py-2.5">
                <span className="text-amber-500 text-xs font-black mt-0.5">!</span>
                <p className="text-xs text-amber-800 font-medium">{s}</p>
              </div>
            ))}</div>
          </div>
          <div className="pb-2">
            <div className="flex items-center gap-2 mb-2"><Target className="w-3.5 h-3.5 text-primary-500" /><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">내일 권장</p></div>
            <div className="space-y-1.5">{analysis.tomorrowRecs.map((s,i) => (
              <div key={i} className="flex items-start gap-2 bg-primary-50 rounded-xl px-3 py-2.5">
                <span className="text-primary-500 text-xs font-black mt-0.5">→</span>
                <p className="text-xs text-primary-800 font-medium">{s}</p>
              </div>
            ))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */

function emptyTask(): PlanTask {
  return { id: crypto.randomUUID(), subject: '국교론', customSubject: '', category: '회독', customCategory: '', detail: '', estimatedMinutes: 60 };
}

export default function PersonalStudyTab({ date, currentUser }: Props) {
  const uid = currentUser.id;

  const [planTasks,     setPlanTasks]     = useState<PlanTask[]>(() => loadPlanTasks(uid, date));
  const [studyStarted,  setStudyStarted]  = useState(() => loadStudyStarted(uid, date));
  const [completedMap,  setCompletedMap]  = useState<CompletedMap>(() => loadCompletedMap(uid, date));
  const [activeTaskId,  setActiveTaskId]  = useState<string | null>(null);
  const [timerState,    setTimerState]    = useState<'idle'|'running'|'paused'>('idle');
  const [elapsed,       setElapsed]       = useState(0);
  const [liveBreak,     setLiveBreak]     = useState(0);
  const [entries,       setEntries]       = useState<PersonalStudyEntry[]>([]);
  const [analysis,      setAnalysis]      = useState<StudyAnalysis | null>(null);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [addingTask,    setAddingTask]    = useState(false);
  const [draftTask,     setDraftTask]     = useState<PlanTask>(emptyTask);

  const startedAtRef = useRef(0);
  const breakSecsRef = useRef(0);
  const pausedAtRef  = useRef<number|null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval>|undefined>(undefined);

  // Load on date change
  useEffect(() => {
    const tasks = loadPlanTasks(uid, date);
    const started = loadStudyStarted(uid, date);
    const done = loadCompletedMap(uid, date);
    setPlanTasks(tasks);
    setStudyStarted(started);
    setCompletedMap(done);
    setEntries(getPersonalStudyEntriesForDate(date).filter(e => e.userId === uid));
    setAnalysis(null); setAddingTask(false);
    setActiveTaskId(null); setTimerState('idle'); setElapsed(0); setLiveBreak(0);
    // Restore active timer
    const at = loadActiveTimer(uid, date);
    if (at && started) {
      startedAtRef.current = at.startedAt;
      breakSecsRef.current = at.breakSecs;
      pausedAtRef.current  = at.pausedAt;
      setActiveTaskId(at.taskId);
      if (at.pausedAt) {
        setElapsed(Math.max(0, Math.floor((at.pausedAt - at.startedAt) / 1000) - at.breakSecs));
        setLiveBreak(at.breakSecs + Math.floor((Date.now() - at.pausedAt) / 1000));
        setTimerState('paused');
      } else {
        setElapsed(Math.max(0, Math.floor((Date.now() - at.startedAt) / 1000) - at.breakSecs));
        setLiveBreak(at.breakSecs);
        setTimerState('running');
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [date, uid]);

  // Tick
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000) - breakSecsRef.current));
      }, 1000);
    } else if (timerState === 'paused') {
      intervalRef.current = setInterval(() => {
        setLiveBreak(breakSecsRef.current + Math.floor((Date.now() - pausedAtRef.current!) / 1000));
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerState]);

  /* ── Plan actions ── */
  function addTask(t: PlanTask) {
    const next = [...planTasks, t];
    setPlanTasks(next); savePlanTasks(uid, date, next);
  }
  function deleteTask(id: string) {
    const next = planTasks.filter(t => t.id !== id);
    setPlanTasks(next); savePlanTasks(uid, date, next);
  }
  function startStudy() { setStudyStarted(true); saveStudyStarted(uid, date, true); }

  /* ── Timer actions ── */
  function startTimer(taskId: string) {
    const now = Date.now();
    startedAtRef.current = now; breakSecsRef.current = 0; pausedAtRef.current = null;
    setActiveTaskId(taskId); setElapsed(0); setLiveBreak(0);
    saveActiveTimer(uid, date, { taskId, startedAt: now, breakSecs: 0, pausedAt: null });
    setTimerState('running');
  }
  function pauseTimer() {
    const now = Date.now(); pausedAtRef.current = now;
    setElapsed(Math.max(0, Math.floor((now - startedAtRef.current) / 1000) - breakSecsRef.current));
    saveActiveTimer(uid, date, { taskId: activeTaskId!, startedAt: startedAtRef.current, breakSecs: breakSecsRef.current, pausedAt: now });
    setTimerState('paused');
  }
  function resumeTimer() {
    const now = Date.now();
    breakSecsRef.current += Math.floor((now - pausedAtRef.current!) / 1000);
    pausedAtRef.current = null; setLiveBreak(breakSecsRef.current);
    saveActiveTimer(uid, date, { taskId: activeTaskId!, startedAt: startedAtRef.current, breakSecs: breakSecsRef.current, pausedAt: null });
    setTimerState('running');
  }
  function completeTask(manual = false) {
    const now = Date.now();
    let fb = breakSecsRef.current;
    if (pausedAtRef.current) fb += Math.floor((now - pausedAtRef.current) / 1000);
    const finalElapsed = Math.max(0, Math.floor((now - startedAtRef.current) / 1000) - fb);
    const task = planTasks.find(t => t.id === activeTaskId);
    if (task) {
      const planned = (task.estimatedMinutes ?? 0) * 60;
      let examStatus: 'O'|'△'|'X'|'' = '';
      if (planned > 0 && finalElapsed >= planned) examStatus = 'O';
      else if (manual && planned > 0) examStatus = '△';
      else if (finalElapsed === 0) examStatus = 'X';
      const entry: PersonalStudyEntry = {
        id: crypto.randomUUID(), date, userId: uid,
        subject: task.subject, customSubject: task.customSubject,
        plannerActivity: task.category === '기타' ? task.customCategory : task.category,
        customActivity: task.customCategory,
        examStatus, feedbackCategories: [], feedback: '',
        studySeconds: finalElapsed, studyHours: '',
        studyContent: task.detail, estimatedMinutes: task.estimatedMinutes,
        manuallyCompleted: manual,
      };
      upsertPersonalStudyEntry(entry);
      markAttendance(date, uid, currentUser.username);
      setEntries(prev => [...prev, entry]);
    }
    const newMap = { ...completedMap, [activeTaskId!]: finalElapsed };
    setCompletedMap(newMap); saveCompletedMap(uid, date, newMap);
    saveActiveTimer(uid, date, null);
    setActiveTaskId(null); setTimerState('idle'); setElapsed(0); setLiveBreak(0);
    pausedAtRef.current = null; breakSecsRef.current = 0;
  }

  const completedIds = new Set(Object.keys(completedMap));
  const activeTask = planTasks.find(t => t.id === activeTaskId) ?? null;
  const activeColor = activeTask ? getColor(activeTask.subject, activeTask.customSubject) : null;
  const estSecs = (activeTask?.estimatedMinutes ?? 0) * 60;
  const totalActual = entries.reduce((s, e) => s + (e.studySeconds || 0), 0);
  const displayBreak = timerState === 'paused' ? liveBreak : breakSecsRef.current;

  /* ── Plan phase ── */
  if (!studyStarted) {
    return (
      <>
      <div className="space-y-4">
        <div className="rounded-2xl p-5 text-white" style={{ background:'linear-gradient(135deg,#2b6460 0%,#52988c 100%)' }}>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">학습 계획</p>
          <p className="text-base font-bold">{formatKoreanDate(date)}</p>
          <p className="text-xs opacity-60 mt-1">오늘 공부할 목록을 미리 작성하세요. 학습 시작 후 목록은 잠금됩니다.</p>
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {planTasks.map((task, idx) => {
            const c = getColor(task.subject, task.customSubject);
            return (
              <div key={task.id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${c.border} px-4 py-3`}>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-300 font-bold pt-0.5 flex-shrink-0">{idx+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{displaySubjectName(task)}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{displayCategoryName(task)}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{formatMins(task.estimatedMinutes)}</span>
                    </div>
                    {task.detail && <p className="text-xs text-gray-500 leading-relaxed">{task.detail}</p>}
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-300 hover:text-red-400 transition flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {planTasks.length === 0 && !addingTask && (
            <div className="text-center py-10 text-gray-300">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">학습 항목을 추가하세요</p>
            </div>
          )}
        </div>

        {/* Add task form */}
        {addingTask ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            {/* Subject */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">과목</p>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECTS.map(s => {
                  const c = getColor(s);
                  const active = draftTask.subject === s;
                  return (
                    <button key={s} onClick={() => setDraftTask(prev => ({ ...prev, subject: s }))}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-bold border-2 transition ${active ? `${c.badge} border-current` : 'bg-gray-100 text-gray-400 border-transparent hover:bg-gray-200'}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
              {draftTask.subject === '기타' && (
                <input className="mt-2 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="과목명 직접 입력" value={draftTask.customSubject}
                  onChange={e => setDraftTask(prev => ({ ...prev, customSubject: e.target.value }))} />
              )}
            </div>
            {/* Category */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">학습 유형</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setDraftTask(prev => ({ ...prev, category: cat }))}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-bold border-2 transition ${
                      draftTask.category === cat ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
              {draftTask.category === '기타' && (
                <input className="mt-2 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="유형 직접 입력" value={draftTask.customCategory}
                  onChange={e => setDraftTask(prev => ({ ...prev, customCategory: e.target.value }))} />
              )}
            </div>
            {/* Detail */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">세부 내용</p>
              <textarea className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none bg-gray-50"
                rows={2} placeholder="예: 기출 20문제 + 오답 정리" value={draftTask.detail}
                onChange={e => setDraftTask(prev => ({ ...prev, detail: e.target.value }))} />
            </div>
            {/* Time */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">예상 시간</p>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={12} placeholder="0"
                  className="w-16 text-center text-sm font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={Math.floor((draftTask.estimatedMinutes ?? 0) / 60) || ''}
                  onChange={e => { const h = Math.max(0,Math.min(12,Number(e.target.value)||0)); setDraftTask(p=>({...p,estimatedMinutes:h*60+(p.estimatedMinutes??0)%60})); }} />
                <span className="text-sm text-gray-400">시간</span>
                <input type="number" min={0} max={59} step={5} placeholder="0"
                  className="w-16 text-center text-sm font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={(draftTask.estimatedMinutes ?? 0) % 60 || ''}
                  onChange={e => { const m = Math.max(0,Math.min(59,Number(e.target.value)||0)); setDraftTask(p=>({...p,estimatedMinutes:Math.floor((p.estimatedMinutes??0)/60)*60+m})); }} />
                <span className="text-sm text-gray-400">분</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setAddingTask(false); setDraftTask(emptyTask()); }}
                className="flex-1 py-2.5 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition">취소</button>
              <button onClick={() => { addTask(draftTask); setAddingTask(false); setDraftTask(emptyTask()); }}
                disabled={(draftTask.estimatedMinutes ?? 0) === 0}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition">추가</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setAddingTask(true); setDraftTask(emptyTask()); }}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-400 hover:border-primary-400 hover:text-primary-600 rounded-2xl py-4 transition-all">
            <Plus className="w-4 h-4" /><span className="font-semibold text-sm">학습 항목 추가</span>
          </button>
        )}

        {planTasks.length > 0 && !addingTask && (
          <button onClick={startStudy}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-2xl transition shadow-sm flex items-center justify-center gap-2">
            <Play className="w-4 h-4" />학습 시작 — {planTasks.length}개 항목
          </button>
        )}
      </div>
      </>
    );
  }

  /* ── Study phase ── */
  const pendingTasks = planTasks.filter(t => !completedIds.has(t.id) && t.id !== activeTaskId);

  return (
    <>
    <div className="space-y-4">

      {/* Header */}
      <div className="rounded-2xl px-5 py-4 text-white" style={{ background:'linear-gradient(135deg,#2b6460 0%,#52988c 100%)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Study Planner</p>
            <p className="text-sm font-bold mt-0.5">{formatKoreanDate(date)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-60">총 학습</p>
            <p className="text-sm font-bold font-mono">{formatTime(totalActual)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-bold text-white/70">{completedIds.size}/{planTasks.length} 완료</span>
          <div className="flex-1 h-1.5 bg-white/25 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all"
              style={{ width:`${planTasks.length > 0 ? (completedIds.size/planTasks.length)*100 : 0}%` }} />
          </div>
          <Lock className="w-3 h-3 text-white/50" />
        </div>
        <button
          onClick={() => { if (analyzing) return; setAnalyzing(true); setTimeout(() => { setAnalysis(analyzeStudy(entries)); setAnalyzing(false); }, 800); }}
          disabled={analyzing || entries.length === 0}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 text-white font-bold text-sm py-2.5 rounded-xl transition">
          {analyzing
            ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"/>분석 중...</>
            : <><Sparkles className="w-3.5 h-3.5"/>오늘 학습 완료 — AI 분석 받기</>}
        </button>
      </div>

      {/* Completed rows */}
      {completedIds.size > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">완료된 학습</p>
          {planTasks.filter(t => completedIds.has(t.id)).map(task => {
            const c = getColor(task.subject, task.customSubject);
            const secs = completedMap[task.id] ?? 0;
            return (
              <div key={task.id} className={`flex items-center gap-2 bg-white rounded-xl border border-gray-100 border-l-4 ${c.border} px-3 py-2.5`}>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${c.badge}`}>{displaySubjectName(task)}</span>
                <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded-md flex-shrink-0">{displayCategoryName(task)}</span>
                <p className="text-[11px] text-gray-500 flex-1 min-w-0 truncate">{task.detail || '—'}</p>
                <div className="text-right flex-shrink-0 ml-1">
                  <p className="text-[10px] text-gray-300 font-mono">{formatMins(task.estimatedMinutes)}</p>
                  <p className={`text-[11px] font-bold font-mono ${c.text}`}>{formatTime(secs)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active timer */}
      {activeTask && activeColor && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className={`flex items-center gap-2 px-4 py-3 ${activeColor.bg}`}>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${activeColor.badge}`}>{displaySubjectName(activeTask)}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/60 text-gray-600">{displayCategoryName(activeTask)}</span>
            {timerState === 'running' && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full animate-pulse ml-auto">⏱ 진행 중</span>}
            {timerState === 'paused'  && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full ml-auto">⏸ 휴게 중 · {formatTime(displayBreak)}</span>}
            {timerState === 'idle'    && (
              <button onClick={() => setActiveTaskId(null)} className="text-[10px] text-gray-400 hover:text-gray-600 ml-auto">← 취소</button>
            )}
          </div>
          {activeTask.detail && <p className="text-xs text-gray-400 px-4 pt-2.5 pb-0">{activeTask.detail}</p>}
          <div className="px-4 pt-3 pb-2">
            <CircularTimer elapsed={elapsed} estimatedSecs={estSecs} sectorColor={activeColor.sector} />
          </div>
          <div className="px-4 pb-4 flex gap-2">
            {timerState === 'idle' && (
              <button onClick={() => startTimer(activeTask.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl transition">
                <Play className="w-4 h-4"/>시작
              </button>
            )}
            {timerState === 'running' && (<>
              <button onClick={pauseTimer}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition">
                <Pause className="w-4 h-4"/>휴게
              </button>
              <button onClick={() => completeTask(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl transition">
                <CheckCircle2 className="w-4 h-4"/>완료
              </button>
            </>)}
            {timerState === 'paused' && (<>
              <button onClick={resumeTimer}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl transition">
                <Play className="w-4 h-4"/>재개
              </button>
              <button onClick={() => completeTask(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm rounded-xl transition">
                <CheckCircle2 className="w-4 h-4"/>완료
              </button>
            </>)}
          </div>
        </div>
      )}

      {/* Pending task list */}
      {pendingTasks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
            {activeTask ? '대기 중' : '학습 목록'}
          </p>
          {pendingTasks.map((task, idx) => {
            const c = getColor(task.subject, task.customSubject);
            const canStart = !activeTask;
            return (
              <button key={task.id}
                onClick={() => { if (canStart) setActiveTaskId(task.id); }}
                disabled={!canStart}
                className={`w-full text-left flex items-center gap-3 bg-white rounded-xl border border-gray-100 border-l-4 ${c.border} px-3 py-3 transition ${canStart ? 'hover:shadow-md' : 'opacity-50 cursor-not-allowed'}`}>
                <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-gray-300">
                  {idx+1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${c.badge}`}>{displaySubjectName(task)}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">{displayCategoryName(task)}</span>
                  </div>
                  {task.detail && <p className="text-[11px] text-gray-400 truncate">{task.detail}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] text-gray-400 font-medium">{formatMins(task.estimatedMinutes)}</p>
                  {canStart && <p className="text-[10px] text-primary-400 font-semibold">시작 →</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* All done */}
      {!activeTask && completedIds.size === planTasks.length && planTasks.length > 0 && (
        <div className="bg-green-50 rounded-2xl border border-green-100 p-5 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <p className="font-bold text-green-800">모든 학습 완료!</p>
          <p className="text-xs text-green-600 mt-1">위의 AI 분석으로 오늘 학습을 돌아보세요</p>
        </div>
      )}
    </div>

    {analysis && <AnalysisModal analysis={analysis} date={date} onClose={() => setAnalysis(null)} />}
    </>
  );
}
