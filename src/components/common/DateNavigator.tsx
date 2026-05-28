import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, RotateCcw } from 'lucide-react';
import CalendarPopup from './CalendarPopup';

interface Props {
  date: string;
  onChange: (date: string) => void;
}

export function getKSTToday(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function DateNavigator({ date, onChange }: Props) {
  const [showCalendar, setShowCalendar] = useState(false);
  const today = getKSTToday();
  const isToday = date === today;

  return (
    <div className="relative mb-4">
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <button
          onClick={() => onChange(addDays(date, -1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalendar(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition border ${
              showCalendar
                ? 'bg-primary-50 border-primary-200'
                : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
            }`}
          >
            <CalendarDays className={`w-4 h-4 ${showCalendar ? 'text-primary-600' : 'text-primary-500'}`} />
            <span className="font-semibold text-gray-800 text-sm">{formatDisplay(date)}</span>
          </button>

          {isToday ? (
            <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              오늘
            </span>
          ) : (
            <button
              onClick={() => { onChange(today); setShowCalendar(false); }}
              title="오늘로 이동"
              className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-0.5 rounded-full transition font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              오늘
            </button>
          )}
        </div>

        <button
          onClick={() => onChange(addDays(date, 1))}
          disabled={isToday}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {showCalendar && (
        <CalendarPopup
          selectedDate={date}
          today={today}
          onSelect={d => { onChange(d); setShowCalendar(false); }}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
