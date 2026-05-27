import { CLASSICAL_VOCAB } from '../../data/classicalVocab';

interface Props {
  date: string;
}

function getDailyIndex(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  return hash % CLASSICAL_VOCAB.length;
}

export default function DailyVocab({ date }: Props) {
  const idx = getDailyIndex(date);
  const vocab = CLASSICAL_VOCAB[idx];

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
      <div className="flex-shrink-0 w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center text-white text-sm font-bold">
        {idx + 1}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-0.5">오늘의 고전 어휘</p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-base font-bold text-amber-900">{vocab.classical}</span>
          <span className="text-amber-400 text-sm">→</span>
          <span className="text-sm font-medium text-amber-800">{vocab.modern}</span>
        </div>
      </div>
    </div>
  );
}
