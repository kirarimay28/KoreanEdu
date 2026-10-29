import { useState, useEffect } from 'react';
import type { User } from '../../types';
import type {
  ClassTimetable, WorkSchedule, ScheduleException, LectureSlot,
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
  saveStudyBlocks,
} from '../../assistantStore';
import {
  getWeekMonday,
  generateVacationWeekBlocks, getVacationWeekNum,
} from '../../assistantAlgo';
import { ChevronDown, ChevronUp, Plus, Trash2, Check } from 'lucide-react';

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

  const uid = currentUser.id;

  useEffect(() => {
    loadClassTimetable(uid).then(t => {
      if (t) setTimetable(t);
      else setTimetable({ userId: uid, semesterStart: '', semesterEnd: '', subjects: [], updatedAt: '' });
    });
    loadWorkSchedule(uid).then(w => {
      if (w) setWork(w);
      else setWork({ userId: uid, workDays: [], workStart: '09:00', workEnd: '18:00', commuteMinutes: 0, returnMinutes: 0, updatedAt: '' });
    });
    loadStudyConfig(uid).then(c => setStudyConfig(c));
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
    const days = work.workDays.includes(day) ? work.workDays.filter(d => d !== day) : [...work.workDays, day];
    setWork({ ...work, workDays: days });
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
    if (!studyConfig || !studyConfig.vacationStartDate) {
      setBlockGenMsg('방학 시작일을 먼저 설정하세요.');
      return;
    }
    setBlockGenLoading(true);
    setBlockGenMsg('');
    const weekStart = getWeekMonday(today);
    const weekNum = getVacationWeekNum(studyConfig.vacationStartDate, weekStart);
    const blocks = generateVacationWeekBlocks(weekStart, weekNum, { ...studyConfig, userId: uid });
    await saveStudyBlocks(blocks);
    setBlockGenMsg(`${weekNum}주차 블록 ${blocks.length}개 생성 완료`);
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
          <div>
            <p className="text-[10px] text-gray-400 mb-1.5">근무 요일</p>
            <div className="flex gap-1.5 flex-wrap">
              {ALL_AWEEKDAYS.map(d => (
                <button key={d} onClick={() => toggleWorkDay(d)}
                  className={`text-[11px] font-bold w-7 h-7 rounded-full transition ${work?.workDays.includes(d) ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">출근 시각</p>
              <input type="time" value={work?.workStart ?? '09:00'} onChange={e => work && setWork({ ...work, workStart: e.target.value })} className={inputCls} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">퇴근 시각</p>
              <input type="time" value={work?.workEnd ?? '18:00'} onChange={e => work && setWork({ ...work, workEnd: e.target.value })} className={inputCls} />
            </div>
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
              <div>
                <p className="text-[10px] text-gray-400 mb-1">방학 시작일</p>
                <input type="date" value={studyConfig.vacationStartDate ?? ''} onChange={e => setStudyConfig({ ...studyConfig, vacationStartDate: e.target.value })} className={inputCls} />
              </div>
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
