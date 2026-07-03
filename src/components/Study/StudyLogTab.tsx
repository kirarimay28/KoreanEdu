import { useState } from 'react';
import { Check } from 'lucide-react';
import type { User, StudyLog } from '../../types';
import { getStudyLog, getUsers, upsertStudyLog, removeStudyLog } from '../../store';
import NameWithCrown from '../common/NameWithCrown';

interface Props {
  date: string;
  currentUser: User;
}

export default function StudyLogTab({ date, currentUser }: Props) {
  const [logDate, setLogDate] = useState(date);
  const [tick, setTick] = useState(0);

  const users = getUsers();

  function isChecked(userId: string) {
    return !!getStudyLog(userId, logDate);
  }

  function toggleCheck(user: User) {
    if (isChecked(user.id)) {
      removeStudyLog(user.id, logDate);
    } else {
      const log: StudyLog = {
        id: `${user.id}_${logDate}`,
        userId: user.id,
        username: user.username,
        date: logDate,
        workName: '',
        difficulties: '',
        selfFeedback: '',
        updatedAt: new Date().toISOString(),
      };
      upsertStudyLog(log);
    }
    setTick(t => t + 1);
  }

  const checkedCount = users.filter(u => isChecked(u.id)).length;

  return (
    <div className="space-y-4" key={tick}>

      {/* 날짜 선택 */}
      <div className="card flex items-center gap-3 py-3">
        <span className="text-xs font-bold text-gray-500 flex-shrink-0">날짜</span>
        <input
          type="date"
          className="flex-1 text-sm font-semibold text-gray-800 bg-transparent outline-none cursor-pointer"
          value={logDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={e => { if (e.target.value) setLogDate(e.target.value); }}
        />
        <span className="text-xs text-gray-400 flex-shrink-0">{checkedCount}/{users.length}명</span>
      </div>

      {/* 멤버 체크 */}
      <div className="card space-y-2">
        {users.map(user => {
          const checked = isChecked(user.id);
          const isSelf = user.id === currentUser.id;
          return (
            <button
              key={user.id}
              onClick={() => toggleCheck(user)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                checked ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                checked ? 'bg-green-500' : 'bg-gray-200'
              }`}>
                {checked
                  ? <Check className="w-4 h-4 text-white" />
                  : <span className="text-xs font-bold text-gray-500">{user.username[0]}</span>
                }
              </div>
              <NameWithCrown
                name={user.username}
                className={`flex-1 text-sm font-semibold ${checked ? 'text-green-700' : 'text-gray-600'}`}
              />
              {isSelf && (
                <span className="text-[10px] text-gray-400 flex-shrink-0">나</span>
              )}
              <span className={`text-xs font-bold flex-shrink-0 ${checked ? 'text-green-500' : 'text-gray-300'}`}>
                {checked ? '완료' : '미완료'}
              </span>
            </button>
          );
        })}
        {users.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-6">등록된 멤버가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
