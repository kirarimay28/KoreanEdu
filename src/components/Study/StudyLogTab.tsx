import { useState, useRef, useEffect } from 'react';
import { Save, ChevronDown, ChevronUp, Upload, Sparkles, X } from 'lucide-react';
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

interface LogFields {
  classicAnalysis: string;
  classicDifficulty: string;
  modernPoetAnalysis: string;
  modernPoetDifficulty: string;
  modernProseAnalysis: string;
  modernProseDifficulty: string;
  wrongAnswerAnalysis: string;
  examTypeAnalysis: string;
  studyGroupLearnings: string;
  selfFeedback: string;
}

function fieldsFromSaved(saved: StudyLog | undefined): LogFields {
  return {
    classicAnalysis:       saved?.classicAnalysis       ?? '',
    classicDifficulty:     saved?.classicDifficulty     ?? '',
    modernPoetAnalysis:    saved?.modernPoetAnalysis    ?? '',
    modernPoetDifficulty:  saved?.modernPoetDifficulty  ?? '',
    modernProseAnalysis:   saved?.modernProseAnalysis   ?? '',
    modernProseDifficulty: saved?.modernProseDifficulty ?? '',
    wrongAnswerAnalysis:   saved?.wrongAnswerAnalysis   ?? '',
    examTypeAnalysis:      saved?.examTypeAnalysis      ?? '',
    studyGroupLearnings:   saved?.studyGroupLearnings   ?? '',
    selfFeedback:          saved?.selfFeedback          ?? '',
  };
}

const MEMBER_SECTIONS: { key: keyof StudyLog; label: string; group: string }[] = [
  { key: 'classicAnalysis',       label: '고전 — 분석 내용',            group: '① 작품 분석' },
  { key: 'classicDifficulty',     label: '고전 — 어려웠던 부분',         group: '① 작품 분석' },
  { key: 'modernPoetAnalysis',    label: '현대시 — 분석 내용',           group: '① 작품 분석' },
  { key: 'modernPoetDifficulty',  label: '현대시 — 어려웠던 부분',        group: '① 작품 분석' },
  { key: 'modernProseAnalysis',   label: '현대산문 — 분석 내용',          group: '① 작품 분석' },
  { key: 'modernProseDifficulty', label: '현대산문 — 어려웠던 부분',       group: '① 작품 분석' },
  { key: 'wrongAnswerAnalysis',   label: '오답 원인 분석',               group: '② 기출 풀이' },
  { key: 'examTypeAnalysis',      label: '임용 기출 유형 분석',           group: '② 기출 풀이' },
  { key: 'studyGroupLearnings',   label: '스터디에서 배운 것',            group: '③ 스터디 소감' },
  { key: 'selfFeedback',          label: '자가 피드백 & 다음 계획',        group: '③ 스터디 소감' },
];

