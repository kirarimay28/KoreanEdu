import { useState, useEffect } from 'react';
import type { User, ExamPeriod, ExamStudySchedule, ExamDayPlan, Weekday } from '../../types';
import { isPrivileged } from '../../types';
import {
  subscribeExamPeriodData, getExamPeriod, setExamPeriod, clearExamPeriod,
  getExamStudySchedules, saveExamStudySchedule,
} from '../../store';
import { CalendarDays, Trash2, Check, Users, Clock } from 'lucide-react';
import { getKSTToday } from '../common/DateNavigator';

interface Props { currentUser: User; }

const DAYS: Weekday[] = ['월', '화', '수', '목', '금', '토', '일'];

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, Math.round(diff / 60 * 10) / 10);
}

function isActive(period: ExamPeriod | null): boolean {
  if (!period) return false;
  const today = getKSTToday();
  return today >= period.startDate && today <= period.endDate;
}

/* ── 방장: 기간 설정 ── */
function AdminPeriodForm({ onSave }: { onSave: (start: string, end: string) => void }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  function handleSave() {
    if (!start || !end) { setError('시작일과 마감일을 모두 입력해 주세요.'); return; }
    if (end < start) { setError('마감일이 시작일보다 빠를 수 없습니다.'); return; }
    onSave(start, end);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <p className="text-xs font-bold text-gray-600">시험기간 설정</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[11px] text-gray-400 font-bold mb-1 block">시작일</label>
          <input
            type="date" value={start} onChange={e => setStart(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-[11px] text-gray-400 font-bold mb-1 block">마감일</label>
          <input
            type="date" value={end} onChange={e => setEnd(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition"
        style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
      >
        시험기간 설정
      </button>
    </div>
  );
}

/* ── 방장: 멤버 일정 표 ── */
function AdminScheduleView({ schedules }: { schedules: ExamStudySchedule[] }) {
  if (schedules.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-gray-300 font-semibold">아직 제출된 계획이 없습니다</p>
      </div>
    );
  }

  const totalByMember = (days: ExamDayPlan[]) =>
    days.filter(d => d.willCome).reduce((sum, d) => sum + calcHours(d.startTime, d.endTime), 0);

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> 제출된 계획 ({schedules.length}명)
      </p>
      {schedules.map(s => (
        <div key={s.userId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800">{s.username}</p>
            <span className="text-xs text-primary-600 font-bold">
              총 {totalByMember(s.days)}h
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map(day => {
              const plan = s.days.find(d => d.day === day);
              const come = plan?.willCome;
              return (
                <div key={day} className={`rounded-lg p-1.5 text-center ${come ? 'bg-primary-50' : 'bg-gray-50'}`}>
                  <p className={`text-[10px] font-bold ${come ? 'text-primary-600' : 'text-gray-300'}`}>{day}</p>
                  {come && plan ? (
                    <p className="text-[8px] text-primary-500 mt-0.5 leading-tight">
                      {plan.startTime}<br />~{plan.endTime}
                    </p>
                  ) : (
                    <p className="text-[8px] text-gray-200 mt-0.5">—</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 멤버: 일정 입력 ── */
function MemberScheduleForm({
  currentUser,
  existing,
  onSave,
}: {
  currentUser: User;
  existing: ExamStudySchedule | null;
  onSave: () => void;
}) {
  const [days, setDays] = useState<ExamDayPlan[]>(() =>
    DAYS.map(day => {
      const found = existing?.days.find(d => d.day === day);
      return found ?? { day, willCome: false, startTime: '09:00', endTime: '18:00' };
    })
  );
  const [saved, setSaved] = useState(false);

  function toggleCome(i: number) {
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, willCome: !d.willCome } : d));
    setSaved(false);
  }
  function updateTime(i: number, field: 'startTime' | 'endTime', val: string) {
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
    setSaved(false);
  }

  function handleSave() {
    saveExamStudySchedule({
      userId: currentUser.id,
      username: currentUser.username,
      days,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    onSave();
  }

  const totalHours = days.filter(d => d.willCome).reduce((sum, d) => sum + calcHours(d.startTime, d.endTime), 0);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-600">요일별 공부 계획</p>
          <span className="text-xs text-primary-600 font-bold">총 {totalHours}시간</span>
        </div>
        {days.map((d, i) => (
          <div key={d.day} className={`rounded-xl border transition ${d.willCome ? 'border-primary-200 bg-primary-50/30' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <button
                onClick={() => toggleCome(i)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition shrink-0 ${d.willCome ? 'text-white' : 'text-gray-400 bg-white border border-gray-200'}`}
                style={d.willCome ? { background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' } : {}}
              >
                {d.day}
              </button>
              {d.willCome ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  <input
                    type="time" value={d.startTime}
                    onChange={e => updateTime(i, 'startTime', e.target.value)}
                    className="flex-1 min-w-0 border border-primary-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-primary-400 bg-white"
                  />
                  <span className="text-xs text-gray-400 shrink-0">~</span>
                  <input
                    type="time" value={d.endTime}
                    onChange={e => updateTime(i, 'endTime', e.target.value)}
                    className="flex-1 min-w-0 border border-primary-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-primary-400 bg-white"
                  />
                  <span className="text-xs text-primary-500 font-bold shrink-0">
                    {calcHours(d.startTime, d.endTime)}h
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-300">탭하면 공부 시간 입력</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
      >
        {saved ? <><Check className="w-4 h-4" /> 저장 완료</> : '계획 저장'}
      </button>
    </div>
  );
}

/* ── 메인 ── */
export default function ExamPeriodTab({ currentUser }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeExamPeriodData(() => setTick(t => t + 1));
    return unsub;
  }, []);

  const isAdmin = isPrivileged(currentUser);
  const period = getExamPeriod();
  const schedules = getExamStudySchedules();
  const mySchedule = schedules.find(s => s.userId === currentUser.id) ?? null;
  const active = isActive(period);

  function handleSetPeriod(start: string, end: string) {
    setExamPeriod({
      startDate: start,
      endDate: end,
      createdById: currentUser.id,
      createdByName: currentUser.username,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      {/* 현재 시험기간 상태 */}
      {period ? (
        <div className={`rounded-2xl p-4 ${active ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className={`w-4 h-4 ${active ? 'text-amber-500' : 'text-gray-400'}`} />
              <div>
                <p className={`text-sm font-bold ${active ? 'text-amber-700' : 'text-gray-600'}`}>
                  {active ? '시험기간 진행 중' : '설정된 시험기간'}
                </p>
                <p className={`text-xs mt-0.5 ${active ? 'text-amber-600' : 'text-gray-400'}`}>
                  {period.startDate} ~ {period.endDate}
                </p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => { if (confirm('시험기간을 삭제하시겠습니까?')) clearExamPeriod(); }}
                className="text-xs text-red-400 border border-red-100 rounded-lg px-2.5 py-1 hover:bg-red-50 transition flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> 삭제
              </button>
            )}
          </div>
          {active && (
            <div className="mt-3 pt-3 border-t border-amber-100">
              <p className="text-xs text-amber-600">
                🎓 시험기간 중 <strong>스터디 일지 · 과제 · 체크리스트 · 고어 시험</strong>은 의무 정지됩니다.
              </p>
            </div>
          )}
        </div>
      ) : (
        isAdmin ? null : (
          <div className="text-center py-10">
            <p className="text-sm text-gray-300 font-semibold">설정된 시험기간이 없습니다</p>
          </div>
        )
      )}

      {/* 방장: 기간 설정 폼 (시험기간 없을 때) */}
      {isAdmin && !period && <AdminPeriodForm onSave={handleSetPeriod} />}

      {/* 공부 계획 섹션 (시험기간 있을 때) */}
      {period && (
        <>
          <MemberScheduleForm
            currentUser={currentUser}
            existing={mySchedule}
            onSave={() => setTick(t => t + 1)}
          />
          {isAdmin && <AdminScheduleView schedules={schedules} />}
        </>
      )}
    </div>
  );
}
