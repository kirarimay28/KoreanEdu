import { useState, useEffect } from 'react';
import type { PersonalStudyEntry, PersonalSubject, ExamStatus, User } from '../../types';
import {
  getPersonalStudyEntriesForDate,
  upsertPersonalStudyEntry,
  deletePersonalStudyEntry,
} from '../../store';
import { Plus, Trash2, Save, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  date: string;
  currentUser: User;
}

const SUBJECTS: PersonalSubject[] = ['국교론', '현대 문법', '중세 문법', '개론서', '기타'];

const EXAM_STATUS_OPTIONS: { value: ExamStatus; label: string; desc: string; color: string }[] = [
  { value: 'O', label: 'O', desc: '분석 + 문풀 + 모범답안 비교 완료', color: 'bg-green-500 text-white' },
  { value: '△', label: '△', desc: '분석 + 문풀만 완료', color: 'bg-yellow-400 text-white' },
  { value: 'X', label: 'X', desc: '미완료', color: 'bg-red-400 text-white' },
];

function emptyEntry(date: string, userId: string): PersonalStudyEntry {
  return {
    id: crypto.randomUUID(),
    date,
    userId,
    subject: '국교론',
    customSubject: '',
    curriculum: '',
    examStatus: '',
    feedback: '',
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

  useEffect(() => { setDraft(entry); }, [entry]);

  function handleSave() {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const displayName = draft.subject === '기타' ? (draft.customSubject || '기타') : draft.subject;

  return (
    <div className="card border border-gray-100">
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => setExpanded(v => !v)}
        >
          <span className="text-sm font-semibold text-gray-800">{displayName}</span>
          {draft.studyHours !== '' && (
            <span className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              {draft.studyHours}시간
            </span>
          )}
          {draft.examStatus && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              draft.examStatus === 'O' ? 'bg-green-100 text-green-700' :
              draft.examStatus === '△' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              기출 {draft.examStatus}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />}
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="ml-3 p-1.5 text-gray-300 hover:text-red-400 transition rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="mt-5 space-y-4">
          {/* Subject select */}
          <div>
            <label className="label">과목</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(s => (
                <button
                  key={s}
                  onClick={() => setDraft(prev => ({ ...prev, subject: s }))}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                    draft.subject === s
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {draft.subject === '기타' && (
              <input
                className="input-field mt-2"
                placeholder="과목명을 직접 입력하세요"
                value={draft.customSubject}
                onChange={e => setDraft(prev => ({ ...prev, customSubject: e.target.value }))}
              />
            )}
          </div>

          {/* Curriculum */}
          <div>
            <label className="label">공부 커리큘럼</label>
            <textarea
              className="textarea-field"
              rows={3}
              placeholder="오늘 공부한 범위나 계획을 적으세요..."
              value={draft.curriculum}
              onChange={e => setDraft(prev => ({ ...prev, curriculum: e.target.value }))}
            />
          </div>

          {/* Exam status */}
          <div>
            <label className="label">기출 파악 여부</label>
            <div className="flex gap-2">
              {EXAM_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDraft(prev => ({ ...prev, examStatus: opt.value }))}
                  title={opt.desc}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
                    draft.examStatus === opt.value
                      ? `${opt.color} border-transparent shadow-sm`
                      : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              {EXAM_STATUS_OPTIONS.map(opt => (
                <p key={opt.value} className="flex-1 text-center text-xs text-gray-400">{opt.desc}</p>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="label">피드백</label>
            <textarea
              className="textarea-field"
              rows={3}
              placeholder="공부하면서 느낀 점, 보완할 점 등을 적으세요..."
              value={draft.feedback}
              onChange={e => setDraft(prev => ({ ...prev, feedback: e.target.value }))}
            />
          </div>

          {/* Study hours */}
          <div>
            <label className="label">공부한 시간</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                className="input-field w-32"
                placeholder="0"
                value={draft.studyHours}
                onChange={e => setDraft(prev => ({ ...prev, studyHours: e.target.value === '' ? '' : Number(e.target.value) }))}
              />
              <span className="text-sm text-gray-500">시간</span>
            </div>
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
    reload();
  }

  function handleDelete(id: string) {
    deletePersonalStudyEntry(id);
    reload();
  }

  const totalHours = entries.reduce((sum, e) => sum + (Number(e.studyHours) || 0), 0);

  return (
    <div className="space-y-4">
      {entries.length > 0 && (
        <div className="flex items-center justify-between bg-primary-50 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-primary-700">오늘 총 공부 시간</span>
          <span className="text-lg font-bold text-primary-700">{totalHours}시간</span>
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
  );
}
