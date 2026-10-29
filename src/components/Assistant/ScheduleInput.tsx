import { useState, useEffect } from 'react';
import type { User } from '../../types';
import type {
  ClassTimetable, WorkSchedule, WorkDaySlot, ScheduleException, LectureSlot,
  AssistantDeadline, StudyConfig, AssistantWeekday, LectureSource,
  DeadlineType, ExceptionType,
} from '../../assistantTypes';
import { ALL_AWEEKDAYS, ASUBJECTS } from '../../assistantTypes';
import {
  loadClassTimetable, saveClassTimetable,
  loadWorkSchedule, saveWorkSchedule,
  subscribeExceptions, saveException, deleteException,
  subscribeLectureSlots, saveLectureSlot, deleteLectureSlot,
  subscribeDeadlines, saveDeadline, deleteDeadline, completeDeadline,
  loadStudyConfig, saveStudyConfig,
  saveStudyBlocks, deleteStudyBlocksForWeek,
} from '../../assistantStore';
import {
  getWeekMonday, addDays,
  generateVacationWeekBlocks, getVacationWeekNum,
  generateSemesterWeekBlocks,
} from '../../assistantAlgo';
import { ChevronDown, ChevronUp, Plus, Trash2, Check, Camera } from 'lucide-react';

interface Props {
  currentUser: User;
  today: string;
}

type Section = 'timetable' | 'work' | 'exception' | 'lecture' | 'deadline' | 'study';

const LECTURE_SOURCES: LectureSource[] = [
  '이환_문학키워드', '이환_문학지식구조', '이환_국교론키워드', '이환_국교론지식구조',
  '박세현_문법', 'THE합격문제', '기타',
];
const DEADLINE_TYPES: DeadlineType[] = ['모의고사', '강의신청', '원서접수', '시험일', '2차일정', '과제제출', '기타'];
const EXCEPTION_TYPES: ExceptionType[] = ['휴강', '대타근무', '공휴일', '근무시간변경', '기타'];

