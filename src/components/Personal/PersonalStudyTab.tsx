import { useState, useEffect, useRef } from 'react';
import type { PersonalStudyEntry, User } from '../../types';
import {
  getPersonalStudyEntriesForDate,
  upsertPersonalStudyEntry,
  deletePersonalStudyEntry,
  markAttendance,
} from '../../store';
import { Plus, Trash2, Save, Play, Pause, Square, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  date: string;
  currentUser: User;
}

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

const SUBJECTS = ['국교론', '교육학', '중세문법', '현대문법', '기타'] as const;

const COLORS: Record<string, { border: string; headerBg: string; badge: string; timerBg: string; bar: string; text: string }> = {
  '국교론':  { border: 'border-l-blue-400',   headerBg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700',    timerBg: 'bg-blue-50',   bar: 'bg-blue-500',   text: 'text-blue-700'   },
  '교육학':  { border: 'border-l-emerald-400', headerBg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', timerBg: 'bg-emerald-50', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  '중세문법': { border: 'border-l-violet-400',  headerBg: 'bg-violet-50',  badge: 'bg-violet-100 text-violet-700',  timerBg: 'bg-violet-50',  bar: 'bg-violet-500',  text: 'text-violet-700'  },
  '현대문법': { border: 'border-l-orange-400',  headerBg: 'bg-orange-50',  badge: 'bg-orange-100 text-orange-700',  timerBg: 'bg-orange-50',  bar: 'bg-orange-500',  text: 'text-orange-700'  },
  '기타':    { border: 'border-l-gray-300',    headerBg: 'bg-gray-50',    badge: 'bg-gray-100 text-gray-600',    timerBg: 'bg-gray-50',   bar: 'bg-gray-400',   text: 'text-gray-600'   },
};
function getColor(subject: string) { return COLORS[subject] ?? COLORS['기타']; }

function formatTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function formatMins(total: number): string {
  if (!total) return '—';
  const h = Math.floor(total / 60), m = total % 60;
  if (!h) return `${m}분`;
  if (!m) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일','월','화','수','목','금','토'];
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function emptyEntry(date: string, userId: string): PersonalStudyEntry {
  return {
    id: crypto.randomUUID(), date, userId,
    subject: '국교론', customSubject: '', plannerActivity: '', customActivity: '',
    examStatus: '', feedbackCategories: [], feedback: '',
    studySeconds: 0, studyHours: '', studyContent: '', estimatedMinutes: 0,
  };
}

function loadTodos(userId: string, date: string): TodoItem[] {
  try { return JSON.parse(localStorage.getItem(`planner_todos_${userId}_${date}`) ?? '[]'); }
  catch { return []; }
}
function saveTodosLS(userId: string, date: string, todos: TodoItem[]) {
  localStorage.setItem(`planner_todos_${userId}_${date}`, JSON.stringify(todos));
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
  const intervalRef = useRef<ReturnType<typeof setInterval>|undefined>(undefined);

  useEffect(() => { setDraft(entry); setElapsed(entry.studySeconds || 0); }, [entry]);

  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerState]);

  function handleStop() {
    setTimerState('idle');
    setDraft(prev => ({ ...prev, studySeconds: elapsed }));
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

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${color.border} overflow-hidden`}>

      {/* Card header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 ${color.headerBg} cursor-pointer`}
        onClick={() => setOpen(v => !v)}
      >
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${color.badge}`}>
          {displayName}
        </span>
        {timerState === 'running' && (
          <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full animate-pulse flex-shrink-0">
            ⏱ 진행 중
          </span>
        )}
        {elapsed > 0 && timerState !== 'running' && (
          <span className="text-xs font-mono text-gray-500 flex-shrink-0">{formatTime(elapsed)}</span>
        )}
        {estSecs > 0 && (
          <div className="flex-1 min-w-0">
            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : color.bar}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
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
                <button
                  key={s}
                  onClick={() => setDraft(prev => ({ ...prev, subject: s }))}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                    active ? `${c.badge} ring-2 ring-offset-1 ${c.bar.replace('bg-', 'ring-')}` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {draft.subject === '기타' && (
            <input
              className="input-field text-sm"
              placeholder="과목명 직접 입력"
              value={draft.customSubject}
              onChange={e => setDraft(prev => ({ ...prev, customSubject: e.target.value }))}
            />
          )}

          {/* Study content */}
          <div>
            <label className="label">오늘 할 내용</label>
            <textarea
              className="textarea-field text-sm resize-none"
              rows={3}
              placeholder="어떤 내용을 공부할 건가요? (예: 기출 20문제 풀이 + 오답 정리)"
              value={draft.studyContent ?? ''}
              onChange={e => setDraft(prev => ({ ...prev, studyContent: e.target.value }))}
            />
          </div>

          {/* Planned time input + actual time display */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">예상 소요 시간</p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min={0} max={12}
                    className="w-14 text-center text-sm font-semibold border border-gray-200 rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                    value={estH || ''}
                    placeholder="0"
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      const h = Math.max(0, Math.min(12, Number(e.target.value) || 0));
                      setDraft(prev => ({ ...prev, estimatedMinutes: h * 60 + estM }));
                    }}
                  />
                  <span className="text-xs text-gray-400">h</span>
                  <input
                    type="number" min={0} max={59} step={5}
                    className="w-14 text-center text-sm font-semibold border border-gray-200 rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                    value={estM || ''}
                    placeholder="0"
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      const m = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                      setDraft(prev => ({ ...prev, estimatedMinutes: estH * 60 + m }));
                    }}
                  />
                  <span className="text-xs text-gray-400">m</span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">실제 시간</p>
                <p className={`font-mono text-xl font-bold tabular-nums ${elapsed > 0 ? color.text : 'text-gray-300'}`}>
                  {formatTime(elapsed)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            {estSecs > 0 && (
              <div className="space-y-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : color.bar}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{formatMins(draft.estimatedMinutes ?? 0)} 목표</span>
                  <span className={progress >= 100 ? 'text-green-600 font-semibold' : ''}>{progress}% 달성</span>
                </div>
              </div>
            )}
          </div>

          {/* Timer controls */}
          <div className={`flex items-center justify-between gap-3 ${color.timerBg} rounded-xl px-4 py-3`}>
            <div className="flex gap-2">
              {timerState !== 'running' ? (
                <button
                  onClick={() => setTimerState('running')}
                  className="flex items-center gap-1.5 text-xs font-bold bg-green-500 hover:bg-green-600 text-white px-3.5 py-2 rounded-xl transition shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  {timerState === 'paused' ? '재개' : '시작'}
                </button>
              ) : (
                <button
                  onClick={() => setTimerState('paused')}
                  className="flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl transition shadow-sm"
                >
                  <Pause className="w-3.5 h-3.5" />일시정지
                </button>
              )}
              {timerState !== 'idle' && (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-3.5 py-2 rounded-xl transition shadow-sm"
                >
                  <Square className="w-3.5 h-3.5" />중지
                </button>
              )}
            </div>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-sm ${
                saved ? 'bg-gray-200 text-gray-500' : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? '저장됨!' : '저장'}
            </button>
          </div>

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
    const updated = [...todos, { id: crypto.randomUUID(), text: newTodo.trim(), done: false }];
    setTodos(updated);
    saveTodosLS(currentUser.id, date, updated);
    setNewTodo('');
  }

  function toggleTodo(id: string) {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated);
    saveTodosLS(currentUser.id, date, updated);
  }

  function deleteTodo(id: string) {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    saveTodosLS(currentUser.id, date, updated);
  }

  const totalPlannedMins = entries.reduce((s, e) => s + (e.estimatedMinutes ?? 0), 0);
  const totalActualSecs  = entries.reduce((s, e) => s + (e.studySeconds || 0), 0);
  const overallPct = totalPlannedMins > 0
    ? Math.min(100, Math.round((totalActualSecs / (totalPlannedMins * 60)) * 100))
    : 0;
  const doneTodos = todos.filter(t => t.done).length;

  return (
    <div className="space-y-5">

      {/* ── Date + summary header ── */}
      <div
        className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a78bfa 100%)' }}
      >
        <p className="text-xs font-semibold opacity-70 uppercase tracking-widest mb-1">Study Planner</p>
        <p className="text-base font-bold mb-4">{formatKoreanDate(date)}</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/15 rounded-xl px-3 py-2.5 text-center">
            <p className="text-[10px] opacity-70 font-semibold mb-0.5">목표 시간</p>
            <p className="text-sm font-bold">{formatMins(totalPlannedMins)}</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2.5 text-center">
            <p className="text-[10px] opacity-70 font-semibold mb-0.5">실제 시간</p>
            <p className="text-sm font-bold font-mono">{formatTime(totalActualSecs)}</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2.5 text-center">
            <p className="text-[10px] opacity-70 font-semibold mb-0.5">내일 할 일</p>
            <p className="text-sm font-bold">{doneTodos}/{todos.length}</p>
          </div>
        </div>

        {totalPlannedMins > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs opacity-80">
              <span>오늘 목표 달성률</span>
              <span className="font-bold">{overallPct}%</span>
            </div>
            <div className="h-2 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Study planner ── */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">📚 스터디 플래너</p>
        <div className="space-y-3">
          {entries.map(entry => (
            <SubjectCard key={entry.id} entry={entry} onSave={handleSave} onDelete={handleDelete} />
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

      {/* ── Tomorrow todo ── */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">✅ 내일 할 일</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {todos.length > 0 && (
            <div className="divide-y divide-gray-50">
              {todos.map((todo, idx) => (
                <div key={todo.id} className="flex items-center gap-3 px-4 py-3 group">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      todo.done
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {todo.done && <span className="text-white text-[10px] font-black">✓</span>}
                  </button>
                  <span className={`flex-1 text-sm leading-relaxed ${todo.done ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                    {todo.text}
                  </span>
                  <span className="text-[10px] text-gray-300 flex-shrink-0">{idx + 1}</span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 transition p-1 text-gray-300 hover:text-red-400 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {todos.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">내일 할 일을 추가해 보세요</p>
          )}

          <div className="flex gap-2 p-3 border-t border-gray-50 bg-gray-50/50">
            <input
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              placeholder="내일 할 일 입력..."
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
            />
            <button
              onClick={addTodo}
              disabled={!newTodo.trim()}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
