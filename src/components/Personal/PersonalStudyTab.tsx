import { useState, useEffect, useRef } from 'react';
import type { PersonalStudyEntry, User } from '../../types';
import {
  getPersonalStudyEntriesForDate,
  upsertPersonalStudyEntry,
  deletePersonalStudyEntry,
  markAttendance,
} from '../../store';
import { Plus, Trash2, Save, Play, Pause, Square, ChevronUp, ChevronDown, CheckCircle2, AlertTriangle, XCircle, Pencil, Check, X } from 'lucide-react';

interface Props {
  date: string;
  currentUser: User;
}

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  priority: 'high' | 'medium' | 'low';
  tag: string;
}

const SUBJECTS = ['국교론', '교육학', '중세문법', '현대문법', '기타'] as const;
const TODO_TAGS = ['국교론', '교육학', '중세문법', '현대문법', '기타', '없음'] as const;

const COLORS: Record<string, {
  border: string; headerBg: string; badge: string;
  timerBg: string; bar: string; text: string; ring: string;
}> = {
  '국교론':  { border:'border-l-blue-400',   headerBg:'bg-blue-50',    badge:'bg-blue-100 text-blue-700',       timerBg:'bg-blue-50',   bar:'bg-blue-500',   text:'text-blue-700',   ring:'ring-blue-400'   },
  '교육학':  { border:'border-l-emerald-400', headerBg:'bg-emerald-50', badge:'bg-emerald-100 text-emerald-700', timerBg:'bg-emerald-50', bar:'bg-emerald-500', text:'text-emerald-700', ring:'ring-emerald-400' },
  '중세문법': { border:'border-l-violet-400',  headerBg:'bg-violet-50',  badge:'bg-violet-100 text-violet-700',   timerBg:'bg-violet-50',  bar:'bg-violet-500',  text:'text-violet-700',  ring:'ring-violet-400'  },
  '현대문법': { border:'border-l-orange-400',  headerBg:'bg-orange-50',  badge:'bg-orange-100 text-orange-700',   timerBg:'bg-orange-50',  bar:'bg-orange-500',  text:'text-orange-700',  ring:'ring-orange-400'  },
  '기타':    { border:'border-l-gray-300',    headerBg:'bg-gray-50',    badge:'bg-gray-100 text-gray-600',       timerBg:'bg-gray-50',   bar:'bg-gray-400',   text:'text-gray-600',   ring:'ring-gray-300'   },
};
const TAG_BADGE: Record<string, string> = {
  '국교론':'bg-blue-100 text-blue-600', '교육학':'bg-emerald-100 text-emerald-600',
  '중세문법':'bg-violet-100 text-violet-600', '현대문법':'bg-orange-100 text-orange-600',
  '기타':'bg-gray-100 text-gray-500', '없음':'',
};
const PRIORITY_META = {
  high:   { dot:'bg-red-500',    label:'높음', badge:'bg-red-50 text-red-600 border-red-200' },
  medium: { dot:'bg-amber-400',  label:'보통', badge:'bg-amber-50 text-amber-600 border-amber-200' },
  low:    { dot:'bg-gray-300',   label:'낮음', badge:'bg-gray-50 text-gray-400 border-gray-200' },
};

function getColor(subject: string) { return COLORS[subject] ?? COLORS['기타']; }

