import { useState, useMemo } from 'react';
import { VOCAB_ITEMS } from '../../data/vocabData';
import { ChevronLeft, ChevronRight, RotateCcw, BookOpen, ArrowLeft, List, Search } from 'lucide-react';

type Phase = 'setup' | 'study' | 'done';
type Mode  = 'flash' | 'list';

/* ── 단어장 뷰 ───────────────────────────────────────────── */
function VocabListView() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return VOCAB_ITEMS;
    return VOCAB_ITEMS.filter(v =>
      v.vocab.toLowerCase().includes(q) || v.answer.toLowerCase().includes(q) || String(v.num) === q
    );
  }, [query]);

  return (
    <div className="space-y-3">
      {/* 검색 */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="고어 / 현대어 / 번호 검색"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-primary-400 bg-white"
        />
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-0 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          <span>#</span>
          <span>고어</span>
          <span>현대어</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-8">검색 결과 없음</p>
          ) : filtered.map(v => (
            <div key={v.num} className="grid grid-cols-[2rem_1fr_1fr] gap-0 items-center px-4 py-3">
              <span className="text-[11px] text-gray-300 font-mono">{v.num}</span>
              <span className="text-sm font-bold text-gray-700 pr-2">{v.vocab}</span>
              <span className="text-sm text-gray-500">{v.answer}</span>
            </div>
          ))}
        </div>
        {query && (
          <p className="text-[10px] text-gray-300 text-center py-2 border-t border-gray-50">
            {filtered.length}개 / 전체 {VOCAB_ITEMS.length}개
          </p>
        )}
      </div>
    </div>
  );
}

