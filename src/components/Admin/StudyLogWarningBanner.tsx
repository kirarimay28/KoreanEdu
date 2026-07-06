import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { getUsers, getStudySessionNotesForWeek } from '../../store';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getThisWeekMonday(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return localDateStr(d);
}

export default function StudyLogWarningBanner() {
  const [dismissed, setDismissed] = useState(false);

  // 목요일(4) 이후부터 표시 (목·금·토·일)
  const dayOfWeek = new Date().getDay();
  const isThursdayOrLater = dayOfWeek === 0 || dayOfWeek >= 4;

  if (dismissed || !isThursdayOrLater) return null;

  const weekKey = getThisWeekMonday();
  const allUsers = getUsers();
  const weekNotes = getStudySessionNotesForWeek(weekKey);
  const uploadedIds = new Set(weekNotes.map(n => n.userId));
  const missingUsers = allUsers.filter(u => !uploadedIds.has(u.id));

  if (missingUsers.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-3 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-red-700 mb-1">⚠️ 일지 미업로드 벌금 대상</p>
        <p className="text-[10px] text-red-500 flex flex-wrap gap-x-2">
          {missingUsers.map(u => (
            <span key={u.id} className="font-semibold">{u.username}</span>
          ))}
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-red-200 hover:text-red-400 flex-shrink-0 transition">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
