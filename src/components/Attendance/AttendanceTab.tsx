import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Check } from 'lucide-react';
import {
  getAttendanceEntries, getUsers, markAttendance, removeAttendance, getApprovedVacations,
  subscribeAttendanceData, getAttendanceCheckIns, submitAttendanceCheckIn, confirmAttendanceCheckIn,
} from '../../store';
import { sendPush } from '../../notifications';
import { getKSTToday } from '../common/DateNavigator';
import NameWithCrown from '../common/NameWithCrown';
import type { User } from '../../types';
import { isPrivileged } from '../../types';

interface Props {
  currentUser: User;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS_KR[d.getDay()]})`;
}

export default function AttendanceTab({ currentUser }: Props) {
  const today = getKSTToday();
  const [viewYear, setViewYear] = useState(() => parseInt(today.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(today.split('-')[1]) - 1);
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeAttendanceData(() => setTick(t => t + 1));
    return unsub;
  }, []);

  const isAdmin = isPrivileged(currentUser);
  const users = getUsers();
  const allAttendance = getAttendanceEntries();
  const approvedAbsences = getApprovedVacations();
  const checkIns = getAttendanceCheckIns();

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

  function getEntry(userId: string, dateStr: string) {
    return allAttendance.find(e => e.userId === userId && e.date === dateStr) ?? null;
  }

  function getApprovedAbsence(userId: string, dateStr: string) {
    return approvedAbsences.find(v => v.requesterId === userId && v.vacationDate === dateStr) ?? null;
  }

  function getMonthStats(userId: string) {
    let total = 0;
    let attended = 0;
    let excused = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthPrefix}-${pad(d)}`;
      if (dateStr > today) break;
      const date = new Date(viewYear, viewMonth, d);
      if (date.getDay() !== 1) continue; // only Mondays
      total++;
      if (getEntry(userId, dateStr)) {
        attended++;
      } else if (getApprovedAbsence(userId, dateStr)) {
        excused++;
      }
    }
    const denominator = total - excused;
    return { total, attended, excused, rate: denominator > 0 ? Math.round((attended / denominator) * 100) : 100 };
  }

  function handleToggle(user: User, dateStr: string) {
    if (!isAdmin) return;
    const existing = getEntry(user.id, dateStr);
    if (existing) removeAttendance(dateStr, user.id);
    else markAttendance(dateStr, user.id, user.username, 'regular');
    setTick(t => t + 1);
  }

  // Today's check-in data
  const myCheckInToday = checkIns.find(c => c.userId === currentUser.id && c.date === today);
  const pendingCheckInsToday = checkIns.filter(c => c.date === today && c.status === 'pending');
  const myEntryToday = getEntry(currentUser.id, today);

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4">
      {/* 오늘 출석 체크 섹션 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold text-gray-500 mb-3">오늘 출석</p>
        <p className="text-sm font-semibold text-gray-800 mb-4">{formatDateFull(today)}</p>

        {myEntryToday ? (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <p className="text-sm font-semibold text-green-700">출석 완료</p>
          </div>
        ) : myCheckInToday ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="w-4 h-4 rounded-full border-2 border-amber-400 animate-pulse shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">확인 대기중</p>
              <p className="text-xs text-amber-600 mt-0.5">방장/부방장이 확인 중입니다</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => submitAttendanceCheckIn(currentUser.id, currentUser.username, today)}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition"
            style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
          >
            출석 체크하기
          </button>
        )}
      </div>

      {/* 방장/부방장: 대기중 출석 체크 */}
      {isAdmin && pendingCheckInsToday.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
          <p className="text-xs font-bold text-amber-600 mb-3">
            대기중 출석 체크 ({pendingCheckInsToday.length}명)
          </p>
          <div className="space-y-2">
            {pendingCheckInsToday.map(ci => (
              <div key={ci.id} className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2.5">
                <NameWithCrown
                  name={ci.username}
                  className="text-sm font-semibold text-gray-800"
                  showAvatar
                  avatarSize="sm"
                />
                <button
                  onClick={() => {
                    confirmAttendanceCheckIn(ci.id, currentUser.id, currentUser.username);
                    sendPush({
                      userIds: [ci.userId],
                      title: '✅ 출석 확인',
                      body: `${ci.date} 출석이 확인되었습니다.`,
                    });
                  }}
                  className="flex items-center gap-1 text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition"
                >
                  <Check className="w-3 h-3" />
                  확인
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 월별 캘린더 */}
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
        const { total, attended, excused, rate } = getMonthStats(user.id);

        return (
          <div key={user.id} className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <NameWithCrown name={user.username} className="font-semibold text-gray-800 text-sm" showAvatar avatarSize="md" />
                <p className="text-xs text-gray-400 mt-0.5">
                  {attended}/{total - excused}주 출석
                  {excused > 0 && <span className="ml-1 text-amber-500">· 결석(승인) {excused}회</span>}
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

            {/* 요일 헤더 */}
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

                if (!isMonday) {
                  return (
                    <div key={day} className="flex items-center justify-center h-9">
                      <span className="text-xs text-gray-150">{day}</span>
                    </div>
                  );
                }

                const hasEntry = !isFuture && getEntry(user.id, dateStr) !== null;
                const approvedAbsence = !isFuture ? getApprovedAbsence(user.id, dateStr) : null;
                const isExcusedAbsent = !hasEntry && approvedAbsence !== null;
                const isUnexcusedAbsent = !isFuture && !hasEntry && !approvedAbsence;
                const isClickable = isAdmin && !isFuture;

                return (
                  <div
                    key={day}
                    onClick={isClickable ? () => handleToggle(user, dateStr) : undefined}
                    className={[
                      'flex items-center justify-center h-9 rounded-lg text-xs font-medium relative group',
                      isClickable ? 'cursor-pointer' : '',
                      isFuture ? 'opacity-20' : '',
                      hasEntry           ? 'bg-primary-100 hover:bg-primary-200' :
                      isExcusedAbsent    ? 'bg-amber-50' :
                      isUnexcusedAbsent  ? 'bg-red-50' :
                      isToday_           ? 'bg-amber-50 ring-1 ring-amber-200' :
                      isClickable        ? 'bg-gray-50 hover:bg-primary-50' :
                      'bg-transparent',
                    ].join(' ')}
                  >
                    {hasEntry ? (
                      <CheckCircle2 className="w-4 h-4 text-primary-500" />
                    ) : isExcusedAbsent ? (
                      <span className="text-[10px] font-bold text-amber-500">결</span>
                    ) : isUnexcusedAbsent ? (
                      <span className="text-[10px] font-bold text-red-400">결</span>
                    ) : (
                      <span className={
                        isFuture ? 'text-gray-300' :
                        isToday_ ? 'text-amber-600 font-bold' :
                        'text-gray-500'
                      }>
                        {day}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 범례 */}
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-50 flex-wrap">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary-400" />
                <span className="text-[10px] text-gray-400">출석</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-amber-500 w-3 text-center">결</span>
                <span className="text-[10px] text-gray-400">결석(승인)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-red-400 w-3 text-center">결</span>
                <span className="text-[10px] text-gray-400">결석(미승인)</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
