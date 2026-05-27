import { useState, useEffect } from 'react';
import type { ClassicalLiteratureEntry, User, Feedback } from '../../types';
import {
  getClassicalEntriesForDate,
  upsertClassicalEntry,
  addFeedbackToClassical,
  deleteClassicalEntry,
  markAttendance,
} from '../../store';
import FeedbackSection from '../common/FeedbackSection';
import { Plus, ChevronDown, ChevronUp, Save, Trash2 } from 'lucide-react';

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
    genre: '',
    literatureType: '',
    speaker: '',
    speakerTarget: '',
    speakerConcern: '',
    speakerSituation: '',
    poeticSituation: '',
    bgTime: '',
    bgSpace: '',
    emotion: '',
    tone1: '',
    tone2: '',
    character1: '',
    character2: '',
    theme: '',
    rhythm: '',
    imagery: '',
    significance: '',
    poeticDevelopment: '',
    expressiveFeatures: '',
    poeticDiction: '',
    phrases: '',
    examAnswer: '',
    feedbacks: [],
  };
}

function normalize(entry: ClassicalLiteratureEntry): ClassicalLiteratureEntry {
  return { ...emptyEntry(entry.date, entry.userId), ...entry };
}

function EntryCard({ entry, currentUser, onSave, onDelete, onAddFeedback }: {
  entry: ClassicalLiteratureEntry;
  currentUser: User;
  onSave: (e: ClassicalLiteratureEntry) => void;
  onDelete: (id: string) => void;
  onAddFeedback: (entryId: string, content: string) => void;
}) {
  const [draft, setDraft] = useState<ClassicalLiteratureEntry>(() => normalize(entry));
  const [expanded, setExpanded] = useState(entry.userId === currentUser.id);
  const [saved, setSaved] = useState(false);
  const isOwner = entry.userId === currentUser.id;

  useEffect(() => { setDraft(normalize(entry)); }, [entry]);

  function handleSave() {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function val(key: keyof ClassicalLiteratureEntry): string {
    return (draft[key] as string) ?? '';
  }

  function fieldInput(label: string, key: keyof ClassicalLiteratureEntry, placeholder = '') {
    if (!isOwner) {
      return (
        <div>
          <span className="label">{label}</span>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 min-h-[44px]">
            {val(key) || <span className="text-gray-400">-</span>}
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
          value={val(key)}
          onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
        />
      </div>
    );
  }

  function textareaField(label: string, key: keyof ClassicalLiteratureEntry, rows = 3) {
    if (!isOwner) {
      return (
        <div>
          <span className="label">{label}</span>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 whitespace-pre-wrap min-h-[80px]">
            {val(key) || <span className="text-gray-400">-</span>}
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
          value={val(key)}
          onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
        />
      </div>
    );
  }

  const typeColor = {
    서정: { badge: 'bg-blue-100 text-blue-700', btn: 'bg-blue-600 text-white', sub: 'text-blue-500' },
    서사: { badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 text-white', sub: 'text-emerald-500' },
  };

  return (
    <div className="card border border-gray-100">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-800">
            {entry.workName || '작품명 미입력'}
          </span>
          {entry.author && <span className="text-xs text-gray-400">/ {entry.author}</span>}
          {entry.literatureType && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[entry.literatureType].badge}`}>
              {entry.literatureType}
            </span>
          )}
          {!isOwner && (
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
              {entry.userId}님
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isOwner && (
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
          {/* ① 기본 정보 */}
          <div>
            <p className="section-title">① 기본 정보</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {fieldInput('작품명', 'workName', '작품명')}
              {fieldInput('작가', 'author', '작가')}
              {fieldInput('기출 연도', 'examYear', '예: 2023')}
            </div>
            {fieldInput('갈래', 'genre', '예: 서정시, 가사, 향가, 시조 등')}
          </div>

          {/* ② 작품 분석 */}
          <div>
            <p className="section-title">② 작품 분석</p>

            {/* 서정/서사 selector */}
            {isOwner ? (
              <div className="flex gap-2 mb-4">
                {(['서정', '서사'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, literatureType: type }))}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                      draft.literatureType === type
                        ? typeColor[type].btn + ' shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            ) : (
              draft.literatureType && (
                <div className="mb-4">
                  <span className={`inline-block px-4 py-1.5 rounded-xl text-sm font-semibold ${typeColor[draft.literatureType].badge}`}>
                    {draft.literatureType}
                  </span>
                </div>
              )
            )}

            {/* 서정 분석 폼 */}
            {draft.literatureType === '서정' && (
              <div className="space-y-5">
                {/* 시적 화자 */}
                <div>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">시적 화자</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {fieldInput('화자 (누구)', 'speaker', '시적 화자')}
                      {fieldInput('대상', 'speakerTarget', '시적 대상')}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {fieldInput('관심사', 'speakerConcern', '화자의 관심사')}
                      {fieldInput('처지', 'speakerSituation', '화자의 처지')}
                    </div>
                    {textareaField('시적 상황', 'poeticSituation', 2)}
                    <div className="grid grid-cols-2 gap-3">
                      {fieldInput('배경 — 시간', 'bgTime', '시간적 배경')}
                      {fieldInput('배경 — 공간', 'bgSpace', '공간적 배경')}
                    </div>
                    {fieldInput('정서', 'emotion', '화자의 정서')}
                    <div className="grid grid-cols-2 gap-3">
                      {fieldInput('어조/태도 ①', 'tone1', '예: 의지적')}
                      {fieldInput('어조/태도 ②', 'tone2', '예: 애상적')}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {fieldInput('성격/분위기 ①', 'character1', '예: 서정적')}
                      {fieldInput('성격/분위기 ②', 'character2', '예: 비유적')}
                    </div>
                    {fieldInput('주제', 'theme', '작품의 주제')}
                    <div className="grid grid-cols-2 gap-3">
                      {fieldInput('운율', 'rhythm', '예: 3·4조, 4음보')}
                      {fieldInput('심상', 'imagery', '예: 시각적, 청각적')}
                    </div>
                    {fieldInput('의의', 'significance', '문학사적 의의')}
                  </div>
                </div>

                {/* 표현 */}
                <div>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">표현</p>
                  <div className="space-y-3">
                    {textareaField('시상 전개', 'poeticDevelopment', 3)}
                    {textareaField('표현상의 특징', 'expressiveFeatures', 3)}
                  </div>
                </div>

                {/* 시의 언어 */}
                <div>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">시의 언어</p>
                  <div className="space-y-3">
                    {textareaField('시어', 'poeticDiction', 2)}
                    {textareaField('구절', 'phrases', 3)}
                  </div>
                </div>
              </div>
            )}

            {/* 서사 placeholder */}
            {draft.literatureType === '서사' && (
              <div className="flex items-center justify-center py-12 bg-gray-50 rounded-2xl">
                <p className="text-gray-400 text-sm">서사 분석 양식은 준비 중입니다.</p>
              </div>
            )}

            {!draft.literatureType && isOwner && (
              <p className="text-sm text-gray-400 text-center py-4">서정 또는 서사를 선택하세요.</p>
            )}
          </div>

          {/* ③ 기출 문제 답안 */}
          <div>
            <p className="section-title">③ 기출 문제 답안</p>
            {textareaField('답안 작성', 'examAnswer', 6)}
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

          {/* ④ 피드백 */}
          <div>
            <p className="section-title">④ 피드백</p>
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

  function handleDelete(id: string) {
    deleteClassicalEntry(id);
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
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">나의 기록</p>
        {myEntry ? (
          <EntryCard
            entry={myEntry}
            currentUser={currentUser}
            onSave={handleSave}
            onDelete={handleDelete}
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
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
