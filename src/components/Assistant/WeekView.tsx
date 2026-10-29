import { useState, useEffect } from 'react';
import type { User } from '../../types';
import type { StudyBlock, WeeklyCheckResult } from '../../assistantTypes';
import { WEEKLY_CHECKS } from '../../assistantTypes';
import {
  loadClassTimetable, loadWorkSchedule,
  subscribeLectureSlots, subscribeStudyBlocks,
  loadWeeklyCheck, saveWeeklyCheck,
} from '../../assistantStore';
import { getDayOfWeek, getWeekMonday, addDays } from '../../assistantAlgo';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface Props {
  currentUser: User;
  today: string;
}

interface DaySummary {
  date: string;
  dow: string;
  classCount: number;
  hasWork: boolean;
  lectureCount: number;
  studyBlocks: StudyBlock[];
}

export default function WeekView({ currentUser, today }: Props) {
  const [weekStart, setWeekStart] = useState(() => getWeekMonday(today));
  const [days, setDays] = useState<DaySummary[]>([]);
  const [weeklyCheck, setWeeklyCheck] = useState<WeeklyCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  const weekEnd = addDays(weekStart, 6);
  const DOWS = ['월', '화', '수', '목', '금', '토', '일'];

  useEffect(() => {
    let unsubs: Array<() => void> = [];
    setLoading(true);

    async function init() {
      const [timetable, work, wCheck] = await Promise.all([
        loadClassTimetable(currentUser.id),
        loadWorkSchedule(currentUser.id),
        loadWeeklyCheck(currentUser.id, weekStart),
      ]);
      setWeeklyCheck(wCheck);

      const baseDays: DaySummary[] = DOWS.map((_, i) => {
        const date = addDays(weekStart, i);
        const dow = getDayOfWeek(date);
        const classCount = timetable
          ? timetable.subjects.reduce((n, s) => n + s.times.filter(t => t.day === dow).length, 0)
          : 0;
        const hasWork = work ? work.workDays.includes(dow) : false;
        return { date, dow, classCount, hasWork, lectureCount: 0, studyBlocks: [] };
      });

      const unsubLec = subscribeLectureSlots(currentUser.id, (slots) => {
        setDays(prev => prev.map((d) => {
          const dow = getDayOfWeek(d.date);
          return { ...d, lectureCount: slots.filter(s => s.day === dow).length };
        }));
      });
      unsubs.push(unsubLec);

      const unsubBlocks = subscribeStudyBlocks(currentUser.id, weekStart, weekEnd, (bl) => {
        setDays(prev => prev.map(d => ({
          ...d,
          studyBlocks: bl.filter(b => b.date === d.date),
        })));
      });
      unsubs.push(unsubBlocks);

      setDays(baseDays);
      setLoading(false);
    }

    init();
    return () => { unsubs.forEach(u => u()); };
  }, [currentUser.id, weekStart]);

  async function toggleCheck(checkId: string) {
    const prev = weeklyCheck ?? {
      id: `${weekStart}_${currentUser.id}`,
      userId: currentUser.id,
      weekKey: weekStart,
      checks: {},
      updatedAt: new Date().toISOString(),
    };
    const next: WeeklyCheckResult = {
      ...prev,
      checks: { ...prev.checks, [checkId]: !prev.checks[checkId] },
    };
    setWeeklyCheck(next);
    await saveWeeklyCheck(next);
  }

  const totalStudyMin = days.reduce((acc, d) =>
    acc + d.studyBlocks.reduce((a, b) => {
      const [sh, sm] = b.start.split(':').map(Number);
      const [eh, em] = b.end.split(':').map(Number);
      return a + (eh * 60 + em) - (sh * 60 + sm);
    }, 0), 0);

  const completedBlocks = days.reduce((acc, d) => acc + d.studyBlocks.filter(b => b.status === '완료').length, 0);
  const totalBlocks = days.reduce((acc, d) => acc + d.studyBlocks.length, 0);

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-gray-400 text-sm">불러오는 중...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Week nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800">{weekStart} ~ {weekEnd}</p>
          <button onClick={() => setWeekStart(getWeekMonday(today))} className="text-[10px] text-primary-500 font-semibold">이번 주</button>
        </div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card py-2">
          <p className="text-lg font-bold text-violet-600">{completedBlocks}<span className="text-xs font-normal text-gray-400">/{totalBlocks}</span></p>
          <p className="text-xs text-gray-400">블록 완료</p>
        </div>
        <div className="card py-2">
          <p className="text-lg font-bold text-primary-600">
            {Math.floor(totalStudyMin / 60)}<span className="text-xs font-medium">h</span>
          </p>
          <p className="text-xs text-gray-400">총 예정 공부</p>
        </div>
        <div className="card py-2">
          <p className="text-lg font-bold text-emerald-600">
            {weeklyCheck ? Object.values(weeklyCheck.checks).filter(Boolean).length : 0}<span className="text-xs font-normal text-gray-400">/5</span>
          </p>
          <p className="text-xs text-gray-400">주간 점검</p>
        </div>
      </div>

      {/* 7-day grid */}
      <div className="space-y-1.5">
        {days.map((d) => {
          const isToday = d.date === today;
          const completedInDay = d.studyBlocks.filter(b => b.status === '완료').length;
          const subjectCounts: Record<string, number> = {};
          for (const b of d.studyBlocks) {
            subjectCounts[b.subject] = (subjectCounts[b.subject] ?? 0) + 1;
          }
          return (
            <div key={d.date} className={`card p-3 ${isToday ? 'border-primary-300 bg-primary-50/30' : ''}`}>
              <div className="flex items-start gap-2">
                <div className={`flex-shrink-0 w-8 text-center pt-0.5`}>
                  <p className={`text-xs font-bold ${isToday ? 'text-primary-600' : 'text-gray-500'}`}>{d.dow}</p>
                  <p className={`text-xs ${isToday ? 'text-primary-500' : 'text-gray-400'}`}>{d.date.slice(5)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1">
                    {d.classCount > 0 && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">수업 {d.classCount}</span>
                    )}
                    {d.hasWork && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">근무</span>
                    )}
                    {d.lectureCount > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">강의 {d.lectureCount}</span>
                    )}
                    {subjectCounts['문법'] && <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">문법 {subjectCounts['문법']}</span>}
                    {subjectCounts['문학'] && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">문학 {subjectCounts['문학']}</span>}
                    {subjectCounts['국교론'] && <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">국교론 {subjectCounts['국교론']}</span>}
                    {d.studyBlocks.length === 0 && d.classCount === 0 && !d.hasWork && d.lectureCount === 0 && (
                      <span className="text-[10px] text-gray-300">-</span>
                    )}
                  </div>
                  {d.studyBlocks.length > 0 && (
                    <p className="text-[10px] text-gray-400 mt-0.5">완료 {completedInDay}/{d.studyBlocks.length}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly check */}
      <div className="card space-y-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary-500" />
          <p className="text-xs font-bold text-gray-800">주간 점검</p>
          <span className="text-[10px] text-gray-400">일요일 오후</span>
        </div>
        {WEEKLY_CHECKS.map(check => {
          const done = weeklyCheck?.checks[check.id] ?? false;
          return (
            <button
              key={check.id}
              onClick={() => toggleCheck(check.id)}
              className={`w-full flex items-start gap-2 text-left px-2 py-1.5 rounded-xl transition ${done ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
            >
              <div className={`w-4 h-4 flex-shrink-0 mt-0.5 rounded border-2 flex items-center justify-center transition ${done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                {done && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <p className={`text-xs leading-relaxed ${done ? 'text-emerald-700 line-through' : 'text-gray-600'}`}>{check.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
