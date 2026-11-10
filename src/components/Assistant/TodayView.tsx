import { useState, useEffect } from 'react';
import type { User } from '../../types';
import type { StudyBlock, AssistantDeadline } from '../../assistantTypes';
import {
  loadClassTimetable, loadWorkSchedule,
  subscribeExceptions, subscribeLectureSlots,
  subscribeStudyBlocks, subscribeDeadlines,
  updateBlockStatus,
} from '../../assistantStore';
import { getDayOfWeek } from '../../assistantAlgo';
import { CheckCircle2, Circle, Clock, AlertCircle, BookOpen, Briefcase, MapPin, Zap } from 'lucide-react';

interface Props {
  currentUser: User;
  today: string;
}


interface TimeItem {
  start: string;
  end: string;
  type: 'class' | 'work' | 'commute' | 'return' | 'lecture' | 'study';
  label: string;
  sub?: string;
  color: string;
  block?: StudyBlock;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function fromMin(m: number): string {
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function TodayView({ currentUser, today }: Props) {
  const [items, setItems] = useState<TimeItem[]>([]);
  const [deadlines, setDeadlines] = useState<AssistantDeadline[]>([]);
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [partialMin, setPartialMin] = useState('');
  const [loading, setLoading] = useState(true);

  const todayDow = getDayOfWeek(today);

  useEffect(() => {
    let unsubs: Array<() => void> = [];

    async function init() {
      const [timetable, work] = await Promise.all([
        loadClassTimetable(currentUser.id),
        loadWorkSchedule(currentUser.id),
      ]);

      const built: TimeItem[] = [];

      // Work + commute
      const todaySlot = work?.slots?.find(s => s.day === todayDow);
      if (work && todaySlot) {
        if (work.commuteMinutes > 0) {
          const cs = fromMin(toMin(todaySlot.start) - work.commuteMinutes);
          built.push({ start: cs, end: todaySlot.start, type: 'commute', label: '출근 이동', color: 'gray' });
        }
        built.push({ start: todaySlot.start, end: todaySlot.end, type: 'work', label: '근무', color: 'gray' });
        if (work.returnMinutes > 0) {
          const re = fromMin(toMin(todaySlot.end) + work.returnMinutes);
          built.push({ start: todaySlot.end, end: re, type: 'return', label: '퇴근 이동', color: 'gray' });
        }
      }

      // Classes
      if (timetable) {
        for (const sub of timetable.subjects) {
          for (const ct of sub.times) {
            if (ct.day === todayDow) {
              built.push({ start: ct.start, end: ct.end, type: 'class', label: sub.name, sub: ct.location, color: 'blue' });
            }
          }
        }
      }

      // subscribe exceptions (just use to filter, not modifying built for now)
      const unsubEx = subscribeExceptions(currentUser.id, () => {});
      unsubs.push(unsubEx);

      // Lecture slots
      const unsubLec = subscribeLectureSlots(currentUser.id, (slots) => {
        const todayLectures = slots.filter(s => s.day === todayDow);
        setItems(prev => {
          const filtered = prev.filter(i => i.type !== 'lecture');
          const lecItems: TimeItem[] = todayLectures.map(l => ({
            start: l.start, end: l.end, type: 'lecture' as const,
            label: l.source.replace(/_/g, ' '), color: 'amber',
          }));
          return [...filtered, ...lecItems].sort((a, b) => a.start.localeCompare(b.start));
        });
      });
      unsubs.push(unsubLec);

      // Study blocks
      const unsubBlocks = subscribeStudyBlocks(currentUser.id, today, today, (bl) => {
        setBlocks(bl);
        setItems(prev => {
          const filtered = prev.filter(i => i.type !== 'study');
          const studyItems: TimeItem[] = bl.map(b => ({
            start: b.start, end: b.end, type: 'study' as const,
            label: b.label, color: b.subject === '문법' ? 'violet' : b.subject === '문학' ? 'emerald' : 'primary',
            block: b,
          }));
          return [...filtered, ...studyItems].sort((a, b) => a.start.localeCompare(b.start));
        });
      });
      unsubs.push(unsubBlocks);

      // Deadlines
      const unsubDl = subscribeDeadlines(currentUser.id, (dl) => {
        setDeadlines(dl.filter(d => !d.completed));
      });
      unsubs.push(unsubDl);

      setItems(built.sort((a, b) => a.start.localeCompare(b.start)));
      setLoading(false);
    }

    init();
    return () => { unsubs.forEach(u => u()); };
  }, [currentUser.id, today, todayDow]);

  async function handleCheckin(block: StudyBlock, status: StudyBlock['status'], min?: number) {
    await updateBlockStatus(block.id, status, min);
    setCheckinId(null);
    setPartialMin('');
  }

  const todayDeadlines = deadlines.filter(d => d.date === today);
  const upcomingDeadlines = deadlines.filter(d => {
    const diff = diffDays(today, d.date);
    return diff > 0 && diff <= 7;
  }).slice(0, 3);

  const studyBlocks = blocks;
  const completedCount = studyBlocks.filter(b => b.status === '완료').length;
  const totalMin = studyBlocks.reduce((acc, b) => {
    const diff = toMin(b.end) - toMin(b.start);
    return acc + diff;
  }, 0);

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-gray-400 text-sm">불러오는 중...</div>;
  }

  const COLOR_MAP: Record<string, string> = {
    blue:    'bg-blue-50 border-blue-200 text-blue-800',
    gray:    'bg-gray-50 border-gray-200 text-gray-600',
    amber:   'bg-amber-50 border-amber-200 text-amber-800',
    violet:  'bg-violet-50 border-violet-200 text-violet-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    primary: 'bg-primary-50 border-primary-200 text-primary-800',
    red:     'bg-red-50 border-red-200 text-red-700',
  };
  const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    class: BookOpen, work: Briefcase, commute: MapPin, return: MapPin, lecture: Zap, study: Clock,
  };

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card py-2">
          <p className="text-lg font-bold text-violet-600">{studyBlocks.length}</p>
          <p className="text-xs text-gray-400">오늘 블록</p>
        </div>
        <div className="card py-2">
          <p className="text-lg font-bold text-emerald-600">{completedCount}</p>
          <p className="text-xs text-gray-400">완료</p>
        </div>
        <div className="card py-2">
          <p className="text-lg font-bold text-primary-600">
            {Math.floor(totalMin / 60)}<span className="text-sm font-medium">h</span>{totalMin % 60 > 0 ? `${totalMin % 60}m` : ''}
          </p>
          <p className="text-xs text-gray-400">총 예정</p>
        </div>
      </div>

