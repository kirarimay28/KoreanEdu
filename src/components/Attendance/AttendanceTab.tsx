import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { getAttendanceEntries, getUsers } from '../../store';
import { getKSTToday } from '../common/DateNavigator';
import NameWithCrown from '../common/NameWithCrown';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function AttendanceTab() {
  const today = getKSTToday();
  const [viewYear, setViewYear] = useState(() => parseInt(today.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(today.split('-')[1]) - 1);

  const users = getUsers();
  const allAttendance = getAttendanceEntries();

  const todayYear = parseInt(today.split('-')[0]);
  const todayMonth = parseInt(today.split('-')[1]) - 1;
  const todayDay = parseInt(today.split('-')[2]);

  const isNextDisabled = viewYear === todayYear && viewMonth >= todayMonth;
  const monthPrefix = `${viewYear}-${pad(viewMonth + 1)}`;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (isNextDisabled) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function isAttended(userId: string, day: number) {
    const dateStr = `${monthPrefix}-${pad(day)}`;
    return allAttendance.some(e => e.userId === userId && e.date === dateStr);
  }

  function getMonthStats(userId: string) {
    let total = 0;
    let attended = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthPrefix}-${pad(d)}`;
      if (dateStr > today) break;
      total++;
      if (isAttended(userId, d)) attended++;
    }
    return { total, attended, rate: total > 0 ? Math.round((attended / total) * 100) : 0 };
  }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-gray-800 text-sm">{viewYear}년 {MONTHS[viewMonth]}</span>
        <button
          onClick={nextMonth}
          disabled={isNextDisabled}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {users.length === 0 && (
        <div className="card text-center py-10 text-gray-400 text-sm">
          등록된 스터디원이 없습니다.
        </div>
      )}

      {users.map(user => {
        const { total, attended, rate } = getMonthStats(user.id);

        return (
          <div key={user.id} className="card">
            {/* Member header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-700">{user.username[0]}</span>
                </div>
                <div>
                  <NameWithCrown name={user.username} className="font-semibold text-gray-800 text-sm" />
                  <p className="text-xs text-gray-400">{attended}/{total}일 출석</p>
                </div>
              </div>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                rate >= 80 ? 'bg-green-100 text-green-700' :
                rate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {rate}%
              </span>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-xs font-medium py-0.5 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} />;
                const dateStr = `${monthPrefix}-${pad(day)}`;
                const isFuture = dateStr > today;
                const attended_ = !isFuture && isAttended(user.id, day);
                const isToday_ = viewYear === todayYear && viewMonth === todayMonth && day === todayDay;
                const col = idx % 7;

                return (
                  <div
                    key={day}
                    className={[
                      'flex items-center justify-center h-9 rounded-lg text-xs font-medium',
                      isFuture ? 'opacity-20' : '',
                      attended_ ? 'bg-primary-100' : isToday_ ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-gray-50',
                    ].join(' ')}
                  >
                    {attended_ ? (
                      <CheckCircle2 className="w-4 h-4 text-primary-500" />
                    ) : (
                      <span className={
                        isFuture ? 'text-gray-300' :
                        isToday_ ? 'text-amber-600 font-bold' :
                        col === 0 ? 'text-red-400' :
                        col === 6 ? 'text-blue-400' :
                        'text-gray-400'
                      }>
                        {day}
                      </span>
                    )}
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