export default function StudyLogTab({ date, currentUser }: Props) {
  const [logDate, setLogDate]         = useState(date);
  const [fields, setFields]           = useState<LogFields>(() => fieldsFromSaved(getStudyLog(currentUser.id, date)));
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [tick, setTick]               = useState(0);
  const [pdfFile, setPdfFile]         = useState<File | null>(null);
  const [analyzing, setAnalyzing]     = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload form fields when date changes
  useEffect(() => {
    setFields(fieldsFromSaved(getStudyLog(currentUser.id, logDate)));
    setPdfFile(null);
    setAnalyzeError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [logDate, currentUser.id]);

  const saved = getStudyLog(currentUser.id, logDate);

  const thisWeekMonday = getWeekMonday(logDate);
  const prevD = new Date(thisWeekMonday + 'T00:00:00');
  prevD.setDate(prevD.getDate() - 7);
  const prevWeekMonday = prevD.toISOString().slice(0, 10);
  const notice = getAssignmentNoticeForWeek(prevWeekMonday);

  const classicName     = notice?.classicWork    || '';
  const modernPoetName  = notice?.modernPoetWork || '';
  const modernProseName = notice?.modernProseWork || '';

  function setField(key: keyof LogFields, value: string) {
    setFields(f => ({ ...f, [key]: value }));
  }

  function handleSave() {
    const log: StudyLog = {
      id: `${currentUser.id}_${logDate}`,
      userId: currentUser.id,
      username: currentUser.username,
      date: logDate,
      ...fields,
      workName: '',
      difficulties: '',
      updatedAt: new Date().toISOString(),
    };
    upsertStudyLog(log);
    setTick(t => t + 1);
  }

  async function handleAnalyze() {
    if (!pdfFile) return;
    if (pdfFile.type !== 'application/pdf') {
      setAnalyzeError('PDF 파일만 업로드 가능합니다.');
      return;
    }
    if (pdfFile.size > 4 * 1024 * 1024) {
      setAnalyzeError('파일 크기가 4MB를 초과합니다.');
      return;
    }

    setAnalyzing(true);
    setAnalyzeError('');

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          const result = e.target?.result;
          if (typeof result !== 'string') { reject(new Error('파일 읽기 실패')); return; }
          resolve(result.split(',')[1] ?? '');
        };
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsDataURL(pdfFile);
      });

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: base64,
          notice: notice
            ? { classicWork: notice.classicWork, modernPoetWork: notice.modernPoetWork, modernProseWork: notice.modernProseWork }
            : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `서버 오류 (${res.status})`);
      }

      const data = await res.json() as Partial<LogFields>;
      setFields(prev => ({
        classicAnalysis:       typeof data.classicAnalysis === 'string'       ? data.classicAnalysis       : prev.classicAnalysis,
        classicDifficulty:     typeof data.classicDifficulty === 'string'     ? data.classicDifficulty     : prev.classicDifficulty,
        modernPoetAnalysis:    typeof data.modernPoetAnalysis === 'string'    ? data.modernPoetAnalysis    : prev.modernPoetAnalysis,
        modernPoetDifficulty:  typeof data.modernPoetDifficulty === 'string'  ? data.modernPoetDifficulty  : prev.modernPoetDifficulty,
        modernProseAnalysis:   typeof data.modernProseAnalysis === 'string'   ? data.modernProseAnalysis   : prev.modernProseAnalysis,
        modernProseDifficulty: typeof data.modernProseDifficulty === 'string' ? data.modernProseDifficulty : prev.modernProseDifficulty,
        wrongAnswerAnalysis:   typeof data.wrongAnswerAnalysis === 'string'   ? data.wrongAnswerAnalysis   : prev.wrongAnswerAnalysis,
        examTypeAnalysis:      typeof data.examTypeAnalysis === 'string'      ? data.examTypeAnalysis      : prev.examTypeAnalysis,
        studyGroupLearnings:   typeof data.studyGroupLearnings === 'string'   ? data.studyGroupLearnings   : prev.studyGroupLearnings,
        selfFeedback:          typeof data.selfFeedback === 'string'          ? data.selfFeedback          : prev.selfFeedback,
      }));
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
    }
  }

  const otherUsers = getUsers().filter(u => u.id !== currentUser.id);
  const otherLogs  = getStudyLogsForDate(logDate).filter(l => l.userId !== currentUser.id);

  const savedFields = fieldsFromSaved(saved);
  const dirty = (Object.keys(fields) as (keyof LogFields)[]).some(k => fields[k] !== savedFields[k]);

  return (
    <div className="space-y-4" key={tick}>

      {/* ── 날짜 선택 ── */}
      <div className="card flex items-center gap-3 py-3">
        <span className="text-xs font-bold text-gray-500 flex-shrink-0">날짜</span>
        <input
          type="date"
          className="flex-1 text-sm font-semibold text-gray-800 bg-transparent outline-none cursor-pointer"
          value={logDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={e => { if (e.target.value) setLogDate(e.target.value); }}
        />
        {saved && (
          <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">저장됨</span>
        )}
      </div>

      {/* ── AI 자동 작성 ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <p className="text-xs font-bold text-gray-700">AI 자동 작성</p>
          </div>
          <span className="text-[10px] text-gray-400">PDF 업로드 → 일지 자동 정리</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => {
            setPdfFile(e.target.files?.[0] ?? null);
            setAnalyzeError('');
          }}
        />

        {pdfFile ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-xl">
            <span className="text-xs font-medium text-violet-700 flex-1 truncate">{pdfFile.name}</span>
            <button
              className="text-violet-400 hover:text-violet-600 transition flex-shrink-0"
              onClick={() => {
                setPdfFile(null);
                setAnalyzeError('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-violet-300 hover:text-violet-500 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            PDF 파일 선택 (최대 4MB)
          </button>
        )}

        {analyzeError && <p className="text-xs text-red-500">{analyzeError}</p>}

        <button
          disabled={!pdfFile || analyzing}
          onClick={handleAnalyze}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-violet-600 hover:bg-violet-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl transition"
        >
          {analyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI 분석 중...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AI 자동 작성
            </>
          )}
        </button>
      </div>

      {/* ── 내 일지 ── */}
      <div className="card space-y-5">
        <p className="text-sm font-bold text-gray-800">스터디 일지</p>

        {/* 저번 주 과제 */}
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

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">고전</span>
              {classicName && <span className="text-xs font-semibold text-gray-600">{classicName}</span>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">분석 내용</label>
              <textarea className="input-field w-full text-sm resize-none" rows={4}
                placeholder="주제·화자·갈등 구조·표현법 등 이번에 새롭게 파악한 내용을 정리하세요"
                value={fields.classicAnalysis} onChange={e => setField('classicAnalysis', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">어려웠던 부분</label>
              <textarea className="input-field w-full text-sm resize-none" rows={3}
                placeholder="분석 또는 문제 풀이에서 막혔던 지점, 헷갈렸던 개념"
                value={fields.classicDifficulty} onChange={e => setField('classicDifficulty', e.target.value)} />
            </div>
          </div>

          <div className="border-t border-dashed border-gray-100" />

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">현대시</span>
              {modernPoetName && <span className="text-xs font-semibold text-gray-600">{modernPoetName}</span>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">분석 내용</label>
              <textarea className="input-field w-full text-sm resize-none" rows={4}
                placeholder="화자의 정서·태도, 시적 이미지, 표현 기법, 주제 등을 정리하세요"
                value={fields.modernPoetAnalysis} onChange={e => setField('modernPoetAnalysis', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">어려웠던 부분</label>
              <textarea className="input-field w-full text-sm resize-none" rows={3}
                placeholder="분석 또는 문제 풀이에서 막혔던 지점, 헷갈렸던 개념"
                value={fields.modernPoetDifficulty} onChange={e => setField('modernPoetDifficulty', e.target.value)} />
            </div>
          </div>

          <div className="border-t border-dashed border-gray-100" />

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">현대산문</span>
              {modernProseName && <span className="text-xs font-semibold text-gray-600">{modernProseName}</span>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">분석 내용</label>
              <textarea className="input-field w-full text-sm resize-none" rows={4}
                placeholder="인물·갈등·시점·서사 구조, 주제 의식, 문학적 의미 등을 정리하세요"
                value={fields.modernProseAnalysis} onChange={e => setField('modernProseAnalysis', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">어려웠던 부분</label>
              <textarea className="input-field w-full text-sm resize-none" rows={3}
                placeholder="분석 또는 문제 풀이에서 막혔던 지점, 헷갈렸던 개념"
                value={fields.modernProseDifficulty} onChange={e => setField('modernProseDifficulty', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ② 기출 풀이 */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">② 기출 풀이</p>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">오답 원인 분석</label>
            <textarea className="input-field w-full text-sm resize-none" rows={4}
              placeholder="틀린 문항이 있다면 왜 틀렸는지, 어떤 근거로 오답을 골랐는지, 놓친 포인트가 무엇인지 정리하세요"
              value={fields.wrongAnswerAnalysis} onChange={e => setField('wrongAnswerAnalysis', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">임용 기출 유형 분석</label>
            <textarea className="input-field w-full text-sm resize-none" rows={4}
              placeholder="지문·문제·선지 삼단 구조로 분석한 내용, 자주 나오는 키워드, 출제 패턴 정리"
              value={fields.examTypeAnalysis} onChange={e => setField('examTypeAnalysis', e.target.value)} />
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ③ 스터디 소감 */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">③ 스터디 소감</p>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">스터디에서 배운 것</label>
            <textarea className="input-field w-full text-sm resize-none" rows={4}
              placeholder="다른 멤버의 분석·발표에서 새롭게 알게 된 점, 토론을 통해 얻은 인사이트"
              value={fields.studyGroupLearnings} onChange={e => setField('studyGroupLearnings', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">자가 피드백 & 다음 계획</label>
            <textarea className="input-field w-full text-sm resize-none" rows={4}
              placeholder="이번 스터디 자가 평가 (잘한 점 / 아쉬운 점), 다음 주 보완할 점과 구체적인 학습 계획"
              value={fields.selfFeedback} onChange={e => setField('selfFeedback', e.target.value)} />
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

      {/* ── 멤버 일지 ── */}
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
