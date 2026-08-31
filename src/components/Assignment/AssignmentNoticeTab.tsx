import { useState, useEffect } from 'react';
import { Pencil, X, Check, Share2, Settings } from 'lucide-react';
import type { User, AssignmentSubjectConfig } from '../../types';
import {
  getAssignmentNotice, getAssignmentNoticeForWeek, setAssignmentNotice,
  clearAssignmentNotice, subscribeAssignmentNotices,
  getAssignmentNoticeConfig, saveAssignmentNoticeConfig,
} from '../../store';
import { shareAssignmentNotice } from '../../kakao';
import NameWithCrown from '../common/NameWithCrown';

interface Props {
  currentUser: User;
}

const NUMS = Array.from({ length: 100 }, (_, i) => i + 1);
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  return `${m}월 ${d}일 (${DAYS[date.getDay()]})`;
}

function getThisWeekMonday(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const [y, m, d] = kst.toISOString().split('T')[0].split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setDate(d + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Map subject key to notice field key
function subjectWorkValue(
  key: AssignmentSubjectConfig['key'],
  works: Record<string, string>,
): string {
  return works[key] ?? '';
}

function WorkRow({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const isNone = value === '없음';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <button
          onClick={() => onChange(isNone ? '' : '없음')}
          className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
            isNone
              ? 'bg-gray-200 text-gray-600 border-gray-300 font-semibold'
              : 'text-gray-300 border-gray-200 hover:border-gray-300 hover:text-gray-500'
          }`}
        >
          없음
        </button>
      </div>
      <input
        disabled={isNone}
        className={`w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 transition ${isNone ? 'bg-gray-50 text-gray-300' : 'bg-white'}`}
        placeholder={isNone ? '' : placeholder}
        value={isNone ? '' : value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function WorkDisplay({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="text-sm text-primary-700">
      <span className="font-semibold">{label}</span> ·{' '}
      {value === '없음' ? <span className="text-gray-400 font-normal">없음</span> : value}
    </p>
  );
}

// Header color per subject index
const HEADER_COLORS = [
  { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' },
  { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700' },
  { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700' },
  { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700' },
];

export default function AssignmentNoticeTab({ currentUser }: Props) {
  const canEdit = currentUser.role === 'admin' || currentUser.role === 'subadmin';
  const [editing, setEditing] = useState(false);
  const [configMode, setConfigMode] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return subscribeAssignmentNotices(() => setTick(t => t + 1));
  }, []);

  const thisWeekMonday = getThisWeekMonday();
  const [date, setDate] = useState(thisWeekMonday);
  const [works, setWorks] = useState<Record<string, string>>({});
  const [goeoStart, setGoeoStart] = useState(1);
  const [goeoEnd, setGoeoEnd] = useState(20);

  // Config edit state
  const [editSubjects, setEditSubjects] = useState<AssignmentSubjectConfig[]>([]);
  const [editWarning, setEditWarning] = useState('');
  const [editingSubjectKey, setEditingSubjectKey] = useState<string | null>(null);

  const notice = getAssignmentNotice();
  const thisWeekNotice = getAssignmentNoticeForWeek(thisWeekMonday);
  const { subjects, warningText } = getAssignmentNoticeConfig();

  function startEdit(editExisting = false) {
    const src = editExisting ? thisWeekNotice : null;
    if (src) {
      setDate(src.date);
      setWorks({
        classicPoet:  src.classicPoetWork  ?? src.classicWork ?? '',
        classicProse: src.classicProseWork ?? '',
        modernPoet:   src.modernPoetWork   ?? '',
        modernProse:  src.modernProseWork  ?? '',
      });
      setGoeoStart(src.goeoStart);
      setGoeoEnd(src.goeoEnd);
    } else {
      setDate(thisWeekMonday);
      setWorks({});
      setGoeoStart(1);
      setGoeoEnd(20);
    }
    setEditing(true);
  }

  function handleSave() {
    const get = (key: string) => {
      const v = works[key] ?? '';
      return v.trim() === '' ? '' : v;
    };
    setAssignmentNotice({
      date,
      classicPoetWork:  get('classicPoet'),
      classicProseWork: get('classicProse'),
      modernPoetWork:   get('modernPoet'),
      modernProseWork:  get('modernProse'),
      goeoStart,
      goeoEnd,
      createdAt: new Date().toISOString(),
      createdById: currentUser.id,
      createdByName: currentUser.username,
    });
    setEditing(false);
    setTick(t => t + 1);
  }

  function handleClear() {
    if (!window.confirm('과제 공지를 삭제할까요?')) return;
    clearAssignmentNotice(thisWeekNotice?.id);
    setEditing(false);
    setTick(t => t + 1);
  }

  // ── Config mode helpers ─────────────────────────────────

  function openConfigMode() {
    setEditSubjects(subjects.map(s => ({ ...s })));
    setEditWarning(warningText);
    setEditingSubjectKey(null);
    setConfigMode(true);
  }

  function saveConfig() {
    saveAssignmentNoticeConfig(editSubjects, editWarning);
    setConfigMode(false);
    setTick(t => t + 1);
  }

  function updateSubjectField(key: string, field: 'label' | 'methodText', value: string) {
    setEditSubjects(ss => ss.map(s => s.key === key ? { ...s, [field]: value } : s));
  }

  // ── Config Mode UI ───────────────────────────────────────

  if (configMode && canEdit) {
    const editing_subj = editSubjects.find(s => s.key === editingSubjectKey);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">과제 설정 편집</p>
          <div className="flex gap-2">
            <button onClick={() => setConfigMode(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">취소</button>
            <button onClick={saveConfig} className="text-xs px-3 py-1.5 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600">저장</button>
          </div>
        </div>

        {/* Subject list */}
        <div className="card space-y-3">
          <p className="text-xs font-semibold text-gray-600">과목</p>
          {editSubjects.map((subj, idx) => {
            const hc = HEADER_COLORS[idx % HEADER_COLORS.length];
            const isOpen = editingSubjectKey === subj.key;
            return (
              <div key={subj.key} className={`rounded-xl border overflow-hidden ${hc.border}`}>
                <button
                  className={`w-full flex items-center justify-between px-3 py-2 ${hc.bg}`}
                  onClick={() => setEditingSubjectKey(isOpen ? null : subj.key)}
                >
                  <span className={`text-xs font-bold ${hc.text}`}>{subj.label}</span>
                  <Pencil className={`w-3 h-3 ${hc.text} opacity-60`} />
                </button>

                {isOpen && editing_subj && (
                  <div className="p-3 space-y-3 bg-white">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500">과목명</label>
                      <input
                        className="mt-0.5 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
                        value={editing_subj.label}
                        onChange={e => updateSubjectField(subj.key, 'label', e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500">학습 방법 설명</label>
                      <textarea
                        rows={10}
                        className="mt-0.5 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400 font-mono leading-relaxed resize-none"
                        value={editing_subj.methodText}
                        onChange={e => updateSubjectField(subj.key, 'methodText', e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => setEditingSubjectKey(null)}
                      className="w-full text-xs py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold"
                    >
                      <Check className="w-3 h-3 inline mr-1" />닫기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Warning text */}
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-gray-600">경고 문구</p>
          <textarea
            rows={2}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400 resize-none"
            value={editWarning}
            onChange={e => setEditWarning(e.target.value)}
            placeholder="경고 문구"
          />
        </div>
      </div>
    );
  }

  // ── Normal / Edit Mode UI ────────────────────────────────

  return (
    <div key={tick} className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">이번 주 과제</h2>
        {canEdit && !editing && (
          <div className="flex gap-2">
            <button
              onClick={openConfigMode}
              className="flex items-center gap-1 text-xs text-gray-400 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <Settings className="w-3.5 h-3.5" /> 설정
            </button>
            {thisWeekNotice && (
              <button
                onClick={() => startEdit(true)}
                className="flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition"
              >
                <Pencil className="w-3 h-3" />수정
              </button>
            )}
            {!thisWeekNotice && (
              <button
                onClick={() => startEdit(false)}
                className="flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition"
              >
                <Pencil className="w-3 h-3" />이번 주 입력
              </button>
            )}
          </div>
        )}
      </div>

      {editing && canEdit ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            />
          </div>

          {/* Works — use dynamic subject labels */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              작품 <span className="font-normal text-gray-400">(과제 없으면 '없음' 선택)</span>
            </label>
            {subjects.map(subj => (
              <WorkRow
                key={subj.key}
                label={subj.label}
                value={works[subj.key] ?? ''}
                onChange={v => setWorks(w => ({ ...w, [subj.key]: v }))}
                placeholder={`${subj.label} 작품명 입력`}
              />
            ))}
          </div>

          {/* Goeo range */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">고어 번호</label>
            <div className="flex items-center gap-2">
              <select
                value={goeoStart}
                onChange={e => setGoeoStart(Number(e.target.value))}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                {NUMS.map(n => <option key={n} value={n}>{n}번</option>)}
              </select>
              <span className="text-xs text-gray-400 flex-shrink-0">~</span>
              <select
                value={goeoEnd}
                onChange={e => setGoeoEnd(Number(e.target.value))}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                {NUMS.map(n => <option key={n} value={n}>{n}번</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            {notice && (
              <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition flex items-center gap-1">
                <X className="w-3 h-3" />삭제
              </button>
            )}
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
              취소
            </button>
            <button
              onClick={handleSave}
              className="text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1"
            >
              <Check className="w-3 h-3" />등록
            </button>
          </div>
        </div>
      ) : notice ? (
        <div className="space-y-3">
          {!thisWeekNotice && canEdit && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center justify-between">
              <p className="text-xs text-amber-700">이번 주 과제가 아직 등록되지 않았습니다.</p>
              <button
                onClick={() => startEdit(false)}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline ml-2 flex-shrink-0"
              >
                이번 주 입력
              </button>
            </div>
          )}

          {/* Date + works summary */}
          <div className="bg-primary-50 border border-primary-100 rounded-2xl px-4 py-3">
            <p className="text-sm font-bold text-primary-800 mb-2">{formatDate(notice.date)}</p>
            <div className="space-y-1">
              {subjects.map(subj => {
                const val = subjectWorkValue(subj.key, {
                  classicPoet:  notice.classicPoetWork  ?? notice.classicWork ?? '',
                  classicProse: notice.classicProseWork ?? '',
                  modernPoet:   notice.modernPoetWork   ?? '',
                  modernProse:  notice.modernProseWork  ?? '',
                });
                return <WorkDisplay key={subj.key} label={subj.label} value={val} />;
              })}
            </div>
            <p className="text-[10px] text-primary-400 mt-2"><NameWithCrown name={notice.createdByName} /> 등록</p>
          </div>

          {/* Per-subject method texts */}
          {subjects.map((subj, idx) => {
            const hc = HEADER_COLORS[idx % HEADER_COLORS.length];
            return (
              <div key={subj.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className={`${hc.bg} border-b ${hc.border} px-4 py-2`}>
                  <p className={`text-xs font-bold ${hc.text}`}>[{subj.label}]</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{subj.methodText}</p>
                </div>
              </div>
            );
          })}

          {/* Warning */}
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-red-600">{warningText}</p>
            <p className="text-xs font-semibold text-red-600">★ 이번 주 고전 어휘는 {notice.goeoStart}번부터 {notice.goeoEnd}번까지입니다.</p>
          </div>

          {/* Share button */}
          <button
            onClick={() => shareAssignmentNotice({
              date: notice.date,
              classicPoetWork:  notice.classicPoetWork ?? '',
              classicProseWork: notice.classicProseWork ?? '',
              classicWork:      notice.classicWork,
              modernPoetWork:   notice.modernPoetWork,
              modernProseWork:  notice.modernProseWork,
              goeoStart: notice.goeoStart,
              goeoEnd:   notice.goeoEnd,
            })}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-2 rounded-xl transition"
          >
            <Share2 className="w-3.5 h-3.5" />카카오톡 공유
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-8 text-center">
          <p className="text-sm text-gray-400 italic">등록된 과제가 없습니다.</p>
          {canEdit && (
            <button
              onClick={() => startEdit(false)}
              className="mt-3 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-xl transition"
            >
              과제 입력하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
