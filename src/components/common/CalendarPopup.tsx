import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { hasStudyRecordOnDate } from '../../store';

interface Props {
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  allowFuture?: boolean;
  minDate?: string;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export default function CalendarPopup({ selectedDate, today, onSelect, onClose, allowFuture, minDate }: Props) {
  const [viewYear, setViewYear] = useState(() => parseInt(selectedDate.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(selectedDate.split('-')[1]) - 1);
  const ref = useRef<HTMLDivElement>(null);

  const todayYear = parseInt(today.split('-')[0]);
  const todayMonth = parseInt(today.split('-')[1]) - 1;
  const todayDay = parseInt(today.split('-')[2]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const isPrevDisabled = allowFuture
    ? (viewYear < todayYear || (viewYear === todayYear && viewMonth <= todayMonth))
    : false;
  const isNextDisabled = allowFuture
    ? false
    : (viewYear > todayYear || (viewYear === todayYear && viewMonth >= todayMonth));

  function prevMonth() {
    if (isPrevDisabled) return;
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (isNextDisabled) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function pad(n: number) { return String(n).padStart(2, '0'); }
  function toDateStr(day: number) { return `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`; }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 p-4"
    >
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          disabled={isPrevDisabled}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="font-semibold text-gray-800 text-sm">{viewYear}년 {MONTHS[viewMonth]}</span>
        <button
          onClick={nextMonth}
          disabled={isNextDisabled}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />;

          const dateStr = toDateStr(day);
          const isFuture = dateStr > today;
          const threshold = minDate ?? today;
          const isDisabled = allowFuture ? dateStr < threshold : isFuture;
          const isSelected = dateStr === selectedDate;
          const isToday_ = viewYear === todayYear && viewMonth === todayMonth && day === todayDay;
          const hasRecord = !isFuture && !allowFuture && hasStudyRecordOnDate(dateStr);
          const col = idx % 7;

          return (
            <button
              key={day}
              disabled={isDisabled}
              onClick={() => onSelect(dateStr)}
              className={[
                'relative flex flex-col items-center justify-center h-9 rounded-lg text-sm font-medium transition',
                isDisabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100',
                isSelected ? 'bg-primary-600 text-white hover:bg-primary-700' : '',
                isToday_ && !isSelected ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300' : '',
                !isSelected && !isToday_ ? (col === 0 ? 'text-red-500' : col === 6 ? 'text-blue-500' : 'text-gray-700') : '',
              ].join(' ')}
            >
              {day}
              {hasRecord && (
                <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white opacity-70' : 'bg-primary-400'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
