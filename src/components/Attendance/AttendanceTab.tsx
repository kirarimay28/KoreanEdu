import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, PlusCircle, MinusCircle } from 'lucide-react';
import { getAttendanceEntries, getUsers, markAttendance, removeAttendance } from '../../store';
import { getKSTToday } from '../common/DateNavigator';
import NameWithCrown from '../common/NameWithCrown';
import type { User } from '../../types';

interface Props {
  currentUser: User;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function AttendanceTab({ currentUser }: Props) {
  const today = getKSTToday();
  const [viewYear, setViewYear] = useState(() => parseInt(today.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(today.split('-')[1]) - 1);
  const [tick, setTick] = useState(0);

  const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'subadmin';

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
      const date = new Date(viewYear, viewMonth, d);
      if (date.getDay() !== 1) continue;
      const dateStr = `${monthPrefix}-${pad(d)}`;
      if (dateStr > today) break;
      total++;
      if (isAttended(userId, d)) attended++;
    }
    return { total, attended, rate: total > 0 ? Math.round((attended / total) * 100) : 0 };
  }

  function handleToggle(user: User, day: number) {
    if (!isPrivileged) return;
    const dateStr = `${monthPrefix}-${pad(day)}`;
    if (isAttended(user.id, day)) {
      removeAttendance(dateStr, user.id);
    } else {
      markAttendance(dateStr, user.id, user.username);
    }
    setTick(t => t + 1);
  }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4" key={tick}>
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

      {/* Admin hint */}
      {isPrivileged && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-primary-400 bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1">
            월요일 셀을 탭해서 출석을 추가·제거할 수 있습니다
          </span>
        </div>
      )}

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
              <div>
                <NameWithCrown name={user.username} className="font-semibold text-gray-800 text-sm" showAvatar avatarSize="md" />
                <p className="text-xs text-gray-400 mt-0.5">{attended}/{total}주 출석</p>
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
                  className={`text-center text-xs font-medium py-0.5 ${
                    i === 1 ? 'text-primary-600 font-bold' :
                    i === 0 ? 'text-red-400' :
                    i === 6 ? 'text-blue-400' :
                    'text-gray-400'
                  }`}
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
                const isMonday = col === 1;
                const showAttended = isMonday && attended_;
                const isClickable = isPrivileged && isMonday && !isFuture;

                const cell = (
                  <div
                    key={day}
                    onClick={isClickable ? () => handleToggle(user, day) : undefined}
                    className={[
                      'flex items-center justify-center h-9 rounded-lg text-xs font-medium relative group',
                      isClickable ? 'cursor-pointer' : '',
                      isFuture ? 'opacity-20' : '',
                      isMonday
                        ? (showAttended
                            ? 'bg-primary-100 hover:bg-primary-200'
                            : isToday_
                              ? 'bg-amber-50 ring-1 ring-amber-200 hover:bg-amber-100'
                              : isClickable
                                ? 'bg-gray-50 hover:bg-primary-50'
                                : 'bg-gray-50')
                        : 'bg-transparent',
                    ].join(' ')}
                  >
                    {showAttended ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        {isClickable && (
                          <MinusCircle className="w-4 h-4 text-red-400 absolute opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </>
                    ) : (
                      <>
                        <span className={
                          !isMonday ? 'text-gray-200' :
                          isFuture ? 'text-gray-300' :
                          isToday_ ? 'text-amber-600 font-bold' :
                          'text-gray-500'
                        }>
                          {day}
                        </span>
                        {isClickable && !isFuture && (
                          <PlusCircle className="w-4 h-4 text-primary-400 absolute opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </>
                    )}
                  </div>
                );

                return cell;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
