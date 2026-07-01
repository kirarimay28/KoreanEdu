import { useState } from 'react';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';
import type { User, StudyLog } from '../../types';
import { getStudyLog, getStudyLogsForDate, upsertStudyLog, getUsers, getAssignmentNoticeForWeek } from '../../store';
import NameWithCrown from '../common/NameWithCrown';

interface Props {
  date: string;
  currentUser: User;
}

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

const MEMBER_SECTIONS: { key: keyof StudyLog; label: string; group: string }[] = [
  { key: 'classicAnalysis',      label: '고전 — 분석 내용',            group: '① 작품 분석' },
  { key: 'classicDifficulty',    label: '고전 — 어려웠던 부분',         group: '① 작품 분석' },
  { key: 'modernPoetAnalysis',   label: '현대시 — 분석 내용',           group: '① 작품 분석' },
  { key: 'modernPoetDifficulty', label: '현대시 — 어려웠던 부분',        group: '① 작품 분석' },
  { key: 'modernProseAnalysis',  label: '현대산문 — 분석 내용',          group: '① 작품 분석' },
  { key: 'modernProseDifficulty',label: '현대산문 — 어려웠던 부분',       group: '① 작품 분석' },
  { key: 'wrongAnswerAnalysis',  label: '오답 원인 분석',               group: '② 기출 풀이' },
  { key: 'examTypeAnalysis',     label: '임용 기출 유형 분석',           group: '② 기출 풀이' },
  { key: 'studyGroupLearnings',  label: '스터디에서 배운 것',            group: '③ 스터디 소감' },
  { key: 'selfFeedback',        label: '자가 피드백 & 다음 계획',        group: '③ 스터디 소감' },
];