export default function ScheduleInput({ currentUser, today }: Props) {
  const [open, setOpen] = useState<Section | null>(null);

  // --- Timetable ---
  const [timetable, setTimetable] = useState<ClassTimetable | null>(null);
  const [ttSaving, setTtSaving] = useState(false);

  // --- Work ---
  const [work, setWork] = useState<WorkSchedule | null>(null);
  const [workSaving, setWorkSaving] = useState(false);

  // --- Exceptions ---
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [newExDate, setNewExDate] = useState(today);
  const [newExType, setNewExType] = useState<ExceptionType>('휴강');
  const [newExDesc, setNewExDesc] = useState('');

  // --- Lectures ---
  const [lectures, setLectures] = useState<LectureSlot[]>([]);
  const [newLecSource, setNewLecSource] = useState<LectureSource>('이환_문학키워드');
  const [newLecDay, setNewLecDay] = useState<AssistantWeekday>('월');
  const [newLecStart, setNewLecStart] = useState('09:00');
  const [newLecEnd, setNewLecEnd] = useState('11:00');

  // --- Deadlines ---
  const [deadlines, setDeadlines] = useState<AssistantDeadline[]>([]);
  const [newDlTitle, setNewDlTitle] = useState('');
  const [newDlDate, setNewDlDate] = useState(today);
  const [newDlType, setNewDlType] = useState<DeadlineType>('모의고사');
  const [newDlTime, setNewDlTime] = useState('');

  // --- Study config + block gen ---
  const [studyConfig, setStudyConfig] = useState<StudyConfig | null>(null);
  const [blockGenMsg, setBlockGenMsg] = useState('');
  const [blockGenLoading, setBlockGenLoading] = useState(false);

  // --- Photo parsing ---
  const [ttParsing, setTtParsing] = useState(false);
  const [workParsing, setWorkParsing] = useState(false);

  const uid = currentUser.id;

  useEffect(() => {
    loadClassTimetable(uid).then(async t => {
      if (t) {
        setTimetable(t);
      } else {
        const defaultTT = SEED_TIMETABLE(uid);
        await saveClassTimetable(defaultTT);
        setTimetable(defaultTT);
      }
    });
    loadWorkSchedule(uid).then(async w => {
      if (w) {
        setWork(w);
      } else {
        const defaultW = SEED_WORK(uid);
        await saveWorkSchedule(defaultW);
        setWork(defaultW);
      }
    });
    loadStudyConfig(uid).then(async c => {
      if (c) {
        setStudyConfig(c);
      } else {
        const defaultC = SEED_STUDY_CONFIG(uid);
        await saveStudyConfig(defaultC);
        setStudyConfig(defaultC);
      }
    });
    const u1 = subscribeExceptions(uid, setExceptions);
    const u2 = subscribeLectureSlots(uid, setLectures);
    const u3 = subscribeDeadlines(uid, setDeadlines);
    return () => { u1(); u2(); u3(); };
  }, [uid]);

  // ── Timetable helpers ──────────────────────────────────
  function addSubject() {
    if (!timetable) return;
    const id = `sub_${Date.now()}`;
    setTimetable({ ...timetable, subjects: [...timetable.subjects, { id, name: '', times: [] }] });
  }
  function removeSubject(subId: string) {
    if (!timetable) return;
    setTimetable({ ...timetable, subjects: timetable.subjects.filter(s => s.id !== subId) });
  }
  function updateSubjectName(subId: string, name: string) {
    if (!timetable) return;
    setTimetable({ ...timetable, subjects: timetable.subjects.map(s => s.id === subId ? { ...s, name } : s) });
  }
  function addClassTime(subId: string) {
    if (!timetable) return;
    setTimetable({ ...timetable, subjects: timetable.subjects.map(s =>
      s.id === subId ? { ...s, times: [...s.times, { day: '월' as AssistantWeekday, start: '09:00', end: '10:30', location: '' }] } : s
    )});
  }
  function updateClassTime(subId: string, idx: number, field: string, val: string) {
    if (!timetable) return;
    setTimetable({ ...timetable, subjects: timetable.subjects.map(s =>
      s.id === subId ? { ...s, times: s.times.map((t, i) => i === idx ? { ...t, [field]: val } : t) } : s
    )});
  }
  function removeClassTime(subId: string, idx: number) {
    if (!timetable) return;
    setTimetable({ ...timetable, subjects: timetable.subjects.map(s =>
      s.id === subId ? { ...s, times: s.times.filter((_, i) => i !== idx) } : s
    )});
  }
  async function saveTimetable() {
    if (!timetable) return;
    setTtSaving(true);
    await saveClassTimetable({ ...timetable, userId: uid });
    setTtSaving(false);
  }

  // ── Work helpers ───────────────────────────────────────
  function toggleWorkDay(day: AssistantWeekday) {
    if (!work) return;
    const exists = work.slots.some(s => s.day === day);
    if (exists) {
      setWork({ ...work, slots: work.slots.filter(s => s.day !== day) });
    } else {
      const newSlot: WorkDaySlot = { day, start: '09:00', end: '18:00' };
      const slots = [...work.slots, newSlot].sort((a, b) => ALL_AWEEKDAYS.indexOf(a.day) - ALL_AWEEKDAYS.indexOf(b.day));
      setWork({ ...work, slots });
    }
  }
  function updateSlotTime(day: AssistantWeekday, field: 'start' | 'end', val: string) {
    if (!work) return;
    setWork({ ...work, slots: work.slots.map(s => s.day === day ? { ...s, [field]: val } : s) });
  }
  async function saveWork() {
    if (!work) return;
    setWorkSaving(true);
    await saveWorkSchedule({ ...work, userId: uid });
    setWorkSaving(false);
  }

  // ── Exception helpers ──────────────────────────────────
  async function addException() {
    if (!newExDesc.trim()) return;
    const ex: ScheduleException = {
      id: `ex_${uid}_${Date.now()}`,
      userId: uid,
      date: newExDate,
      type: newExType,
      description: newExDesc.trim(),
      createdAt: new Date().toISOString(),
    };
    await saveException(ex);
    setNewExDesc('');
  }

  // ── Lecture helpers ────────────────────────────────────
  async function addLecture() {
    const subject = newLecSource.startsWith('이환_문학') || newLecSource === 'THE합격문제'
      ? '문학' : newLecSource.startsWith('이환_국교론') ? '국교론' : '문법';
    const slot: LectureSlot = {
      id: `lec_${uid}_${Date.now()}`,
      userId: uid,
      source: newLecSource,
      day: newLecDay,
      start: newLecStart,
      end: newLecEnd,
      subject,
      updatedAt: new Date().toISOString(),
    };
    await saveLectureSlot(slot);
  }

  // ── Deadline helpers ───────────────────────────────────
  async function addDeadline() {
    if (!newDlTitle.trim()) return;
    const dl: AssistantDeadline = {
      id: `dl_${uid}_${Date.now()}`,
      userId: uid,
      title: newDlTitle.trim(),
      date: newDlDate,
      time: newDlTime || undefined,
      type: newDlType,
      urgentHoursBefore: 3,
      reminderDaysBefore: [7, 3, 1],
      completed: false,
      createdAt: new Date().toISOString(),
    };
    await saveDeadline(dl);
    setNewDlTitle('');
    setNewDlTime('');
  }

  // ── Study block gen ────────────────────────────────────
  async function genWeekBlocks() {
    if (!studyConfig) { setBlockGenMsg('공부 설정을 먼저 저장하세요.'); return; }
    setBlockGenLoading(true);
    setBlockGenMsg('');
    const weekStart = getWeekMonday(today);
    const weekEnd = addDays(weekStart, 6);
    await deleteStudyBlocksForWeek(uid, weekStart, weekEnd);
    if (studyConfig.mode === '학기') {
      const blocks = generateSemesterWeekBlocks(
        weekStart, { ...studyConfig, userId: uid },
        timetable, work?.slots ?? null,
        work?.commuteMinutes ?? 0, work?.returnMinutes ?? 0,
      );
      await saveStudyBlocks(blocks);
      setBlockGenMsg(`학기 모드 블록 ${blocks.length}개 생성 완료`);
    } else {
      if (!studyConfig.vacationStartDate) {
        setBlockGenMsg('방학 시작일을 먼저 설정하세요.');
        setBlockGenLoading(false);
        return;
      }
      const weekNum = getVacationWeekNum(studyConfig.vacationStartDate, weekStart);
      const blocks = generateVacationWeekBlocks(weekStart, weekNum, { ...studyConfig, userId: uid });
      await saveStudyBlocks(blocks);
      setBlockGenMsg(`${weekNum}주차 블록 ${blocks.length}개 생성 완료`);
    }
    setBlockGenLoading(false);
  }

  function Section({ id, label, children }: { id: Section; label: string; children: React.ReactNode }) {
    const isOpen = open === id;
    return (
      <div className="card overflow-hidden">
        <button
          onClick={() => setOpen(isOpen ? null : id)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-sm font-bold text-gray-800">{label}</span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {isOpen && <div className="px-4 pb-4 space-y-3 border-t border-gray-100">{children}</div>}
      </div>
    );
  }

  const inputCls = 'w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-primary-400';
  const selectCls = 'text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white focus:outline-none';
  const saveBtnCls = 'text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition';

  return (
    <div className="space-y-2">

      {/* 학기 시간표 */}
      <Section id="timetable" label="학기 시간표">
        <div className="space-y-2 mt-2">
          <label className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border-2 border-dashed border-primary-200 text-primary-500 text-[11px] font-semibold cursor-pointer hover:bg-primary-50 transition ${ttParsing ? 'opacity-50 pointer-events-none' : ''}`}>
            <Camera className="w-3.5 h-3.5" />
            {ttParsing ? '인식 중...' : '사진으로 시간표 가져오기'}
            <input type="file" accept="image/*" className="hidden" onChange={async e => {
              const file = e.target.files?.[0];
              if (!file || !timetable) return;
              setTtParsing(true);
              try {
                const base64 = await compressImage(file, 1200);
                const resp = await fetch('/api/parse-schedule', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg', type: 'timetable' }),
                });
                if (!resp.ok) {
                  const e = await resp.json().catch(() => ({}));
                  throw new Error(e.error ?? `서버 오류 ${resp.status}`);
                }
                const data = await resp.json();
                setTimetable({
                  ...timetable,
                  semesterStart: data.semesterStart || timetable.semesterStart,
                  semesterEnd: data.semesterEnd || timetable.semesterEnd,
                  subjects: (data.subjects ?? []).map((s: any, i: number) => ({
                    id: `sub_img_${Date.now()}_${i}`,
                    name: s.name ?? '',
                    times: (s.times ?? []).map((t: any) => ({ day: t.day, start: t.start, end: t.end, location: '' })),
                  })),
                });
              } catch (err: any) {
                alert('시간표 인식 실패: ' + err.message);
              } finally {
                setTtParsing(false);
                e.target.value = '';
              }
            }} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">학기 시작</p>
              <input type="date" value={timetable?.semesterStart ?? ''} onChange={e => timetable && setTimetable({ ...timetable, semesterStart: e.target.value })} className={inputCls} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">학기 종료</p>
              <input type="date" value={timetable?.semesterEnd ?? ''} onChange={e => timetable && setTimetable({ ...timetable, semesterEnd: e.target.value })} className={inputCls} />
            </div>
          </div>
          {timetable?.subjects.map(sub => (
            <div key={sub.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input placeholder="과목명" value={sub.name} onChange={e => updateSubjectName(sub.id, e.target.value)} className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none" />
                <button onClick={() => removeSubject(sub.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {sub.times.map((t, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <select value={t.day} onChange={e => updateClassTime(sub.id, i, 'day', e.target.value)} className={selectCls}>
                    {ALL_AWEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input type="time" value={t.start} onChange={e => updateClassTime(sub.id, i, 'start', e.target.value)} className={`${selectCls} w-20`} />
                  <span className="text-gray-400">~</span>
                  <input type="time" value={t.end} onChange={e => updateClassTime(sub.id, i, 'end', e.target.value)} className={`${selectCls} w-20`} />
                  <input placeholder="강의실" value={t.location ?? ''} onChange={e => updateClassTime(sub.id, i, 'location', e.target.value)} className={`${selectCls} flex-1 min-w-[80px]`} />
                  <button onClick={() => removeClassTime(sub.id, i)} className="text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => addClassTime(sub.id)} className="text-[10px] text-primary-500 font-semibold">+ 시간 추가</button>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={addSubject} className="text-[11px] text-primary-600 font-semibold flex items-center gap-1"><Plus className="w-3 h-3" />과목 추가</button>
            <button onClick={saveTimetable} disabled={ttSaving} className={saveBtnCls}>{ttSaving ? '저장 중...' : '저장'}</button>
          </div>
        </div>
      </Section>

      {/* 출근 일정 */}
      <Section id="work" label="출근 일정">
        <div className="space-y-3 mt-2">
          <label className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border-2 border-dashed border-primary-200 text-primary-500 text-[11px] font-semibold cursor-pointer hover:bg-primary-50 transition ${workParsing ? 'opacity-50 pointer-events-none' : ''}`}>
            <Camera className="w-3.5 h-3.5" />
            {workParsing ? '인식 중...' : '사진으로 출근 일정 가져오기'}
            <input type="file" accept="image/*" className="hidden" onChange={async e => {
              const file = e.target.files?.[0];
              if (!file || !work) return;
              setWorkParsing(true);
              try {
                const base64 = await compressImage(file, 1200);
                const resp = await fetch('/api/parse-schedule', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg', type: 'work' }),
                });
                if (!resp.ok) {
                  const e = await resp.json().catch(() => ({}));
                  throw new Error(e.error ?? `서버 오류 ${resp.status}`);
                }
                const data = await resp.json();
                setWork({
                  ...work,
                  slots: data.slots ?? work.slots,
                  commuteMinutes: data.commuteMinutes ?? work.commuteMinutes,
                  returnMinutes: data.returnMinutes ?? work.returnMinutes,
                });
              } catch (err: any) {
                alert('출근 일정 인식 실패: ' + err.message);
              } finally {
                setWorkParsing(false);
                e.target.value = '';
              }
            }} />
          </label>
          <div>
            <p className="text-[10px] text-gray-400 mb-1.5">근무 요일 (탭하여 추가·제거)</p>
            <div className="flex gap-1.5 flex-wrap">
              {ALL_AWEEKDAYS.map(d => (
                <button key={d} onClick={() => toggleWorkDay(d)}
                  className={`text-[11px] font-bold w-7 h-7 rounded-full transition ${work?.slots.some(s => s.day === d) ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          {work && work.slots.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400">요일별 출퇴근 시각</p>
              {work.slots.map(slot => (
                <div key={slot.day} className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-600 w-5 flex-shrink-0">{slot.day}</span>
                  <input type="time" value={slot.start} onChange={e => updateSlotTime(slot.day, 'start', e.target.value)} className={`${selectCls} flex-1`} />
                  <span className="text-gray-400 text-[10px]">~</span>
                  <input type="time" value={slot.end} onChange={e => updateSlotTime(slot.day, 'end', e.target.value)} className={`${selectCls} flex-1`} />
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">출근 이동(분)</p>
              <input type="number" min={0} value={work?.commuteMinutes ?? 0} onChange={e => work && setWork({ ...work, commuteMinutes: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">퇴근 이동(분)</p>
              <input type="number" min={0} value={work?.returnMinutes ?? 0} onChange={e => work && setWork({ ...work, returnMinutes: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <button onClick={saveWork} disabled={workSaving} className={saveBtnCls}>{workSaving ? '저장 중...' : '저장'}</button>
        </div>
      </Section>

      {/* 예외 일정 */}
      <Section id="exception" label="예외 일정">
        <div className="space-y-2 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={newExDate} onChange={e => setNewExDate(e.target.value)} className={inputCls} />
            <select value={newExType} onChange={e => setNewExType(e.target.value as ExceptionType)} className={inputCls}>
              {EXCEPTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input placeholder="메모 (예: 대체 수업, 연차)" value={newExDesc} onChange={e => setNewExDesc(e.target.value)} className={`${inputCls} flex-1`} />
            <button onClick={addException} className={saveBtnCls}><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <div className="space-y-1">
            {exceptions.map(ex => (
              <div key={ex.id} className="flex items-center justify-between text-xs bg-gray-50 px-3 py-1.5 rounded-xl">
                <span className="text-gray-500">{ex.date}</span>
                <span className="font-medium text-gray-700 flex-1 mx-2 truncate">[{ex.type}] {ex.description}</span>
                <button onClick={() => deleteException(ex.id)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 강의 일정 */}
      <Section id="lecture" label="강의 일정 (인강)">
        <div className="space-y-2 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={newLecSource} onChange={e => setNewLecSource(e.target.value as LectureSource)} className={inputCls}>
              {LECTURE_SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={newLecDay} onChange={e => setNewLecDay(e.target.value as AssistantWeekday)} className={inputCls}>
              {ALL_AWEEKDAYS.map(d => <option key={d} value={d}>{d}요일</option>)}
            </select>
            <input type="time" value={newLecStart} onChange={e => setNewLecStart(e.target.value)} className={inputCls} />
            <input type="time" value={newLecEnd} onChange={e => setNewLecEnd(e.target.value)} className={inputCls} />
          </div>
          <button onClick={addLecture} className={`${saveBtnCls} flex items-center gap-1`}><Plus className="w-3.5 h-3.5" />추가</button>
          <div className="space-y-1">
            {lectures.map(l => (
              <div key={l.id} className="flex items-center justify-between text-xs bg-amber-50 px-3 py-1.5 rounded-xl">
                <span className="font-medium text-amber-800 truncate flex-1">{l.source.replace(/_/g, ' ')}</span>
                <span className="text-amber-600 mx-2 flex-shrink-0">{l.day} {l.start}~{l.end}</span>
                <button onClick={() => deleteLectureSlot(l.id)} className="text-red-400 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 마감·행사 */}
      <Section id="deadline" label="마감·행사 (D-day)">
        <div className="space-y-2 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="제목" value={newDlTitle} onChange={e => setNewDlTitle(e.target.value)} className={inputCls} />
            <select value={newDlType} onChange={e => setNewDlType(e.target.value as DeadlineType)} className={inputCls}>
              {DEADLINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" value={newDlDate} onChange={e => setNewDlDate(e.target.value)} className={inputCls} />
            <input type="time" placeholder="시각 (선택)" value={newDlTime} onChange={e => setNewDlTime(e.target.value)} className={inputCls} />
          </div>
          <button onClick={addDeadline} className={`${saveBtnCls} flex items-center gap-1`}><Plus className="w-3.5 h-3.5" />추가</button>
          <div className="space-y-1">
            {deadlines.map(d => {
              const diff = Math.round((new Date(d.date).getTime() - new Date(today + 'T00:00:00+09:00').getTime()) / 86400000);
              return (
                <div key={d.id} className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-xl ${d.completed ? 'bg-gray-50 opacity-50' : 'bg-red-50'}`}>
                  <span className={`font-medium truncate flex-1 ${d.completed ? 'line-through text-gray-400' : 'text-red-800'}`}>{d.title}</span>
                  <span className={`mx-2 flex-shrink-0 font-bold ${diff < 0 ? 'text-gray-400' : diff <= 2 ? 'text-red-600' : 'text-gray-500'}`}>
                    {diff < 0 ? '종료' : `D-${diff}`}
                  </span>
                  {!d.completed && <button onClick={() => completeDeadline(d.id)} className="text-emerald-500 mr-1"><Check className="w-3.5 h-3.5" /></button>}
                  <button onClick={() => deleteDeadline(d.id)} className="text-red-400 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* 공부 설정 */}
      <Section id="study" label="공부 설정 · 블록 생성">
        {studyConfig && (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">모드</p>
                <select value={studyConfig.mode} onChange={e => setStudyConfig({ ...studyConfig, mode: e.target.value as '방학' | '학기' })} className={inputCls}>
                  <option value="방학">방학</option>
                  <option value="학기">학기</option>
                </select>
              </div>
              {studyConfig.mode === '방학' && (
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">방학 시작일</p>
                  <input type="date" value={studyConfig.vacationStartDate ?? ''} onChange={e => setStudyConfig({ ...studyConfig, vacationStartDate: e.target.value })} className={inputCls} />
                </div>
              )}
              <div>
                <p className="text-[10px] text-gray-400 mb-1">공부 시작</p>
                <input type="time" value={studyConfig.studyStartTime} onChange={e => setStudyConfig({ ...studyConfig, studyStartTime: e.target.value })} className={inputCls} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">공부 종료</p>
                <input type="time" value={studyConfig.studyEndTime} onChange={e => setStudyConfig({ ...studyConfig, studyEndTime: e.target.value })} className={inputCls} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">최소 블록(분)</p>
                <input type="number" min={15} value={studyConfig.minBlockMin} onChange={e => setStudyConfig({ ...studyConfig, minBlockMin: Number(e.target.value) })} className={inputCls} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">기본 블록(분)</p>
                <input type="number" min={30} value={studyConfig.defaultBlockMin} onChange={e => setStudyConfig({ ...studyConfig, defaultBlockMin: Number(e.target.value) })} className={inputCls} />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1.5">과목 비중</p>
              <div className="grid grid-cols-3 gap-2">
                {ASUBJECTS.map(s => (
                  <div key={s}>
                    <p className="text-[10px] text-gray-500 mb-0.5">{s}</p>
                    <input type="number" min={0.5} step={0.5} value={studyConfig.ratios[s]} onChange={e => setStudyConfig({ ...studyConfig, ratios: { ...studyConfig.ratios, [s]: Number(e.target.value) } })} className={inputCls} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => saveStudyConfig({ ...studyConfig, userId: uid })} className={saveBtnCls}>설정 저장</button>
              <button onClick={genWeekBlocks} disabled={blockGenLoading} className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition">
                {blockGenLoading ? '생성 중...' : '이번 주 공부 블록 생성'}
              </button>
            </div>
            {blockGenMsg && <p className="text-xs text-emerald-700 font-medium">{blockGenMsg}</p>}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Seed data (first-time setup) ─────────────────────────────
function SEED_TIMETABLE(userId: string): ClassTimetable {
  const ts = Date.now();
  return {
    userId,
    semesterStart: '2026-09-01',
    semesterEnd: '2027-02-14',
    updatedAt: new Date().toISOString(),
    subjects: [
      { id: `s${ts}1`, name: '이해교육론', times: [
        { day: '월', start: '10:00', end: '11:00', location: '4115' },
        { day: '수', start: '09:00', end: '10:00', location: '4115' },
      ]},
      { id: `s${ts}2`, name: '논리와사고', times: [
        { day: '화', start: '09:00', end: '11:00', location: '대학 본관2105' },
        { day: '목', start: '10:00', end: '11:00', location: '대학 본관2105' },
      ]},
      { id: `s${ts}3`, name: '현대소설론', times: [
        { day: '월', start: '11:00', end: '13:00', location: '사범대학(4118)스마트' },
        { day: '화', start: '13:00', end: '14:00', location: '사범대학(4118)스마트' },
      ]},
      { id: `s${ts}4`, name: '특수교육학개론', times: [
        { day: '목', start: '11:00', end: '13:00', location: '사범대학(5208)브릿지STUDIO5' },
      ]},
      { id: `s${ts}5`, name: '중세국어의이해', times: [
        { day: '화', start: '14:00', end: '16:00', location: '사범대학(5204)스마트' },
        { day: '수', start: '14:00', end: '16:00', location: '사범대학' },
      ]},
      { id: `s${ts}6`, name: '국어의미론', times: [
        { day: '월', start: '15:00', end: '17:00', location: '사범대학(4113)스마트' },
        { day: '화', start: '16:00', end: '17:00', location: '사범대학(4113)스마트' },
      ]},
      { id: `s${ts}7`, name: '교육과정', times: [
        { day: '월', start: '18:00', end: '20:00', location: '사범대학(3208)미래형수업분석실3' },
      ]},
      { id: `s${ts}8`, name: 'AI기반디지털학습환경설계', times: [
        { day: '화', start: '21:00', end: '22:00', location: '미정' },
      ]},
    ],
  };
}

function SEED_WORK(userId: string): WorkSchedule {
  return {
    userId,
    slots: [
      { day: '목', start: '18:00', end: '22:00' },
      { day: '금', start: '14:30', end: '22:00' },
      { day: '토', start: '15:30', end: '20:00' },
      { day: '일', start: '12:30', end: '17:30' },
    ],
    commuteMinutes: 0,
    returnMinutes: 0,
    updatedAt: new Date().toISOString(),
  };
}

function SEED_STUDY_CONFIG(userId: string): import('../../assistantTypes').StudyConfig {
  return {
    userId,
    mode: '학기',
    minBlockMin: 45,
    defaultBlockMin: 90,
    bufferMinutes: 60,
    ratios: { '문법': 3, '문학': 2.5, '국교론': 2.5 },
    studyStartTime: '09:00',
    studyEndTime: '23:30',
    updatedAt: new Date().toISOString(),
  };
}

function compressImage(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}
