import { useState, useEffect, useRef } from 'react';
import type { PersonalStudyEntry, User } from '../../types';
import {
  getPersonalStudyEntriesForDate,
  upsertPersonalStudyEntry,
  deletePersonalStudyEntry,
  markAttendance,
} from '../../store';
import { Plus, Trash2, Save, Play, Pause, Square, BookOpen, CheckSquare, Clock } from 'lucide-react';

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

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function emptyEntry(date: string, userId: string): PersonalStudyEntry {
  return {
    id: crypto.randomUUID(),
    date,
    userId,
    subject: '국교론',
    customSubject: '',
    plannerActivity: '',
    customActivity: '',
    examStatus: '',
    feedbackCategories: [],
    feedback: '',
    studySeconds: 0,
    studyHours: '',
    studyContent: '',
    estimatedMinutes: 0,
  };
}

function loadTodos(userId: string, date: string): TodoItem[] {
  try {
    return JSON.parse(localStorage.getItem(`planner_todos_${userId}_${date}`) ?? '[]');
  } catch { return []; }
}

function saveTodosToStorage(userId: string, date: string, todos: TodoItem[]) {
  localStorage.setItem(`planner_todos_${userId}_${date}`, JSON.stringify(todos));
}

function SubjectCard({ entry, onSave, onDelete }: {
  entry: PersonalStudyEntry;
  onSave: (e: PersonalStudyEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState(entry);
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsed, setElapsed] = useState(entry.studySeconds || 0);
  const [saved, setSaved] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    setDraft(entry);
    setElapsed(entry.studySeconds || 0);
  }, [entry]);

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

  const estH = Math.floor((draft.estimatedMinutes ?? 0) / 60);
  const estM = (draft.estimatedMinutes ?? 0) % 60;

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <select
          value={draft.subject}
          onChange={e => setDraft(prev => ({ ...prev, subject: e.target.value }))}
          className="flex-1 text-sm font-bold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer"
        >
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
        {elapsed > 0 && (
          <span className="text-xs font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full flex-shrink-0">
            {formatTime(elapsed)}
          </span>
        )}
        <button onClick={() => onDelete(entry.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
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
        <label className="label">공부할 내용</label>
        <textarea
          className="textarea-field text-sm"
          rows={2}
          placeholder="오늘 공부할 내용을 입력하세요"
          value={draft.studyContent ?? ''}
          onChange={e => setDraft(prev => ({ ...prev, studyContent: e.target.value }))}
        />
      </div>

      {/* Estimated time */}
      <div>
        <label className="label">예상 소요 시간</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={12}
            className="input-field w-20 text-center text-sm"
            value={estH || ''}
            placeholder="0"
            onChange={e => {
              const h = Math.max(0, Math.min(12, Number(e.target.value) || 0));
              setDraft(prev => ({ ...prev, estimatedMinutes: h * 60 + estM }));
            }}
          />
          <span className="text-sm text-gray-500 flex-shrink-0">시간</span>
          <input
            type="number"
            min={0}
            max={59}
            step={5}
            className="input-field w-20 text-center text-sm"
            value={estM || ''}
            placeholder="0"
            onChange={e => {
              const m = Math.max(0, Math.min(59, Number(e.target.value) || 0));
              setDraft(prev => ({ ...prev, estimatedMinutes: estH * 60 + m }));
            }}
          />
          <span className="text-sm text-gray-500 flex-shrink-0">분</span>
        </div>
      </div>

      {/* Timer */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <div className="text-center font-mono text-3xl font-bold text-gray-800 mb-3 tracking-widest">
          {formatTime(elapsed)}
        </div>
        <div className="flex gap-2 justify-center">
          {timerState !== 'running' ? (
            <button
              onClick={() => setTimerState('running')}
              className="flex items-center gap-1.5 text-sm font-semibold bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition"
            >
              <Play className="w-4 h-4" />{timerState === 'paused' ? '재개' : '시작'}
            </button>
          ) : (
            <button
              onClick={() => setTimerState('paused')}
              className="flex items-center gap-1.5 text-sm font-semibold bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl transition"
            >
              <Pause className="w-4 h-4" />일시정지
            </button>
          )}
          {timerState !== 'idle' && (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition"
            >
              <Square className="w-4 h-4" />중지
            </button>
          )}
        </div>
        {timerState === 'running' && <p className="text-center text-xs text-green-600 font-medium mt-2">⏱ 공부 중...</p>}
        {timerState === 'paused' && <p className="text-center text-xs text-yellow-600 font-medium mt-2">⏸ 일시정지됨</p>}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} className="flex items-center gap-2 btn-primary text-sm py-2">
          <Save className="w-4 h-4" />
          {saved ? '저장됨!' : '저장'}
        </button>
      </div>
    </div>
  );
}

export default function PersonalStudyTab({ date, currentUser }: Props) {
  const [entries, setEntries] = useState<PersonalStudyEntry[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');

  function reload() {
    setEntries(getPersonalStudyEntriesForDate(date).filter(e => e.userId === currentUser.id));
  }

  useEffect(() => { reload(); }, [date]);
  useEffect(() => {
    setTodos(loadTodos(currentUser.id, date));
  }, [date, currentUser.id]);

  function handleAdd() {
    const entry = emptyEntry(date, currentUser.id);
    upsertPersonalStudyEntry(entry);
    reload();
  }

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
    saveTodosToStorage(currentUser.id, date, updated);
    setNewTodo('');
  }

  function toggleTodo(id: string) {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated);
    saveTodosToStorage(currentUser.id, date, updated);
  }

  function deleteTodo(id: string) {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    saveTodosToStorage(currentUser.id, date, updated);
  }

  const totalSeconds = entries.reduce((sum, e) => sum + (e.studySeconds || 0), 0);

  return (
    <div className="space-y-6">

      {/* 순공 시간 summary */}
      {totalSeconds > 0 && (
        <div className="flex items-center justify-between bg-primary-50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-primary-700">오늘 순공 시간</span>
          </div>
          <span className="text-lg font-bold text-primary-700 font-mono">{formatTime(totalSeconds)}</span>
        </div>
      )}

      {/* 스터디 플래너 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-bold text-gray-800">스터디 플래너</h3>
        </div>

        <div className="space-y-3">
          {entries.map(entry => (
            <SubjectCard
              key={entry.id}
              entry={entry}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}

          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-500 hover:border-primary-400 hover:text-primary-700 rounded-2xl py-5 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium text-sm">과목 추가</span>
          </button>
        </div>
      </div>

      {/* 내일 할 일 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-bold text-gray-800">내일 할 일</h3>
        </div>

        <div className="card space-y-2.5">
          {todos.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">내일 할 일을 추가해 보세요</p>
          )}

          {todos.map(todo => (
            <div key={todo.id} className="flex items-center gap-2.5 group">
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition ${
                  todo.done
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                {todo.done && <span className="text-white text-[10px] font-bold">✓</span>}
              </button>
              <span className={`flex-1 text-sm leading-relaxed ${todo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 transition p-0.5 text-gray-300 hover:text-red-400 flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <input
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              placeholder="할 일 추가..."
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