function formatTime(s: number): string {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function formatMins(t: number): string {
  if (!t) return '—';
  const h = Math.floor(t/60), m = t%60;
  if (!h) return `${m}분`; if (!m) return `${h}시간`; return `${h}시간 ${m}분`;
}
function formatKoreanDate(d: string): string {
  const dt = new Date(d+'T00:00:00');
  const days = ['일','월','화','수','목','금','토'];
  return `${dt.getFullYear()}년 ${dt.getMonth()+1}월 ${dt.getDate()}일 (${days[dt.getDay()]})`;
}

type Status = 'O' | '△' | 'X' | null;
function computeStatus(entry: PersonalStudyEntry, liveElapsed: number): Status {
  const planned = (entry.estimatedMinutes ?? 0) * 60;
  if (liveElapsed === 0 && !entry.studySeconds) return 'X';
  const secs = liveElapsed;
  if (planned > 0 && secs >= planned) return 'O';
  if (entry.manuallyCompleted) return planned > 0 ? '△' : 'O';
  return null;
}

function emptyEntry(date: string, userId: string): PersonalStudyEntry {
  return {
    id: crypto.randomUUID(), date, userId,
    subject: '국교론', customSubject: '', plannerActivity: '', customActivity: '',
    examStatus: '', feedbackCategories: [], feedback: '',
    studySeconds: 0, studyHours: '', studyContent: '', estimatedMinutes: 0,
    manuallyCompleted: false,
  };
}

function loadTodos(userId: string, date: string): TodoItem[] {
  try { return JSON.parse(localStorage.getItem(`planner_todos_${userId}_${date}`) ?? '[]'); }
  catch { return []; }
}
function saveTodosLS(userId: string, date: string, todos: TodoItem[]) {
  localStorage.setItem(`planner_todos_${userId}_${date}`, JSON.stringify(todos));
}

/* ── Status badge ───────────────────────────────────────── */
function StatusBadge({ status }: { status: Status }) {
  if (!status) return null;
  if (status === 'O') return (
    <span className="flex items-center gap-1 text-[11px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" />완료
    </span>
  );
  if (status === '△') return (
    <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" />미달
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" />누락
    </span>
  );
}

/* ── Subject Card ───────────────────────────────────────── */
function SubjectCard({ entry, onSave, onDelete }: {
  entry: PersonalStudyEntry;
  onSave: (e: PersonalStudyEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState(entry);
  const [timerState, setTimerState] = useState<'idle'|'running'|'paused'>('idle');
  const [elapsed, setElapsed] = useState(entry.studySeconds || 0);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(true);
  const [editingTime, setEditingTime] = useState(false);
  const [editH, setEditH] = useState(0);
  const [editM, setEditM] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>|undefined>(undefined);
  // 실제 시각 기반 타이머: 앱을 나갔다 돌아와도 경과 시간 유지
  const startAtRef  = useRef<number>(0);   // 이번 run 시작 timestamp
  const baseRef     = useRef<number>(entry.studySeconds || 0); // 이전까지 누적 초

  const LS_KEY = `timer_run_${entry.id}`;

  // 마운트 시 localStorage에서 진행 중인 타이머 복원 (로그아웃 후 재진입 포함)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const { startedAt, base } = JSON.parse(raw) as { startedAt: number; base: number };
        baseRef.current    = base;
        startAtRef.current = startedAt;
        const restored     = base + Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(restored);
        setTimerState('running');
      }
    } catch { localStorage.removeItem(LS_KEY); }
    return () => { clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsed(baseRef.current + Math.floor((Date.now() - startAtRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerState]);

  // entry 갱신 시: LS에 진행 중 타이머 있으면 elapsed 건드리지 않음
  // (마운트 직후 race condition 방지 + 로그아웃 재진입 후 복원 유지)
  useEffect(() => {
    setDraft(entry);
    if (!localStorage.getItem(LS_KEY)) {
      setElapsed(entry.studySeconds || 0);
      baseRef.current = entry.studySeconds || 0;
    }
  }, [entry]);

  // 목표 달성 시 자동 완료
  useEffect(() => {
    const planned = (draft.estimatedMinutes ?? 0) * 60;
    if (planned > 0 && elapsed >= planned && timerState === 'running') {
      stopTimer();
    }
  }, [elapsed]);

  function startTimer() {
    startAtRef.current = Date.now();
    baseRef.current    = elapsed;
    localStorage.setItem(LS_KEY, JSON.stringify({ startedAt: startAtRef.current, base: baseRef.current }));
    setTimerState('running');
  }

  function pauseTimer() {
    baseRef.current = elapsed;
    localStorage.removeItem(LS_KEY);
    setTimerState('paused');
  }

  function stopTimer() {
    localStorage.removeItem(LS_KEY);
    setTimerState('idle');
    setDraft(prev => ({ ...prev, studySeconds: elapsed }));
  }

  function handleManualComplete() {
    localStorage.removeItem(LS_KEY);
    const updated = { ...draft, studySeconds: elapsed, manuallyCompleted: true };
    setDraft(updated);
    setTimerState('idle');
    onSave(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSave() {
    onSave({ ...draft, studySeconds: elapsed });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const color = getColor(draft.subject);
  const estSecs = (draft.estimatedMinutes ?? 0) * 60;
  const progress = estSecs > 0 ? Math.min(100, Math.round((elapsed / estSecs) * 100)) : 0;
  const estH = Math.floor((draft.estimatedMinutes ?? 0) / 60);
  const estM = (draft.estimatedMinutes ?? 0) % 60;
  const displayName = draft.subject === '기타' ? (draft.customSubject || '기타') : draft.subject;
  const status = computeStatus({ ...draft, studySeconds: elapsed }, elapsed);
  const canManualComplete = elapsed > 0 && status === null; // timer used, not auto-completed

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${color.border} overflow-hidden`}>

      {/* Header */}
      <div
        className={`flex items-center gap-2.5 px-4 py-3 cursor-pointer ${color.headerBg}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${color.badge}`}>
          {displayName}
        </span>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <StatusBadge status={status} />
          {status === null && elapsed > 0 && timerState === 'running' && (
            <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full animate-pulse">
              ⏱ 진행 중
            </span>
          )}
        </div>

        {estSecs > 0 && status !== 'X' && (
          <div className="w-16 flex-shrink-0">
            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : color.bar}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[9px] text-right mt-0.5 opacity-60 font-medium">{progress}%</p>
          </div>
        )}

        <button
          onClick={e => { e.stopPropagation(); localStorage.removeItem(LS_KEY); onDelete(entry.id); }}
          className="p-1 text-gray-300 hover:text-red-400 transition flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-gray-400 flex-shrink-0">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-4 pt-4">

          {/* Subject pills */}
          <div className="flex gap-1.5 flex-wrap">
            {SUBJECTS.map(s => {
              const c = getColor(s);
              const active = draft.subject === s;
              return (
                <button key={s} onClick={() => setDraft(prev => ({ ...prev, subject: s }))}
                  className={`text-xs px-3 py-1 rounded-full font-semibold transition ring-2 ring-offset-1 ${
                    active ? `${c.badge} ${c.ring}` : 'bg-gray-100 text-gray-400 ring-transparent hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {draft.subject === '기타' && (
            <input className="input-field text-sm" placeholder="과목명 직접 입력"
              value={draft.customSubject}
              onChange={e => setDraft(prev => ({ ...prev, customSubject: e.target.value }))} />
          )}

          {/* Content */}
          <div>
            <label className="label">오늘 할 내용</label>
            <textarea className="textarea-field text-sm resize-none" rows={3}
              placeholder="어떤 내용을 공부할 건가요? (예: 기출 20문제 풀이 + 오답 정리)"
              value={draft.studyContent ?? ''}
              onChange={e => setDraft(prev => ({ ...prev, studyContent: e.target.value }))} />
          </div>

          {/* Time + progress */}
          <div className="bg-gray-50 rounded-xl p-3.5 space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">예상 소요</p>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={12}
                    className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                    value={estH || ''} placeholder="0"
                    onClick={e => e.stopPropagation()}
                    onChange={e => { const h = Math.max(0,Math.min(12,Number(e.target.value)||0)); setDraft(prev=>({...prev,estimatedMinutes:h*60+estM})); }}
                  />
                  <span className="text-xs text-gray-400 font-medium">h</span>
                  <input type="number" min={0} max={59} step={5}
                    className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                    value={estM || ''} placeholder="0"
                    onClick={e => e.stopPropagation()}
                    onChange={e => { const m = Math.max(0,Math.min(59,Number(e.target.value)||0)); setDraft(prev=>({...prev,estimatedMinutes:estH*60+m})); }}
                  />
                  <span className="text-xs text-gray-400 font-medium">m</span>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center justify-end gap-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">실제 시간</p>
                  {!editingTime && timerState === 'idle' && (
                    <button
                      onClick={() => {
                        setEditH(Math.floor(elapsed / 3600));
                        setEditM(Math.floor((elapsed % 3600) / 60));
                        setEditingTime(true);
                      }}
                      className="p-0.5 text-gray-300 hover:text-gray-500 transition"
                      title="시간 수정"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {editingTime ? (
                  <div className="flex items-center gap-1 justify-end">
                    <input
                      type="number" min={0} max={23}
                      className="w-12 text-center text-sm font-bold border border-primary-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-primary-300"
                      value={editH}
                      onChange={e => setEditH(Math.max(0, Math.min(23, Number(e.target.value) || 0)))}
                    />
                    <span className="text-xs text-gray-400 font-bold">:</span>
                    <input
                      type="number" min={0} max={59}
                      className="w-12 text-center text-sm font-bold border border-primary-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-primary-300"
                      value={String(editM).padStart(2, '0')}
                      onChange={e => setEditM(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                    />
                    <button
                      onClick={() => {
                        const newSecs = editH * 3600 + editM * 60;
                        setElapsed(newSecs);
                        baseRef.current = newSecs;
                        setEditingTime(false);
                      }}
                      className="p-1 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setEditingTime(false)}
                      className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <p className={`font-mono text-2xl font-black tabular-nums leading-none ${elapsed > 0 ? color.text : 'text-gray-200'}`}>
                    {formatTime(elapsed)}
                  </p>
                )}
              </div>
            </div>

            {estSecs > 0 && (
              <div className="space-y-1">
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : color.bar}`}
                    style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>목표 {formatMins(draft.estimatedMinutes ?? 0)}</span>
                  <span className={progress >= 100 ? 'text-green-600 font-bold' : ''}>{progress}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Timer controls */}
          <div className={`${color.timerBg} rounded-xl px-4 py-3 flex items-center justify-between gap-3`}>
            <div className="flex gap-2">
              {timerState !== 'running' ? (
                <button onClick={startTimer}
                  className="flex items-center gap-1.5 text-xs font-bold bg-green-500 hover:bg-green-600 text-white px-3.5 py-2 rounded-xl transition shadow-sm">
                  <Play className="w-3.5 h-3.5" />{timerState === 'paused' ? '재개' : '시작'}
                </button>
              ) : (
                <button onClick={pauseTimer}
                  className="flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl transition shadow-sm">
                  <Pause className="w-3.5 h-3.5" />일시정지
                </button>
              )}
              {timerState !== 'idle' && (
                <button onClick={stopTimer}
                  className="flex items-center gap-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-3.5 py-2 rounded-xl transition shadow-sm">
                  <Square className="w-3.5 h-3.5" />중지
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canManualComplete && (
                <button onClick={handleManualComplete}
                  className="flex items-center gap-1.5 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200 px-3.5 py-2 rounded-xl transition">
                  <AlertTriangle className="w-3.5 h-3.5" />완료 처리
                </button>
              )}
              <button onClick={handleSave}
                className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-sm ${
                  saved ? 'bg-gray-200 text-gray-500' : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}>
                <Save className="w-3.5 h-3.5" />
                {saved ? '저장됨!' : '저장'}
              </button>
            </div>
          </div>

          {/* Status explanation */}
          {status === 'O' && <p className="text-xs text-green-600 text-center font-medium">🎉 목표 달성! 자동으로 완료 처리되었습니다.</p>}
          {status === '△' && <p className="text-xs text-amber-600 text-center font-medium">목표 시간에 미달했지만 완료 처리되었습니다.</p>}
        </div>
      )}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function PersonalStudyTab({ date, currentUser }: Props) {
  const [entries, setEntries] = useState<PersonalStudyEntry[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newPriority, setNewPriority] = useState<'high'|'medium'|'low'>('medium');
  const [newTag, setNewTag] = useState<string>('없음');

  function reload() {
    setEntries(getPersonalStudyEntriesForDate(date).filter(e => e.userId === currentUser.id));
  }

  useEffect(() => { reload(); }, [date]);
  useEffect(() => { setTodos(loadTodos(currentUser.id, date)); }, [date, currentUser.id]);

  function handleSave(entry: PersonalStudyEntry) {
    upsertPersonalStudyEntry(entry);
    markAttendance(entry.date, currentUser.id, currentUser.username);
    reload();
  }

  function handleDelete(id: string) {
    deletePersonalStudyEntry(id);
    reload();
  }

  function addTodo() {
    if (!newTodo.trim()) return;
    const updated = [...todos, {
      id: crypto.randomUUID(), text: newTodo.trim(),
      done: false, priority: newPriority, tag: newTag,
    }];
    setTodos(updated);
    saveTodosLS(currentUser.id, date, updated);
    setNewTodo(''); setNewTag('없음'); setNewPriority('medium');
  }

  function toggleTodo(id: string) {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated); saveTodosLS(currentUser.id, date, updated);
  }

  function deleteTodo(id: string) {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated); saveTodosLS(currentUser.id, date, updated);
  }

  const totalPlanned = entries.reduce((s, e) => s + (e.estimatedMinutes ?? 0), 0);
  const totalActual  = entries.reduce((s, e) => s + (e.studySeconds || 0), 0);
  const overallPct   = totalPlanned > 0 ? Math.min(100, Math.round((totalActual/(totalPlanned*60))*100)) : 0;
  const doneTodos    = todos.filter(t => t.done).length;

  // status counts for summary
  const statusCounts = entries.reduce((acc, e) => {
    const s = computeStatus(e, e.studySeconds || 0);
    if (s === 'O') acc.o++;
    else if (s === '△') acc.d++;
    else if (s === 'X') acc.x++;
    return acc;
  }, { o: 0, d: 0, x: 0 });

  return (
    <div className="space-y-5">

      {/* ── Header card ── */}
      <div className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a78bfa 100%)' }}>
        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Study Planner</p>
        <p className="text-base font-bold mb-4">{formatKoreanDate(date)}</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white/15 rounded-xl px-3 py-2.5 text-center">
            <p className="text-[10px] opacity-70 font-semibold mb-0.5">목표</p>
            <p className="text-sm font-bold">{formatMins(totalPlanned)}</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2.5 text-center">
            <p className="text-[10px] opacity-70 font-semibold mb-0.5">실제</p>
            <p className="text-sm font-bold font-mono">{formatTime(totalActual)}</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2.5 text-center">
            <p className="text-[10px] opacity-70 font-semibold mb-0.5">할 일</p>
            <p className="text-sm font-bold">{doneTodos}/{todos.length}</p>
          </div>
        </div>

        {/* Status row */}
        {entries.length > 0 && (
          <div className="flex gap-2 mb-4">
            <div className="flex-1 flex items-center gap-1.5 bg-green-500/30 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">완료 {statusCounts.o}</span>
            </div>
            <div className="flex-1 flex items-center gap-1.5 bg-amber-500/30 rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">미달 {statusCounts.d}</span>
            </div>
            <div className="flex-1 flex items-center gap-1.5 bg-red-500/30 rounded-xl px-3 py-2">
              <XCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">누락 {statusCounts.x}</span>
            </div>
          </div>
        )}

        {totalPlanned > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs opacity-80">
              <span>오늘 목표 달성률</span>
              <span className="font-bold">{overallPct}%</span>
            </div>
            <div className="h-2 bg-white/25 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width:`${overallPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Planner ── */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">📚 스터디 플래너</p>
        <div className="space-y-3">
          {entries.map(e => (
            <SubjectCard key={e.id} entry={e} onSave={handleSave} onDelete={handleDelete} />
          ))}
          <button
            onClick={() => { const e = emptyEntry(date, currentUser.id); upsertPersonalStudyEntry(e); reload(); }}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-400 hover:border-primary-400 hover:text-primary-600 rounded-2xl py-5 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold text-sm">과목 추가</span>
          </button>
        </div>
      </div>

      {/* ── Todo list ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">✅ 내일 할 일</p>
          {todos.length > 0 && (
            <span className="text-xs font-semibold text-gray-400">
              {doneTodos}/{todos.length} 완료
            </span>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Priority sections */}
          {(['high','medium','low'] as const).map(p => {
            const items = todos.filter(t => t.priority === p);
            if (!items.length) return null;
            const meta = PRIORITY_META[p];
            return (
              <div key={p}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/70 border-b border-gray-100">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{meta.label}</span>
                  <span className="text-[10px] text-gray-400">{items.filter(t=>t.done).length}/{items.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map(todo => (
                    <div key={todo.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50/50 transition">
                      <button
                        onClick={() => toggleTodo(todo.id)}
                        className={`w-5 h-5 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all shadow-sm ${
                          todo.done ? 'bg-primary-500 border-primary-500 shadow-primary-200' : 'border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        {todo.done && <span className="text-white text-[10px] font-black">✓</span>}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed ${todo.done ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                          {todo.text}
                        </p>
                        {todo.tag && todo.tag !== '없음' && (
                          <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${TAG_BADGE[todo.tag] ?? 'bg-gray-100 text-gray-500'}`}>
                            {todo.tag}
                          </span>
                        )}
                      </div>

                      <button onClick={() => deleteTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 transition p-1 text-gray-300 hover:text-red-400 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {todos.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">내일 할 일을 추가해 보세요</p>
          )}

          {/* Add todo form */}
          <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-2">
            <div className="flex gap-2">
              {/* Priority selector */}
              <div className="flex gap-1">
                {(['high','medium','low'] as const).map(p => {
                  const meta = PRIORITY_META[p];
                  return (
                    <button key={p} onClick={() => setNewPriority(p)}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1.5 rounded-lg border transition ${
                        newPriority === p ? `${meta.badge} border-current` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="text-xs border border-gray-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-gray-600 flex-shrink-0"
                value={newTag} onChange={e => setNewTag(e.target.value)}
              >
                {TODO_TAGS.map(t => <option key={t}>{t}</option>)}
              </select>
              <input
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                placeholder="내일 할 일 입력..."
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
              />
              <button onClick={addTodo} disabled={!newTodo.trim()}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white rounded-xl transition">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
