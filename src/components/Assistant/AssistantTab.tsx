import { useState } from 'react';
import type { User } from '../../types';
import TodayView from './TodayView';
import WeekView from './WeekView';
import ScheduleInput from './ScheduleInput';
import GradesView from './GradesView';
import AIChat from './AIChat';
import { getKSTToday } from '../common/DateNavigator';
import { CalendarDays, Calendar, ListTodo, BarChart2, Bot } from 'lucide-react';

interface Props {
  currentUser: User;
}

type SubTab = 'today' | 'week' | 'schedule' | 'grades' | 'ai';

const SUBTABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today',    label: '오늘',   icon: CalendarDays },
  { id: 'week',     label: '주간',   icon: Calendar },
  { id: 'schedule', label: '일정',   icon: ListTodo },
  { id: 'grades',   label: '성적',   icon: BarChart2 },
  { id: 'ai',       label: '비서',   icon: Bot },
];

export default function AssistantTab({ currentUser }: Props) {
  const [sub, setSub] = useState<SubTab>('today');
  const today = getKSTToday();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-primary-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">임용 AI 비서</p>
          <p className="text-[10px] text-gray-400">{today} · 서연 전용</p>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-0.5 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.55)' }}>
        {SUBTABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSub(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] rounded-lg transition-all font-medium whitespace-nowrap min-w-0 ${
                sub === tab.id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div key={sub} className="jade-enter">
        {sub === 'today'    && <TodayView currentUser={currentUser} today={today} />}
        {sub === 'week'     && <WeekView currentUser={currentUser} today={today} />}
        {sub === 'schedule' && <ScheduleInput currentUser={currentUser} today={today} />}
        {sub === 'grades'   && <GradesView currentUser={currentUser} />}
        {sub === 'ai'       && <AIChat currentUser={currentUser} />}
      </div>
    </div>
  );
}


