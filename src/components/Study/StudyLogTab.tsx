import { useState, useRef } from 'react';
import { Upload, Sparkles, X, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { User, StudyLog, StudySessionNote } from '../../types';
import {
  getUsers,
  upsertStudyLog, removeStudyLog,
  getStudySessionNote, getStudySessionNotesForDate,
  saveStudySessionNote, deleteStudySessionNote,
  getAssignmentNoticeForWeek,
} from '../../store';
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

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const dayOfMonth = d.getDate();
  const firstDayJS = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const firstDayISO = firstDayJS === 0 ? 7 : firstDayJS;
  const weekNum = Math.ceil((dayOfMonth + firstDayISO - 1) / 7);
  return `${month}월 ${weekNum}주차`;
}

interface NoteFields {
  classicAnalysis?: string;
  classicDifficulty?: string;
  modernPoetAnalysis?: string;
  modernPoetDifficulty?: string;
  modernProseAnalysis?: string;
  modernProseDifficulty?: string;
  wrongAnswerAnalysis?: string;
  examTypeAnalysis?: string;
  studyGroupLearnings?: string;
  selfFeedback?: string;
}

function parseNote(note: StudySessionNote): NoteFields {
  try { return JSON.parse(note.content) as NoteFields; } catch { return {}; }
}

function renderLine(line: string, i: number) {
  const isBullet = line.startsWith('•');
  const content = isBullet ? line.slice(1).trim() : line;
  const parts = content.split(/\*\*(.*?)\*\*/g);
  return (
    <p key={i} className={`text-xs text-gray-600 leading-relaxed ${isBullet ? 'flex gap-1.5' : ''}`}>
      {isBullet && <span className="text-gray-300 flex-shrink-0 mt-px">•</span>}
      <span>
        {parts.map((part, j) =>
          j % 2 === 1
            ? <strong key={j} className="font-semibold text-gray-800">{part}</strong>
            : part
        )}
      </span>
    </p>
  );
}

function NoteSection({ label, value, color }: { label: string; value?: string; color: string }) {
  if (!value) return null;
  const lines = value.split('\n').filter(l => l.trim());
  return (
    <div>
      <p className={`text-[10px] font-bold mb-1.5 ${color}`}>{label}</p>
      <div className="space-y-1">{lines.map((line, i) => renderLine(line, i))}</div>
    </div>
  );
}



function NoteContent({ fields, notice }: { fields: NoteFields; notice: ReturnType<typeof getAssignmentNoticeForWeek> }) {
  const hasWork = fields.classicAnalysis || fields.classicDifficulty || fields.modernPoetAnalysis || fields.modernPoetDifficulty || fields.modernProseAnalysis || fields.modernProseDifficulty;
  const hasExam = fields.wrongAnswerAnalysis || fields.examTypeAnalysis;
  const hasReflection = fields.studyGroupLearnings || fields.selfFeedback;

  // Build classic label from new fields, falling back to old classicWork
  const classicParts: string[] = [];
  if (notice?.classicPoetWork && notice.classicPoetWork !== '없음') classicParts.push(notice.classicPoetWork);
  if (notice?.classicProseWork && notice.classicProseWork !== '없음') classicParts.push(notice.classicProseWork);
  const classicLabel = classicParts.length > 0 ? classicParts.join(' / ') : (notice?.classicWork || '고전');

  return (
    <div className="space-y-4 pt-3">
      {hasWork && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">① 작품 분석</p>
          <div className="space-y-2.5">
            <NoteSection label={`${classicLabel} — 분석`}        value={fields.classicAnalysis}       color="text-amber-600" />
            <NoteSection label={`${classicLabel} — 어려웠던 점`} value={fields.classicDifficulty}     color="text-amber-500" />
            <NoteSection label={`${notice?.modernPoetWork && notice.modernPoetWork !== '없음' ? notice.modernPoetWork : '현대시'} — 분석`}        value={fields.modernPoetAnalysis}    color="text-sky-600" />
            <NoteSection label={`${notice?.modernPoetWork && notice.modernPoetWork !== '없음' ? notice.modernPoetWork : '현대시'} — 어려웠던 점`} value={fields.modernPoetDifficulty} color="text-sky-500" />
            <NoteSection label={`${notice?.modernProseWork && notice.modernProseWork !== '없음' ? notice.modernProseWork : '현대산문'} — 분석`}        value={fields.modernProseAnalysis}   color="text-violet-600" />
            <NoteSection label={`${notice?.modernProseWork && notice.modernProseWork !== '없음' ? notice.modernProseWork : '현대산문'} — 어려웠던 점`} value={fields.modernProseDifficulty} color="text-violet-500" />
          </div>
        </div>
      )}
      {hasExam && (
        <div className="space-y-2.5 pt-1 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">② 기출 풀이</p>
          <NoteSection label="오답 원인 분석"      value={fields.wrongAnswerAnalysis} color="text-rose-600" />
          <NoteSection label="임용 기출 유형 분석" value={fields.examTypeAnalysis}    color="text-rose-500" />
        </div>
      )}
      {hasReflection && (
        <div className="space-y-2.5 pt-1 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">③ 스터디 소감</p>
          <NoteSection label="스터디에서 배운 것"      value={fields.studyGroupLearnings} color="text-emerald-600" />
          <NoteSection label="자가 피드백 & 다음 계획" value={fields.selfFeedback}         color="text-emerald-500" />
        </div>
      )}
    </div>
  );
}

