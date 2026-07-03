import { useState, useRef } from 'react';
import { Check, Upload, Sparkles, X, Trash2 } from 'lucide-react';
import type { User, StudyLog, StudySessionNote } from '../../types';
import {
  getStudyLog, getStudyLogsForDate, getUsers,
  upsertStudyLog, removeStudyLog,
  getStudySessionNote, saveStudySessionNote, deleteStudySessionNote,
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

function NoteSection({ label, value, color }: { label: string; value?: string; color: string }) {
  if (!value) return null;
  return (
    <div>
      <p className={`text-[10px] font-bold mb-1 ${color}`}>{label}</p>
      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(' '));
  }
  return pages.join('\n');
}

export default function StudyLogTab({ date, currentUser }: Props) {
  const [logDate, setLogDate] = useState(date);
  const [tick, setTick]       = useState(0);

  const [pdfFile, setPdfFile]           = useState<File | null>(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [analyzeStep, setAnalyzeStep]   = useState<'extract' | 'ai'>('extract');
  const [analyzeError, setAnalyzeError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const users    = getUsers();
  const note     = getStudySessionNote(logDate);
  const isAdmin  = currentUser.role === 'admin' || currentUser.role === 'subadmin';
  const fields   = note ? parseNote(note) : null;

  const thisWeekMonday = getWeekMonday(logDate);
  const prevD = new Date(thisWeekMonday + 'T00:00:00');
  prevD.setDate(prevD.getDate() - 7);
  const notice = getAssignmentNoticeForWeek(prevD.toISOString().slice(0, 10));

  const checkedCount  = users.filter(u => !!getStudyLog(u.id, logDate)).length;
  const otherLogs     = getStudyLogsForDate(logDate);

  function isChecked(userId: string) { return !!getStudyLog(userId, logDate); }

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

  function handleDeleteNote() {
    deleteStudySessionNote(logDate);
    setTick(t => t + 1);
  }

  async function handleAnalyze() {
    if (!pdfFile) return;
    if (pdfFile.type !== 'application/pdf') {
      setAnalyzeError('PDF 파일만 업로드 가능합니다.');
      return;
    }

    setAnalyzing(true);
    setAnalyzeStep('extract');
    setAnalyzeError('');

    try {
      const pdfText = await extractPdfText(pdfFile);
      if (!pdfText.trim()) throw new Error('PDF에서 텍스트를 추출할 수 없습니다.');

      setAnalyzeStep('ai');

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfText,
          notice: notice
            ? { classicWork: notice.classicWork, modernPoetWork: notice.modernPoetWork, modernProseWork: notice.modernProseWork }
            : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `서버 오류 (${res.status})`);
      }

      const data = await res.json();
      const newNote: StudySessionNote = {
        id: logDate,
        date: logDate,
        content: JSON.stringify(data),
        createdAt: new Date().toISOString(),
        createdById: currentUser.id,
        createdByName: currentUser.username,
      };
      saveStudySessionNote(newNote);
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
      setTick(t => t + 1);
    }
  }

  return (
    <div className="space-y-4" key={tick}>

      {/* 날짜 */}
      <div className="card flex items-center gap-3 py-3">
        <span className="text-xs font-bold text-gray-500 flex-shrink-0">날짜</span>
        <input
          type="date"
          className="flex-1 text-sm font-semibold text-gray-800 bg-transparent outline-none cursor-pointer"
          value={logDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={e => { if (e.target.value) setLogDate(e.target.value); }}
        />
        <span className="text-xs text-gray-400 flex-shrink-0">{checkedCount}/{users.length}명 완료</span>
      </div>

      {/* AI 분석 결과 or 업로드 */}
      {note && fields ? (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <p className="text-xs font-bold text-gray-700">AI 분석 결과</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">{note.createdByName} 업로드</span>
              {isAdmin && (
                <button onClick={handleDeleteNote} className="text-gray-300 hover:text-red-400 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {notice && (
            <div className="bg-primary-50 border border-primary-100 rounded-xl px-3 py-2 flex flex-wrap gap-x-4 gap-y-0.5">
              {notice.classicWork    && <span className="text-[10px] text-primary-600"><span className="font-bold">고전 </span>{notice.classicWork}</span>}
              {notice.modernPoetWork && <span className="text-[10px] text-primary-600"><span className="font-bold">현대시 </span>{notice.modernPoetWork}</span>}
              {notice.modernProseWork && <span className="text-[10px] text-primary-600"><span className="font-bold">현대산문 </span>{notice.modernProseWork}</span>}
            </div>
          )}

          {/* ① 작품 분석 */}
          {(fields.classicAnalysis || fields.classicDifficulty || fields.modernPoetAnalysis || fields.modernPoetDifficulty || fields.modernProseAnalysis || fields.modernProseDifficulty) && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">① 작품 분석</p>
              <div className="space-y-2.5">
                <NoteSection label={`${notice?.classicWork || '고전'} — 분석`}        value={fields.classicAnalysis}       color="text-amber-600" />
                <NoteSection label={`${notice?.classicWork || '고전'} — 어려웠던 점`} value={fields.classicDifficulty}     color="text-amber-500" />
                <NoteSection label={`${notice?.modernPoetWork || '현대시'} — 분석`}        value={fields.modernPoetAnalysis}    color="text-sky-600" />
                <NoteSection label={`${notice?.modernPoetWork || '현대시'} — 어려웠던 점`} value={fields.modernPoetDifficulty} color="text-sky-500" />
                <NoteSection label={`${notice?.modernProseWork || '현대산문'} — 분석`}        value={fields.modernProseAnalysis}   color="text-violet-600" />
                <NoteSection label={`${notice?.modernProseWork || '현대산문'} — 어려웠던 점`} value={fields.modernProseDifficulty} color="text-violet-500" />
              </div>
            </div>
          )}

          {(fields.wrongAnswerAnalysis || fields.examTypeAnalysis) && (
            <div className="space-y-2.5 pt-1 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">② 기출 풀이</p>
              <NoteSection label="오답 원인 분석"     value={fields.wrongAnswerAnalysis} color="text-rose-600" />
              <NoteSection label="임용 기출 유형 분석" value={fields.examTypeAnalysis}    color="text-rose-500" />
            </div>
          )}

          {(fields.studyGroupLearnings || fields.selfFeedback) && (
            <div className="space-y-2.5 pt-1 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">③ 스터디 소감</p>
              <NoteSection label="스터디에서 배운 것"      value={fields.studyGroupLearnings} color="text-emerald-600" />
              <NoteSection label="자가 피드백 & 다음 계획" value={fields.selfFeedback}         color="text-emerald-500" />
            </div>
          )}
        </div>
      ) : (
        <div className="card space-y-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <p className="text-xs font-bold text-gray-700">AI 스터디 분석</p>
            <span className="text-[10px] text-gray-400 ml-1">— PDF 업로드 후 멤버들이 읽고 체크</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => { setPdfFile(e.target.files?.[0] ?? null); setAnalyzeError(''); }}
          />

          {pdfFile ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-xl">
              <span className="text-xs font-medium text-violet-700 flex-1 truncate">{pdfFile.name}</span>
              <button
                className="text-violet-400 hover:text-violet-600 transition flex-shrink-0"
                onClick={() => { setPdfFile(null); setAnalyzeError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
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
              PDF 파일 선택
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
                {analyzeStep === 'extract' ? '텍스트 추출 중...' : 'AI 분석 중...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI 분석 시작
              </>
            )}
          </button>
        </div>
      )}

      {/* 멤버 체크 */}
      <div className="card space-y-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">복습 완료 체크</p>
        {users.map(user => {
          const checked   = isChecked(user.id);
          const checkedAt = otherLogs.find(l => l.userId === user.id)?.updatedAt;
          const isSelf    = user.id === currentUser.id;
          const canToggle = isSelf || isAdmin;
          return (
            <button
              key={user.id}
              disabled={!canToggle}
              onClick={() => canToggle && toggleCheck(user)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                checked
                  ? 'bg-green-50 hover:bg-green-100'
                  : canToggle ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-50'
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
              <div className="flex-1 min-w-0">
                <NameWithCrown
                  name={user.username}
                  className={`text-sm font-semibold ${checked ? 'text-green-700' : 'text-gray-600'}`}
                />
                {checked && checkedAt && (
                  <p className="text-[10px] text-green-400 mt-0.5">
                    {new Date(checkedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 완료
                  </p>
                )}
              </div>
              {isSelf && <span className="text-[10px] text-gray-400 flex-shrink-0">나</span>}
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
