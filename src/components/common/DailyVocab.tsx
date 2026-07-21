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
    <div
      className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
      style={{
        background: 'rgba(255,255,255,0.62)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(121,179,168,0.30)',
        boxShadow: '0 2px 12px rgba(43,100,96,0.07), 0 0 0 1px rgba(255,255,255,0.55) inset',
      }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black"
        style={{ background: 'linear-gradient(135deg, #52988c 0%, #2b6460 100%)' }}
      >
        {idx + 1}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-wider mb-0.5">오늘의 고전 어휘</p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-base font-bold text-primary-900">{vocab.classical}</span>
          <span className="text-primary-400 text-sm">→</span>
          <span className="text-sm font-medium text-primary-700">{vocab.modern}</span>
        </div>
      </div>
    </div>
  );
}
