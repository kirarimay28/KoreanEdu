import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, X, Trash2 } from 'lucide-react';
import type { User, CalendarEvent, EventColor } from '../../types';
import { getApprovedVacations, getCalendarEventsForMonth, createCalendarEvent, deleteCalendarEvent } from '../../store';
import { getKSTToday } from '../common/DateNavigator';

interface Props {
  currentUser: User;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const COLOR_OPTIONS: { value: EventColor; bg: string; dot: string; pill: string }[] = [
  { value: 'blue',   bg: 'bg-blue-500',   dot: 'bg-blue-500',   pill: 'bg-blue-100 text-blue-700' },
  { value: 'green',  bg: 'bg-green-500',  dot: 'bg-green-500',  pill: 'bg-green-100 text-green-700' },
  { value: 'red',    bg: 'bg-red-400',    dot: 'bg-red-400',    pill: 'bg-red-100 text-red-600' },
  { value: 'orange', bg: 'bg-orange-400', dot: 'bg-orange-400', pill: 'bg-orange-100 text-orange-700' },
  { value: 'purple', bg: 'bg-primary-500', dot: 'bg-primary-500', pill: 'bg-primary-100 text-primary-700' },
];

function colorPill(color: EventColor) {
  return COLOR_OPTIONS.find(c => c.value === color)?.pill ?? 'bg-gray-100 text-gray-600';
}
function colorDot(color: EventColor) {
  return COLOR_OPTIONS.find(c => c.value === color)?.dot ?? 'bg-gray-400';
}

export default function CalendarTab({ currentUser }: Props) {
  const today = getKSTToday();
  const [year, setYear] = useState(() => parseInt(today.slice(0, 4)));
  const [month, setMonth] = useState(() => parseInt(today.slice(5, 7)) - 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Add event form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<EventColor>('blue');
  const [showForm, setShowForm] = useState(false);

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'subadmin';

  const vacations = getApprovedVacations();
  const vacationByDate: Record<string, string[]> = {};
  for (const v of vacations) {
    if (!vacationByDate[v.vacationDate]) vacationByDate[v.vacationDate] = [];
    vacationByDate[v.vacationDate].push(v.requesterName);
  }

  const events = getCalendarEventsForMonth(year, month);
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  function handleDayClick(dateStr: string) {
    if (selectedDate === dateStr) {
      setSelectedDate(null);
      setShowForm(false);
    } else {
      setSelectedDate(dateStr);
      setShowForm(false);
    }
  }

  function handleAddEvent() {
    if (!title.trim() || !selectedDate) return;
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      date: selectedDate,
      title: title.trim(),
      description: description.trim(),
      color,
      createdAt: new Date().toISOString(),
      createdById: currentUser.id,
      createdByName: currentUser.username,
    };
    createCalendarEvent(event);
    setTitle('');
    setDescription('');
    setColor('blue');
    setShowForm(false);
    setTick(t => t + 1);
  }

  function handleDeleteEvent(id: string) {
    deleteCalendarEvent(id);
    setTick(t => t + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];
  const selectedVacs = selectedDate ? (vacationByDate[selectedDate] ?? []) : [];

  function formatSelectedDate(d: string) {
    const dt = new Date(d + 'T00:00:00');
    const dow = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
    return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${dow})`;
  }

  return (
    <div className="space-y-3" key={tick}>
      <div className="flex items-center gap-2 mb-1">
        <CalendarDays className="w-4 h-4 text-primary-500" />
        <h2 className="text-sm font-bold text-gray-800">캘린더</h2>
      </div>

      <div className="card p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-gray-800">{year}년 {month + 1}월</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`text-center text-[11px] font-semibold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === today;
            const isSelected = selectedDate === dateStr;
            const vacNames = vacationByDate[dateStr] ?? [];
            const dayEvents = eventsByDate[dateStr] ?? [];
            const dayOfWeek = (firstDay + day - 1) % 7;

            return (
              <button
                key={day}
                onClick={() => handleDayClick(dateStr)}
                className={`flex flex-col items-center pt-1 pb-1 rounded-lg min-h-[44px] transition-all ${isSelected ? 'bg-primary-50 ring-1 ring-primary-300' : 'hover:bg-gray-50'}`}
              >
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full leading-none ${
                  isToday ? 'bg-primary-600 text-white font-bold'
                  : dayOfWeek === 0 ? 'text-red-400'
                  : dayOfWeek === 6 ? 'text-blue-400'
                  : 'text-gray-700'
                }`}>
                  {day}
                </span>

                {/* Event dots */}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map(e => (
                      <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${colorDot(e.color)}`} />
                    ))}
                  </div>
                )}

                {/* Vacation badges */}
                {vacNames.length > 0 && (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5 w-full px-0.5">
                    {vacNames.slice(0, 1).map((name, i) => (
                      <span key={i} className="text-[9px] bg-amber-100 text-amber-700 rounded px-1 leading-tight truncate w-full text-center">
                        {name}
                      </span>
                    ))}
                    {vacNames.length > 1 && (
                      <span className="text-[9px] text-gray-400">+{vacNames.length - 1}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date panel */}
      {selectedDate && (
        <div className="card border border-primary-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800">{formatSelectedDate(selectedDate)}</p>
            <div className="flex items-center gap-2">
              {isAdmin && !showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition px-2 py-1 rounded-lg hover:bg-primary-50"
                >
                  <Plus className="w-3.5 h-3.5" />일정 추가
                </button>
              )}
              <button onClick={() => { setSelectedDate(null); setShowForm(false); }} className="text-gray-300 hover:text-gray-500 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Event list */}
          {selectedEvents.length > 0 && (
            <div className="space-y-2 mb-3">
              {selectedEvents.map(event => (
                <div key={event.id} className={`flex items-start gap-2 px-3 py-2 rounded-xl ${colorPill(event.color)}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{event.title}</p>
                    {event.description && <p className="text-[11px] opacity-75 mt-0.5">{event.description}</p>}
                    <p className="text-[10px] opacity-50 mt-0.5">{event.createdByName}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteEvent(event.id)} className="flex-shrink-0 opacity-50 hover:opacity-100 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Vacation list */}
          {selectedVacs.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {selectedVacs.map((name, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-xs text-amber-700">{name} 휴가</span>
                </div>
              ))}
            </div>
          )}

          {selectedEvents.length === 0 && selectedVacs.length === 0 && !showForm && (
            <p className="text-xs text-gray-400 py-2">등록된 일정이 없습니다.</p>
          )}

          {/* Add event form */}
          {showForm && (
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <input
                className="input-field w-full text-sm"
                placeholder="일정 제목"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                autoFocus
              />
              <input
                className="input-field w-full text-sm"
                placeholder="메모 (선택)"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">색상</span>
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setColor(opt.value)}
                    className={`w-6 h-6 rounded-full ${opt.bg} transition-all ${color === opt.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100'}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddEvent}
                  disabled={!title.trim()}
                  className="flex-1 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white rounded-xl transition"
                >
                  추가
                </button>
                <button
                  onClick={() => { setShowForm(false); setTitle(''); setDescription(''); }}
                  className="px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary-600 inline-block" />
          <span className="text-[11px] text-gray-500">오늘</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-amber-100 inline-block" />
          <span className="text-[11px] text-gray-500">휴가 승인</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          <span className="text-[11px] text-gray-500">일정</span>
        </div>
      </div>
    </div>
  );
}
