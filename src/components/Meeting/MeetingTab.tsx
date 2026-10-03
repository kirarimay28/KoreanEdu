import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronDown, ChevronUp, Trash2, Edit3, FileText, X } from 'lucide-react';
import type { User, MeetingRecord, MeetingRuleChange, MeetingRuleCategory } from '../../types';
import {
  subscribeMeetingRecords,
  getMeetingRecords,
  saveMeetingRecord,
  deleteMeetingRecord,
} from '../../store';

interface Props {
  currentUser: User;
}

const CATEGORIES: { key: MeetingRuleCategory; label: string; color: string; dot: string }[] = [
  { key: 'new',      label: '신규 규정',    color: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  { key: 'modified', label: '수정된 규정',  color: 'bg-amber-50 text-amber-800 border-amber-200',       dot: 'bg-amber-500' },
  { key: 'removed',  label: '삭제된 규정',  color: 'bg-red-50 text-red-800 border-red-200',             dot: 'bg-red-500' },
  { key: 'other',    label: '기타 결정사항', color: 'bg-blue-50 text-blue-800 border-blue-200',          dot: 'bg-blue-500' },
];

function getKSTToday() {
  return new Date(new Date().getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

function isEditor(user: User) {
  return user.role === 'admin' || user.role === 'subadmin' || user.isTreasurer;
}

interface FormState {
  roundNumber: string;
  date: string;
  transcript: string;
  ruleChanges: MeetingRuleChange[];
}

function emptyForm(): FormState {
  return { roundNumber: '', date: getKSTToday(), transcript: '', ruleChanges: [] };
}

function recordToForm(r: MeetingRecord): FormState {
  return {
    roundNumber: String(r.roundNumber),
    date: r.date,
    transcript: r.transcript,
    ruleChanges: r.ruleChanges.map(rc => ({ ...rc })),
  };
}

export default function MeetingTab({ currentUser }: Props) {
  const [records, setRecords] = useState<MeetingRecord[]>(() => getMeetingRecords());
  const [view, setView] = useState<'list' | 'detail' | 'form'>('list');
  const [selected, setSelected] = useState<MeetingRecord | null>(null);
  const [editing, setEditing] = useState<MeetingRecord | null>(null); // null = new
  const [form, setForm] = useState<FormState>(emptyForm);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeMeetingRecords(() => setRecords(getMeetingRecords()));
    return unsub;
  }, []);

  const canEdit = isEditor(currentUser);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setView('form');
  }

  function openEdit(r: MeetingRecord) {
    setEditing(r);
    setForm(recordToForm(r));
    setView('form');
  }

  function openDetail(r: MeetingRecord) {
    setSelected(r);
    setTranscriptOpen(false);
    setView('detail');
  }

  function addRuleChange(cat: MeetingRuleCategory) {
    setForm(f => ({
      ...f,
      ruleChanges: [...f.ruleChanges, { id: crypto.randomUUID(), category: cat, content: '' }],
    }));
  }

  function updateRuleChange(id: string, content: string) {
    setForm(f => ({
      ...f,
      ruleChanges: f.ruleChanges.map(rc => rc.id === id ? { ...rc, content } : rc),
    }));
  }

  function removeRuleChange(id: string) {
    setForm(f => ({ ...f, ruleChanges: f.ruleChanges.filter(rc => rc.id !== id) }));
  }

  function handleSave() {
    const round = parseInt(form.roundNumber, 10);
    if (isNaN(round) || round < 1) { alert('회차 번호를 올바르게 입력해 주세요.'); return; }
    if (!form.date) { alert('날짜를 입력해 주세요.'); return; }

    const now = new Date().toISOString();
    const record: MeetingRecord = {
      id: editing?.id ?? crypto.randomUUID(),
      roundNumber: round,
      date: form.date,
      transcript: form.transcript.trim(),
      ruleChanges: form.ruleChanges.filter(rc => rc.content.trim()),
      createdById: editing?.createdById ?? currentUser.id,
      createdByName: editing?.createdByName ?? currentUser.username,
      createdAt: editing?.createdAt ?? now,
      updatedAt: editing ? now : undefined,
    };
    saveMeetingRecord(record);
    setSelected(record);
    setTranscriptOpen(false);
    setView('detail');
  }

  function handleDelete(id: string) {
    if (!window.confirm('이 회의록을 삭제할까요?')) return;
    deleteMeetingRecord(id);
    setView('list');
  }

  // ── List view ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">전체 회의록</p>
          {canEdit && (
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition"
              style={{ background: 'linear-gradient(135deg,#f890bc,#de4e80)', boxShadow: '0 2px 8px rgba(222,78,128,0.25)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              새 회의록
            </button>
          )}
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 rounded-2xl" style={{ background: 'rgba(255,255,255,0.45)' }}>
            <FileText className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">아직 작성된 회의록이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(r => {
              const newCount = r.ruleChanges.filter(rc => rc.category === 'new').length;
              const modCount = r.ruleChanges.filter(rc => rc.category === 'modified').length;
              const remCount = r.ruleChanges.filter(rc => rc.category === 'removed').length;
              const othCount = r.ruleChanges.filter(rc => rc.category === 'other').length;
              return (
                <button
                  key={r.id}
                  onClick={() => openDetail(r)}
                  className="w-full card text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{r.roundNumber}회차 회의록</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.date)}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {newCount > 0 && <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">신규 {newCount}</span>}
                    {modCount > 0 && <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">수정 {modCount}</span>}
                    {remCount > 0 && <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">삭제 {remCount}</span>}
                    {othCount > 0 && <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">기타 {othCount}</span>}
                    {r.ruleChanges.length === 0 && <span className="text-[10px] text-gray-400">변경사항 없음</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Detail view ───────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    const r = records.find(x => x.id === selected.id) ?? selected;
    return (
      <div className="space-y-4">
        {/* Back */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 transition font-medium px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,163,199,0.20)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            목록으로
          </button>
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(r)}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                수정
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                삭제
              </button>
            </div>
          )}
        </div>

        {/* Header card */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#ffc9e0,#de4e80)' }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-800">{r.roundNumber}회차 회의록</p>
              <p className="text-xs text-gray-400">{formatDate(r.date)} · {r.createdByName} 작성</p>
            </div>
          </div>
        </div>

        {/* Transcript */}
        {r.transcript && (
          <div className="card">
            <button
              onClick={() => setTranscriptOpen(v => !v)}
              className="w-full flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">회의 스크립트</span>
              </div>
              {transcriptOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {transcriptOpen && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">{r.transcript}</pre>
              </div>
            )}
          </div>
        )}

        {/* Rule changes by category */}
        {CATEGORIES.map(cat => {
          const items = r.ruleChanges.filter(rc => rc.category === cat.key);
          return (
            <div key={cat.key} className={`rounded-2xl border p-4 space-y-2 ${cat.color}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
                <p className="text-xs font-bold">{cat.label}</p>
              </div>
              {items.length === 0 ? (
                <p className="text-xs opacity-50 pl-4">해당 없음</p>
              ) : (
                <ul className="space-y-1 pl-4">
                  {items.map(rc => (
                    <li key={rc.id} className="text-xs leading-relaxed before:content-['•'] before:mr-1.5">{rc.content}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <div className="space-y-4">
        {/* Back */}
        <button
          onClick={() => setView(selected ? 'detail' : 'list')}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 transition font-medium px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,163,199,0.20)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          취소
        </button>

        <p className="text-sm font-bold text-gray-800">{editing ? '회의록 수정' : '새 회의록 작성'}</p>

        {/* Basic info */}
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">회차 번호</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={form.roundNumber}
                  onChange={e => setForm(f => ({ ...f, roundNumber: e.target.value }))}
                  placeholder="1"
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <span className="text-sm text-gray-500 font-medium">회차</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">날짜</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="card space-y-2">
          <label className="text-xs font-semibold text-gray-500 block">회의 스크립트 (선택)</label>
          <textarea
            value={form.transcript}
            onChange={e => setForm(f => ({ ...f, transcript: e.target.value }))}
            placeholder="회의 녹음 스크립트를 붙여넣거나 직접 입력하세요..."
            rows={6}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
          />
        </div>

        {/* Rule changes per category */}
        {CATEGORIES.map(cat => {
          const items = form.ruleChanges.filter(rc => rc.category === cat.key);
          return (
            <div key={cat.key} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
                  <p className="text-xs font-bold text-gray-700">{cat.label}</p>
                </div>
                <button
                  onClick={() => addRuleChange(cat.key)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-primary-600 hover:text-primary-800 transition px-2 py-1 bg-primary-50 rounded-lg"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </button>
              </div>
              {items.length === 0 && (
                <p className="text-[11px] text-gray-400 pl-4">항목 없음</p>
              )}
              {items.map(rc => (
                <div key={rc.id} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={rc.content}
                    onChange={e => updateRuleChange(rc.id, e.target.value)}
                    placeholder="내용을 입력하세요"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                  <button
                    onClick={() => removeRuleChange(rc.id)}
                    className="mt-1 text-gray-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-2xl text-sm font-bold text-white transition"
          style={{ background: 'linear-gradient(135deg,#f890bc,#de4e80)', boxShadow: '0 2px 12px rgba(222,78,128,0.25)' }}
        >
          {editing ? '수정 완료' : '회의록 저장'}
        </button>
      </div>
    );
  }

  return null;
}
