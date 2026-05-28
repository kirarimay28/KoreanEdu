import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { getApprovedVacations } from '../../store';
import { getKSTToday } from '../common/DateNavigator';

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarTab() {
  const today = getKSTToday();
  const [year, setYear] = useState(() => parseInt(today.slice(0, 4)));
  const [month, setMonth] = useState(() => parseInt(today.slice(5, 7)) - 1);

  const vacations = getApprovedVacations();

  const vacationByDate: Record<string, string[]> = {};
  for (const v of vacations) {
    if (!vacationByDate[v.vacationDate]) vacationByDate[v.vacationDate] = [];
    vacationByDate[v.vacationDate].push(v.requesterName);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <CalendarDays className="w-4 h-4 text-primary-500" />
        <h2 className="text-sm font-bold text-gray-800">캘린더</h2>
      </div>

      <div className="card p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-gray-800">
            {year}년 {month + 1}월
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-[11px] font-semibold py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === today;
            const vacNames = vacationByDate[dateStr] ?? [];
            const dayOfWeek = (firstDay + day - 1) % 7;

            return (
              <div
                key={day}
                className="flex flex-col items-center pt-1 pb-1 rounded-lg min-h-[44px]"
              >
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full leading-none ${
                    isToday
                      ? 'bg-primary-600 text-white font-bold'
                      : dayOfWeek === 0
                        ? 'text-red-400'
                        : dayOfWeek === 6
                          ? 'text-blue-400'
                          : 'text-gray-700'
                  }`}
                >
                  {day}
                </span>
                {vacNames.length > 0 && (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5 w-full px-0.5">
                    {vacNames.slice(0, 2).map((name, i) => (
                      <span
                        key={i}
                        className="text-[9px] bg-amber-100 text-amber-700 rounded px-1 leading-tight truncate w-full text-center"
                      >
                        {name}
                      </span>
                    ))}
                    {vacNames.length > 2 && (
                      <span className="text-[9px] text-gray-400">+{vacNames.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary-600 inline-block" />
          <span className="text-[11px] text-gray-500">오늘</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded bg-amber-100 inline-block" />
          <span className="text-[11px] text-gray-500">휴가 승인</span>
        </div>
      </div>
    </div>
  );
}
