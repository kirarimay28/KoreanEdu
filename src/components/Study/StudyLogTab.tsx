import { useState } from 'react';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';
import type { User, StudyLog } from '../../types';
import { getStudyLog, getStudyLogsForDate, upsertStudyLog, getUsers } from '../../store';

interface Props {
  date: string;
  currentUser: User;
}

const FIELDS: { key: keyof Pick<StudyLog, 'workName' | 'assignedQuestions' | 'difficulties' | 'selfFeedback'>; label: string; multi: boolean }[] = [
  { key: 'workName',           label: '작품명',     multi: false },
  { key: 'assignedQuestions',  label: '맡은 문항',  multi: false },
  { key: 'difficulties',       label: '어려웠던 점', multi: true },
  { key: 'selfFeedback',       label: '자가 피드백', multi: true },
];

export default function StudyLogTab({ date, currentUser }: Props) {
  const saved = getStudyLog(currentUser.id, date);

  const [workName, setWorkName] = useState(saved?.workName ?? '');
  const [assignedQuestions, setAssignedQuestions] = useState(saved?.assignedQuestions ?? '');
  const [difficulties, setDifficulties] = useState(saved?.difficulties ?? '');
  const [selfFeedback, setSelfFeedback] = useState(saved?.selfFeedback ?? '');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const setters: Record<string, (v: string) => void> = {
    workName: setWorkName,
    assignedQuestions: setAssignedQuestions,
    difficulties: setDifficulties,
    selfFeedback: setSelfFeedback,
  };
  const values: Record<string, string> = {
    workName, assignedQuestions, difficulties, selfFeedback,
  };

  function handleSave() {
    const log: StudyLog = {
      id: `${currentUser.id}_${date}`,
      userId: currentUser.id,
      username: currentUser.username,
      date,
      workName, assignedQuestions, difficulties, selfFeedback,
      updatedAt: new Date().toISOString(),
    };
    upsertStudyLog(log);
    setTick(t => t + 1);
  }

  const otherUsers = getUsers().filter(u => u.id !== currentUser.id);
  const otherLogs = getStudyLogsForDate(date).filter(l => l.userId !== currentUser.id);

  const dirty =
    workName !== (saved?.workName ?? '') ||
    assignedQuestions !== (saved?.assignedQuestions ?? '') ||
    difficulties !== (saved?.difficulties ?? '') ||
    selfFeedback !== (saved?.selfFeedback ?? '');

  return (
    <div className="space-y-4" key={tick}>
      {/* My log */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">스터디 일지</p>
          {saved && !dirty && (
            <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full">저장됨</span>
          )}
        </div>

        {FIELDS.map(f => (
          <div key={f.key}>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{f.label}</label>
            {f.multi ? (
              <textarea
                className="input-field w-full text-sm resize-none"
                rows={3}
                placeholder={f.label + ' 작성'}
                value={values[f.key]}
                onChange={e => setters[f.key](e.target.value)}
              />
            ) : (
              <input
                className="input-field w-full text-sm"
                placeholder={f.label + ' 작성'}
                value={values[f.key]}
                onChange={e => setters[f.key](e.target.value)}
              />
            )}
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={!dirty && !!saved}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-primary-600 hover:bg-primary-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl transition"
        >
          <Save className="w-3.5 h-3.5" />
          {saved && !dirty ? '저장 완료' : '저장'}
        </button>
      </div>

      {/* Members' logs */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">멤버 일지</p>
        <div className="space-y-2">
          {otherUsers.map(user => {
            const log = otherLogs.find(l => l.userId === user.id);
            const isExpanded = expandedMember === user.id;
            return (
              <div key={user.id} className="card p-3">
                <button
                  className="w-full flex items-center gap-2"
                  onClick={() => log && setExpandedMember(isExpanded ? null : user.id)}
                >
                  <span className="text-sm font-semibold text-gray-700 flex-1 text-left">{user.username}</span>
                  {log ? (
                    <>
                      <span className="text-[11px] text-gray-400 truncate max-w-[120px]">{log.workName || '—'}</span>
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-300">미작성</span>
                  )}
                </button>

                {isExpanded && log && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    {FIELDS.map(f => log[f.key] && (
                      <div key={f.key}>
                        <p className="text-[10px] font-bold text-primary-500 mb-0.5">{f.label}</p>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{log[f.key]}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {otherUsers.length === 0 && (
            <p className="text-xs text-gray-300 text-center py-4">다른 멤버가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
