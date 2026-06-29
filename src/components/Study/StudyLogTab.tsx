import { useState } from 'react';
import { Save, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import type { User, StudyLog } from '../../types';
import { getStudyLog, getStudyLogsForDate, upsertStudyLog, getUsers, getAssignmentNoticeForWeek } from '../../store';
import NameWithCrown from '../common/NameWithCrown';

type WorkType = '고전시가' | '고전산문' | '현대시' | '현대산문';

const WORK_TYPES: WorkType[] = ['고전시가', '고전산문', '현대시', '현대산문'];

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function noticeWorkName(wt: WorkType, notice: NonNullable<ReturnType<typeof getAssignmentNoticeForWeek>>): string {
  if (wt === '고전시가' || wt === '고전산문') return notice.classicWork;
  if (wt === '현대시') return notice.modernPoetWork;
  return notice.modernProseWork;
}

interface Props {
  date: string;
  currentUser: User;
}

const MEMBER_SECTIONS: { key: keyof StudyLog; label: string }[] = [
  { key: 'newInsights',          label: '새롭게 파악한 내용' },
  { key: 'difficulties',         label: '어려웠던 부분' },
  { key: 'wrongAnswerAnalysis',  label: '오답 원인 분석' },
  { key: 'studyGroupLearnings',  label: '스터디에서 얻은 것' },
  { key: 'selfFeedback',         label: '자가 피드백 & 다음 계획' },
];

export default function StudyLogTab({ date, currentUser }: Props) {
  const saved = getStudyLog(currentUser.id, date);

  const thisWeekMonday = getWeekMonday(date);
  const prevD = new Date(thisWeekMonday + 'T00:00:00');
  prevD.setDate(prevD.getDate() - 7);
  const prevWeekMonday = prevD.toISOString().slice(0, 10);
  const notice = getAssignmentNoticeForWeek(prevWeekMonday);

  const [workType, setWorkType] = useState<WorkType | ''>((saved?.workType as WorkType) ?? '');
  const [workName, setWorkName] = useState(saved?.workName ?? '');
  const [workNameEditing, setWorkNameEditing] = useState(false);
  const [newInsights, setNewInsights] = useState(saved?.newInsights ?? '');
  const [difficulties, setDifficulties] = useState(saved?.difficulties ?? '');
  const [wrongAnswerAnalysis, setWrongAnswerAnalysis] = useState(saved?.wrongAnswerAnalysis ?? '');
  const [studyGroupLearnings, setStudyGroupLearnings] = useState(saved?.studyGroupLearnings ?? '');
  const [selfFeedback, setSelfFeedback] = useState(saved?.selfFeedback ?? '');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  function handleWorkTypeSelect(wt: WorkType) {
    setWorkType(wt);
    if (notice) {
      setWorkName(noticeWorkName(wt, notice));
      setWorkNameEditing(false);
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
      newInsights,
      difficulties,
      wrongAnswerAnalysis,
      studyGroupLearnings,
      selfFeedback,
      updatedAt: new Date().toISOString(),
    };
    upsertStudyLog(log);
    setWorkNameEditing(false);
    setTick(t => t + 1);
  }

  const otherUsers = getUsers().filter(u => u.id !== currentUser.id);
  const otherLogs = getStudyLogsForDate(date).filter(l => l.userId !== currentUser.id);

  const dirty =
    workType !== ((saved?.workType ?? '') as WorkType | '') ||
    workName !== (saved?.workName ?? '') ||
    newInsights !== (saved?.newInsights ?? '') ||
    difficulties !== (saved?.difficulties ?? '') ||
    wrongAnswerAnalysis !== (saved?.wrongAnswerAnalysis ?? '') ||
    studyGroupLearnings !== (saved?.studyGroupLearnings ?? '') ||
    selfFeedback !== (saved?.selfFeedback ?? '');

  return (
    <div className="space-y-4" key={tick}>
      {/* My log */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">스터디 일지</p>
          {saved && !dirty && (
            <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full">저장됨</span>
          )}
        </div>

        {/* Work type + work name */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 block">작품 유형</label>
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

          {workType && (
            <div className="flex items-center gap-2 bg-primary-50 rounded-xl px-3 py-2.5">
              {workNameEditing ? (
                <input
                  autoFocus
                  className="flex-1 text-sm bg-transparent outline-none text-gray-800 font-medium"
                  value={workName}
                  onChange={e => setWorkName(e.target.value)}
                  onBlur={() => setWorkNameEditing(false)}
                  onKeyDown={e => e.key === 'Enter' && setWorkNameEditing(false)}
                />
              ) : (
                <span className="flex-1 text-sm font-semibold text-primary-800">
                  {workName || <span className="text-primary-400 font-normal">작품명 없음</span>}
                </span>
              )}
              <button
                onClick={() => setWorkNameEditing(v => !v)}
                className="text-primary-400 hover:text-primary-600 transition flex-shrink-0"
                title="작품명 수정"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Section 1: 작품 분석 */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">① 작품 분석</p>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">새롭게 파악한 내용</label>
            <textarea
              className="input-field w-full text-sm resize-none"
              rows={3}
              placeholder="주제, 화자, 표현 방식 등 이번에 새롭게 이해한 내용"
              value={newInsights}
              onChange={e => setNewInsights(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">어려웠던 부분</label>
            <textarea
              className="input-field w-full text-sm resize-none"
              rows={3}
              placeholder="분석하거나 문제 풀면서 막혔던 부분"
              value={difficulties}
              onChange={e => setDifficulties(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Section 2: 기출 풀이 */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">② 기출 풀이</p>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">오답 원인 분석</label>
            <textarea
              className="input-field w-full text-sm resize-none"
              rows={3}
              placeholder="틀린 문항이 있다면 왜 틀렸는지, 어떤 부분을 놓쳤는지"
              value={wrongAnswerAnalysis}
              onChange={e => setWrongAnswerAnalysis(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Section 3: 스터디 소감 */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">③ 스터디 소감</p>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">스터디에서 얻은 것</label>
            <textarea
              className="input-field w-full text-sm resize-none"
              rows={3}
              placeholder="토론에서 새롭게 알게 된 점, 다른 멤버에게 배운 것"
              value={studyGroupLearnings}
              onChange={e => setStudyGroupLearnings(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">자가 피드백 & 다음 계획</label>
            <textarea
              className="input-field w-full text-sm resize-none"
              rows={3}
              placeholder="이번 스터디 자가 평가, 다음 주 보완할 점"
              value={selfFeedback}
              onChange={e => setSelfFeedback(e.target.value)}
            />
          </div>
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
                  <NameWithCrown name={user.username} className="text-sm font-semibold text-gray-700 flex-1 text-left" />
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
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    {MEMBER_SECTIONS.map(({ key, label }) => {
                      const val = log[key] as string | undefined;
                      if (!val) return null;
                      return (
                        <div key={key}>
                          <p className="text-[10px] font-bold text-primary-500 mb-0.5">{label}</p>
                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{val}</p>
                        </div>
                      );
                    })}
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
