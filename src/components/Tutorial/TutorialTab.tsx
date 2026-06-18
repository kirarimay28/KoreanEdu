import { useState } from 'react';
import {
  BookOpen, GraduationCap, ClipboardList, HelpCircle, CalendarDays,
  Megaphone, Lightbulb, CalendarCheck, Mail, Plane, Inbox, Users,
  ChevronLeft, ChevronRight, Map,
} from 'lucide-react';

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badge: string;
  title: string;
  desc: string;
  tips: { emoji: string; text: string }[];
}

const STEPS: Step[] = [
  {
    icon: BookOpen,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    badge: '시작하기',
    title: '나랏말쓰미에 오신 걸 환영해요!',
    desc: '국어 임용고시를 함께 준비하는 스터디 앱이에요. 모든 기록이 실시간으로 저장돼요.',
    tips: [
      { emoji: '📱', text: '화면 하단 탭 바(스터디·개인공부·반성·질의응답·캘린더)로 주요 기능을 이용해요.' },
      { emoji: '☰', text: '우측 상단 메뉴(≡)에서 출석·쪽지·휴가신청 등 추가 기능을 볼 수 있어요.' },
      { emoji: '🔄', text: '다른 기기에서 접속해도 데이터가 그대로 유지돼요.' },
    ],
  },
  {
    icon: Megaphone,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    badge: '메인 화면',
    title: '공지사항',
    desc: '관리자가 올린 공지를 메인 화면 상단에서 항상 확인할 수 있어요.',
    tips: [
      { emoji: '📌', text: '핀 고정된 공지는 항상 맨 위에 표시돼요.' },
      { emoji: '👆', text: '공지 제목을 탭하면 상세 내용이 펼쳐져요.' },
      { emoji: '🔔', text: '새로운 공지가 올라오면 꼭 확인하세요!' },
    ],
  },
  {
    icon: Lightbulb,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: '메인 화면',
    title: '이번 주 교육관 형성 질문',
    desc: '매주 새로운 교육 철학 질문에 답하면서 교사로서의 가치관을 다듬어요.',
    tips: [
      { emoji: '✍️', text: '[내 답변 작성]을 눌러 나만의 답변을 작성하세요.' },
      { emoji: '👥', text: '[다른 답변 보러 가기]로 스터디원들의 생각을 읽어볼 수 있어요.' },
      { emoji: '👍', text: '마음에 드는 답변에 좋아요/싫어요 반응을 남길 수 있어요.' },
    ],
  },
  {
    icon: BookOpen,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    badge: '스터디 탭',
    title: '고전·현대 문학 학습 기록',
    desc: '오늘 스터디에서 다룬 작품을 분석하고 기록해요.',
    tips: [
      { emoji: '📅', text: '상단에서 날짜를 선택하고 [+ 새 작품 추가]를 탭하세요.' },
      { emoji: '🏛️', text: '고전 문학: 시적 화자·정서·배경·표현법 등 항목별로 분석을 입력해요.' },
      { emoji: '📖', text: '현대 문학: 답안 초안 → 모범 답안 검토 → 사고 과정 순으로 기록해요.' },
      { emoji: '💬', text: '다른 멤버의 기록에 피드백을 남길 수 있어요.' },
    ],
  },
  {
    icon: GraduationCap,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    badge: '개인공부 탭',
    title: '개인 공부 내용 기록',
    desc: '국교론, 문법 등 오늘 혼자 공부한 내용을 기록해요.',
    tips: [
      { emoji: '📚', text: '과목을 선택하세요: 국교론 / 현대 문법 / 중세 문법 / 개론서 / 기타' },
      { emoji: '⏱️', text: '공부 시간과 커리큘럼을 입력하면 학습량을 파악할 수 있어요.' },
      { emoji: '✅', text: '시험 여부(O/△/X)를 표시하고 피드백 칸에 소감을 메모하세요.' },
    ],
  },
  {
    icon: ClipboardList,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    badge: '반성 탭',
    title: '오늘의 반성과 개선 방향',
    desc: '부족했던 점을 솔직히 돌아보고 내일의 방향을 잡아요.',
    tips: [
      { emoji: '🪞', text: '오늘 공부에서 부족했던 부분을 솔직하게 작성하세요.' },
      { emoji: '🎯', text: '내일의 개선 방향을 구체적으로 설정하세요.' },
      { emoji: '📈', text: '꾸준한 반성 기록이 실력 향상의 지름길이에요!' },
    ],
  },
  {
    icon: HelpCircle,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    badge: '질의응답 탭',
    title: '궁금한 점을 질문하세요',
    desc: '스터디 관련 질문을 올리고 서로 답해줘요.',
    tips: [
      { emoji: '✏️', text: '[글쓰기] 버튼으로 제목과 내용을 입력해 질문을 등록하세요.' },
      { emoji: '👆', text: '게시글을 탭하면 내용과 댓글이 펼쳐져요.' },
      { emoji: '⌨️', text: '댓글 입력 후 Enter 키를 누르면 빠르게 전송돼요.' },
      { emoji: '🗑️', text: '본인이 작성한 글과 댓글은 직접 삭제할 수 있어요.' },
    ],
  },
  {
    icon: CalendarDays,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    badge: '캘린더 탭',
    title: '휴가 일정을 한눈에',
    desc: '승인된 멤버들의 휴가 일정을 달력으로 확인해요.',
    tips: [
      { emoji: '◀️▶️', text: '화살표 버튼으로 이전/다음 달로 이동하세요.' },
      { emoji: '🟡', text: '날짜에 노란 뱃지 = 그 날 휴가가 승인된 멤버 이름이에요.' },
      { emoji: '🔵', text: '오늘 날짜는 파란 원으로 강조 표시돼요.' },
    ],
  },
  {
    icon: CalendarCheck,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badge: '출석 탭',
    title: '매일 출석 체크!',
    desc: '스터디 참여를 인증하고 멤버들의 출석 현황을 확인해요.',
    tips: [
      { emoji: '☑️', text: '[출석 체크] 버튼으로 오늘 출석을 등록하세요.' },
      { emoji: '👀', text: '멤버별 출석 현황과 누적 기록을 한눈에 볼 수 있어요.' },
      { emoji: '⚠️', text: '출석은 하루에 한 번만 체크할 수 있어요.' },
    ],
  },
  {
    icon: Mail,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    badge: '쪽지 탭',
    title: '스터디원에게 개인 메시지',
    desc: '다른 멤버에게 쪽지를 보내거나 받은 쪽지를 확인해요.',
    tips: [
      { emoji: '📩', text: '[쪽지 쓰기] → 받는 사람 선택 → 내용 입력 → 보내기' },
      { emoji: '🔴', text: '받은쪽지 탭의 빨간 숫자 = 아직 읽지 않은 쪽지 수예요.' },
      { emoji: '👁️', text: '쪽지를 열면 자동으로 읽음 처리되고, 보낸 쪽지에 [읽음] 표시가 떠요.' },
      { emoji: '🗑️', text: '읽은 쪽지는 삭제해서 정리할 수 있어요.' },
    ],
  },
  {
    icon: Plane,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    badge: '휴가신청 탭',
    title: '결석 시 휴가 신청',
    desc: '부득이하게 스터디에 참석하지 못할 때 사전에 신청해요.',
    tips: [
      { emoji: '📋', text: '휴가 날짜, 사유(질병·여행 등), 보충 날짜를 입력하세요.' },
      { emoji: '⏳', text: '신청 후 관리자 승인을 기다리세요. 승인되면 캘린더에 표시돼요.' },
      { emoji: '📬', text: '승인·거절 여부는 휴가신청 탭과 휴가명단 탭에서 확인하세요.' },
    ],
  },
  {
    icon: Inbox,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    badge: '자료요청 탭',
    title: '스터디원에게 자료 요청',
    desc: '필요한 기출 문제나 작품 자료를 특정 멤버에게 요청해요.',
    tips: [
      { emoji: '📤', text: '받을 사람, 자료 종류(기출 문제·작품 자료 등), 세부 내용을 입력하세요.' },
      { emoji: '🔴', text: '우측 상단 메뉴(≡)의 빨간 점 = 처리해야 할 미완료 요청이 있다는 신호예요.' },
      { emoji: '✅', text: '요청을 처리했으면 [완료] 버튼을 눌러 상태를 업데이트하세요.' },
    ],
  },
  {
    icon: Users,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    badge: '멤버 탭',
    title: '스터디원 정보 확인',
    desc: '스터디에 참여 중인 멤버들의 정보를 볼 수 있어요.',
    tips: [
      { emoji: '👤', text: '멤버 이름, 가입일, 나의 다짐을 확인할 수 있어요.' },
      { emoji: '🛡️', text: '관리자는 멤버의 역할(부관리자)을 설정하거나 경고를 줄 수 있어요.' },
      { emoji: '💪', text: '서로의 다짐을 보며 함께 동기부여해요!' },
    ],
  },
];

