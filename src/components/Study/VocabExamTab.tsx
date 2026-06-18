import { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, Save, ChevronDown, Trash2 } from 'lucide-react';
import type { User } from '../../types';
import { VOCAB_ITEMS, isAnswerCorrect } from '../../data/vocabData';
import { saveVocabExamRecord, getVocabExamRecords, getAllVocabExamRecords, deleteVocabExamRecord } from '../../store';
import { getKSTToday } from '../common/DateNavigator';
import { isPrivileged } from '../../types';

interface Props {
  currentUser: User;
}

type Phase = 'setup' | 'exam' | 'result';

interface GradeResult {
  itemNum: number;
  vocab: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
}

const NUMS = VOCAB_ITEMS.map(v => v.num); // 1–60

export default function VocabExamTab({ currentUser }: Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(20);
  const [noCarryover, setNoCarryover] = useState(true);
  const [carryoverNums, setCarryoverNums] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<GradeResult[]>([]);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [tick, setTick] = useState(0);

  const examItems = (() => {
    const rangeNums = new Set(
      VOCAB_ITEMS.filter(v => v.num >= startNum && v.num <= endNum).map(v => v.num)
    );
    const extra = noCarryover ? [] : carryoverNums;
    extra.forEach(n => rangeNums.add(n));
    return VOCAB_ITEMS.filter(v => rangeNums.has(v.num));
  })();

  function toggleCarryover(num: number) {
    setCarryoverNums(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  }

  function startExam() {
    setAnswers({});
    setResults([]);
    setSaved(false);
    setPhase('exam');
  }

  function grade() {
    const graded: GradeResult[] = examItems.map(item => ({
      itemNum: item.num,
      vocab: item.vocab,
      userAnswer: answers[item.num] ?? '',
      correctAnswer: item.answer,
      correct: isAnswerCorrect(answers[item.num] ?? '', item.answer),
    }));
    setResults(graded);
    setPhase('result');
  }

  function handleSave() {
    const score = results.filter(r => r.correct).length;
    const record = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      username: currentUser.username,
      date: getKSTToday(),
      startNum,
      endNum,
      carryoverNums: noCarryover ? [] : carryoverNums,
      score,
      total: results.length,
      createdAt: new Date().toISOString(),
    };
    saveVocabExamRecord(record);
    setSaved(true);
    setTick(t => t + 1);
  }

  function reset() {
    setPhase('setup');
    setSaved(false);
    setResults([]);
  }

  const history = getVocabExamRecords(currentUser.id);
  const allRecords = isPrivileged(currentUser) ? getAllVocabExamRecords() : [];
  const score = results.filter(r => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  function handleDeleteRecord(id: string) {
    deleteVocabExamRecord(id);
    setTick(t => t + 1);
  }

  if (phase === 'setup') {
    return (
      <div className="space-y-4" key={tick}>
        {/* 번호 선택 */}
        <div className="card space-y-4">
          <p className="text-sm font-bold text-gray-800">시험 범위 설정</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">시작 번호</label>
              <select
                className="input-field"
                value={startNum}
                onChange={e => {
                  const v = Number(e.target.value);
                  setStartNum(v);
                  if (endNum < v) setEndNum(v);
                }}
              >
                {NUMS.map(n => <option key={n} value={n}>{n}번</option>)}
              </select>
            </div>
            <span className="pb-3 text-gray-400 text-sm">~</span>
            <div className="flex-1">
              <label className="label">끝 번호</label>
              <select
                className="input-field"
                value={endNum}
                onChange={e => setEndNum(Number(e.target.value))}
              >
                {NUMS.filter(n => n >= startNum).map(n => <option key={n} value={n}>{n}번</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-primary-600 font-medium">
            총 {examItems.length + (noCarryover ? 0 : carryoverNums.filter(n => !examItems.find(i => i.num === n)).length)}문항
          </p>
        </div>

        {/* 이월 번호 선택 */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">이월 번호 선택</p>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={noCarryover}
                onChange={e => {
                  setNoCarryover(e.target.checked);
                  if (e.target.checked) setCarryoverNums([]);
                }}
                className="w-4 h-4 accent-primary-600"
              />
              없음
            </label>
          </div>

          {!noCarryover && (
            <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {VOCAB_ITEMS.map(item => {
                const inRange = item.num >= startNum && item.num <= endNum;
                const checked = carryoverNums.includes(item.num);
                return (
                  <label
                    key={item.num}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition select-none ${
                      inRange
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : checked
                        ? 'bg-primary-50 border border-primary-300 text-primary-700 font-semibold'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-3 h-3 accent-primary-600 flex-shrink-0"
                      checked={inRange ? true : checked}
                      disabled={inRange}
                      onChange={() => !inRange && toggleCarryover(item.num)}
                    />
                    <span className="font-bold w-5 flex-shrink-0">{item.num}</span>
                    <span className="truncate">{item.vocab}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={startExam}
          disabled={examItems.length === 0}
          className="btn-primary w-full"
        >
          시험 응시 ({examItems.length + (noCarryover ? 0 : carryoverNums.filter(n => n < startNum || n > endNum).length)}문항)
        </button>

        {/* 최근 기록 */}
        {history.length > 0 && (
          <div className="card space-y-2">
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center justify-between w-full text-sm font-semibold text-gray-700"
            >
              <span>최근 응시 기록</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            {showHistory && (
              <div className="divide-y divide-gray-50 mt-1">
                {history.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="text-gray-500">
                      {r.date} · {r.startNum}~{r.endNum}번
                      {r.carryoverNums.length > 0 && ` + 이월 ${r.carryoverNums.join(', ')}`}
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded-full ${
                      r.score / r.total >= 0.8
                        ? 'text-green-700 bg-green-50'
                        : r.score / r.total >= 0.5
                        ? 'text-amber-700 bg-amber-50'
                        : 'text-red-700 bg-red-50'
                    }`}>
                      {r.score}/{r.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 어드민: 전체 응시 기록 관리 */}
        {isPrivileged(currentUser) && allRecords.length > 0 && (
          <div className="card space-y-2 border-amber-100">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">전체 응시 기록 (관리자)</p>
            <div className="divide-y divide-gray-50">
              {allRecords.map(r => (
                <div key={r.id} className="flex items-center gap-2 py-2.5 text-xs">
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-700">{r.username}</span>
                    <span className="text-gray-400 ml-1.5">
                      {r.date} · {r.startNum}~{r.endNum}번
                      {r.carryoverNums.length > 0 && ` + 이월 ${r.carryoverNums.join(', ')}`}
                    </span>
                  </div>
                  <span className={`font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    r.score / r.total >= 0.8
                      ? 'text-green-700 bg-green-50'
                      : r.score / r.total >= 0.5
                      ? 'text-amber-700 bg-amber-50'
                      : 'text-red-700 bg-red-50'
                  }`}>
                    {r.score}/{r.total}
                  </span>
                  <button
                    onClick={() => handleDeleteRecord(r.id)}
                    className="p-1 text-gray-300 hover:text-red-400 transition flex-shrink-0"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'exam') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-gray-800">
            고어 시험 · {examItems.length}문항
          </p>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 transition">
            취소
          </button>
        </div>
        <p className="text-xs text-gray-400">띄어쓰기 무관 · 글자 일치 시 정답 처리</p>

        <div className="space-y-2">
          {examItems.map((item, idx) => (
            <div key={item.num} className="card space-y-2 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-gray-400 flex-shrink-0">#{idx + 1}</span>
                <span className="text-sm font-bold text-gray-800">{item.vocab}</span>
              </div>
              <input
                className="input-field text-sm"
                placeholder="뜻을 입력하세요"
                value={answers[item.num] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [item.num]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && idx === examItems.length - 1) grade();
                }}
              />
            </div>
          ))}
        </div>

        <button onClick={grade} className="btn-primary w-full mt-2">
          채점하기
        </button>
      </div>
    );
  }

  // result phase
  const wrongItems = results.filter(r => !r.correct);
  const correctItems = results.filter(r => r.correct);

  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className={`card text-center space-y-1 py-5 ${
        pct >= 80 ? 'bg-green-50 border-green-200' :
        pct >= 50 ? 'bg-amber-50 border-amber-200' :
        'bg-red-50 border-red-200'
      }`}>
        <p className={`text-4xl font-black ${
          pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700'
        }`}>
          {score} / {total}
        </p>
        <p className={`text-sm font-semibold ${
          pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
        }`}>
          {pct}% 정답
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
        >
          <RotateCcw className="w-4 h-4" />
          다시 응시
        </button>
        <button
          onClick={handleSave}
          disabled={saved}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
            saved
              ? 'bg-gray-100 text-gray-400 cursor-default'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? '기록 완료' : '기록하기'}
        </button>
      </div>

      {/* Wrong answers */}
      {wrongItems.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">
            틀린 문항 ({wrongItems.length})
          </p>
          {wrongItems.map(r => (
            <div key={r.itemNum} className="card py-3 space-y-1.5 border-red-100">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{r.vocab}</p>
                  {r.userAnswer && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      내 답: <span className="line-through">{r.userAnswer}</span>
                    </p>
                  )}
                  <p className="text-xs text-red-600 font-medium mt-0.5">
                    정답: {r.correctAnswer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Correct answers */}
      {correctItems.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
            맞힌 문항 ({correctItems.length})
          </p>
          {correctItems.map(r => (
            <div key={r.itemNum} className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl border border-green-100">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700">{r.vocab}</span>
              <span className="text-xs text-gray-400 ml-auto truncate max-w-[50%]">{r.correctAnswer}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