export default function StudyLogTab({ date, currentUser }: Props) {
  const saved = getStudyLog(currentUser.id, date);

  const thisWeekMonday = getWeekMonday(date);
  const prevD = new Date(thisWeekMonday + 'T00:00:00');
  prevD.setDate(prevD.getDate() - 7);
  const prevWeekMonday = prevD.toISOString().slice(0, 10);
  const notice = getAssignmentNoticeForWeek(prevWeekMonday);

  const [classicAnalysis,       setClassicAnalysis]       = useState(saved?.classicAnalysis ?? '');
  const [classicDifficulty,     setClassicDifficulty]     = useState(saved?.classicDifficulty ?? '');
  const [modernPoetAnalysis,    setModernPoetAnalysis]    = useState(saved?.modernPoetAnalysis ?? '');
  const [modernPoetDifficulty,  setModernPoetDifficulty]  = useState(saved?.modernPoetDifficulty ?? '');
  const [modernProseAnalysis,   setModernProseAnalysis]   = useState(saved?.modernProseAnalysis ?? '');
  const [modernProseDifficulty, setModernProseDifficulty] = useState(saved?.modernProseDifficulty ?? '');
  const [wrongAnswerAnalysis,   setWrongAnswerAnalysis]   = useState(saved?.wrongAnswerAnalysis ?? '');
  const [examTypeAnalysis,      setExamTypeAnalysis]      = useState(saved?.examTypeAnalysis ?? '');
  const [studyGroupLearnings,   setStudyGroupLearnings]   = useState(saved?.studyGroupLearnings ?? '');
  const [selfFeedback,          setSelfFeedback]          = useState(saved?.selfFeedback ?? '');
  const [expandedMember,        setExpandedMember]        = useState<string | null>(null);
  const [tick,                  setTick]                  = useState(0);

  function handleSave() {
    const log: StudyLog = {
      id: `${currentUser.id}_${date}`,
      userId: currentUser.id,
      username: currentUser.username,
      date,
      classicAnalysis,
      classicDifficulty,
      modernPoetAnalysis,
      modernPoetDifficulty,
      modernProseAnalysis,
      modernProseDifficulty,
      wrongAnswerAnalysis,
      examTypeAnalysis,
      studyGroupLearnings,
      selfFeedback,
      workName: '',
      difficulties: '',
      updatedAt: new Date().toISOString(),
    };
    upsertStudyLog(log);
    setTick(t => t + 1);
  }

  const otherUsers = getUsers().filter(u => u.id !== currentUser.id);
  const otherLogs = getStudyLogsForDate(date).filter(l => l.userId !== currentUser.id);

  const dirty =
    classicAnalysis       !== (saved?.classicAnalysis ?? '') ||
    classicDifficulty     !== (saved?.classicDifficulty ?? '') ||
    modernPoetAnalysis    !== (saved?.modernPoetAnalysis ?? '') ||
    modernPoetDifficulty  !== (saved?.modernPoetDifficulty ?? '') ||
    modernProseAnalysis   !== (saved?.modernProseAnalysis ?? '') ||
    modernProseDifficulty !== (saved?.modernProseDifficulty ?? '') ||
    wrongAnswerAnalysis   !== (saved?.wrongAnswerAnalysis ?? '') ||
    examTypeAnalysis      !== (saved?.examTypeAnalysis ?? '') ||
    studyGroupLearnings   !== (saved?.studyGroupLearnings ?? '') ||
    selfFeedback          !== (saved?.selfFeedback ?? '');

  // 저번 주 과제 작품명
  const classicName     = notice?.classicWork    || '';
  const modernPoetName  = notice?.modernPoetWork || '';
  const modernProseName = notice?.modernProseWork || '';

  return (
    <div className="space-y-4" key={tick}>
      {/* 내 일지 */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">스터디 일지</p>
          {saved && !dirty && (
            <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full">저장됨</span>
          )}
        </div>

        {/* 저번 주 과제 참고 */}
        {notice ? (
          <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 space-y-1">
            <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest mb-1.5">저번 주 과제</p>
            {classicName     && <p className="text-xs text-primary-700"><span className="font-semibold w-14 inline-block">고전</span>{classicName}</p>}
            {modernPoetName  && <p className="text-xs text-primary-700"><span className="font-semibold w-14 inline-block">현대시</span>{modernPoetName}</p>}
            {modernProseName && <p className="text-xs text-primary-700"><span className="font-semibold w-14 inline-block">현대산문</span>{modernProseName}</p>}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400">저번 주 과제 공지가 없습니다.</p>
          </div>
        )}

        <div className="border-t border-gray-100" />

        {/* ① 작품 분석 */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">① 작품 분석</p>

          {/* 고전 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">고전</span>
              {classicName && <span className="text-xs font-semibold text-gray-600">{classicName}</span>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">분석 내용</label>
              <textarea
                className="input-field w-full text-sm resize-none"
                rows={4}
                placeholder="주제·화자·갈등 구조·표현법 등 이번에 새롭게 파악한 내용을 정리하세요"
                value={classicAnalysis}
                onChange={e => setClassicAnalysis(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">어려웠던 부분</label>
              <textarea
                className="input-field w-full text-sm resize-none"
                rows={3}
                placeholder="분석 또는 문제 풀이에서 막혔던 지점, 헷갈렸던 개념"
                value={classicDifficulty}
                onChange={e => setClassicDifficulty(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-dashed border-gray-100" />

          {/* 현대시 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">현대시</span>
              {modernPoetName && <span className="text-xs font-semibold text-gray-600">{modernPoetName}</span>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">분석 내용</label>
              <textarea
                className="input-field w-full text-sm resize-none"
                rows={4}
                placeholder="화자의 정서·태도, 시적 이미지, 표현 기법, 주제 등을 정리하세요"
                value={modernPoetAnalysis}
                onChange={e => setModernPoetAnalysis(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">어려웠던 부분</label>
              <textarea
                className="input-field w-full text-sm resize-none"
                rows={3}
                placeholder="분석 또는 문제 풀이에서 막혔던 지점, 헷갈렸던 개념"
                value={modernPoetDifficulty}
                onChange={e => setModernPoetDifficulty(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-dashed border-gray-100" />

          {/* 현대산문 */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">현대산문</span>
              {modernProseName && <span className="text-xs font-semibold text-gray-600">{modernProseName}</span>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">분석 내용</label>
              <textarea
                className="input-field w-full text-sm resize-none"
                rows={4}
                placeholder="인물·갈등·시점·서사 구조, 주제 의식, 문학적 의미 등을 정리하세요"
                value={modernProseAnalysis}
                onChange={e => setModernProseAnalysis(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">어려웠던 부분</label>
              <textarea
                className="input-field w-full text-sm resize-none"
                rows={3}
                placeholder="분석 또는 문제 풀이에서 막혔던 지점, 헷갈렸던 개념"
                value={modernProseDifficulty}
                onChange={e => setModernProseDifficulty(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ② 기출 풀이 */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">② 기출 풀이</p>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">오답 원인 분석</label>
            <textarea
              className="input-field w-full text-sm resize-none"
              rows={4}
              placeholder="틀린 문항이 있다면 왜 틀렸는지, 어떤 근거로 오답을 골랐는지, 놓친 포인트가 무엇인지 정리하세요"
              value={wrongAnswerAnalysis}
              onChange={e => setWrongAnswerAnalysis(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">임용 기출 유형 분석</label>
            <textarea
              className="input-field w-full text-sm resize-none"
              rows={4}
              placeholder="지문·문제·선지 삼단 구조로 분석한 내용, 자주 나오는 키워드, 출제 패턴 정리"
              value={examTypeAnalysis}
              onChange={e => setExamTypeAnalysis(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ③ 스터디 소감 */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">③ 스터디 소감</p>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">스터디에서 배운 것</label>
            <textarea
              className="input-field w-full text-sm resize-none"
              rows={4}
              placeholder="다른 멤버의 분석·발표에서 새롭게 알게 된 점, 토론을 통해 얻은 인사이트"
              value={studyGroupLearnings}
              onChange={e => setStudyGroupLearnings(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">자가 피드백 & 다음 계획</label>
            <textarea
              className="input-field w-full text-sm resize-none"
              rows={4}
              placeholder="이번 스터디 자가 평가 (잘한 점 / 아쉬운 점), 다음 주 보완할 점과 구체적인 학습 계획"
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

      {/* 멤버 일지 */}
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
                      <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">작성완료</span>
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-300">미작성</span>
                  )}
                </button>

                {isExpanded && log && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-4">
                    {['① 작품 분석', '② 기출 풀이', '③ 스터디 소감'].map(group => {
                      const sections = MEMBER_SECTIONS.filter(s => s.group === group);
                      const hasContent = sections.some(s => !!log[s.key]);
                      if (!hasContent) return null;
                      return (
                        <div key={group} className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group}</p>
                          {sections.map(({ key, label }) => {
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
