import { useState, useEffect } from 'react';
import type { ClassicalLiteratureEntry, User, Feedback } from '../../types';
import {
  getClassicalEntriesForDate,
  upsertClassicalEntry,
  addFeedbackToClassical,
  markAttendance,
} from '../../store';
import FeedbackSection from '../common/FeedbackSection';
import { Plus, ChevronDown, ChevronUp, Save } from 'lucide-react';

interface Props {
  date: string;
  currentUser: User;
}

function emptyEntry(date: string, userId: string): ClassicalLiteratureEntry {
  return {
    id: crypto.randomUUID(),
    date,
    userId,
    workName: '',
    author: '',
    examYear: '',
    poeticNarrator: '',
    poeticObject: '',
    genre: '',
    theme: '',
    examAnswer: '',
    feedbacks: [],
  };
}

function EntryCard({ entry, currentUser, onSave, onAddFeedback }: {
  entry: ClassicalLiteratureEntry;
  currentUser: User;
  onSave: (e: ClassicalLiteratureEntry) => void;
  onAddFeedback: (entryId: string, content: string) => void;
}) {
  const [draft, setDraft] = useState(entry);
  const [expanded, setExpanded] = useState(entry.userId === currentUser.id);
  const [saved, setSaved] = useState(false);
  const isOwner = entry.userId === currentUser.id;

  useEffect(() => { setDraft(entry); }, [entry]);

  function handleSave() {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function field(label: string, key: keyof ClassicalLiteratureEntry, placeholder = '') {
    if (!isOwner) {
      return (
        <div>
          <span className="label">{label}</span>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 min-h-[44px]">
            {(draft[key] as string) || <span className="text-gray-400">-</span>}
          </p>
        </div>
      );
    }
    return (
      <div>
        <label className="label">{label}</label>
        <input
          className="input-field"
          placeholder={placeholder}
          value={draft[key] as string}
          onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
        />
      </div>
    );
  }

  function textareaField(label: string, key: keyof ClassicalLiteratureEntry, rows = 4) {
    if (!isOwner) {
      return (
        <div>
          <span className="label">{label}</span>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 whitespace-pre-wrap min-h-[80px]">
            {(draft[key] as string) || <span className="text-gray-400">-</span>}
          </p>
        </div>
      );
    }
    return (
      <div>
        <label className="label">{label}</label>
        <textarea
          className="textarea-field"
          rows={rows}
          value={draft[key] as string}
          onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
        />
      </div>
    );
  }

  return (
    <div className="card border border-gray-100">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">
            {entry.workName || '작품명 미입력'}
          </span>
          {entry.author && <span className="text-xs text-gray-400">/ {entry.author}</span>}
          {!isOwner && (
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
              {entry.userId}님
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="mt-5 space-y-5">
          {/* Section 1 */}
          <div>
            <p className="section-title">① 기본 정보</p>
            <div className="grid grid-cols-3 gap-3">
              {field('작품명', 'workName', '작품명')}
              {field('작가', 'author', '작가')}
              {field('기출 연도', 'examYear', '예: 2023')}
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <p className="section-title">② 작품 분석 & 답안</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {field('시적 화자', 'poeticNarrator', '시적 화자')}
              {field('시적 대상', 'poeticObject', '시적 대상')}
              {field('갈래', 'genre', '예: 서정시, 가사 등')}
              {field('주제', 'theme', '주제')}
            </div>
            {textareaField('기출 문제 답안 작성', 'examAnswer', 6)}
          </div>

          {isOwner && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 btn-primary text-sm py-2"
              >
                <Save className="w-4 h-4" />
                {saved ? '저장됨!' : '저장'}
              </button>
            </div>
          )}

          {/* Section 3: Feedback */}
          <div>
            <p className="section-title">③ 피드백</p>
            <FeedbackSection
              feedbacks={entry.feedbacks}
              currentUser={currentUser}
              entryOwnerId={entry.userId}
              onAddFeedback={(content) => onAddFeedback(entry.id, content)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClassicalLiterature({ date, currentUser }: Props) {
  const [entries, setEntries] = useState<ClassicalLiteratureEntry[]>([]);

  function reload() {
    setEntries(getClassicalEntriesForDate(date));
  }

  useEffect(() => { reload(); }, [date]);

  const myEntry = entries.find(e => e.userId === currentUser.id);
  const othersEntries = entries.filter(e => e.userId !== currentUser.id);

  function handleAddEntry() {
    const newEntry = emptyEntry(date, currentUser.id);
    upsertClassicalEntry(newEntry);
    reload();
  }

  function handleSave(entry: ClassicalLiteratureEntry) {
    upsertClassicalEntry(entry);
    markAttendance(entry.date, currentUser.id, currentUser.username);
    reload();
  }

  function handleAddFeedback(entryId: string, content: string) {
    const fb: Feedback = {
      id: crypto.randomUUID(),
      authorId: currentUser.id,
      authorName: currentUser.username,
      content,
      createdAt: new Date().toISOString(),
    };
    addFeedbackToClassical(entryId, fb);
    reload();
  }

  return (
    <div className="space-y-4">
      {/* My entry */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">나의 기록</p>
        {myEntry ? (
          <EntryCard
            entry={myEntry}
            currentUser={currentUser}
            onSave={handleSave}
            onAddFeedback={handleAddFeedback}
          />
        ) : (
          <button
            onClick={handleAddEntry}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-500 hover:border-primary-400 hover:text-primary-700 rounded-2xl py-8 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">오늘의 고전 문학 기록 추가</span>
          </button>
        )}
      </div>

      {/* Others */}
      {othersEntries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">스터디원 기록</p>
          <div className="space-y-3">
            {othersEntries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                currentUser={currentUser}
                onSave={handleSave}
                onAddFeedback={handleAddFeedback}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