/* ── 플래시 카드 뷰 ─────────────────────────────────────── */
function FlashCardView() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(20);
  const [carryover, setCarryover] = useState<number[]>([]);
  const [cards, setCards] = useState<typeof VOCAB_ITEMS>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());

  const rangeCount = Math.max(0, endNum - startNum + 1);
  const totalCount = rangeCount + carryover.length;

  const outsideRange = useMemo(
    () => VOCAB_ITEMS.filter(v => v.num < startNum || v.num > endNum),
    [startNum, endNum],
  );

  function toggleCarryover(num: number) {
    setCarryover(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
  }

  function startStudy() {
    const mainCards = VOCAB_ITEMS.filter(v => v.num >= startNum && v.num <= endNum);
    const coCards   = VOCAB_ITEMS.filter(v => carryover.includes(v.num));
    setCards([...coCards, ...mainCards]);
    setIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
    setPhase('study');
  }

  function markKnown() {
    setKnown(prev => new Set([...prev, cards[index].num]));
    advance();
  }

  function markUnknown() {
    setUnknown(prev => new Set([...prev, cards[index].num]));
    advance();
  }

  function advance() {
    if (index < cards.length - 1) {
      setIndex(i => i + 1);
      setFlipped(false);
    } else {
      setPhase('done');
    }
  }

  function prev() {
    if (index > 0) { setIndex(i => i - 1); setFlipped(false); }
  }

  if (phase === 'setup') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">번호 입력</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-[10px] text-gray-400 font-bold mb-1.5">시작</p>
              <input
                type="number" min={1} max={100}
                value={startNum}
                onChange={e => {
                  const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                  setStartNum(v);
                  if (v > endNum) setEndNum(v);
                }}
                className="w-full text-center text-3xl font-black border-2 border-gray-200 focus:border-primary-400 rounded-xl py-3 focus:outline-none"
              />
            </div>
            <span className="text-gray-300 text-2xl font-bold pt-5">~</span>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-gray-400 font-bold mb-1.5">끝</p>
              <input
                type="number" min={1} max={100}
                value={endNum}
                onChange={e => {
                  const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                  setEndNum(v);
                  if (v < startNum) setStartNum(v);
                }}
                className="w-full text-center text-3xl font-black border-2 border-gray-200 focus:border-primary-400 rounded-xl py-3 focus:outline-none"
              />
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">{rangeCount}개 선택됨</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">이월 번호 입력</p>
          <p className="text-[11px] text-gray-400 mb-3">범위 외에 추가 학습할 번호를 선택하세요</p>
          {outsideRange.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-2">전체 범위(1~100)가 선택됨</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {outsideRange.map(v => {
                const active = carryover.includes(v.num);
                return (
                  <button
                    key={v.num}
                    onClick={() => toggleCarryover(v.num)}
                    className={`w-9 h-9 text-xs font-bold rounded-xl border-2 transition ${
                      active
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-primary-300'
                    }`}
                  >
                    {v.num}
                  </button>
                );
              })}
            </div>
          )}
          {carryover.length > 0 && (
            <p className="text-xs text-primary-600 font-semibold mt-2.5">+ 이월 {carryover.length}개</p>
          )}
        </div>

        <button
          onClick={startStudy}
          disabled={rangeCount === 0}
          className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white font-bold text-sm rounded-2xl transition shadow-sm flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          학습 시작 — 총 {totalCount}개
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const knownCount   = known.size;
    const unknownCount = unknown.size;
    const skippedCount = cards.length - knownCount - unknownCount;
    const pct = cards.length > 0 ? Math.round((knownCount / cards.length) * 100) : 0;
    const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '👍' : '💪';

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="text-5xl mb-3">{emoji}</div>
          <p className="text-lg font-black text-gray-800">학습 완료!</p>
          <p className="text-sm text-gray-500 mt-0.5">{cards.length}개 중 {knownCount}개 정확히 기억</p>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-[11px] text-green-600 font-bold mb-0.5">알아요</p>
              <p className="text-2xl font-black text-green-700">{knownCount}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-[11px] text-red-500 font-bold mb-0.5">모름</p>
              <p className="text-2xl font-black text-red-600">{unknownCount}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-gray-400 font-bold mb-0.5">넘김</p>
              <p className="text-2xl font-black text-gray-500">{skippedCount}</p>
            </div>
          </div>
        </div>

        {unknownCount > 0 && (
          <button
            onClick={() => {
              setCards(cards.filter(c => unknown.has(c.num)));
              setIndex(0); setFlipped(false);
              setKnown(new Set()); setUnknown(new Set());
              setPhase('study');
            }}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            모르는 것만 다시 ({unknownCount}개)
          </button>
        )}
        <button
          onClick={() => { setPhase('setup'); setCarryover([]); }}
          className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition flex items-center justify-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          처음으로
        </button>
      </div>
    );
  }

  const card = cards[index];
  const progress = ((index + 1) / cards.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPhase('setup')}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />설정
        </button>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-gray-600">{index + 1} / {cards.length}</span>
          <div className="w-36 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-xs font-mono text-gray-400">No.{card.num}</span>
      </div>

      <div
        className="relative cursor-pointer select-none"
        style={{ perspective: '1000px', height: '300px' }}
        onClick={() => setFlipped(f => !f)}
      >
        <div
          className="relative w-full h-full transition-all duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div
            className="absolute inset-0 bg-white rounded-3xl border-2 border-primary-100 shadow-md flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest mb-6">고어</p>
            <p className="text-3xl font-black text-gray-800 text-center leading-relaxed">{card.vocab}</p>
            <p className="text-[11px] text-gray-300 font-medium mt-8">터치하면 뒷면으로</p>
          </div>

          <div
            className="absolute inset-0 rounded-3xl border-2 border-primary-200 shadow-md flex flex-col items-center justify-center p-8"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, #d4e8e2 0%, #aacfc5 100%)',
            }}
          >
            <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mb-4">현대어</p>
            <p className="text-xl font-black text-gray-800 text-center leading-relaxed">{card.answer}</p>
            <div className="mt-6 pt-4 border-t border-primary-200 w-full text-center">
              <p className="text-xs text-primary-600 font-semibold">{card.vocab}</p>
            </div>
          </div>
        </div>
      </div>

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={markUnknown} className="py-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl border-2 border-red-100 transition text-sm">
            모르겠어요 😢
          </button>
          <button onClick={markKnown} className="py-4 bg-green-50 hover:bg-green-100 text-green-600 font-bold rounded-2xl border-2 border-green-100 transition text-sm">
            알아요 ✓
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={prev} disabled={index === 0} className="py-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-600 font-bold rounded-2xl transition flex items-center justify-center gap-1.5 text-sm">
            <ChevronLeft className="w-4 h-4" />이전
          </button>
          <button onClick={advance} className="py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl transition flex items-center justify-center gap-1.5 text-sm">
            다음<ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-center gap-4 text-xs">
        <span className="text-green-600 font-semibold">✓ 알아요 {known.size}</span>
        <span className="text-red-500 font-semibold">✗ 모름 {unknown.size}</span>
      </div>
    </div>
  );
}

/* ── 메인 ───────────────────────────────────────────────── */
export default function VocabStudyTab() {
  const [mode, setMode] = useState<Mode>('flash');

  return (
    <div className="space-y-4">
      {/* 모드 탭 */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setMode('flash')}
          className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium flex items-center justify-center gap-1.5 ${mode === 'flash' ? 'tab-active' : 'tab-inactive'}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          플래시 카드
        </button>
        <button
          onClick={() => setMode('list')}
          className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium flex items-center justify-center gap-1.5 ${mode === 'list' ? 'tab-active' : 'tab-inactive'}`}
        >
          <List className="w-3.5 h-3.5" />
          단어장
        </button>
      </div>

      {mode === 'flash' ? <FlashCardView /> : <VocabListView />}
    </div>
  );
}
