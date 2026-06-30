import { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw, Edit2, ChevronRight } from 'lucide-react';
import NameWithCrown from '../common/NameWithCrown';
import type { User } from '../../types';
import { getUsers, getVocabTestScore, getVocabTestScoresForDate, upsertVocabTestScore, getAssignmentNoticeForWeek } from '../../store';
import { VOCAB_ITEMS } from '../../data/vocabData';
import type { VocabItem } from '../../data/vocabData';

interface Props {
  date: string;
  currentUser: User;
}

type TestMode = 'short_answer' | 'multiple_choice';
type QuizPhase = 'quiz' | 'result';

interface QuizQuestion {
  item: VocabItem;
  choices: string[];
  correctIndex: number;
}

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(items: VocabItem[]): QuizQuestion[] {
  return shuffleArray(items).map(item => {
    const others = VOCAB_ITEMS.filter(v => v.num !== item.num);
    const distractors = shuffleArray(others).slice(0, 4).map(v => v.answer);
    const allChoices = shuffleArray([item.answer, ...distractors]);
    const correctIndex = allChoices.indexOf(item.answer);
    return { item, choices: allChoices, correctIndex };
  });
}

function getResult(score: number): { label: string; detail: string; color: string; icon: React.ReactNode } {
  if (score <= 9) return {
    label: '전체 재시험',
    detail: '다음 주 40개 응시 + 경고 자동 부여',
    color: 'text-red-500 bg-red-50 border-red-200',
    icon: <AlertTriangle className="w-4 h-4" />,
  };
  if (score <= 15) return {
    label: '틀린 어휘 재시험',
    detail: '틀린 항목만 다음 주 재시험',
    color: 'text-amber-500 bg-amber-50 border-amber-200',
    icon: <RefreshCw className="w-4 h-4" />,
  };
  return {
    label: '통과',
    detail: '16개 이상 정답',
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: <CheckCircle className="w-4 h-4" />,
  };
}

const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤'];

