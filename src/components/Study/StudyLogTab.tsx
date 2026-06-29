import { useState } from 'react';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';
import type { User, StudyLog } from '../../types';
import { getStudyLog, getStudyLogsForDate, upsertStudyLog, getUsers, getAssignmentNotice } from '../../store';

type WorkType = '고전시가' | '고전산문' | '현대시' | '현대산문';

const WORK_TYPES: WorkType[] = ['고전시가', '고전산문', '현대시', '현대산문'];

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function noticeWorkName(wt: WorkType, notice: NonNullable<ReturnType<typeof getAssignmentNotice>>): string {
  if (wt === '고전시가' || wt === '고전산문') return notice.classicWork;
  if (wt === '현대시') return notice.modernPoetWork;
  return notice.modernProseWork;
}

interface Props {
  date: string;
  currentUser: User;
}

export default function StudyLogTab({ date, currentUser }: Props) {
  const saved = getStudyLog(currentUser.id, date);
  const notice = getAssignmentNotice();
  const weekMonday = getWeekMonday(date);
  const canAutoFill = !!notice && notice.date < weekMonday;

  const [workType, setWorkType] = useState<WorkType | ''>((saved?.workType as WorkType) ?? '');
  const [workName, setWorkName] = useState(saved?.workName ?? '');
  const [difficulties, setDifficulties] = useState(saved?.difficulties ?? '');
  const [selfFeedback, setSelfFeedback] = useState(saved?.selfFeedback ?? '');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  function handleWorkTypeSelect(wt: WorkType) {
    setWorkType(wt);
    if (!workName && canAutoFill && notice) {
      setWorkName(noticeWorkName(wt, notice));
    }
  }

  function handleSave() {
    const log: StudyLog = {
      id: `${currentUser.id}_${date}`,
      userId: currentUser.id,
      username: currentUser.username,
      date,
      workType,
      workName,
      difficulties,
      selfFeedback,
      updatedAt: new Date().toISOString(),
    };
    upsertStudyLog(log);
    setTick(t => t + 1);
  }

  const otherUsers = getUsers().filter(u => u.id !== currentUser.id);
  const otherLogs = getStudyLogsForDate(date).filter(l => l.userId !== currentUser.id);

  const dirty =
    workType !== ((saved?.workType ?? '') as WorkType | '') ||
    workName !== (saved?.workName ?? '') ||
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

        {/* Work type selector */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">작품 유형</label>
          <div className="flex gap-1.5 flex-wrap">
            {WORK_TYPES.map(wt => (
              <button
                key={wt}
                onClick={() => handleWorkTypeSelect(wt)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition ${
                  workType === wt
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {wt}
              </button>
            ))}
          </div>
        </div>

        {/* Work name */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">작품명</label>
          <input
            className="input-field w-full text-sm"
            placeholder="작품명 작성"
            value={workName}
            onChange={e => setWorkName(e.target.value)}
          />
          {canAutoFill && workType && notice && (
            <p className="mt-0.5 text-[10px] text-gray-400">
              과제 작품: {noticeWorkName(workType, notice) || '—'}
            </p>
          )}
        </div>

        {/* Difficulties */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">어려웠던 점</label>
          <textarea
            className="input-field w-full text-sm resize-none"
            rows={3}
            placeholder="어려웠던 점 작성"
            value={difficulties}
            onChange={e => setDifficulties(e.target.value)}
          />
        </div>

        {/* Self feedback */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">자가 피드백</label>
          <textarea
            className="input-field w-full text-sm resize-none"
            rows={3}
            placeholder="자가 피드백 작성"
            value={selfFeedback}
            onChange={e => setSelfFeedback(e.target.value)}
          />
        </div>

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
                      <div className="flex items-center gap-1 min-w-0">
                        {log.workType && (
                          <span className="text-[10px] text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {log.workType}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 truncate max-w-[100px]">{log.workName || '—'}</span>
                      </div>
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
                    {log.workType && (
                      <div>
                        <p className="text-[10px] font-bold text-primary-500 mb-0.5">작품 유형</p>
                        <p className="text-xs text-gray-600">{log.workType}</p>
                      </div>
                    )}
                    {log.workName && (
                      <div>
                        <p className="text-[10px] font-bold text-primary-500 mb-0.5">작품명</p>
                        <p className="text-xs text-gray-600">{log.workName}</p>
                      </div>
                    )}
                    {log.difficulties && (
                      <div>
                        <p className="text-[10px] font-bold text-primary-500 mb-0.5">어려웠던 점</p>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{log.difficulties}</p>
                      </div>
                    )}
                    {log.selfFeedback && (
                      <div>
                        <p className="text-[10px] font-bold text-primary-500 mb-0.5">자가 피드백</p>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{log.selfFeedback}</p>
                      </div>
                    )}
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