export default function StudyLogTab({ date, currentUser }: Props) {
  const [logDate, setLogDate] = useState(() => getWeekMonday(date));
  const [tick, setTick] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(currentUser.id);

  const [pdfFile, setPdfFile]           = useState<File | null>(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [analyzeStep, setAnalyzeStep]   = useState<'extract' | 'ai'>('extract');
  const [analyzeError, setAnalyzeError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const users   = getUsers();
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'subadmin';
  const allNotes = getStudySessionNotesForDate(logDate);

  const thisWeekMonday = getWeekMonday(logDate);
  const prevD = new Date(thisWeekMonday + 'T00:00:00');
  prevD.setDate(prevD.getDate() - 7);
  const notice = getAssignmentNoticeForWeek(prevD.toISOString().slice(0, 10));

  function toggleExpand(userId: string) {
    setExpandedId(prev => prev === userId ? null : userId);
    setPdfFile(null);
    setAnalyzeError('');
  }

  function handleDeleteNote(noteId: string) {
    deleteStudySessionNote(noteId);
    // also remove study log check
    const note = allNotes.find(n => n.id === noteId);
    if (note) removeStudyLog(note.userId, logDate);
    setTick(t => t + 1);
  }

  async function handleAnalyze(targetUser: User) {
    if (!pdfFile) return;
    if (pdfFile.type !== 'application/pdf') {
      setAnalyzeError('PDF 파일만 업로드 가능합니다.');
      return;
    }
    setAnalyzing(true);
    setAnalyzeStep('extract');
    setAnalyzeError('');
    try {
      // API 키 가져오기
      const cfgRes = await fetch('/api/config');
      const { geminiKey } = await cfgRes.json();
      if (!geminiKey) throw new Error('API 키가 설정되지 않았습니다.');

      // PDF → base64 변환 (FileReader — 모든 브라우저/iOS 호환)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsDataURL(pdfFile);
      });

      // 과제 공지 문자열 구성
      let noticeStr = '';
      if (notice) {
        const classicParts: string[] = [];
        if (notice.classicPoetWork && notice.classicPoetWork !== '없음') classicParts.push(`고전 시가: ${notice.classicPoetWork}`);
        if (notice.classicProseWork && notice.classicProseWork !== '없음') classicParts.push(`고전 산문: ${notice.classicProseWork}`);
        const modernPoet  = notice.modernPoetWork  !== '없음' ? (notice.modernPoetWork  || '미정') : '없음';
        const modernProse = notice.modernProseWork !== '없음' ? (notice.modernProseWork || '미정') : '없음';
        noticeStr = `이번 주 과제 — ${classicParts.length ? classicParts.join(', ') : '고전: 미정'}, 현대시: ${modernPoet}, 현대산문: ${modernProse}`;
      }

      const prompt = `다음은 국어 임용고시 스터디 구성원의 발표 자료 또는 스터디 일지 PDF입니다.${noticeStr ? '\n' + noticeStr : ''}

【핵심 원칙】
- PDF에 명시적으로 기재된 내용만 정리하세요.
- PDF에 없는 내용은 절대 추가하거나 추측하지 마세요.
- 풀지 않은 문제를 오답으로 처리하거나, 언급되지 않은 약점을 임의로 추가하지 마세요.
- 해당 항목의 내용이 PDF에 없으면 반드시 빈 문자열("")로 남기세요.

각 필드는 **단권화 스타일**로 작성해주세요:
- 핵심 키워드나 개념은 **굵게** 표시 (예: **화자**, **주제**)
- 각 항목은 줄바꿈으로 구분
- 줄글 대신 간결한 불릿(•) 형식

JSON만 반환하세요.

{
  "classicAnalysis": "PDF에 있는 고전 작품 분석 내용만. 없으면 \"\"",
  "classicDifficulty": "PDF에 명시된 어려웠던 부분만. 없으면 \"\"",
  "modernPoetAnalysis": "PDF에 있는 현대시 분석 내용만. 없으면 \"\"",
  "modernPoetDifficulty": "PDF에 명시된 어려웠던 부분만. 없으면 \"\"",
  "modernProseAnalysis": "PDF에 있는 현대산문 분석 내용만. 없으면 \"\"",
  "modernProseDifficulty": "PDF에 명시된 어려웠던 부분만. 없으면 \"\"",
  "wrongAnswerAnalysis": "PDF에 실제로 기재된 오답 분석만. 문제를 풀지 않았거나 언급이 없으면 반드시 \"\"",
  "examTypeAnalysis": "PDF에 있는 기출 유형 분석만. 없으면 \"\"",
  "studyGroupLearnings": "PDF에 기재된 스터디에서 배운 점만. 없으면 \"\"",
  "selfFeedback": "PDF에 실제로 작성된 자기 피드백과 계획만. 없는 내용을 임의로 추가하지 말 것. 없으면 \"\""
}`;

      // Gemini에 직접 요청 (generateContent는 CORS 허용, 파일 크기 제한 없음)
      setAnalyzeStep('ai');
      const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
      const body = JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64 } },
            { text: prompt },
          ],
        }],
      });

      let firstError = '';
      let analysisData: any = null;
      for (const model of MODELS) {
        for (let attempt = 0; attempt < 2; attempt++) {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
          );
          const data = await response.json();
          if (response.ok) {
            const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
            const match = text.match(/\{[\s\S]*\}/);
            analysisData = match ? JSON.parse(match[0]) : {};
            break;
          }
          const errMsg = data?.error?.message ?? `오류 (${response.status})`;
          if (!firstError) firstError = `[${model}] ${errMsg}`;
          if (response.status !== 503 && response.status !== 429) break;
          await new Promise(r => setTimeout(r, 1500));
        }
        if (analysisData) break;
      }
      if (!analysisData) throw new Error(firstError || 'AI 분석 실패');

      const noteId = `${targetUser.id}_${logDate}`;
      const now = new Date().toISOString();
      const newNote: StudySessionNote = {
        id: noteId,
        date: logDate,
        userId: targetUser.id,
        username: targetUser.username,
        content: JSON.stringify(analysisData),
        createdAt: now,
        updatedAt: now,
        createdById: currentUser.id,
        createdByName: currentUser.username,
      };
      saveStudySessionNote(newNote);
      const log: StudyLog = {
        id: `${targetUser.id}_${logDate}`,
        userId: targetUser.id,
        username: targetUser.username,
        date: logDate,
        workName: '',
        difficulties: '',
        selfFeedback: '',
        updatedAt: new Date().toISOString(),
      };
      upsertStudyLog(log);
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
      setTick(t => t + 1);
    }
  }

  const completedCount = allNotes.length;
  const today = new Date().toISOString().slice(0, 10);
  const canGoForward = addDays(logDate, 7) <= today;

  return (
    <div className="space-y-4" key={tick}>
      {/* 주차 네비게이터 */}
      <div className="card flex items-center gap-2 py-3">
        <button
          onClick={() => { setLogDate(addDays(logDate, -7)); setExpandedId(currentUser.id); }}
          className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="flex-1 text-sm font-bold text-gray-700 text-center">{getWeekLabel(logDate)}</span>
        <button
          onClick={() => { setLogDate(addDays(logDate, 7)); setExpandedId(currentUser.id); }}
          disabled={!canGoForward}
          className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{completedCount}/{users.length}명 완료</span>
      </div>

      {/* 과제 정보 */}
      {notice && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-3 py-2 flex flex-wrap gap-x-4 gap-y-0.5">
          {(notice.classicPoetWork || notice.classicProseWork) ? (
            <>
              {notice.classicPoetWork && (
                <span className="text-[10px] text-primary-600">
                  <span className="font-bold">고전 시가 </span>
                  {notice.classicPoetWork === '없음' ? <span className="text-primary-300">없음</span> : notice.classicPoetWork}
                </span>
              )}
              {notice.classicProseWork && (
                <span className="text-[10px] text-primary-600">
                  <span className="font-bold">고전 산문 </span>
                  {notice.classicProseWork === '없음' ? <span className="text-primary-300">없음</span> : notice.classicProseWork}
                </span>
              )}
            </>
          ) : notice.classicWork ? (
            <span className="text-[10px] text-primary-600"><span className="font-bold">고전 </span>{notice.classicWork}</span>
          ) : null}
          {notice.modernPoetWork && (
            <span className="text-[10px] text-primary-600">
              <span className="font-bold">현대시 </span>
              {notice.modernPoetWork === '없음' ? <span className="text-primary-300">없음</span> : notice.modernPoetWork}
            </span>
          )}
          {notice.modernProseWork && (
            <span className="text-[10px] text-primary-600">
              <span className="font-bold">현대산문 </span>
              {notice.modernProseWork === '없음' ? <span className="text-primary-300">없음</span> : notice.modernProseWork}
            </span>
          )}
        </div>
      )}

      {/* 멤버별 분석 */}
      <div className="space-y-2">
        {users.map(user => {
          const note      = getStudySessionNote(user.id, logDate);
          const fields    = note ? parseNote(note) : null;
          const isSelf    = user.id === currentUser.id;
          const canUpload = isSelf || isAdmin;
          const canDelete = isSelf || isAdmin;
          const expanded  = expandedId === user.id;
          const hasNote   = !!note;

          return (
            <div key={user.id} className="card overflow-hidden p-0">
              {/* 헤더 */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => toggleExpand(user.id)}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${hasNote ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400'}`}>
                  {user.username[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <NameWithCrown name={user.username} className="text-sm font-semibold text-gray-800" />
                  {isSelf && <span className="text-[10px] text-gray-400 ml-1">나</span>}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${hasNote ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400'}`}>
                  {hasNote ? '분석 완료' : '미등록'}
                </span>
                {expanded ? <ChevronUp className="w-4 h-4 text-gray-300 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />}
              </button>

              {/* 펼침 영역 */}
              {expanded && (
                <div className="px-4 pb-4 border-t border-gray-50">
                  {hasNote && fields ? (
                    <div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-violet-400" />
                          <span className="text-[10px] text-gray-400">{note!.createdByName} 업로드 · {new Date(note!.createdAt).toLocaleDateString('ko-KR')}</span>
                        </div>
                        {canDelete && (
                          <button onClick={() => handleDeleteNote(note!.id)} className="text-gray-300 hover:text-red-400 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <NoteContent fields={fields} notice={notice} />
                      {canUpload && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                          <input ref={isSelf ? fileInputRef : undefined} type="file" accept="application/pdf" className="hidden"
                            onChange={e => { setPdfFile(e.target.files?.[0] ?? null); setAnalyzeError(''); }} />
                          <button
                            className="text-[10px] text-gray-400 hover:text-violet-500 transition flex items-center gap-1"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="w-3 h-3" /> 다시 분석
                          </button>
                          {pdfFile && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-xl">
                              <span className="text-xs font-medium text-violet-700 flex-1 truncate">{pdfFile.name}</span>
                              <button className="text-violet-400 hover:text-violet-600 flex-shrink-0"
                                onClick={() => { setPdfFile(null); setAnalyzeError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {analyzeError && <p className="text-xs text-red-500">{analyzeError}</p>}
                          {pdfFile && (
                            <button disabled={analyzing} onClick={() => handleAnalyze(user)}
                              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl transition">
                              {analyzing
                                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{analyzeStep === 'extract' ? '텍스트 추출 중...' : 'AI 분석 중...'}</>
                                : <><Sparkles className="w-3.5 h-3.5" />AI 분석 시작</>}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : canUpload ? (
                    <div className="pt-3 space-y-2">
                      <input ref={isSelf ? fileInputRef : undefined} type="file" accept="application/pdf" className="hidden"
                        onChange={e => { setPdfFile(e.target.files?.[0] ?? null); setAnalyzeError(''); }} />
                      {pdfFile ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-xl">
                          <span className="text-xs font-medium text-violet-700 flex-1 truncate">{pdfFile.name}</span>
                          <button className="text-violet-400 hover:text-violet-600 flex-shrink-0"
                            onClick={() => { setPdfFile(null); setAnalyzeError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-violet-300 hover:text-violet-500 transition"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4" /> PDF 파일 선택
                        </button>
                      )}
                      {analyzeError && <p className="text-xs text-red-500">{analyzeError}</p>}
                      <button
                        disabled={!pdfFile || analyzing}
                        onClick={() => handleAnalyze(user)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-violet-600 hover:bg-violet-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl transition"
                      >
                        {analyzing
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{analyzeStep === 'extract' ? '텍스트 추출 중...' : 'AI 분석 중...'}</>
                          : <><Sparkles className="w-4 h-4" />AI 분석 시작</>}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300 text-center py-4">아직 등록된 분석이 없어요</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
