import { useState, useEffect, useRef } from 'react';
import type { PersonalStudyEntry, User } from '../../types';
import {
  getPersonalStudyEntriesForDate,
  upsertPersonalStudyEntry,
  deletePersonalStudyEntry,
  markAttendance,
} from '../../store';
import { usePdfExport } from '../../hooks/usePdfExport';
import { Plus, Trash2, Save, Play, Pause, Square, ChevronDown, ChevronUp, FileDown } from 'lucide-react';

interface Props {
  date: string;
  currentUser: User;
}

const SUBJECTS = ['국교론', '교육학', '중세문법', '현대문법', '기타'] as const;
const ACTIVITIES = ['회독', '기출풀이', '기출분석', '강의수강', '단권화', '오답정리', '기타'] as const;
const FEEDBACK_CATS = ['집중 부족', '오답 다수 발생', '개념 이해 부족', '키워드 오류'] as const;


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
  };
}

function SubjectCard({ entry, onSave, onDelete }: {
  entry: PersonalStudyEntry;
  onSave: (e: PersonalStudyEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState(entry);
  const [expanded, setExpanded] = useState(true);
  const [saved, setSaved] = useState(false);
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsed, setElapsed] = useState(entry.studySeconds || 0);
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

  const displayName = draft.subject === '기타' ? (draft.customSubject || '기타') : draft.subject;
  const cats: string[] = draft.feedbackCategories || [];

  return (
    <div className="card border border-gray-100">
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 flex-1 text-left min-w-0"
          onClick={() => setExpanded(v => !v)}
        >
          <span className="text-sm font-semibold text-gray-800 truncate">{displayName}</span>
          {elapsed > 0 && (
            <span className="text-xs font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full flex-shrink-0">
              {formatTime(elapsed)}
            </span>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />}
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="ml-3 p-1.5 text-gray-300 hover:text-red-400 transition rounded-lg flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">

          {/* Timer */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="text-center font-mono text-3xl font-bold text-gray-800 mb-3 tracking-widest">
              {formatTime(elapsed)}
            </div>
            <div className="flex gap-2 justify-center">
              {timerState === 'idle' && (
                <button
                  onClick={() => setTimerState('running')}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition"
                >
                  <Play className="w-4 h-4" />시작
                </button>
              )}
              {timerState === 'running' && (
                <>
                  <button
                    onClick={() => setTimerState('paused')}
                    className="flex items-center gap-1.5 text-sm font-semibold bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl transition"
                  >
                    <Pause className="w-4 h-4" />일시정지
                  </button>
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-1.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition"
                  >
                    <Square className="w-4 h-4" />중지
                  </button>
                </>
              )}
              {timerState === 'paused' && (
                <>
                  <button
                    onClick={() => setTimerState('running')}
                    className="flex items-center gap-1.5 text-sm font-semibold bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition"
                  >
                    <Play className="w-4 h-4" />재개
                  </button>
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-1.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition"
                  >
                    <Square className="w-4 h-4" />중지
                  </button>
                </>
              )}
            </div>
            {timerState === 'running' && (
              <p className="text-center text-xs text-green-600 font-medium mt-2">⏱ 공부 중...</p>
            )}
            {timerState === 'paused' && (
              <p className="text-center text-xs text-yellow-600 font-medium mt-2">⏸ 일시정지됨</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="label">과목</label>
            <select
              value={SUBJECTS.includes(draft.subject as typeof SUBJECTS[number]) ? draft.subject : '기타'}
              onChange={e => setDraft(prev => ({ ...prev, subject: e.target.value }))}
              className="input-field"
            >
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
            {draft.subject === '기타' && (
              <input
                className="input-field mt-2"
                placeholder="과목명을 직접 입력하세요"
                value={draft.customSubject}
                onChange={e => setDraft(prev => ({ ...prev, customSubject: e.target.value }))}
              />
            )}
          </div>

          {/* Planner */}
          <div>
            <label className="label">플래너 (공부 방법)</label>
            <select
              value={draft.plannerActivity || ''}
              onChange={e => setDraft(prev => ({ ...prev, plannerActivity: e.target.value }))}
              className="input-field"
            >
              <option value="">선택하세요</option>
              {ACTIVITIES.map(a => <option key={a}>{a}</option>)}
            </select>
            {draft.plannerActivity === '기타' && (
              <input
                className="input-field mt-2"
                placeholder="공부 방법을 직접 입력하세요"
                value={draft.customActivity || ''}
                onChange={e => setDraft(prev => ({ ...prev, customActivity: e.target.value }))}
              />
            )}
          </div>


          {/* Feedback categories */}
          <div>
            <label className="label">자가 피드백 카테고리</label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_CATS.map(cat => {
                const selected = cats.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setDraft(prev => ({
                      ...prev,
                      feedbackCategories: selected
                        ? cats.filter(c => c !== cat)
                        : [...cats, cat],
                    }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      selected
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback text */}
          <div>
            <label className="label">자가 피드백</label>
            <textarea
              className="textarea-field"
              rows={3}
              placeholder="오늘 공부한 내용에서 부족했던 점, 보완해야 할 점을 적으세요..."
              value={draft.feedback}
              onChange={e => setDraft(prev => ({ ...prev, feedback: e.target.value }))}
            />
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} className="flex items-center gap-2 btn-primary text-sm py-2">
              <Save className="w-4 h-4" />
              {saved ? '저장됨!' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PersonalStudyTab({ date, currentUser }: Props) {
  const [entries, setEntries] = useState<PersonalStudyEntry[]>([]);
  const { contentRef, exportToPDF, isExporting } = usePdfExport(`개인공부_${date}.pdf`);

  function reload() {
    setEntries(getPersonalStudyEntriesForDate(date).filter(e => e.userId === currentUser.id));
  }

  useEffect(() => { reload(); }, [date]);

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

  const totalSeconds = entries.reduce((sum, e) => sum + (e.studySeconds || 0), 0);
  const totalHoursLegacy = entries.reduce((sum, e) => sum + (Number(e.studyHours) || 0), 0);
  const hasTimer = entries.some(e => (e.studySeconds || 0) > 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={exportToPDF}
          disabled={isExporting}
          className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs px-3 py-2 rounded-xl transition disabled:opacity-50"
        >
          <FileDown className="w-3.5 h-3.5" />
          {isExporting ? '생성 중...' : 'PDF 저장'}
        </button>
      </div>

      <div ref={contentRef} className="space-y-4">
        {entries.length > 0 && (
          <div className="flex items-center justify-between bg-primary-50 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-primary-700">오늘 순공 시간</span>
            <span className="text-lg font-bold text-primary-700 font-mono">
              {hasTimer ? formatTime(totalSeconds) : `${totalHoursLegacy}시간`}
            </span>
          </div>
        )}

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
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-500 hover:border-primary-400 hover:text-primary-700 rounded-2xl py-6 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">과목 추가</span>
        </button>
      </div>
    </div>
  );
}
