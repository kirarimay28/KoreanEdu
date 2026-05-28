import type { User } from '../../types';
import { getUsers, getAttendanceEntries } from '../../store';
import { UserCircle2, CalendarCheck, Trophy, Star } from 'lucide-react';

interface Props {
  currentUser: User;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}

export default function MemberTab({ currentUser }: Props) {
  const users = getUsers().slice().sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const attendanceEntries = getAttendanceEntries();

  function getAttendanceCount(userId: string): number {
    return attendanceEntries.filter(e => e.userId === userId).length;
  }

  const sorted = users.slice().sort(
    (a, b) => getAttendanceCount(b.id) - getAttendanceCount(a.id)
  );
  const maxCount = sorted.length > 0 ? getAttendanceCount(sorted[0].id) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <UserCircle2 className="w-4 h-4 text-primary-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          스터디 멤버 {users.length}명
        </span>
      </div>

      {sorted.map((user, rank) => {
        const isMe = user.id === currentUser.id;
        const count = getAttendanceCount(user.id);
        const isTop = count > 0 && count === maxCount;

        return (
          <div
            key={user.id}
            className={`card flex items-start gap-4 ${isMe ? 'ring-2 ring-primary-200 bg-primary-50/30' : ''}`}
          >
            {/* Rank */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                rank === 0 ? 'bg-amber-100 text-amber-600' :
                rank === 1 ? 'bg-gray-100 text-gray-500' :
                rank === 2 ? 'bg-orange-100 text-orange-500' :
                'bg-gray-50 text-gray-400'
              }`}>
                {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-800 text-sm">{user.username}</span>
                {isMe && (
                  <span className="text-[10px] font-semibold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                    나
                  </span>
                )}
                {isTop && count > 0 && (
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5" />
                    출석왕
                  </span>
                )}
              </div>
              {user.resolution && (
                <p className="text-xs text-gray-500 italic mt-0.5 line-clamp-2">
                  "{user.resolution}"
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <CalendarCheck className="w-3.5 h-3.5 text-primary-400" />
                  <span>출석 <span className="font-semibold text-gray-600">{count}일</span></span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>가입 {formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
