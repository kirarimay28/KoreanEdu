import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface Props {
  date: string;
  onChange: (date: string) => void;
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

export default function DateNavigator({ date, onChange }: Props) {
  return (
    <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4">
      <button
        onClick={() => onChange(addDays(date, -1))}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary-500" />
        <span className="font-semibold text-gray-800 text-sm">{formatDisplay(date)}</span>
        {isToday(date) && (
          <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">오늘</span>
        )}
      </div>

      <button
        onClick={() => onChange(addDays(date, 1))}
        disabled={isToday(date)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
