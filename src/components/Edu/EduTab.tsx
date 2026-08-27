import { useState, useEffect, useMemo } from 'react';
import type { User } from '../../types';
import type { EduRound, EduQuestion, EduAnswer } from '../../types';
import {
  getEduRounds, getEduQuestionsForRound, getMyEduAnswer, getEduAnswersForRound,
  saveEduRound, saveEduQuestions, saveEduAnswer, runEduDerangement, subscribeEduData,
  weekMondayKey, getUserById, deleteEduRound,
} from '../../store';
import { ChevronLeft, Printer, CheckCircle2, Clock, Users, Archive, Lock, Unlock, Plus, Trash2 } from 'lucide-react';
import { isPrivileged } from '../../types';

function thisWeekKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return weekMondayKey(today);
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildPrintHtml(
  roundTitle: string,
  questions: EduQuestion[],
  answers: Record<string, string> | undefined,
  showAnswers: boolean,
  authorName: string,
): string {
  const rows = questions.map(q => `
    <div style="margin-bottom:16px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid;">
      <p style="font-weight:700;margin:0 0 6px;color:#374151;">Q${q.questionNum}. ${escHtml(q.questionText)}</p>
      ${answers !== undefined
        ? `<p style="margin:0;padding:8px;background:#f3f4f6;border-radius:6px;min-height:32px;color:#111827;">${escHtml(answers[q.id] ?? '(미작성)')}</p>`
        : showAnswers
          ? `<p style="margin:6px 0 0;color:#059669;font-size:14px;">정답: ${escHtml(q.answerText)}</p>`
          : ''
      }
    </div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>국어교과교육론 — ${escHtml(roundTitle)}</title>
<style>body{font-family:'Noto Sans KR',Arial,sans-serif;max-width:680px;margin:32px auto;padding:20px;color:#111;}
h1{font-size:20px;font-weight:800;margin:0 0 2px;}h2{font-size:13px;color:#6b7280;margin:0 0 18px;font-weight:400;}</style>
</head><body>
<h1>국어교과교육론</h1>
<h2>${escHtml(roundTitle)} — ${escHtml(authorName)}</h2>
${rows}</body></html>`;
}

type EduView = 'week' | 'create' | 'solve' | 'archive';

export default function EduTab({ currentUser }: { currentUser: User }) {
  const [view, setView] = useState<EduView>('week');
  const [tick, setTick] = useState(0);
  const [roundTitleInput, setRoundTitleInput] = useState('');
  const [createQs, setCreateQs] = useState<{ q: string; a: string }[]>(() =>
    Array.from({ length: 10 }, () => ({ q: '', a: '' }))
  );
  const [solveAnswers, setSolveAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [archiveRoundId, setArchiveRoundId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormDate, setAddFormDate] = useState('');
  const [addFormTitle, setAddFormTitle] = useState('');

  useEffect(() => subscribeEduData(() => setTick(t => t + 1)), []);

  const weekKey = useMemo(() => thisWeekKey(), []);
  const rounds = useMemo(() => getEduRounds(), [tick]);
  const currentRound = useMemo(() => rounds.find(r => r.weekKey === weekKey) ?? null, [rounds, weekKey]);
  const roundQs = useMemo(() =>
    currentRound ? getEduQuestionsForRound(currentRound.id) : [], [currentRound, tick]);
  const myQs = useMemo(() =>
    roundQs.filter(q => q.creatorId === currentUser.id), [roundQs, currentUser.id]);
  const assignedCreatorId = currentRound?.assignments[currentUser.id];
  const assignedQs = useMemo(() =>
    assignedCreatorId ? roundQs.filter(q => q.creatorId === assignedCreatorId) : [],
    [roundQs, assignedCreatorId]);
  const myAnswer = useMemo(() =>
    currentRound ? getMyEduAnswer(currentRound.id, currentUser.id) : undefined,
    [currentRound, currentUser.id, tick]);

  const isAdmin = isPrivileged(currentUser);
  const hasMyQs = myQs.length >= 10;
  const isAssigned = !!assignedCreatorId && assignedQs.length > 0;
  const creatorCount = useMemo(() => new Set(roundQs.map(q => q.creatorId)).size, [roundQs]);

  useEffect(() => {
    if (view === 'create') {
      setCreateQs(Array.from({ length: 10 }, (_, i) => ({
        q: myQs[i]?.questionText ?? '',
        a: myQs[i]?.answerText ?? '',
      })));
    }
  }, [view]);

  useEffect(() => {
    if (view === 'solve') {
      setSolveAnswers(myAnswer?.answers ?? {});
    }
  }, [view, myAnswer?.id]);

  const handleCreateRound = () => {
    if (!roundTitleInput.trim()) return;
    const round: EduRound = {
      id: weekKey,
      weekKey,
      title: roundTitleInput.trim(),
      assignments: {},
      assignedAt: '',
      isArchived: false,
      createdAt: new Date().toISOString(),
      createdById: currentUser.id,
      createdByName: currentUser.username,
    };
    saveEduRound(round);
    setRoundTitleInput('');
  };

  const handleSubmitQs = () => {
    if (!currentRound) return;
    if (createQs.some(q => !q.q.trim() || !q.a.trim())) {
      alert('모든 문제와 정답을 입력해 주세요.');
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const qs: EduQuestion[] = createQs.map((q, i) => ({
      id: `${currentRound.id}_${currentUser.id}_${i + 1}`,
      roundId: currentRound.id,
      creatorId: currentUser.id,
      questionNum: i + 1,
      questionText: q.q.trim(),
      answerText: q.a.trim(),
      createdAt: now,
    }));
    saveEduQuestions(qs);
    setSaving(false);
    setView('week');
  };

  const handleSaveAnswer = () => {
    if (!currentRound) return;
    setSaving(true);
    const now = new Date().toISOString();
    const ans: EduAnswer = {
      id: `${currentRound.id}_${currentUser.id}`,
      roundId: currentRound.id,
      userId: currentUser.id,
      username: currentUser.username,
      answers: solveAnswers,
      submittedAt: myAnswer?.submittedAt ?? now,
      updatedAt: now,
    };
    saveEduAnswer(ans);
    setSaving(false);
    setSaveMsg('저장되었습니다.');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handleAssign = () => {
    if (!currentRound) return;
    const creators = [...new Set(roundQs.map(q => q.creatorId))];
    if (!window.confirm(`${creators.length}명을 배정하시겠습니까?`)) return;
    const result = runEduDerangement(currentRound.id, creators);
    if (!result.ok) alert(result.error ?? '배정 실패');
    else alert(`배정 완료! ${creators.length}명이 배정되었습니다.`);
  };

  const handleAddRound = () => {
    if (!addFormDate || !addFormTitle.trim()) return;
    const wk = weekMondayKey(addFormDate);
    if (rounds.some(r => r.id === wk)) {
      alert(`${fmtDate(wk)} 주차 회차가 이미 존재합니다.`);
      return;
    }
    const round: EduRound = {
      id: wk,
      weekKey: wk,
      title: addFormTitle.trim(),
      assignments: {},
      assignedAt: '',
      isArchived: false,
      createdAt: new Date().toISOString(),
      createdById: currentUser.id,
      createdByName: currentUser.username,
    };
    saveEduRound(round);
    setAddFormDate('');
    setAddFormTitle('');
    setShowAddForm(false);
  };

  const handleDeleteRound = (roundId: string, title: string) => {
    if (!window.confirm(`'${title}' 회차를 삭제하면 문제와 풀이 기록이 모두 삭제됩니다. 계속하시겠습니까?`)) return;
    deleteEduRound(roundId);
    setArchiveRoundId(null);
  };

  const handlePrint = (type: 'create' | 'solve') => {
    const qs = type === 'create' ? myQs : assignedQs;
    if (qs.length === 0) return;
    const ans = type === 'solve' ? solveAnswers : undefined;
    const html = buildPrintHtml(currentRound?.title ?? '', qs, ans, type === 'create', currentUser.username);
    const win = window.open('', '_blank');
    if (!win) { alert('팝업을 허용한 뒤 다시 시도해 주세요.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const BackBtn = ({ to, label = '돌아가기' }: { to: EduView; label?: string }) => (
    <button
      onClick={() => { setView(to); if (to !== 'archive') setArchiveRoundId(null); }}
      className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 font-medium mb-4 px-2 py-1 rounded-lg hover:bg-primary-50 transition"
    >
      <ChevronLeft className="w-4 h-4" /> {label}
    </button>
  );

  // ── CREATE view ─────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="pb-20">
        <BackBtn to="week" />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <h2 className="font-bold text-gray-900 text-base mb-0.5">문제 제작</h2>
          <p className="text-xs text-gray-500 mb-4">{currentRound?.title} · 빈칸 문제 10개를 작성하세요.</p>
          {createQs.map((item, i) => (
            <div key={i} className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[11px] font-bold text-primary-500 mb-1.5">Q{i + 1}</p>
              <textarea
                value={item.q}
                onChange={e => setCreateQs(prev => prev.map((x, j) => j === i ? { ...x, q: e.target.value } : x))}
                placeholder="빈칸 문제를 입력하세요"
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white mb-2"
                rows={2}
              />
              <input
                value={item.a}
                onChange={e => setCreateQs(prev => prev.map((x, j) => j === i ? { ...x, a: e.target.value } : x))}
                placeholder="정답"
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSubmitQs}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
          >
            {saving ? '저장 중...' : '제출하기'}
          </button>
          {hasMyQs && (
            <button
              onClick={() => handlePrint('create')}
              className="px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm flex items-center gap-1.5 font-medium hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" /> PDF
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── SOLVE view ──────────────────────────────────────────────
  if (view === 'solve') {
    return (
      <div className="pb-20">
        <BackBtn to="week" />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <h2 className="font-bold text-gray-900 text-base mb-0.5">풀이하기</h2>
          <p className="text-xs text-gray-500 mb-4">{currentRound?.title} · 배정된 문제를 풀어 주세요. (제작자 미공개)</p>
          {assignedQs.map(q => (
            <div key={q.id} className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-2">Q{q.questionNum}. {q.questionText}</p>
              <textarea
                value={solveAnswers[q.id] ?? ''}
                onChange={e => setSolveAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="정답을 입력하세요"
                className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white"
                rows={2}
              />
            </div>
          ))}
        </div>
        {saveMsg && (
          <div className="mb-3 text-center text-sm text-emerald-600 font-medium">{saveMsg}</div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSaveAnswer}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
          <button
            onClick={() => handlePrint('solve')}
            className="px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm flex items-center gap-1.5 font-medium hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>
    );
  }

  // ── ARCHIVE view ────────────────────────────────────────────
  if (view === 'archive') {
    if (archiveRoundId) {
      const archiveRound = rounds.find(r => r.id === archiveRoundId);
      const aQs = archiveRound ? getEduQuestionsForRound(archiveRound.id) : [];
      const aAnswers = archiveRound ? getEduAnswersForRound(archiveRound.id) : [];
      const canView = isAdmin || !!archiveRound?.isArchived;
      const creatorIds = [...new Set(aQs.map(q => q.creatorId))];

      return (
        <div className="pb-20">
          <button
            onClick={() => setArchiveRoundId(null)}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 font-medium mb-4 px-2 py-1 rounded-lg hover:bg-primary-50 transition"
          >
            <ChevronLeft className="w-4 h-4" /> 목록으로
          </button>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-bold text-gray-900">{archiveRound?.title ?? '회차'}</h2>
              <p className="text-xs text-gray-500">{archiveRound ? fmtDate(archiveRound.weekKey) + ' 주차' : ''}</p>
            </div>
            {isAdmin && archiveRound && (
              <button
                onClick={() => saveEduRound({ ...archiveRound, isArchived: !archiveRound.isArchived })}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition ${
                  archiveRound.isArchived
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                }`}
              >
                {archiveRound.isArchived
                  ? <><Unlock className="w-3 h-3" /> 전체 공개 중</>
                  : <><Lock className="w-3 h-3" /> 비공개</>
                }
              </button>
            )}
          </div>
          {isAdmin && archiveRound && (
            <button
              onClick={() => handleDeleteRound(archiveRound.id, archiveRound.title)}
              className="w-full mb-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> 이 회차 삭제
            </button>
          )}
          {!canView ? (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-500 shadow-sm border border-gray-100">
              <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              관리자가 공개하면 확인할 수 있습니다.
            </div>
          ) : creatorIds.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">제출된 문제가 없습니다.</div>
          ) : (
            creatorIds.map(creatorId => {
              const creatorUser = getUserById(creatorId);
              const cQs = aQs.filter(q => q.creatorId === creatorId).sort((a, b) => a.questionNum - b.questionNum);
              const solverEntry = Object.entries(archiveRound?.assignments ?? {}).find(([, cId]) => cId === creatorId);
              const solverAnswer = solverEntry ? aAnswers.find(a => a.userId === solverEntry[0]) : undefined;
              const solverUser = solverEntry ? getUserById(solverEntry[0]) : undefined;
              return (
                <div key={creatorId} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                  <p className="font-bold text-sm text-primary-700 mb-3">
                    📝 {creatorUser?.username ?? '(알 수 없음)'}의 문제
                    {solverUser && (
                      <span className="text-xs font-normal text-gray-400 ml-2">→ {solverUser.username} 풀이</span>
                    )}
                  </p>
                  {cQs.map(q => {
                    const solverAns = solverAnswer?.answers[q.id];
                    return (
                      <div key={q.id} className="mb-3 pb-3 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
                        <p className="text-sm font-medium text-gray-800 mb-1">Q{q.questionNum}. {q.questionText}</p>
                        <p className="text-xs text-emerald-700 mb-1">✓ 정답: {q.answerText}</p>
                        {solverAnswer !== undefined && (
                          <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5">
                            풀이: {solverAns || '(미작성)'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      );
    }

    return (
      <div className="pb-20">
        <BackBtn to="week" />
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">아카이브</h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 px-2.5 py-1.5 rounded-lg border border-primary-200 hover:bg-primary-50 transition font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> 새 회차 추가
            </button>
          )}
        </div>

        {isAdmin && showAddForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-primary-100 p-4 mb-4">
            <p className="text-xs font-bold text-gray-600 mb-3">새 회차 추가</p>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-gray-400 mb-0.5 block">날짜 (해당 주 아무 날)</label>
                <input
                  type="date"
                  value={addFormDate}
                  onChange={e => setAddFormDate(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 mb-0.5 block">회차 제목</label>
                <input
                  value={addFormTitle}
                  onChange={e => setAddFormTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRound()}
                  placeholder="예: 3단원 교수학습론"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddRound}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
                >
                  추가
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setAddFormDate(''); setAddFormTitle(''); }}
                  className="px-4 py-2 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {rounds.length === 0 && !showAddForm && (
          <div className="text-center text-sm text-gray-400 py-10">아직 회차가 없습니다.</div>
        )}
        {rounds.map(r => {
          const qCount = getEduQuestionsForRound(r.id).length;
          const aCount = getEduAnswersForRound(r.id).length;
          return (
            <button
              key={r.id}
              onClick={() => setArchiveRoundId(r.id)}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3 text-left hover:bg-gray-50 active:bg-gray-100 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{r.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmtDate(r.weekKey)} 주차 · 문제 {qCount}개 · 풀이 {aCount}명
                  </p>
                </div>
                {r.isArchived
                  ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">공개</span>
                  : <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">비공개</span>
                }
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // ── WEEK view (default) ─────────────────────────────────────
  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900">국어교과교육론</h2>
        <button
          onClick={() => setView('archive')}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
        >
          <Archive className="w-3.5 h-3.5" /> 아카이브
        </button>
      </div>

      {!currentRound ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <p className="text-sm text-gray-500 mb-3">이번 주 회차가 아직 개설되지 않았습니다.</p>
          {isAdmin ? (
            <div className="flex gap-2">
              <input
                value={roundTitleInput}
                onChange={e => setRoundTitleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateRound()}
                placeholder="회차 제목 (예: 3단원 교수학습론)"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <button
                onClick={handleCreateRound}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
              >
                개설
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">관리자가 회차를 개설하면 참여할 수 있습니다.</p>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-900">{currentRound.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{fmtDate(currentRound.weekKey)} 주차</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">문제 제출</p>
                <p className="text-sm font-bold text-primary-600">{creatorCount}명</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className={`rounded-2xl p-3 border shadow-sm ${hasMyQs ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {hasMyQs
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <Clock className="w-4 h-4 text-gray-400" />
                }
                <p className="text-xs font-bold text-gray-700">문제 제작</p>
              </div>
              <p className="text-xs text-gray-500">{hasMyQs ? '제출 완료' : '미완료'}</p>
            </div>
            <div className={`rounded-2xl p-3 border shadow-sm ${myAnswer ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {myAnswer
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <Clock className="w-4 h-4 text-gray-400" />
                }
                <p className="text-xs font-bold text-gray-700">풀이 제출</p>
              </div>
              <p className="text-xs text-gray-500">
                {myAnswer ? '제출 완료' : isAssigned ? '배정됨 · 풀이 대기' : '배정 대기'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setView('create')}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#f9a8c9 0%,#de4e80 100%)' }}
              >
                {hasMyQs ? '내 문제 수정하기' : '문제 제작하기'}
              </button>
              {hasMyQs && (
                <button
                  onClick={() => handlePrint('create')}
                  className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm flex items-center gap-1.5 font-medium hover:bg-gray-50 transition"
                >
                  <Printer className="w-4 h-4" /> PDF
                </button>
              )}
            </div>

            {isAssigned && (
              <button
                onClick={() => setView('solve')}
                className="w-full py-3 rounded-2xl text-sm font-bold border"
                style={{ borderColor: '#f9a8c9', color: '#de4e80', background: 'rgba(249,168,201,0.07)' }}
              >
                {myAnswer ? '풀이 수정하기' : '풀이하기'}
              </button>
            )}

            {isAdmin && (
              <div className="pt-1">
                <p className="text-[10px] text-gray-400 mb-1.5 text-center font-medium">관리자</p>
                <button
                  onClick={handleAssign}
                  className="w-full py-2.5 rounded-2xl text-sm font-bold bg-gray-800 text-white flex items-center justify-center gap-2 hover:bg-gray-700 transition"
                >
                  <Users className="w-4 h-4" />
                  배정 실행 ({creatorCount}명 제출)
                </button>
              </div>
            )}
          </div>

          {assignedCreatorId && assignedQs.length > 0 && (
            <div className="mt-3 bg-sky-50 rounded-2xl p-3 border border-sky-100">
              <p className="text-xs font-bold text-sky-700 mb-0.5">배정 안내</p>
              <p className="text-xs text-sky-600">다른 멤버의 문제 {assignedQs.length}개가 배정되었습니다.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