export default function VocabTestTab({ date, currentUser }: Props) {
  const [mode, setMode] = useState<TestMode | null>(null);
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('quiz');
  const [mcCorrect, setMcCorrect] = useState(0);
  const [mcTotal, setMcTotal] = useState(0);
  const [mcScaled, setMcScaled] = useState(0);

  const [tick, setTick] = useState(0);

  const existing = getVocabTestScore(currentUser.id, date);
  const allScores = getVocabTestScoresForDate(date);
  const allUsers = getUsers();

  const thisWeekMonday = getWeekMonday(date);
  const notice = getAssignmentNoticeForWeek(thisWeekMonday);
  const vocabStart = notice?.goeoStart ?? 1;
  const vocabEnd = notice?.goeoEnd ?? 20;
  const vocabItems = useMemo(
    () => VOCAB_ITEMS.filter(v => v.num >= vocabStart && v.num <= vocabEnd),
    [vocabStart, vocabEnd],
  );

  function startMC() {
    const qs = buildQuestions(vocabItems);
    setQuestions(qs);
    setQIndex(0);
    setSelectedAnswers(new Array(qs.length).fill(-1));
    setQuizPhase('quiz');
    setMode('multiple_choice');
  }

  function handleChoiceSelect(choiceIdx: number) {
    setSelectedAnswers(prev => {
      const updated = [...prev];
      updated[qIndex] = choiceIdx;
      return updated;
    });
  }

  function handleNext() {
    if (selectedAnswers[qIndex] === -1) return;
    if (qIndex < questions.length - 1) {
      setQIndex(i => i + 1);
    } else {
      submitMC();
    }
  }

  function submitMC() {
    const correct = questions.filter((q, i) => selectedAnswers[i] === q.correctIndex).length;
    const total = questions.length;
    const scaled = total > 0 ? Math.max(1, Math.min(20, Math.round((correct / total) * 20))) : 0;
    setMcCorrect(correct);
    setMcTotal(total);
    setMcScaled(scaled);
    if (scaled > 0) upsertVocabTestScore(currentUser.id, currentUser.username, date, scaled);
    setQuizPhase('result');
    setTick(t => t + 1);
  }

  function handleShortAnswerSubmit() {
    const n = Number(input);
    if (!Number.isInteger(n) || n < 1 || n > 20) return;
    upsertVocabTestScore(currentUser.id, currentUser.username, date, n);
    setInput('');
    setEditing(false);
    setMode(null);
    setTick(t => t + 1);
  }

  const showForm = !existing || editing;

  /* ── 객관식: 문제 화면 ── */
  if (mode === 'multiple_choice' && quizPhase === 'quiz' && questions.length > 0) {
    const q = questions[qIndex];
    const selected = selectedAnswers[qIndex] ?? -1;
    const progress = ((qIndex + 1) / questions.length) * 100;
    const isLast = qIndex === questions.length - 1;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">객관식 시험 · {qIndex + 1}/{questions.length}</p>
          <button
            onClick={() => { setMode(null); setQuizPhase('quiz'); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >취소</button>
        </div>

        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-5 text-center space-y-2">
          <p className="text-xs font-mono text-gray-400">No. {q.item.num}</p>
          <p className="text-2xl font-black text-gray-800 leading-relaxed">{q.item.vocab}</p>
          <p className="text-xs text-gray-400">현대어 뜻을 고르세요</p>
        </div>

        <div className="space-y-2">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleChoiceSelect(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                selected === i
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50'
              }`}
            >
              <span className="inline-block w-5 text-xs font-bold opacity-60 mr-1">{CIRCLE_NUMS[i]}</span>
              {choice}
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={selected === -1}
          className="w-full py-3 text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-100 disabled:text-gray-400 text-white"
        >
          {isLast ? '제출하기' : '다음'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  /* ── 객관식: 결과 화면 ── */
  if (mode === 'multiple_choice' && quizPhase === 'result') {
    const result = getResult(mcScaled);
    const wrongQuestions = questions.filter((q, i) => selectedAnswers[i] !== q.correctIndex);

    return (
      <div className="space-y-4">
        <div className="card text-center space-y-3 py-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">객관식 결과</p>
          <p className="text-4xl font-black text-gray-800">{mcCorrect} / {mcTotal}</p>
          {mcTotal !== 20 && (
            <p className="text-xs text-gray-500">20점 기준 환산: {mcScaled}점</p>
          )}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${result.color}`}>
            {result.icon}
            <div className="text-left">
              <p className="text-sm font-bold">{result.label}</p>
              <p className="text-[11px]">{result.detail}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => { setMode(null); setQuizPhase('quiz'); }}
          className="w-full py-2.5 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition"
        >
          완료
        </button>

        {wrongQuestions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">
              틀린 문항 ({wrongQuestions.length})
            </p>
            {wrongQuestions.map(q => (
              <div key={q.item.num} className="card py-3 border-red-100 space-y-0.5">
                <p className="text-sm font-bold text-gray-800">{q.item.vocab}</p>
                <p className="text-xs text-red-600 font-medium">정답: {q.item.answer}</p>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">멤버 점수 현황</p>
          <div className="card divide-y divide-gray-50">
            {allUsers.map(user => {
              const s = allScores.find(x => x.userId === user.id);
              const isMe = user.id === currentUser.id;
              return (
                <div key={user.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className={`text-sm font-semibold flex-1 ${isMe ? 'text-primary-600' : 'text-gray-700'}`}>
                    <NameWithCrown name={user.username} />{isMe ? ' (나)' : ''}
                  </span>
                  {s ? (
                    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${getResult(s.score).color}`}>
                      {getResult(s.score).icon}
                      <span>{s.score} / 20</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-300 bg-gray-50 px-2.5 py-1 rounded-full">미제출</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ── 메인 화면: 방식 선택 / 단답형 / 저장된 점수 ── */
  return (
    <div className="space-y-4" key={tick}>
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">내 시험 점수</p>
          <span className="text-[11px] text-gray-400">{date}</span>
        </div>

        {!showForm && existing ? (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${getResult(existing.score).color}`}>
              {getResult(existing.score).icon}
              <div className="flex-1">
                <p className="text-sm font-bold">{existing.score} / 20</p>
                <p className="text-[11px]">{getResult(existing.score).label} — {getResult(existing.score).detail}</p>
              </div>
            </div>
            <button
              onClick={() => { setInput(String(existing.score)); setEditing(true); setMode('short_answer'); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-500 transition"
            >
              <Edit2 className="w-3 h-3" />수정
            </button>
          </div>
        ) : mode === null ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">응시 방식을 선택하세요 (한 가지만 선택 가능)</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('short_answer')}
                className="py-5 rounded-xl border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition text-center space-y-1"
              >
                <p className="text-sm font-bold text-gray-800">단답형</p>
                <p className="text-[11px] text-gray-400">점수 직접 입력</p>
              </button>
              <button
                onClick={startMC}
                disabled={vocabItems.length === 0}
                className="py-5 rounded-xl border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-center space-y-1"
              >
                <p className="text-sm font-bold text-gray-800">객관식</p>
                <p className="text-[11px] text-gray-400">5지선다 · {vocabItems.length}문항</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">20문항 중 맞힌 개수를 입력하세요.</p>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={20}
                className="input-field flex-1 text-sm"
                placeholder="예: 17"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleShortAnswerSubmit(); }}
              />
              <button
                onClick={handleShortAnswerSubmit}
                disabled={!input || Number(input) < 1 || Number(input) > 20}
                className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition"
              >
                제출
              </button>
              <button
                onClick={() => { setEditing(false); setMode(null); }}
                className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition"
              >취소</button>
            </div>
            {input && Number(input) >= 1 && Number(input) <= 20 && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${getResult(Number(input)).color}`}>
                {getResult(Number(input)).icon}
                <span className="font-semibold">{getResult(Number(input)).label}</span>
                <span>— {getResult(Number(input)).detail}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">멤버 점수 현황</p>
        <div className="card divide-y divide-gray-50">
          {allUsers.map(user => {
            const s = allScores.find(x => x.userId === user.id);
            const isMe = user.id === currentUser.id;
            return (
              <div key={user.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className={`text-sm font-semibold flex-1 ${isMe ? 'text-primary-600' : 'text-gray-700'}`}>
                  <NameWithCrown name={user.username} />{isMe ? ' (나)' : ''}
                </span>
                {s ? (
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${getResult(s.score).color}`}>
                    {getResult(s.score).icon}
                    <span>{s.score} / 20</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-300 bg-gray-50 px-2.5 py-1 rounded-full">미제출</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { range: '1–9', label: '전체 재시험', color: 'text-red-500 bg-red-50' },
          { range: '10–15', label: '틀린 어휘 재시험', color: 'text-amber-500 bg-amber-50' },
          { range: '16–20', label: '통과', color: 'text-green-600 bg-green-50' },
        ].map(item => (
          <span key={item.range} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.color}`}>
            {item.range}점 — {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
