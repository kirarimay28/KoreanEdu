import { useState, useEffect, useCallback } from 'react';
import type { User } from '../../types';
import type {
  PlannerProfile, PlannerSubject, PlannerFixedSchedule, PlannerTag,
  SubjectType, Phase, PlannerChecklist,
  PlannerPersonalSettings,
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
      {view === '주간계획'  && <WeekView  profile={profile} />}
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
      {view === '설정' && <SettingsView profile={profile} onUpdate={handleProfileUpdate} />}
    </div>
  );
}