export default function TutorialTab() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const total = STEPS.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Map className="w-4 h-4 text-primary-500" />
        <h2 className="text-sm font-bold text-gray-800">튜토리얼</h2>
        <span className="text-xs text-gray-400">앱 사용 방법 가이드</span>
      </div>

      {/* Card */}
      <div className="card p-5">
        {/* Step counter */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-100 transition text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-gray-500">
            {step + 1} / {total}
          </span>
          <button
            onClick={() => setStep(s => Math.min(total - 1, s + 1))}
            disabled={step === total - 1}
            className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-100 transition text-gray-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Icon + Badge */}
        <div className="flex flex-col items-center mb-4">
          <div className={`w-16 h-16 rounded-2xl ${current.iconBg} flex items-center justify-center mb-3 shadow-sm`}>
            <Icon className={`w-8 h-8 ${current.iconColor}`} />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${current.iconBg} ${current.iconColor} mb-2`}>
            {current.badge}
          </span>
          <h3 className="text-base font-bold text-gray-800 text-center leading-snug">
            {current.title}
          </h3>
          <p className="text-xs text-gray-500 text-center mt-1.5 leading-relaxed">
            {current.desc}
          </p>
        </div>

        {/* Tips */}
        <div className="space-y-2.5 border-t border-gray-100 pt-4">
          {current.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5 flex-shrink-0">{tip.emoji}</span>
              <p className="text-sm text-gray-700 leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap px-4">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`rounded-full transition-all ${
              i === step
                ? 'w-4 h-2 bg-primary-500'
                : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Prev/Next buttons */}
      <div className="flex gap-2">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </button>
        )}
        {step < total - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition"
          >
            다음
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setStep(0)}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition"
          >
            처음으로 돌아가기 🎉
          </button>
        )}
      </div>
    </div>
  );
}