      {/* Today deadlines */}
      {todayDeadlines.length > 0 && (
        <div className="card border-red-200 bg-red-50 space-y-1">
          <p className="text-xs font-bold text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />오늘 마감</p>
          {todayDeadlines.map(d => (
            <p key={d.id} className="text-xs text-red-700 font-medium">{d.title}{d.time ? ` · ${d.time}` : ''}</p>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="card space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">타임라인</p>
        {items.length === 0 && studyBlocks.length === 0 && (
          <p className="text-xs text-gray-400 py-4 text-center">공부 블록이 없습니다. 일정을 입력하면 자동으로 생성됩니다.</p>
        )}
        {items.map((item, idx) => {
          const colorCls = COLOR_MAP[item.color] ?? COLOR_MAP.gray;
          const Icon = ICON_MAP[item.type] ?? Clock;
          const isStudy = item.type === 'study' && item.block;
          const block = item.block;
          const statusIcon = block?.status === '완료' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                             block?.status === '부분'  ? <CheckCircle2 className="w-4 h-4 text-amber-500" /> :
                             block?.status === '미완'  ? <Circle className="w-4 h-4 text-red-400" /> :
                             null;
          return (
            <div key={idx} className={`rounded-xl border px-3 py-2 ${colorCls}`}>
              <div className="flex items-start gap-2">
                <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold leading-snug truncate">{item.label}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {statusIcon}
                      <p className="text-[10px] opacity-70">{item.start}–{item.end}</p>
                    </div>
                  </div>
                  {item.sub && <p className="text-[10px] opacity-60">{item.sub}</p>}
                  {isStudy && block && checkinId !== block.id && block.status === '예정' && (
                    <div className="flex gap-1.5 mt-1.5">
                      <button onClick={() => handleCheckin(block, '완료')} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-500 text-white">완료</button>
                      <button onClick={() => setCheckinId(block.id)} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-amber-500 text-white">부분</button>
                      <button onClick={() => handleCheckin(block, '미완')} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-red-400 text-white">미완</button>
                    </div>
                  )}
                  {isStudy && block && checkinId === block.id && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <input
                        type="number"
                        placeholder="몇 분?"
                        value={partialMin}
                        onChange={e => setPartialMin(e.target.value)}
                        className="w-16 text-xs border border-amber-300 rounded-lg px-1.5 py-0.5 bg-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleCheckin(block, '부분', partialMin ? Number(partialMin) : undefined)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-amber-500 text-white"
                      >확인</button>
                      <button onClick={() => setCheckinId(null)} className="text-[10px] text-gray-400">취소</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="card space-y-1.5">
          <p className="text-xs font-bold text-gray-500">이번 주 마감</p>
          {upcomingDeadlines.map(d => {
            const diff = diffDays(today, d.date);
            return (
              <div key={d.id} className="flex items-center justify-between">
                <p className="text-xs text-gray-700 truncate flex-1">{d.title}</p>
                <span className={`text-[10px] font-bold ml-2 flex-shrink-0 ${diff <= 2 ? 'text-red-500' : 'text-gray-400'}`}>D-{diff}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
