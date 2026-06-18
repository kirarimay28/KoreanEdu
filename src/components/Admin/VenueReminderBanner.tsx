import { useState } from 'react';
import type { User } from '../../types';
import { getKSTToday } from '../common/DateNavigator';
import { ExternalLink } from 'lucide-react';

const VENUE_URL = 'https://thechoa.chosun.ac.kr/clientMain/a/t/main.do';

function getThisSunday(): string | null {
  const today = getKSTToday();
  const d = new Date(today + 'T00:00:00');
  return d.getDay() === 0 ? today : null;
}

interface Props { currentUser: User; }

export default function VenueReminderBanner({ currentUser }: Props) {
  const sunday = getThisSunday();

  const [dismissed, setDismissed] = useState(() => {
    if (!sunday || currentUser.role !== 'subadmin') return true;
    const stored = localStorage.getItem(`venue_reminder_${currentUser.id}`);
    return stored === sunday;
  });

  if (!sunday || currentUser.role !== 'subadmin' || dismissed) return null;

  function handleYes() {
    localStorage.setItem(`venue_reminder_${currentUser.id}`, sunday!);
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
