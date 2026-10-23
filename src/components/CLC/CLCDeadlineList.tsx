import { BookOpen, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { useCLCData, getUpcomingDeadlines } from './useCLCData';

interface Props {
  uid: string;
}

function formatDeadline(d: Date): string {
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);

  if (diff < 0) return '마감됨';
  if (days === 0 && hours < 1) return '1시간 미만';
  if (days === 0) return `${hours}시간 후`;
  if (days === 1) return '내일';
  if (days <= 7) return `${days}일 후`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function urgencyColor(d: Date, done: boolean): string {
  if (done) return 'text-gray-400';
  const diff = d.getTime() - new Date().getTime();
  if (diff < 0) return 'text-gray-400';
  if (diff < 86400000) return 'text-red-500';
  if (diff < 86400000 * 3) return 'text-orange-500';
  return 'text-gray-500';
}

export default function CLCDeadlineList({ uid }: Props) {
  const { credMeta, data, loading } = useCLCData(uid);

  if (loading) return null;
  if (!credMeta?.enabled) return null;

  const deadlines = getUpcomingDeadlines(data);

  if (deadlines.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-gray-400">
        다가오는 마감이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {deadlines.map((item, i) => {
        const Icon = item.type === 'assignment' ? FileText : BookOpen;
        const color = urgencyColor(item.deadline, item.done);
        const label = formatDeadline(item.deadline);
        const urgent = !item.done && item.deadline.getTime() - Date.now() < 86400000;

        return (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition
              ${item.done ? 'bg-gray-50 border-gray-100 opacity-60' : urgent ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
              ${item.done ? 'bg-gray-100' : urgent ? 'bg-red-100' : 'bg-indigo-50'}`}>
              {item.done
                ? <CheckCircle2 className="w-4 h-4 text-gray-400" />
                : <Icon className={`w-4 h-4 ${urgent ? 'text-red-400' : 'text-indigo-400'}`} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {item.label}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{item.courseName}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Clock className={`w-3 h-3 ${color}`} />
              <span className={`text-xs font-medium ${color}`}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
