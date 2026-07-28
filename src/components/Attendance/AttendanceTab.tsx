import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, PlusCircle, MinusCircle, Star } from 'lucide-react';
import { getAttendanceEntries, getUsers, markAttendance, removeAttendance, getApprovedVacations } from '../../store';
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
  // makeupDate set of approved vacations, keyed by userId
  const approvedVacations = getApprovedVacations();

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

  // Returns the approved vacation whose makeupDate matches this date for this user.
  // Requires: requesterId === userId AND makeupDate === dateStr AND vacationDate is non-empty.
  function getMakeupVacation(userId: string, dateStr: string) {
    return approvedVacations.find(
      v => v.requesterId === userId && v.makeupDate === dateStr && !!v.makeupDate && !!v.vacationDate
    ) ?? null;
  }

  function getEntry(userId: string, dateStr: string) {
    return allAttendance.find(e => e.userId === userId && e.date === dateStr) ?? null;
  }

  // Monday-only regular attendance lookup
  function isRegularAttended(userId: string, dateStr: string) {
    const e = getEntry(userId, dateStr);
    return e !== null && e.type !== 'makeup';
  }

  // Makeup attendance: only counts entries explicitly typed 'makeup'
  function isMakeupAttended(userId: string, dateStr: string) {
    const e = getEntry(userId, dateStr);
    return e?.type === 'makeup';
  }

  function getMonthStats(userId: string) {
    let total = 0;
    let attended = 0;
    let makeup = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const dateStr = `${monthPrefix}-${pad(d)}`;
      if (date.getDay() === 1) {
        if (dateStr > today) break;
        total++;
        if (isRegularAttended(userId, dateStr)) attended++;
      } else {
        if (isMakeupAttended(userId, dateStr)) makeup++;
      }
    }
    return { total, attended, makeup, rate: total > 0 ? Math.round((attended / total) * 100) : 0 };
  }

  function handleToggle(user: User, dateStr: string, isMakeupCell: boolean) {
    if (!isPrivileged) return;
    const existing = getEntry(user.id, dateStr);
    if (existing) {
      removeAttendance(dateStr, user.id);
    } else {
      markAttendance(dateStr, user.id, user.username, isMakeupCell ? 'makeup' : 'regular');
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
        <div className="flex flex-col gap-1 px-1">
          <span className="text-[11px] text-primary-400 bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1">
            월요일 → 정규 출석 / ★ 날짜(승인된 휴가 보강일) → 보강 출석
          </span>
        </div>
      )}

      {users.length === 0 && (
        <div className="card text-center py-10 text-gray-400 text-sm">
          등록된 스터디원이 없습니다.
        </div>
      )}

      {users.map(user => {
        const { total, attended, makeup, rate } = getMonthStats(user.id);

        return (
          <div key={user.id} className="card">
            {/* Member header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <NameWithCrown name={user.username} className="font-semibold text-gray-800 text-sm" showAvatar avatarSize="md" />
                <p className="text-xs text-gray-400 mt-0.5">
                  {attended}/{total}주 출석
                  {makeup > 0 && <span className="ml-1 text-amber-500">· 보강 {makeup}회</span>}
                </p>
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
                const isToday_ = viewYear === todayYear && viewMonth === todayMonth && day === todayDay;
                const col = idx % 7;
                const isMonday = col === 1;

                // Regular attendance: only counts on Mondays, type !== 'makeup'
                const regularAttended = !isFuture && isMonday && isRegularAttended(user.id, dateStr);

                // Makeup day: non-Monday cell whose date matches an approved vacation's makeupDate
                // for this specific user (checks requesterId + vacationDate + makeupDate)
                const makeupVacation = !isMonday && !isFuture ? getMakeupVacation(user.id, dateStr) : null;
                const isMakeupDay = makeupVacation !== null;
                const makeupAttended = isMakeupDay && isMakeupAttended(user.id, dateStr);

                const isClickable = isPrivileged && !isFuture && (isMonday || isMakeupDay);

                // What to show
                const showRegularCheck = regularAttended;
                const showMakeupStar = makeupAttended;
                const showMakeupPending = isMakeupDay && !makeupAttended;
                const showSomething = showRegularCheck || showMakeupStar || showMakeupPending;

                return (
                  <div
                    key={day}
                    onClick={isClickable ? () => handleToggle(user, dateStr, isMakeupDay) : undefined}
                    className={[
                      'flex items-center justify-center h-9 rounded-lg text-xs font-medium relative group',
                      isClickable ? 'cursor-pointer' : '',
                      isFuture ? 'opacity-20' : '',
                      showRegularCheck ? 'bg-primary-100 hover:bg-primary-200' :
                      showMakeupStar   ? 'bg-amber-50 hover:bg-amber-100' :
                      showMakeupPending ? 'bg-amber-50 ring-1 ring-amber-200 hover:bg-amber-100' :
                      isToday_ && isMonday ? 'bg-amber-50 ring-1 ring-amber-200 hover:bg-amber-100' :
                      isClickable ? 'bg-gray-50 hover:bg-primary-50' :
                      'bg-transparent',
                    ].join(' ')}
                    title={makeupVacation ? `보강일 (결석: ${makeupVacation.vacationDate})` : undefined}
                  >
                    {showSomething ? (
                      <>
                        {showRegularCheck && <CheckCircle2 className="w-4 h-4 text-primary-500" />}
                        {showMakeupStar && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        {showMakeupPending && (
                          <>
                            <span className="text-amber-500 font-bold">{day}</span>
                            <Star className="w-2 h-2 text-amber-400 fill-amber-300 absolute top-0.5 right-0.5" />
                          </>
                        )}
                        {isClickable && (showRegularCheck || showMakeupStar) && (
                          <MinusCircle className="w-4 h-4 text-red-400 absolute opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </>
                    ) : (
                      <>
                        <span className={
                          isMonday
                            ? (isFuture ? 'text-gray-300' : isToday_ ? 'text-amber-600 font-bold' : 'text-gray-500')
                            : 'text-gray-200'
                        }>
                          {day}
                        </span>
                        {isClickable && !isFuture && (
                          <PlusCircle className={`w-4 h-4 absolute opacity-0 group-hover:opacity-100 transition ${isMakeupDay ? 'text-amber-400' : 'text-primary-400'}`} />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-50">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary-400" />
                <span className="text-[10px] text-gray-400">정규</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] text-gray-400">보강</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-300 fill-amber-200" />
                <span className="text-[10px] text-gray-400">보강 예정</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
