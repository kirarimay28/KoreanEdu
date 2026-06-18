import { useState } from 'react';
import type { User } from '../../types';
import { getKSTToday } from '../common/DateNavigator';
import { ExternalLink } from 'lucide-react';

const VENUE_URL = 'https://thechoa.chosun.ac.kr/clientMain/a/t/main.do';

// "네!" 클릭 시 다음 월요일 날짜 반환 → 그 날부터 다시 표시
function getNextMonday(today: string): string {
  const d = new Date(today + 'T00:00:00');
  const day = d.getDay(); // 0=일, 1=월, ...
  const daysUntil = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntil);
  return d.toISOString().slice(0, 10);
}

interface Props { currentUser: User; }

export default function VenueReminderBanner({ currentUser }: Props) {
  const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'subadmin';

  const [dismissed, setDismissed] = useState(() => {
    if (!isPrivileged) return true;
    const stored = localStorage.getItem(`venue_reminder_${currentUser.id}`);
    if (!stored) return false;
    // stored = "다음 월요일" 날짜 → 그 날이 지나기 전까지 숨김
    return getKSTToday() < stored;
  });

  if (!isPrivileged || dismissed) return null;

  function handleYes() {
    const nextMon = getNextMonday(getKSTToday());
    localStorage.setItem(`venue_reminder_${currentUser.id}`, nextMon);
    setDismissed(true);
  }

  function handleNo() {
    window.open(VENUE_URL, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-xl flex-shrink-0">🤔</span>
        <p className="text-sm font-bold text-amber-800">장소 예약 완료되었나요?</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleYes}
          className="flex-1 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition"
        >
          네!
        </button>
        <button
          onClick={handleNo}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-bold bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl transition"
        >
          아니요😱 <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
