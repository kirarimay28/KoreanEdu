import { useState } from 'react';
import { BookOpen, BookMarked, AlignLeft, ChevronDown, ChevronUp, Lock, Unlock, BookText, ExternalLink } from 'lucide-react';
import type { User } from '../../types';
import { getLitTextbookVisible, setLitTextbookVisible } from '../../store';

interface Props {
  currentUser: User;
}

interface Step {
  label: string;
  sub?: string;
  note?: string;
}

interface Textbook {
  title?: string;
  url?: string;
  locked?: boolean;
}

interface Section {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  badge: string;
  title: string;
  steps?: Step[];
  textbook: Textbook;
}

const SECTIONS: Section[] = [
  {
    id: 'edu',
    icon: BookOpen,
    gradient: 'linear-gradient(135deg, #2b6460, #52988c)',
    badge: '01',
    title: '국어교과교육론',
    textbook: { title: '국어교육의 이해' },
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
    gradient: 'linear-gradient(135deg, #5b7fa6, #7fabc8)',
    badge: '02',
    title: '문학',
    textbook: {
      title: '추후 공개',
      url: 'http://m.holro2.co.kr/view.html?idx=301954',
      locked: true,
    },
    steps: [
      { label: '시중 교재로 진행' },
    ],
  },
  {
    id: 'gram',
    icon: AlignLeft,
    gradient: 'linear-gradient(135deg, #7a6248, #a08060)',
    badge: '03',
    title: '문법',
    textbook: { title: '우리말 문법론' },
    steps: [
      { label: '매주 개론서 한 챕터씩 회독', sub: '모여서 질의응답' },
      { label: '각자 빈칸 시험지 만들어 오기', note: '양식 있음' },
      { label: '만들어 온 빈칸 시험지 돌려서 풀기', note: '제작자가 본인 시험지 풀지 않도록!' },
      { label: '해당 챕터 키워드 정리' },
      { label: '해당 챕터 관련 기출 문제 풀이' },
    ],
  },
];

function TextbookBadge({
  textbook,
  isAdmin,
  litVisible,
  onToggle,
}: {
  textbook: Textbook;
  isAdmin: boolean;
  litVisible: boolean;
  onToggle?: () => void;
}) {
  const showLink = textbook.url && (!textbook.locked || litVisible);
  const showLocked = textbook.locked && !litVisible;

  return (
    <div
      className="mt-3 rounded-xl px-3 py-2.5 flex items-start gap-2.5"
      style={{
        background: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(121,179,168,0.22)',
      }}
    >
      <BookText className="w-3.5 h-3.5 text-primary-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-wider mb-0.5">교재 안내</p>

        {showLocked ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-amber-700 font-medium">비공개</span>
            <span className="text-[10px] text-amber-500">— 학기 중 공개 예정</span>
            {isAdmin && (
              <button
                onClick={onToggle}
                className="ml-auto flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#b45309', border: '1px solid rgba(251,191,36,0.35)' }}
              >
                <Unlock className="w-2.5 h-2.5" />공개로 전환
              </button>
            )}
          </div>
        ) : showLink ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href={textbook.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 underline underline-offset-2"
            >
              {textbook.title}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            {isAdmin && textbook.locked && (
              <button
                onClick={onToggle}
                className="ml-auto flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition"
                style={{ background: 'rgba(43,100,96,0.10)', color: '#2b6460', border: '1px solid rgba(43,100,96,0.22)' }}
              >
                <Lock className="w-2.5 h-2.5" />비공개로 전환
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs font-semibold text-gray-800">{textbook.title}</p>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  isAdmin,
  litVisible,
  onToggleLit,
}: {
  section: Section;
  isAdmin: boolean;
  litVisible: boolean;
  onToggleLit: () => void;
}) {
  const [open, setOpen] = useState(false);
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
      {/* Header — always visible, tap to toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: section.gradient }}
        >
          <Icon className="w-[18px] h-[18px] text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(43,100,96,0.10)', color: '#2b6460' }}
            >
              {section.badge}
            </span>
            {section.textbook.locked && !litVisible && (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                <Lock className="w-2.5 h-2.5" />비공개
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-800">{section.title}</p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-4 pb-4 border-t border-white/50 pt-3 space-y-1">
          {/* Steps */}
          {section.steps && (
            <ol className="space-y-2">
              {section.steps.map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white mt-0.5"
                    style={{ background: section.gradient }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-relaxed">{step.label}</p>
                    {step.sub && (
                      <p className="text-[11px] text-primary-600 font-medium mt-0.5">↳ {step.sub}</p>
                    )}
                    {step.note && (
                      <span
                        className="text-[11px] font-medium mt-1 px-2 py-0.5 rounded-md inline-block"
                        style={{ background: 'rgba(43,100,96,0.08)', color: '#2b6460' }}
                      >
                        ※ {step.note}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* Textbook */}
          <TextbookBadge
            textbook={section.textbook}
            isAdmin={isAdmin}
            litVisible={litVisible}
            onToggle={section.id === 'lit' ? onToggleLit : undefined}
          />
        </div>
      )}
    </div>
  );
}

export default function CurriculumTab({ currentUser }: Props) {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'subadmin';
  const [litVisible, setLitVisible] = useState(() => getLitTextbookVisible());

  function handleToggleLit() {
    const next = !litVisible;
    setLitTextbookVisible(next);
    setLitVisible(next);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
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
          과목을 탭하면 진행 방식과 교재를 확인할 수 있어요.
        </p>
      </div>

      {SECTIONS.map(s => (
        <SectionCard
          key={s.id}
          section={s}
          isAdmin={isAdmin}
          litVisible={litVisible}
          onToggleLit={handleToggleLit}
        />
      ))}
    </div>
  );
}
