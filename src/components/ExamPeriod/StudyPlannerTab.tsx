import { useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from '../../types';
import type {
  PlannerProfile, PlannerSubject, PlannerFixedSchedule, PlannerTag,
  SubjectType, Phase, PlannerChecklist,
  PlannerPersonalSettings, Weekday,
  PlanMode, ManualBlock, ManualWeekTemplate, ManualDayOverride,
} from '../../plannerTypes';
import {
  ALL_TAGS,
  generateWeekPlan, generateChecklist, suggestTags,
  getCurrentPhase, PHASE_LABELS, SEMESTER,
  getWeeklyTarget, getWeekMonday, addDays,
  makeSeedProfileA, makeSeedProfileB,
} from '../../plannerAlgo';
import {
  loadPlannerProfile, savePlannerProfile,
  subscribePlannerChecklists, savePlannerChecklist,
  loadManualTemplate, saveManualTemplate,
  saveManualOverride, loadAllManualOverrides,
} from '../../plannerStore';
import {
  BookOpen, Plus, Trash2, X, ChevronDown, ChevronUp,
  Settings, Clock, Calendar, CheckSquare, Users2, AlertTriangle,
  GraduationCap, Edit3, RefreshCw,
} from 'lucide-react';
import { getKSTToday } from '../common/DateNavigator';
import { getUsers } from '../../store';

interface Props { currentUser: User }

type PlannerView = '입력' | '주간계획' | '체크리스트' | '스터디현황' | '설정';

const TYPE_LABEL: Record<SubjectType, string> = { major: '전공', teaching: '교직', elective: '교양' };
const TYPE_COLOR: Record<SubjectType, string> = {
  major: 'bg-primary-100 text-primary-700',
  teaching: 'bg-blue-100 text-blue-700',
  elective: 'bg-green-100 text-green-700',
};
const BLOCK_COLOR: Record<string, string> = {
  class_review: 'bg-primary-50 border-primary-200 text-primary-800',
  memorize:     'bg-amber-50 border-amber-200 text-amber-800',
  transit:      'bg-gray-50 border-gray-200 text-gray-600',
  supplement:   'bg-teal-50 border-teal-200 text-teal-800',
  study:        'bg-white border-gray-200 text-gray-800',
};
const DOW_KR = ['월', '화', '수', '목', '금', '토', '일'];

function fmtHour(min: number): string {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function getToday() { return getKSTToday(); }

// ── Manual planning helpers ──────────────────────────────────
const TIME_SLOTS: string[] = (() => {
  const s: string[] = [];
  for (let m = 6 * 60; m <= 23 * 60 + 30; m += 30) {
    const h = Math.floor(m / 60);
    const mn = m % 60;
    s.push(`${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`);
  }
  return s;
})();

const tm = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

function blocksOverlap(as: string, ae: string, bs: string, be: string): boolean {
  return tm(as) < tm(be) && tm(ae) > tm(bs);
}

// ── BlockEditModal ───────────────────────────────────────────
interface BlockEditModalProps {
  profile: PlannerProfile;
  day: Weekday;
  block?: ManualBlock;
  onSave: (block: ManualBlock, repeat: boolean) => void;
  onDelete?: () => void;
  onClose: () => void;
  autoEditMode?: boolean;
}

function BlockEditModal({
  profile, day, block, onSave, onDelete, onClose, autoEditMode,
}: BlockEditModalProps) {
  const firstSubject = profile.subjects[0];
  const [subjectId, setSubjectId] = useState(block?.subjectId ?? firstSubject?.id ?? 'other');
  const [customName, setCustomName] = useState(
    block?.subjectId === 'other' ? block.subjectName : '',
  );
  const [label, setLabel] = useState(block?.label ?? '');
  const [start, setStart] = useState(block?.start ?? '09:00');
  const [end, setEnd] = useState(block?.end ?? '10:00');
  const [repeat, setRepeat] = useState(false);

  const overlapWarning = useMemo(() => {
    for (const s of profile.subjects) {
      for (const ct of s.classTimes) {
        if (ct.day === day && blocksOverlap(start, end, ct.start, ct.end)) return true;
      }
    }
    for (const fs of profile.fixedSchedules) {
      if (fs.day === day && blocksOverlap(start, end, fs.start, fs.end)) return true;
    }
    return false;
  }, [start, end, day, profile]);

  function handleSave() {
    if (!start || !end || tm(start) >= tm(end)) return;
    const resolvedName = subjectId === 'other'
      ? customName
      : (profile.subjects.find(s => s.id === subjectId)?.name ?? customName);
    const newBlock: ManualBlock = {
      id: block?.id ?? crypto.randomUUID(),
      subjectId,
      subjectName: resolvedName,
      label,
      start,
      end,
      pinned: block?.pinned ?? false,
    };
    onSave(newBlock, repeat);
  }

  const endSlots = TIME_SLOTS.filter(t => tm(t) > tm(start));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl w-full max-w-lg p-5 pb-8 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">{block ? '블록 수정' : '블록 추가'}</p>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Subject */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2">과목</p>
          <div className="flex flex-wrap gap-2">
            {profile.subjects.map(s => (
              <button key={s.id} onClick={() => setSubjectId(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  subjectId === s.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {s.name || '(이름 없음)'}
              </button>
            ))}
            <button onClick={() => setSubjectId('other')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                subjectId === 'other' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-200'
              }`}>
              기타
            </button>
          </div>
          {subjectId === 'other' && (
            <input
              className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
              placeholder="과목/활동 이름"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
            />
          )}
        </div>

        {/* Label */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-1.5">할 일</p>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
            placeholder="예) 1회독, 문제 풀기"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">시작</p>
            <select value={start} onChange={e => setStart(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400">
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">종료</p>
            <select value={end} onChange={e => setEnd(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400">
              {endSlots.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {overlapWarning && (
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-xl px-3 py-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            수업 또는 고정 일정과 겹칩니다. 저장은 됩니다.
          </div>
        )}

        {/* Repeat (hidden in auto+edit mode since overrides are used) */}
        {!autoEditMode && (
          <div className="flex gap-2">
            <button onClick={() => setRepeat(true)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${repeat ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              매주 반복
            </button>
            <button onClick={() => setRepeat(false)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${!repeat ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              이번 주만
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {block && onDelete && (
            <button onClick={onDelete}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 border border-red-200 hover:bg-red-50 transition">
              삭제
            </button>
          )}
          <button onClick={handleSave}
            disabled={!end || !endSlots.length || tm(start) >= tm(end)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white theme-gradient shadow-sm disabled:opacity-40">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ManualWeekView ───────────────────────────────────────────
function ManualWeekView({
  profile, userId, autoEditMode = false,
}: {
  profile: PlannerProfile;
  userId: string;
  autoEditMode?: boolean;
}) {
  const today = getToday();
  const [weekMonday, setWeekMonday] = useState(getWeekMonday(today));
  const [tmpl, setTmpl] = useState<ManualWeekTemplate>(
    () => loadManualTemplate(userId) ?? { userId, template: {}, updatedAt: '' },
  );
  const [overrides, setOverrides] = useState<ManualDayOverride[]>(
    () => loadAllManualOverrides(userId),
  );
  const [editing, setEditing] = useState<{ day: Weekday; date: string; block?: ManualBlock } | null>(null);
  const [showRecommend, setShowRecommend] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showReminder, setShowReminder] = useState(true);

  const phase = getCurrentPhase(today);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i)),
    [weekMonday],
  );

  const autoPlan = useMemo(
    () => generateWeekPlan(profile, weekMonday, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, weekMonday],
  );

  // Stable IDs for auto blocks (used as fallback in auto+edit)
  const autoBlocksMap = useMemo<Map<string, ManualBlock[]>>(() => {
    if (!autoEditMode) return new Map();
    const map = new Map<string, ManualBlock[]>();
    for (const day of autoPlan) {
      map.set(day.date, day.studyBlocks.map((b, i) => ({
        id: `auto_${day.date}_${i}`,
        subjectId: b.subjectId,
        subjectName: b.subjectName,
        label: b.label,
        start: b.start,
        end: b.end,
        pinned: false,
      })));
    }
    return map;
  }, [autoPlan, autoEditMode]);

  function getBlocksForDate(date: string): ManualBlock[] {
    const override = overrides.find(o => o.date === date);
    if (override) return [...override.blocks].sort((a, b) => tm(a.start) - tm(b.start));
    if (autoEditMode) return (autoBlocksMap.get(date) ?? []).slice();
    const dayIdx = weekDates.indexOf(date);
    if (dayIdx < 0) return [];
    const dow = DOW_KR[dayIdx] as Weekday;
    return [...(tmpl.template[dow] ?? [])].sort((a, b) => tm(a.start) - tm(b.start));
  }

  function hasConflict(block: ManualBlock, dow: Weekday): boolean {
    for (const s of profile.subjects) {
      for (const ct of s.classTimes) {
        if (ct.day === dow && blocksOverlap(block.start, block.end, ct.start, ct.end)) return true;
      }
    }
    for (const fs of profile.fixedSchedules) {
      if (fs.day === dow && blocksOverlap(block.start, block.end, fs.start, fs.end)) return true;
    }
    return false;
  }

  function persistOverride(date: string, blocks: ManualBlock[]) {
    const o: ManualDayOverride = { userId, date, blocks, updatedAt: new Date().toISOString() };
    saveManualOverride(o);
    setOverrides(prev => [...prev.filter(x => x.date !== date), o]);
  }

  function persistTemplate(dow: Weekday, blocks: ManualBlock[]) {
    const next: ManualWeekTemplate = {
      ...tmpl,
      template: { ...tmpl.template, [dow]: blocks },
      updatedAt: new Date().toISOString(),
    };
    setTmpl(next);
    saveManualTemplate(next);
  }

  function handleSaveBlock(newBlock: ManualBlock, repeat: boolean, date: string, dayIdx: number) {
    const dow = DOW_KR[dayIdx] as Weekday;
    const existingOverride = overrides.find(o => o.date === date);

    if (autoEditMode || !repeat) {
      // Save as date override
      const base = existingOverride?.blocks ?? (autoEditMode ? (autoBlocksMap.get(date) ?? []) : (tmpl.template[dow] ?? []));
      const idx = base.findIndex(b => b.id === newBlock.id);
      const updated = idx >= 0
        ? base.map(b => b.id === newBlock.id ? { ...newBlock, pinned: true } : b)
        : [...base, { ...newBlock, pinned: autoEditMode }];
      persistOverride(date, updated);
    } else {
      // Repeat → update weekly template
      const tBlocks = tmpl.template[dow] ?? [];
      const idx = tBlocks.findIndex(b => b.id === newBlock.id);
      const updated = idx >= 0
        ? tBlocks.map(b => b.id === newBlock.id ? newBlock : b)
        : [...tBlocks, newBlock];
      persistTemplate(dow, updated);
    }
  }

  function handleDeleteBlock(blockId: string, date: string, dayIdx: number) {
    const dow = DOW_KR[dayIdx] as Weekday;
    const existingOverride = overrides.find(o => o.date === date);

    if (existingOverride) {
      persistOverride(date, existingOverride.blocks.filter(b => b.id !== blockId));
    } else if (autoEditMode) {
      persistOverride(date, (autoBlocksMap.get(date) ?? []).filter(b => b.id !== blockId));
    } else {
      persistTemplate(dow, (tmpl.template[dow] ?? []).filter(b => b.id !== blockId));
    }
  }

  function handleCopyLastWeek() {
    if (!window.confirm('지난주 계획을 이번 주로 복사할까요? 이번 주에 이미 있는 블록은 덮어씁니다.')) return;
    const lastWeekDates = Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i - 7));
    for (let i = 0; i < 7; i++) {
      const lastDate = lastWeekDates[i];
      const thisDate = weekDates[i];
      const dow = DOW_KR[i] as Weekday;
      const lastOverride = overrides.find(o => o.date === lastDate);
      const src = lastOverride?.blocks ?? (autoEditMode ? (autoBlocksMap.get(lastDate) ?? []) : (tmpl.template[dow] ?? []));
      if (src.length > 0) {
        persistOverride(thisDate, src.map(b => ({ ...b, id: crypto.randomUUID(), pinned: false })));
      }
    }
  }

  function handleResetWeek() {
    if (!window.confirm('이번 주 고친 내용이 모두 사라지고 자동 계획으로 돌아갑니다. 계속할까요?')) return;
    for (const date of weekDates) {
      try { localStorage.removeItem(`manual_override_v1_${userId}_${date}`); } catch {}
    }
    setOverrides(prev => prev.filter(o => !weekDates.includes(o.date)));
  }

  // Weekly summary
  const summary = useMemo(() => {
    const totals = new Map<string, { name: string; mins: number; rec: number }>();
    for (let i = 0; i < 7; i++) {
      const date = weekDates[i];
      const dow = DOW_KR[i] as Weekday;
      const override = overrides.find(o => o.date === date);
      const blocks: ManualBlock[] = override?.blocks ?? (
        autoEditMode ? (autoBlocksMap.get(date) ?? []) : (tmpl.template[dow] ?? [])
      );
      for (const b of blocks) {
        const mins = Math.max(0, tm(b.end) - tm(b.start));
        const cur = totals.get(b.subjectId) ?? { name: b.subjectName, mins: 0, rec: 0 };
        totals.set(b.subjectId, { ...cur, mins: cur.mins + mins });
      }
    }
    for (const s of profile.subjects) {
      const rec = getWeeklyTarget(s, phase);
      const cur = totals.get(s.id);
      if (cur) totals.set(s.id, { ...cur, rec });
      else if (rec > 0) totals.set(s.id, { name: s.name, mins: 0, rec });
    }
    return [...totals.values()].filter(x => x.mins > 0 || x.rec > 0);
  }, [weekDates, overrides, tmpl, autoBlocksMap, autoEditMode, profile.subjects, phase]);

  const weekLabel = (() => {
    const d = new Date(weekMonday + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${Math.ceil(d.getDate() / 7)}주차`;
  })();

  return (
    <div className="space-y-3">
      {/* Week nav */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <div className="flex items-center justify-between mb-2.5">
          <button onClick={() => setWeekMonday(addDays(weekMonday, -7))}
            className="text-xs text-gray-400 font-bold px-2 py-1 rounded-lg hover:bg-gray-100">← 이전</button>
          <p className="text-xs font-bold text-gray-700">{weekLabel}</p>
          <button onClick={() => setWeekMonday(addDays(weekMonday, 7))}
            className="text-xs text-gray-400 font-bold px-2 py-1 rounded-lg hover:bg-gray-100">다음 →</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopyLastWeek}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
            지난주 복사
          </button>
          <button onClick={() => setShowRecommend(true)}
            className="text-xs text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition">
            추천 블록 보기
          </button>
          {autoEditMode && (
            <button onClick={handleResetWeek}
              className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition">
              고친 내용 모두 되돌리기
            </button>
          )}
          <button onClick={() => setShowReminder(v => !v)}
            className="text-xs text-gray-400 border border-gray-100 rounded-lg px-2 py-1 hover:bg-gray-50 transition">
            {showReminder ? '수업 안내 끄기' : '수업 안내 켜기'}
          </button>
        </div>
      </div>

      {/* Day cards */}
      {weekDates.map((date, dayIdx) => {
        const dow = DOW_KR[dayIdx] as Weekday;
        const isToday = date === today;
        const isPast = date < today;
        const blocks = getBlocksForDate(date);
        const totalMins = blocks.reduce((s, b) => s + Math.max(0, tm(b.end) - tm(b.start)), 0);

        const classReminders = showReminder
          ? profile.subjects.filter(s =>
              s.classTimes.some(ct => ct.day === dow) && !blocks.some(b => b.subjectId === s.id)
            )
          : [];

        return (
          <div key={date}
            className={`rounded-2xl border shadow-sm overflow-hidden ${isToday ? 'border-primary-300 bg-primary-50/30' : 'border-gray-100 bg-white'} ${isPast ? 'opacity-60' : ''}`}>
            <div className={`flex items-center justify-between px-4 py-3 ${isToday ? 'bg-primary-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                {isToday && <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />}
                <p className={`text-sm font-bold ${isToday ? 'text-primary-700' : 'text-gray-700'}`}>
                  {dow}요일 · {date.slice(5).replace('-', '/')}
                </p>
              </div>
              <p className={`text-xs font-semibold ${isToday ? 'text-primary-600' : 'text-gray-500'}`}>
                {(totalMins / 60).toFixed(1)}시간
              </p>
            </div>

            <div className="divide-y divide-gray-50">
              {blocks.map(block => (
                <button key={block.id}
                  onClick={() => setEditing({ day: dow, date, block })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left">
                  <span className="text-[11px] font-mono text-gray-400 shrink-0 w-20">{block.start}–{block.end}</span>
                  <span className="flex-1 text-xs text-gray-700 min-w-0 truncate">
                    {block.subjectName}{block.label ? ` · ${block.label}` : ''}
                  </span>
                  {hasConflict(block, dow) && <span className="shrink-0 text-sm">⚠️</span>}
                  {block.pinned && <span className="text-[9px] text-primary-400 font-bold shrink-0">고정</span>}
                  <Edit3 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </button>
              ))}
              {blocks.length === 0 && (
                <p className="text-xs text-gray-300 text-center py-2">블록 없음</p>
              )}
            </div>

            {classReminders.map(s => (
              <p key={s.id} className="px-4 py-1.5 text-[11px] text-gray-400 italic border-t border-gray-50">
                오늘 {s.name} 수업 정리 블록이 없어요
              </p>
            ))}

            <div className="px-4 py-2 border-t border-gray-50">
              <button onClick={() => setEditing({ day: dow, date })}
                className="w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 font-bold flex items-center justify-center gap-1.5 hover:border-primary-300 hover:text-primary-500 transition">
                <Plus className="w-3.5 h-3.5" /> 블록 추가
              </button>
            </div>
          </div>
        );
      })}

      {/* Weekly summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button onClick={() => setShowSummary(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-gray-600">
          이번 주 과목별 합계
          {showSummary ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showSummary && (
          <div className="border-t border-gray-50 divide-y divide-gray-50">
            {summary.length === 0 && <p className="text-xs text-gray-300 text-center py-3">블록 없음</p>}
            {summary.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-xs text-gray-700 flex-1 truncate min-w-0">{s.name}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-gray-800">{fmtHour(s.mins)}</span>
                  {s.rec > 0 && <span className="text-[10px] text-gray-400">권장 {fmtHour(s.rec)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BlockEditModal */}
      {editing && (
        <BlockEditModal
          profile={profile}
          day={editing.day}
          block={editing.block}
          autoEditMode={autoEditMode}
          onSave={(block, repeat) => {
            const dayIdx = weekDates.indexOf(editing.date);
            handleSaveBlock(block, repeat, editing.date, dayIdx);
            setEditing(null);
          }}
          onDelete={editing.block ? () => {
            const dayIdx = weekDates.indexOf(editing.date);
            handleDeleteBlock(editing.block!.id, editing.date, dayIdx);
            setEditing(null);
          } : undefined}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Recommend sheet */}
      {showRecommend && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRecommend(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg p-5 pb-8 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">추천 블록 (자동 계획 참고)</p>
              <button onClick={() => setShowRecommend(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-400">원하는 블록만 골라서 내 계획에 추가하세요</p>
            {autoPlan.map(day => (
              <div key={day.date}>
                <p className="text-xs font-bold text-gray-500 mb-1.5">
                  {day.dayOfWeek}요일 {day.date.slice(5).replace('-', '/')}
                </p>
                <div className="space-y-1.5">
                  {day.studyBlocks.length === 0 && (
                    <p className="text-[11px] text-gray-300 px-2">블록 없음</p>
                  )}
                  {day.studyBlocks.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-[11px] font-mono text-gray-400 shrink-0">{b.start}–{b.end}</span>
                      <span className="flex-1 text-xs text-gray-700 min-w-0 truncate">{b.label}</span>
                      <button
                        onClick={() => {
                          const dayIdx = weekDates.indexOf(day.date);
                          const newBlock: ManualBlock = {
                            id: crypto.randomUUID(),
                            subjectId: b.subjectId,
                            subjectName: b.subjectName,
                            label: b.label,
                            start: b.start,
                            end: b.end,
                            pinned: false,
                          };
                          handleSaveBlock(newBlock, false, day.date, dayIdx);
                        }}
                        className="text-xs text-primary-600 font-bold border border-primary-200 rounded-lg px-2 py-1 hover:bg-primary-50 shrink-0">
                        추가
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PlanModeSelector ─────────────────────────────────────────
function PlanModeSelector({
  profile, onUpdate,
}: { profile: PlannerProfile; onUpdate: (p: PlannerProfile) => void }) {
  const mode: PlanMode = profile.planMode ?? 'auto';

  function handleChange(next: PlanMode) {
    if (mode === 'manual' && next === 'auto') {
      if (!window.confirm('직접 짠 계획은 보관되고 자동 계획이 표시돼요. 계속할까요?')) return;
    }
    onUpdate({ ...profile, planMode: next });
  }

  const OPTIONS: { id: PlanMode; label: string; desc: string }[] = [
    { id: 'auto',      label: '자동',       desc: '앱이 계획을 자동 생성' },
    { id: 'manual',    label: '직접',       desc: '빈 주간표에 직접 블록 추가' },
    { id: 'auto+edit', label: '자동 + 수정', desc: '자동 계획을 불러와 수정' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" />계획 방식
      </p>
      <div className="space-y-2">
        {OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => handleChange(opt.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition ${
              mode === opt.id
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}>
            <div>
              <p className={`text-sm font-bold ${mode === opt.id ? 'text-primary-700' : 'text-gray-700'}`}>
                {opt.label}
              </p>
              <p className="text-[11px] text-gray-400">{opt.desc}</p>
            </div>
            {mode === opt.id && (
              <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  SubjectsInput — 과목 입력 탭
// ────────────────────────────────────────────────────────────
function SubjectsInput({
  profile, onUpdate,
}: { profile: PlannerProfile; onUpdate: (p: PlannerProfile) => void }) {
  const [editId, setEditId] = useState<string | null>(null);

  function addSubject() {
    const id = crypto.randomUUID();
    const s: PlannerSubject = {
      id, name: '', type: 'teaching', isCommon: false, classTimes: [],
      noExam: false, isOnline: false, tags: ['특이사항 없음'], notes: '',
    };
    onUpdate({ ...profile, subjects: [...profile.subjects, s] });
    setEditId(id);
  }

  function updateSubject(id: string, patch: Partial<PlannerSubject>) {
    onUpdate({
      ...profile,
      subjects: profile.subjects.map(s => s.id === id ? { ...s, ...patch } : s),
    });
  }

  function removeSubject(id: string) {
    onUpdate({ ...profile, subjects: profile.subjects.filter(s => s.id !== id) });
  }

  function toggleTag(s: PlannerSubject, tag: PlannerTag) {
    let tags = s.tags.includes(tag)
      ? s.tags.filter(t => t !== tag)
      : [...s.tags.filter(t => t !== '특이사항 없음'), tag];
    if (tags.length === 0) tags = ['특이사항 없음'];
    updateSubject(s.id, { tags });
  }

  function addClassTime(s: PlannerSubject) {
    updateSubject(s.id, {
      classTimes: [...s.classTimes, { day: '월', start: '09:00', end: '10:00' }],
    });
  }

  function updateClassTime(s: PlannerSubject, idx: number, patch: Partial<PlannerSubject['classTimes'][0]>) {
    const next = s.classTimes.map((ct, i) => i === idx ? { ...ct, ...patch } : ct);
    updateSubject(s.id, { classTimes: next });
  }

  function removeClassTime(s: PlannerSubject, idx: number) {
    updateSubject(s.id, { classTimes: s.classTimes.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-3">
      {profile.subjects.map(s => {
        const expanded = editId === s.id;
        const autoTags = s.notes ? suggestTags(s.notes) : [];
        return (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => setEditId(expanded ? null : s.id)}
            >
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLOR[s.type]}`}>
                {TYPE_LABEL[s.type]}{s.isCommon ? ' 공통' : ''}
              </span>
              <span className="flex-1 text-sm font-semibold text-gray-800 truncate">
                {s.name || '(과목명 없음)'}
              </span>
              {s.noExam && <span className="text-[10px] text-gray-400">시험없음</span>}
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
            </button>

            {expanded && (
              <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-3">
                {/* Name + type */}
                {!s.isCommon && (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                      placeholder="과목명"
                      value={s.name}
                      onChange={e => updateSubject(s.id, { name: e.target.value })}
                    />
                    <select
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                      value={s.type}
                      onChange={e => updateSubject(s.id, { type: e.target.value as SubjectType })}
                    >
                      <option value="teaching">교직</option>
                      <option value="elective">교양</option>
                    </select>
                  </div>
                )}

                {/* Online / no exam toggles */}
                <div className="flex gap-3">
                  {!s.isCommon && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-600">
                      <input type="checkbox" checked={s.isOnline}
                        onChange={e => updateSubject(s.id, { isOnline: e.target.checked, classTimes: e.target.checked ? [] : s.classTimes })} />
                      수업시간 없음(온라인)
                    </label>
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={s.noExam}
                      onChange={e => updateSubject(s.id, { noExam: e.target.checked })} />
                    시험 없음
                  </label>
                </div>

                {/* Class times */}
                {!s.isOnline && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400">수업 시간</p>
                    {s.classTimes.map((ct, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary-400"
                          value={ct.day}
                          onChange={e => updateClassTime(s, i, { day: e.target.value as typeof ct.day })}
                          disabled={s.isCommon}
                        >
                          {DOW_KR.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input type="time" value={ct.start}
                          onChange={e => updateClassTime(s, i, { start: e.target.value })}
                          disabled={s.isCommon}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary-400" />
                        <span className="text-xs text-gray-300">~</span>
                        <input type="time" value={ct.end}
                          onChange={e => updateClassTime(s, i, { end: e.target.value })}
                          disabled={s.isCommon}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary-400" />
                        {!s.isCommon && (
                          <button onClick={() => removeClassTime(s, i)} className="text-gray-300 hover:text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {!s.isCommon && (
                      <button onClick={() => addClassTime(s)}
                        className="flex items-center gap-1 text-xs text-primary-500 font-bold">
                        <Plus className="w-3 h-3" /> 시간 추가
                      </button>
                    )}
                  </div>
                )}

                {/* Exam date */}
                {!s.noExam && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 mb-1">기말 시험일 (선택)</p>
                    <input type="date" value={s.examDate ?? ''}
                      onChange={e => updateSubject(s.id, { examDate: e.target.value || undefined })}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
                  </div>
                )}

                {/* Tags */}
                <div>
                  <p className="text-[11px] font-bold text-gray-400 mb-1.5">특이사항 태그</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TAGS.map(tag => {
                      const active = s.tags.includes(tag);
                      const suggested = autoTags.includes(tag) && !active;
                      return (
                        <button key={tag}
                          onClick={() => toggleTag(s, tag)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                            active ? 'bg-primary-600 text-white border-primary-600'
                            : suggested ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-white text-gray-500 border-gray-200'
                          }`}>
                          {tag}{suggested ? ' ✦' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <textarea
                    rows={2}
                    placeholder="메모 (키워드 입력하면 태그 자동 추천)"
                    value={s.notes}
                    onChange={e => updateSubject(s.id, { notes: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
                  />
                </div>

                {/* Delete (non-common only) */}
                {!s.isCommon && (
                  <button onClick={() => removeSubject(s.id)}
                    className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                    <Trash2 className="w-3.5 h-3.5" /> 과목 삭제
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button onClick={addSubject}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 font-bold flex items-center justify-center gap-2 hover:border-primary-300 hover:text-primary-500 transition">
        <Plus className="w-4 h-4" /> 개인 과목 추가
      </button>
    </div>
  );
}

// ── SchedulesInput — 고정 일정 탭 ──────────────────────────
function SchedulesInput({
  profile, onUpdate,
}: { profile: PlannerProfile; onUpdate: (p: PlannerProfile) => void }) {
  function add() {
    const id = crypto.randomUUID();
    onUpdate({
      ...profile,
      fixedSchedules: [...profile.fixedSchedules, {
        id, name: '', day: '월', start: '09:00', end: '18:00',
        travelMinutes: 0, duringExam: true,
      }],
    });
  }

  function update(id: string, patch: Partial<PlannerFixedSchedule>) {
    onUpdate({
      ...profile,
      fixedSchedules: profile.fixedSchedules.map(f => f.id === id ? { ...f, ...patch } : f),
    });
  }

  function remove(id: string) {
    onUpdate({ ...profile, fixedSchedules: profile.fixedSchedules.filter(f => f.id !== id) });
  }

  return (
    <div className="space-y-3">
      {profile.fixedSchedules.map(f => (
        <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 font-semibold"
              placeholder="일정 이름 (알바, 스터디 등)"
              value={f.name}
              onChange={e => update(f.id, { name: e.target.value })}
            />
            <button onClick={() => remove(f.id)} className="text-gray-300 hover:text-red-400 shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select value={f.day} onChange={e => update(f.id, { day: e.target.value as typeof f.day })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400">
              {DOW_KR.map(d => <option key={d} value={d}>{d}요일</option>)}
            </select>
            <input type="time" value={f.start} onChange={e => update(f.id, { start: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
            <span className="text-xs text-gray-400">~</span>
            <input type="time" value={f.end} onChange={e => update(f.id, { end: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
          </div>

          <div className="flex items-center gap-4 text-xs flex-wrap">
            <label className="flex items-center gap-1.5 text-gray-600">
              이동시간(편도):
              <select value={f.travelMinutes}
                onChange={e => update(f.id, { travelMinutes: Number(e.target.value) })}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary-400">
                {[0, 10, 20, 30, 45, 60, 90].map(n => (
                  <option key={n} value={n}>{n === 0 ? '없음' : `${n}분`}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-gray-600">
              <input type="checkbox" checked={f.duringExam}
                onChange={e => update(f.id, { duringExam: e.target.checked })} />
              시험기간에도 그대로
            </label>
          </div>
        </div>
      ))}

      <button onClick={add}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 font-bold flex items-center justify-center gap-2 hover:border-primary-300 hover:text-primary-500 transition">
        <Plus className="w-4 h-4" /> 고정 일정 추가
      </button>
    </div>
  );
}

// ── InputView — 입력 탭 3개 ────────────────────────────────
function InputView({
  profile, onUpdate,
}: { profile: PlannerProfile; onUpdate: (p: PlannerProfile) => void }) {
  type Sub = '과목' | '고정 일정';
  const [sub, setSub] = useState<Sub>('과목');

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {(['과목', '고정 일정'] as Sub[]).map(t => (
          <button key={t} onClick={() => setSub(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${sub === t ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>
      {sub === '과목'    && <SubjectsInput profile={profile} onUpdate={onUpdate} />}
      {sub === '고정 일정' && <SchedulesInput profile={profile} onUpdate={onUpdate} />}
    </div>
  );
}

// ── WeekView — 주간 계획 ────────────────────────────────────
function WeekView({ profile }: { profile: PlannerProfile }) {
  const today = getToday();
  const [weekStart, setWeekStart] = useState(getWeekMonday(today));
  const phase = getCurrentPhase(today);
  const plan = generateWeekPlan(profile, weekStart, today);

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  // Sort so today's card is first this week
  const sorted = (() => {
    const todayIdx = plan.findIndex(d => d.date === today);
    if (todayIdx <= 0) return plan;
    return [...plan.slice(todayIdx), ...plan.slice(0, todayIdx)];
  })();

  const totalWeekMin = plan.reduce((s, d) => s + d.totalStudyMinutes, 0);

  // Warning: check if total target > available
  const weeklyTargets = profile.subjects
    .filter(s => !s.noExam)
    .reduce((s, subj) => s + getWeeklyTarget(subj, phase), 0);

  const phaseInfo = PHASE_LABELS[phase];

  return (
    <div className="space-y-3">
      {/* Phase banner */}
      <div className="bg-primary-50 rounded-2xl border border-primary-100 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-primary-700">{phaseInfo.name} · {phaseInfo.range}</p>
            <p className="text-[11px] text-primary-500 mt-0.5">{phaseInfo.goal}</p>
          </div>
          <span className="text-xs text-primary-400 font-semibold">{fmtHour(totalWeekMin)} / 주</span>
        </div>
        {weeklyTargets > totalWeekMin + 60 && (
          <div className="mt-2 flex items-center gap-1.5 text-amber-700 bg-amber-50 rounded-xl px-3 py-1.5 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            목표 {fmtHour(weeklyTargets)} 중 {fmtHour(weeklyTargets - totalWeekMin)} 부족 — 우선순위 낮은 항목부터 축소됩니다
          </div>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between px-1">
        <button onClick={prevWeek} className="text-xs text-gray-400 font-bold px-2 py-1 rounded-lg hover:bg-gray-100">← 이전</button>
        <p className="text-xs font-bold text-gray-600">{weekStart} ~ {addDays(weekStart, 6)}</p>
        <button onClick={nextWeek} className="text-xs text-gray-400 font-bold px-2 py-1 rounded-lg hover:bg-gray-100">다음 →</button>
      </div>

      {/* Day cards */}
      {sorted.map(day => {
        const isToday = day.date === today;
        const isPast = day.date < today;
        const hours = (day.totalStudyMinutes / 60).toFixed(1);
        return (
          <div key={day.date}
            className={`rounded-2xl border shadow-sm overflow-hidden ${isToday ? 'border-primary-300 bg-primary-50/30' : 'border-gray-100 bg-white'} ${isPast ? 'opacity-60' : ''}`}>
            <div className={`flex items-center justify-between px-4 py-3 ${isToday ? 'bg-primary-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                {isToday && <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />}
                <p className={`text-sm font-bold ${isToday ? 'text-primary-700' : 'text-gray-700'}`}>
                  {day.dayOfWeek}요일 · {day.date.slice(5).replace('-', '/')}
                </p>
              </div>
              <p className={`text-xs font-semibold ${isToday ? 'text-primary-600' : 'text-gray-500'}`}>
                {hours}시간
              </p>
            </div>

            {day.studyBlocks.length === 0 ? (
              <p className="text-xs text-gray-300 text-center py-3">공부 블록 없음</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {day.studyBlocks.map((b, i) => (
                  <div key={i}
                    className={`flex items-center gap-3 px-4 py-2.5 border-l-2 ${BLOCK_COLOR[b.blockType] ?? 'bg-white border-gray-200 text-gray-800'}`}>
                    <span className="text-[11px] font-mono text-gray-400 shrink-0 w-20">{b.start}–{b.end}</span>
                    <span className="text-xs text-current flex-1 min-w-0">{b.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── ChecklistView ────────────────────────────────────────────
function ChecklistView({
  profile, userId,
  checklists, onToggle,
}: {
  profile: PlannerProfile;
  userId: string;
  checklists: PlannerChecklist[];
  onToggle: (id: string) => void;
}) {
  const today = getToday();
  const phase = getCurrentPhase(today);
  const items = generateChecklist(profile.subjects);
  const myChecklist = checklists.find(c => c.userId === userId);
  const completedIds = new Set(myChecklist?.completedIds ?? []);

  const phases = ([0, 1, 2, 3] as Phase[]);
  const [open, setOpen] = useState<Phase>(phase < 4 ? phase : 3);

  return (
    <div className="space-y-2">
      {phases.map(ph => {
        const phItems = items.filter(i => i.phase === ph);
        const done = phItems.filter(i => completedIds.has(i.id)).length;
        const isOpen = open === ph;
        const isCurrent = ph === phase;
        return (
          <div key={ph} className={`rounded-2xl border shadow-sm overflow-hidden ${isCurrent ? 'border-primary-200' : 'border-gray-100'}`}>
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 ${isCurrent ? 'bg-primary-50' : 'bg-white'}`}
              onClick={() => setOpen(isOpen ? -1 as Phase : ph)}
            >
              <div className="flex-1 text-left">
                <p className={`text-sm font-bold ${isCurrent ? 'text-primary-700' : 'text-gray-700'}`}>
                  {PHASE_LABELS[ph].name}
                </p>
                <p className="text-[11px] text-gray-400">{PHASE_LABELS[ph].range}</p>
              </div>
              <span className={`text-xs font-semibold ${done === phItems.length ? 'text-green-600' : isCurrent ? 'text-primary-600' : 'text-gray-500'}`}>
                {done}/{phItems.length}
              </span>
              <div className="w-16 bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${isCurrent ? 'theme-gradient' : 'bg-gray-300'}`}
                  style={{ width: `${phItems.length ? (done / phItems.length) * 100 : 0}%` }}
                />
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
            </button>

            {isOpen && (
              <div className="border-t border-gray-50 divide-y divide-gray-50">
                {phItems.map(item => {
                  const checked = completedIds.has(item.id);
                  return (
                    <label key={item.id}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer ${checked ? 'opacity-50' : ''}`}>
                      <input type="checkbox" checked={checked}
                        onChange={() => onToggle(item.id)}
                        className="mt-0.5 rounded shrink-0 accent-current" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLOR[item.subjectId === 'all' ? 'major' : profile.subjects.find(s => s.id === item.subjectId)?.type ?? 'major']}`}>
                            {item.subjectName}
                          </span>
                          {item.isCommon && <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">공통</span>}
                        </div>
                        <p className={`text-sm ${checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.text}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── GroupProgressView — 스터디 현황 ────────────────────────
function GroupProgressView({
  checklists, allProfiles,
}: {
  checklists: PlannerChecklist[];
  allProfiles: PlannerProfile[];
}) {
  const today = getToday();
  const phase = getCurrentPhase(today);

  // Build common checklist items (from any profile that has common subjects)
  const refProfile = allProfiles[0];
  if (!refProfile) {
    return <p className="text-center text-sm text-gray-300 py-8">플래너를 설정한 멤버가 없습니다</p>;
  }
  const allItems = generateChecklist(refProfile.subjects);
  const commonItems = allItems.filter(i => i.isCommon);

  return (
    <div className="space-y-4">
      <div className="bg-primary-50 rounded-2xl border border-primary-100 p-3">
        <p className="text-xs font-bold text-primary-700">전공(공통) 체크리스트 진행률</p>
        <p className="text-[11px] text-primary-500 mt-0.5">개인 교직·교양은 본인에게만 표시됩니다</p>
      </div>

      {checklists.length === 0 && (
        <p className="text-center text-sm text-gray-300 py-6">체크리스트를 저장한 멤버가 없습니다</p>
      )}

      {checklists.map(cl => {
        const done = commonItems.filter(i => cl.completedIds.includes(i.id)).length;
        const pct = commonItems.length ? Math.round(done / commonItems.length * 100) : 0;
        return (
          <div key={cl.userId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-800">{cl.username}</p>
              <p className="text-xs font-semibold text-primary-600">{pct}%</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full theme-gradient transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">{done}/{commonItems.length} 항목 완료</p>

            {/* Per-phase breakdown */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {([0, 1, 2, 3] as Phase[]).map(ph => {
                const phItems = commonItems.filter(i => i.phase === ph);
                const phDone = phItems.filter(i => cl.completedIds.includes(i.id)).length;
                const isCur = ph === phase;
                return (
                  <div key={ph} className={`rounded-xl p-2 text-center ${isCur ? 'bg-primary-50' : 'bg-gray-50'}`}>
                    <p className={`text-[9px] font-bold ${isCur ? 'text-primary-600' : 'text-gray-400'}`}>
                      {PHASE_LABELS[ph].name.slice(0, 4)}
                    </p>
                    <p className={`text-xs font-bold mt-0.5 ${isCur ? 'text-primary-700' : 'text-gray-600'}`}>
                      {phDone}/{phItems.length}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── SettingsView ────────────────────────────────────────────
function SettingsView({
  profile, onUpdate,
}: { profile: PlannerProfile; onUpdate: (p: PlannerProfile) => void }) {
  const s = profile.settings;
  function upd(patch: Partial<PlannerPersonalSettings>) {
    onUpdate({ ...profile, settings: { ...s, ...patch } });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />하루 공부 시간</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '시작', key: 'studyStart' as const, val: s.studyStart },
            { label: '종료', key: 'studyEnd' as const, val: s.studyEnd },
          ].map(f => (
            <div key={f.key}>
              <p className="text-[11px] text-gray-400 mb-1">{f.label}</p>
              <input type="time" value={f.val}
                onChange={e => upd({ [f.key]: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-bold text-gray-600">식사 시간</p>
        {[
          { label: '점심', sKey: 'lunchStart' as const, eKey: 'lunchEnd' as const, sv: s.lunchStart, ev: s.lunchEnd },
          { label: '저녁', sKey: 'dinnerStart' as const, eKey: 'dinnerEnd' as const, sv: s.dinnerStart, ev: s.dinnerEnd },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-8 shrink-0">{f.label}</span>
            <input type="time" value={f.sv}
              onChange={e => upd({ [f.sKey]: e.target.value })}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
            <span className="text-xs text-gray-300">~</span>
            <input type="time" value={f.ev}
              onChange={e => upd({ [f.eKey]: e.target.value })}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <p className="text-xs font-bold text-gray-600">일요일 휴식</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">이후 휴식</span>
          <input type="time" value={s.sundayRestAfter}
            onChange={e => upd({ sundayRestAfter: e.target.value })}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
        </div>
      </div>
    </div>
  );
}

// ── Main StudyPlannerTab ─────────────────────────────────────
export default function StudyPlannerTab({ currentUser }: Props) {
  const [view, setView] = useState<PlannerView>('주간계획');
  const [profile, setProfile] = useState<PlannerProfile>(() => {
    const saved = loadPlannerProfile(currentUser.id);
    if (saved) return saved;
    // First time → seed data for this user
    const seed = makeSeedProfileA(currentUser.id, currentUser.username);
    return seed;
  });

  const [checklists, setChecklists] = useState<PlannerChecklist[]>([]);
  const [allProfiles, setAllProfiles] = useState<PlannerProfile[]>([]);
  const [saving, setSaving] = useState(false);

  // Subscribe to group checklists
  useEffect(() => {
    return subscribePlannerChecklists(setChecklists);
  }, []);

  // Load all known user profiles for group view
  useEffect(() => {
    const users = getUsers();
    const profiles: PlannerProfile[] = [];
    for (const u of users) {
      const p = loadPlannerProfile(u.id);
      if (p) profiles.push(p);
    }
    setAllProfiles(profiles);
  }, [view]);

  const handleProfileUpdate = useCallback((p: PlannerProfile) => {
    setProfile(p);
    savePlannerProfile(p);
  }, []);

  async function handleToggleChecklist(itemId: string) {
    const current = checklists.find(c => c.userId === currentUser.id);
    const ids = current?.completedIds ?? [];
    const next = ids.includes(itemId)
      ? ids.filter(id => id !== itemId)
      : [...ids, itemId];
    const cl: PlannerChecklist = {
      userId: currentUser.id,
      username: currentUser.username,
      completedIds: next,
      updatedAt: new Date().toISOString(),
    };
    setChecklists(prev => {
      const other = prev.filter(c => c.userId !== currentUser.id);
      return [...other, cl];
    });
    await savePlannerChecklist(cl);
  }

  async function handleSeedB() {
    const users = getUsers();
    const otherUser = users.find(u => u.id !== currentUser.id);
    if (!otherUser) return;
    setSaving(true);
    const bp = makeSeedProfileB(otherUser.id, otherUser.username);
    savePlannerProfile(bp);
    setSaving(false);
    alert(`스터디원 B (${otherUser.username}) 시드 데이터가 로컬에 저장됐습니다.`);
  }

  const VIEWS: PlannerView[] = ['주간계획', '체크리스트', '스터디현황', '입력', '설정'];
  const VIEW_ICONS: Record<PlannerView, typeof BookOpen> = {
    '주간계획': Calendar,
    '체크리스트': CheckSquare,
    '스터디현황': Users2,
    '입력': Edit3,
    '설정': Settings,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary-500" />
            <p className="text-sm font-bold text-gray-800">기말고사 스터디 플래너</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { handleSeedB(); }}
              disabled={saving}
              className="text-[10px] text-gray-400 border border-gray-100 rounded-lg px-2 py-1 hover:bg-gray-50 transition flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> 시드B
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          {SEMESTER.finalPrepStart} ~ {SEMESTER.examEnd} ·&nbsp;
          현재: <span className="font-semibold text-primary-600">{PHASE_LABELS[getCurrentPhase(getToday())].name}</span>
        </p>
      </div>

      {/* View navigation */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-0 scrollbar-none">
        {VIEWS.map(v => {
          const Icon = VIEW_ICONS[v];
          return (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 ${view === v ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              <Icon className="w-3.5 h-3.5" />
              {v}
            </button>
          );
        })}
      </div>

      {/* View content */}
      {view === '입력'      && <InputView profile={profile} onUpdate={handleProfileUpdate} />}
      {view === '주간계획' && (profile.planMode === 'manual' || profile.planMode === 'auto+edit'
        ? <ManualWeekView
            profile={profile}
            userId={currentUser.id}
            autoEditMode={profile.planMode === 'auto+edit'}
          />
        : <WeekView profile={profile} />
      )}
      {view === '체크리스트' && (
        <ChecklistView
          profile={profile}
          userId={currentUser.id}
          checklists={checklists}
          onToggle={handleToggleChecklist}
        />
      )}
      {view === '스터디현황' && (
        <GroupProgressView checklists={checklists} allProfiles={allProfiles} />
      )}
      {view === '설정' && (
        <div className="space-y-4">
          <PlanModeSelector profile={profile} onUpdate={handleProfileUpdate} />
          <SettingsView profile={profile} onUpdate={handleProfileUpdate} />
        </div>
      )}
    </div>
  );
}
