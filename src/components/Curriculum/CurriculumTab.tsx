import { useState } from 'react';
import { BookOpen, BookMarked, AlignLeft, ChevronDown, ChevronUp, Lock } from 'lucide-react';

interface Step {
  label: string;
  sub?: string;
  note?: string;
}

interface Section {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconGradient: string;
  badge: string;
  title: string;
  locked?: boolean;
  lockedMsg?: string;
  steps?: Step[];
}

const SECTIONS: Section[] = [
  {
    id: 'edu',
    icon: BookOpen,
    iconGradient: 'linear-gradient(135deg, #2b6460, #52988c)',
    badge: '01',
    title: '국어교과교육론',
    steps: [
      { label: '매주 개론서 한 챕터씩 회독' },
      { label: '각자 빈칸 시험지 만들어 오기', note: '양식 있음' },
      { label: '만들어 온 빈칸 시험지 돌려서 풀기', note: '제작자가 본인 시험지 풀지 않도록!' },
      { label: '해당 챕터 키워드 정리' },
      { label: '해당 챕터 관련 기출 문제 풀이' },
    ],
  },
  {
    id: 'lit',
    icon: BookMarked,
    iconGradient: 'linear-gradient(135deg, #5b7fa6, #7fabc8)',
    badge: '02',
    title: '문학',
    locked: true,
    lockedMsg: '학기 중에 스터디 구성원에 한해 공개됩니다.',
    steps: [
      { label: '시중 교재로 진행' },
    ],
  },
  {
    id: 'gram',
    icon: AlignLeft,
    iconGradient: 'linear-gradient(135deg, #7a6248, #a08060)',
    badge: '03',
    title: '문법',
    steps: [
      { label: '매주 개론서 한 챕터씩 회독', sub: '모여서 질의응답' },
      { label: '각자 빈칸 시험지 만들어 오기', note: '양식 있음' },
      { label: '만들어 온 빈칸 시험지 돌려서 풀기', note: '제작자가 본인 시험지 풀지 않도록!' },
      { label: '해당 챕터 키워드 정리' },
      { label: '해당 챕터 관련 기출 문제 풀이' },
    ],
  },
];

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);
  const Icon = section.icon;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.52)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.58)',
        boxShadow: '0 2px 16px rgba(43,100,96,0.07), 0 0 0 1px rgba(255,255,255,0.42) inset',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: section.iconGradient }}
        >
          <Icon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(43,100,96,0.10)', color: '#2b6460' }}
            >
              {section.badge}
            </span>
            {section.locked && (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                <Lock className="w-2.5 h-2.5" />비공개
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-800 mt-0.5">{section.title}</p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/50 pt-3">
          {section.locked ? (
            <div
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl"
              style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.22)' }}
            >
              <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium leading-relaxed">{section.lockedMsg}</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {section.steps!.map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  {/* Step number badge */}
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white mt-0.5"
                    style={{ background: section.iconGradient }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-relaxed">{step.label}</p>
                    {step.sub && (
                      <p className="text-[11px] text-primary-600 font-medium mt-0.5">↳ {step.sub}</p>
                    )}
                    {step.note && (
                      <p
                        className="text-[11px] font-medium mt-1 px-2 py-0.5 rounded-md inline-block"
                        style={{ background: 'rgba(43,100,96,0.08)', color: '#2b6460' }}
                      >
                        ※ {step.note}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export default function CurriculumTab() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div
        className="rounded-2xl px-4 py-4"
        style={{
          background: 'linear-gradient(135deg, rgba(43,100,96,0.18) 0%, rgba(82,152,140,0.12) 100%)',
          border: '1px solid rgba(121,179,168,0.28)',
        }}
      >
        <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-widest mb-1">Study Curriculum</p>
        <p className="text-sm font-bold text-primary-900">스터디 커리큘럼</p>
        <p className="text-[11px] text-primary-600 mt-1 leading-relaxed">
          각 과목별 진행 방식과 주차별 루틴을 안내합니다.
        </p>
      </div>

      {SECTIONS.map(s => <SectionCard key={s.id} section={s} />)}
    </div>
  );
}
