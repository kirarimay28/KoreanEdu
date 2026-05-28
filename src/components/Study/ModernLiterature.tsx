import { useState, useEffect } from 'react';
import type { ModernLiteratureEntry, User, Feedback } from '../../types';
import { isPrivileged } from '../../types';
import {
  getModernEntriesForDate,
  upsertModernEntry,
  addFeedbackToModern,
  deleteFeedbackFromModern,
  deleteModernEntry,
  markAttendance,
} from '../../store';
import FeedbackSection from '../common/FeedbackSection';
import { Plus, ChevronDown, ChevronUp, Save, Trash2 } from 'lucide-react';

interface Props {
  date: string;
  currentUser: User;
}

function emptyEntry(date: string, userId: string): ModernLiteratureEntry {
  return {
    id: crypto.randomUUID(),
    date,
    userId,
    workName: '',
    author: '',
    examYear: '',
    answerDraft: '',
    modelAnswerReview: '',
    thoughtProcess: '',
    feedbacks: [],
  };
}

function EntryCard({ entry, currentUser, onSave, onDelete, onAddFeedback, onDeleteFeedback }: {
  entry: ModernLiteratureEntry;
  currentUser: User;
  onSave: (e: ModernLiteratureEntry) => void;
  onDelete: (id: string) => void;
  onAddFeedback: (entryId: string, content: string) => void;
  onDeleteFeedback: (entryId: string, feedbackId: string) => void;
}) {
  const [draft, setDraft] = useState(entry);
  const [expanded, setExpanded] = useState(entry.userId === currentUser.id);
  const [saved, setSaved] = useState(false);
  const isOwner = entry.userId === currentUser.id;
  const canDelete = isOwner || isPrivileged(currentUser);

  useEffect(() => { setDraft(entry); }, [entry]);

  function handleSave() {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function readOnlyOrInput(label: string, key: keyof ModernLiteratureEntry, placeholder = '') {
    if (!isOwner) {
      return (
        <div>
          <span className="label">{label}</span>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">
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

  function readOnlyOrTextarea(label: string, key: keyof ModernLiteratureEntry, rows = 5, placeholder = '') {
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
          placeholder={placeholder}
          value={draft[key] as string}
          onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
        />
      </div>
    );
  }

  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">
            {entry.workName || '작품명 미입력'}
          </span>
          {entry.author && <span className="text-xs text-gray-400">/ {entry.author}</span>}
          {entry.examYear && <span className="text-xs text-gray-400">{entry.examYear}년</span>}
          {!isOwner && (
            <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">
              {entry.userId}님
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canDelete && (
            <button
              onClick={e => { e.stopPropagation(); if (window.confirm('이 기록을 삭제할까요?')) onDelete(entry.id); }}
              className="p-1 text-gray-300 hover:text-red-400 transition rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-5 space-y-5">
          {/* Basic info */}
          <div>
            <p className="section-title">① 기본 정보</p>
            <div className="grid grid-cols-2 gap-3">
              {readOnlyOrInput('작품명', 'workName', '작품명')}
              {readOnlyOrInput('작가', 'author', '작가')}
            </div>
          </div>

          {/* Study process */}
          <div>
            <p className="section-title">② 학습 과정</p>
            <div className="space-y-3">
              {readOnlyOrInput('기출 연도', 'examYear', '예: 2023')}
              {readOnlyOrTextarea('답안 작성', 'answerDraft', 6, '기출 문제에 대한 나의 답안을 작성하세요...')}
              {readOnlyOrTextarea('모범 답안 확인 (강사 답안 / 합격자 답안 / 개론서 등)', 'modelAnswerReview', 5, '모범 답안을 참고하여 비교 분석한 내용을 적으세요...')}
              {readOnlyOrTextarea('사고 과정 (답안의 근거, 의문점, 논의하고 싶은 부분)', 'thoughtProcess', 5, '답안의 근거, 의문점, 스터디원과 논의하고 싶은 부분 등을 자유롭게 적으세요...')}
            </div>
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

          {/* Feedback */}
          <div>
            <p className="section-title">③ 피드백</p>
            <FeedbackSection
              feedbacks={entry.feedbacks}
              currentUser={currentUser}
              entryOwnerId={entry.userId}
              onAddFeedback={(content) => onAddFeedback(entry.id, content)}
              onDeleteFeedback={(feedbackId) => onDeleteFeedback(entry.id, feedbackId)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModernLiterature({ date, currentUser }: Props) {
  const [entries, setEntries] = useState<ModernLiteratureEntry[]>([]);

  function reload() {
    setEntries(getModernEntriesForDate(date));
  }

  useEffect(() => { reload(); }, [date]);

  const myEntry = entries.find(e => e.userId === currentUser.id);
  const othersEntries = entries.filter(e => e.userId !== currentUser.id);

  function handleAddEntry() {
    const newEntry = emptyEntry(date, currentUser.id);
    upsertModernEntry(newEntry);
    reload();
  }

  function handleSave(entry: ModernLiteratureEntry) {
    upsertModernEntry(entry);
    markAttendance(entry.date, currentUser.id, currentUser.username);
    reload();
  }

  function handleDelete(id: string) {
    deleteModernEntry(id);
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
    addFeedbackToModern(entryId, fb);
    reload();
  }

  function handleDeleteFeedback(entryId: string, feedbackId: string) {
    deleteFeedbackFromModern(entryId, feedbackId);
    reload();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">나의 기록</p>
        {myEntry ? (
          <EntryCard
            entry={myEntry}
            currentUser={currentUser}
            onSave={handleSave}
            onDelete={handleDelete}
            onAddFeedback={handleAddFeedback}
            onDeleteFeedback={handleDeleteFeedback}
          />
        ) : (
          <button
            onClick={handleAddEntry}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-500 hover:border-primary-400 hover:text-primary-700 rounded-2xl py-8 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">오늘의 현대 문학 기록 추가</span>
          </button>
        )}
      </div>

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
                onDelete={handleDelete}
                onAddFeedback={handleAddFeedback}
                onDeleteFeedback={handleDeleteFeedback}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
