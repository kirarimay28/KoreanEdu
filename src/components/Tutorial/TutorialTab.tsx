import { useState } from 'react';
import {
  BookOpen, GraduationCap, ClipboardList, HelpCircle, CalendarDays,
  Megaphone, CalendarCheck, Mail, Plane, Inbox, Users,
  Map, BookMarked, TableProperties, ChevronDown, ChevronUp,
} from 'lucide-react';

interface Tip { emoji: string; text: string; }
interface SubSection { heading: string; tips: Tip[]; }
interface Section {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  badge: string;
  title: string;
  summary: string;
  tips?: Tip[];
  subs?: SubSection[];
}

const SECTIONS: Section[] = [
  {
    id: 'intro',
    icon: BookOpen,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    borderColor: 'border-primary-100',
    badge: '시작하기',
    title: '앱 전체 구조',
    summary: '나랏말의 화면 구성과 기본 사용법',
    tips: [
      { emoji: '📱', text: '하단 탭 바로 6개 화면(스터디 · 개인공부 · 반성 · 질의응답 · 캘린더 · 과제)을 이동해요.' },
      { emoji: '☰', text: '우측 상단 메뉴(≡)에서 출석 · 멤버 · 자료요청 · 휴가신청 · 쪽지 · 도서관에 접근해요.' },
      { emoji: '👑', text: '방장 이름 옆엔 보라색 왕관, 부방장 이름 옆엔 파란색 왕관이 표시돼요.' },
      { emoji: '🔄', text: '새로고침(↻) 버튼을 누르면 다른 멤버가 올린 최신 데이터를 불러와요.' },
      { emoji: '🔐', text: '로그아웃 후 재접속해도 모든 기록은 서버에 저장돼 그대로 유지돼요.' },
    ],
  },
  {
    id: 'lobby',
    icon: Megaphone,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    borderColor: 'border-primary-100',
    badge: '로비',
    title: '메인 화면',
    summary: '공지사항 · 스터디 장소 · 오늘의 단어 · 교육관 형성 질문',
    subs: [
      {
        heading: '📢 공지사항',
        tips: [
          { emoji: '📌', text: '핀 고정 공지는 항상 맨 위에 표시돼요.' },
          { emoji: '👆', text: '제목을 탭하면 상세 내용이 펼쳐지고, 카카오톡으로 공유할 수 있어요.' },
          { emoji: '✏️', text: '방장·부방장이 공지를 작성하고 삭제할 수 있어요.' },
        ],
      },
      {
        heading: '📍 스터디 장소 안내',
        tips: [
          { emoji: '🗺️', text: '오늘 스터디 장소가 상단 배너로 표시돼요.' },
          { emoji: '✏️', text: '방장·부방장은 언제든지 장소를 수정할 수 있어요.' },
        ],
      },
      {
        heading: '📖 오늘의 단어',
        tips: [
          { emoji: '🔤', text: '매일 고전 어휘 단어 하나가 표시돼요. 짧게 확인하는 습관을 들여보세요!' },
        ],
      },
      {
        heading: '💡 교육관 형성 질문',
        tips: [
          { emoji: '✍️', text: '[내 답변 작성]을 눌러 이번 주 교육 철학 질문에 내 생각을 작성해요.' },
          { emoji: '👥', text: '[다른 답변 보러 가기]로 스터디원들의 생각을 읽어볼 수 있어요.' },
          { emoji: '👍', text: '마음에 드는 답변에 좋아요 / 싫어요 반응을 남길 수 있어요.' },
        ],
      },
    ],
  },
  {
    id: 'study',
    icon: BookOpen,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-100',
    badge: '스터디',
    title: '스터디 탭',
    summary: '고어 시험 · 시험 응시 · 상호 피드백 · 스터디 일지',
    subs: [
      {
        heading: '📝 고어 시험 — 점수 입력',
        tips: [
          { emoji: '🔢', text: '오늘 진행한 고전 어휘 시험 점수(1~20점)를 직접 입력해요.' },
          { emoji: '📊', text: '멤버 전체의 점수 현황을 한눈에 볼 수 있어요.' },
          { emoji: '🗑️', text: '방장·부방장은 잘못 입력된 점수 기록을 삭제할 수 있어요.' },
        ],
      },
      {
        heading: '🖊️ 시험 응시 — 직접 풀기',
        tips: [
          { emoji: '🎯', text: '시작·끝 번호를 설정하고, 추가 복습할 단어(이월 문항)를 선택해 시험 범위를 정해요.' },
          { emoji: '⏱️', text: '응시 시작과 동시에 10분 타이머가 작동해요. 시간이 끝나면 자동으로 채점돼요.' },
          { emoji: '✅', text: '띄어쓰기는 무시하고, 정확한 글자 일치로 채점해요.' },
          { emoji: '📈', text: '[기록하기]를 누르면 고어 시험 탭의 오늘 점수에 자동으로 반영돼요.' },
          { emoji: '🚫', text: '오늘 이미 응시했다면 재응시가 불가해요. 방장이 기록을 삭제해야 다시 응시할 수 있어요.' },
        ],
      },
      {
        heading: '💬 상호 피드백',
        tips: [
          { emoji: '👤', text: '오늘 시험 점수를 제출한 멤버를 선택해 피드백을 남겨요.' },
          { emoji: '🏷️', text: '카테고리(분석 방향성 · 근거 부족/오류 · 어휘 부족 · 공부법) 중 하나를 선택하세요.' },
          { emoji: '📥', text: '받은 피드백 · 보낸 피드백 · 전체 현황을 각각 확인할 수 있어요.' },
        ],
      },
      {
        heading: '📔 스터디 일지',
        tips: [
          { emoji: '📝', text: '작품명, 맡은 문항, 어려웠던 점, 자가 피드백을 작성해요.' },
          { emoji: '👥', text: '다른 멤버들이 작성한 일지도 펼쳐서 확인할 수 있어요.' },
        ],
      },
    ],
  },
  {
    id: 'personal',
    icon: GraduationCap,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    borderColor: 'border-green-100',
    badge: '개인공부',
    title: '개인공부 탭',
    summary: '과목별 공부 기록 · 타이머 · 피드백 메모',
    tips: [
      { emoji: '➕', text: '[+ 과목 추가]를 눌러 오늘 공부한 과목 카드를 만들어요.' },
      { emoji: '📚', text: '과목: 국교론 · 교육학 · 중세문법 · 현대문법 · 기타' },
      { emoji: '🗂️', text: '활동 유형: 회독 · 기출풀이 · 기출분석 · 강의수강 · 단권화 · 오답정리 · 기타' },
      { emoji: '⏱️', text: '내장 타이머로 공부 시간을 측정하거나, 완료 후 시간을 직접 입력할 수 있어요.' },
      { emoji: '🏷️', text: '피드백 카테고리(집중 부족 · 오답 다수 발생 · 개념 이해 부족 · 키워드 오류)를 선택하고 메모를 남겨요.' },
      { emoji: '📄', text: 'PDF 내보내기로 오늘 공부 기록을 파일로 저장할 수 있어요.' },
      { emoji: '☑️', text: '하단 [출석 체크] 버튼으로 오늘 출석을 바로 등록할 수 있어요.' },
    ],
  },
  {
    id: 'reflection',
    icon: ClipboardList,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    borderColor: 'border-primary-100',
    badge: '반성',
    title: '반성 탭',
    summary: '오늘 부족했던 점과 내일의 개선 방향 기록',
    tips: [
      { emoji: '🪞', text: '오늘 공부에서 부족했던 부분을 솔직하게 기록해요.' },
      { emoji: '🎯', text: '내일의 개선 방향을 구체적으로 설정하면 꾸준한 성장에 도움이 돼요.' },
      { emoji: '📅', text: '날짜를 선택해 과거 반성 기록도 다시 확인할 수 있어요.' },
    ],
  },
  {
    id: 'qna',
    icon: HelpCircle,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    borderColor: 'border-orange-100',
    badge: '질의응답',
    title: '질의응답 탭',
    summary: '스터디 관련 질문 등록과 멤버 간 답변',
    tips: [
      { emoji: '✏️', text: '[글쓰기] 버튼으로 제목과 내용을 입력해 질문을 등록해요.' },
      { emoji: '👆', text: '게시글을 탭하면 내용과 댓글이 펼쳐져요.' },
      { emoji: '⌨️', text: '댓글 입력 후 Enter 키를 누르면 빠르게 전송돼요.' },
      { emoji: '🗑️', text: '본인 글·댓글은 직접 삭제할 수 있고, 방장·부방장은 모든 글을 삭제할 수 있어요.' },
    ],
  },
  {
    id: 'assignment',
    icon: TableProperties,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    borderColor: 'border-primary-100',
    badge: '과제',
    title: '과제 탭',
    summary: '이번 주 과제 공지 · 항목별 체크리스트',
    subs: [
      {
        heading: '📋 이번 주 과제',
        tips: [
          { emoji: '📌', text: '방장·부방장이 이번 주 해야 할 과제를 공지해요.' },
          { emoji: '📅', text: '게시 날짜와 과제 내용이 함께 표시돼요.' },
        ],
      },
      {
        heading: '✅ 체크리스트',
        tips: [
          { emoji: '🗓️', text: '주차를 선택하고 각 과제 항목의 완료 여부를 체크해요.' },
          { emoji: '✔️', text: '항목마다 완료 · 진행중 · 과제 없음 중 하나를 선택해요.' },
          { emoji: '📊', text: '멤버별 완성도(%)를 한눈에 비교할 수 있어요.' },
        ],
      },
    ],
  },
  {
    id: 'calendar',
    icon: CalendarDays,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    borderColor: 'border-teal-100',
    badge: '캘린더',
    title: '캘린더 탭',
    summary: '승인된 멤버들의 휴가 일정을 달력으로 확인',
    tips: [
      { emoji: '◀️▶️', text: '화살표 버튼으로 이전/다음 달로 이동해요.' },
      { emoji: '🟡', text: '날짜에 이름 태그가 표시된 날 = 해당 멤버의 휴가가 승인된 날이에요.' },
      { emoji: '🔵', text: '오늘 날짜는 파란 원으로 강조 표시돼요.' },
    ],
  },
  {
    id: 'attendance',
    icon: CalendarCheck,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-100',
    badge: '출석',
    title: '출석 탭',
    summary: '멤버별 월간 출석 달력과 출석률 통계',
    tips: [
      { emoji: '📅', text: '멤버별 이번 달 출석 달력을 확인할 수 있어요.' },
      { emoji: '📊', text: '출석률(%)이 색상으로 표시돼요: 초록(80% 이상) · 노랑(50~79%) · 빨강(50% 미만)' },
      { emoji: '💡', text: '출석 체크는 개인공부 탭 하단의 [출석 체크] 버튼으로 할 수 있어요.' },
    ],
  },
  {
    id: 'member',
    icon: Users,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    borderColor: 'border-pink-100',
    badge: '멤버',
    title: '멤버 탭',
    summary: '스터디원 랭킹 · 왕관 아이콘 · 관리자 권한',
    tips: [
      { emoji: '🏆', text: '누적 출석 횟수 순으로 멤버가 정렬되고, 1·2·3위는 금·은·동 메달로 표시돼요.' },
      { emoji: '👑', text: '방장 이름 옆 보라색 왕관, 부방장 이름 옆 파란색 왕관이 표시돼요.' },
      { emoji: '⚠️', text: '경고를 받은 멤버는 경고 배지가, 기능 제한을 받은 멤버는 제한됨 배지가 표시돼요.' },
      { emoji: '🛡️', text: '방장은 멤버를 부방장으로 지정하거나 해제할 수 있어요.' },
      { emoji: '📋', text: '방장·부방장은 멤버에게 경고를 부여하거나 삭제할 수 있어요.' },
      { emoji: '🔒', text: '방장은 스터디 탭 열람 · 도서관 다운로드 · 휴가 신청 · 자료 요청 권한을 개별적으로 제한할 수 있어요.' },
      { emoji: '🗑️', text: '방장은 멤버 탈퇴 처리를 할 수 있어요.' },
    ],
  },
  {
    id: 'messages',
    icon: Mail,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    borderColor: 'border-sky-100',
    badge: '쪽지',
    title: '쪽지 탭',
    summary: '스터디원에게 개인 메시지 보내고 받기',
    tips: [
      { emoji: '📩', text: '[쪽지 쓰기] → 받는 사람 선택 → 내용 입력 → 보내기' },
      { emoji: '🔴', text: '받은쪽지 탭의 빨간 숫자 = 아직 읽지 않은 쪽지 수예요.' },
      { emoji: '👁️', text: '쪽지를 열면 자동으로 읽음 처리되고, 보낸 쪽지 목록에 [읽음] 표시가 떠요.' },
      { emoji: '🗑️', text: '읽은 쪽지는 삭제해서 깔끔하게 정리할 수 있어요.' },
    ],
  },
  {
    id: 'vacation',
    icon: Plane,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    borderColor: 'border-rose-100',
    badge: '휴가',
    title: '휴가신청 · 휴가명단',
    summary: '결석 사전 신청과 승인 현황 확인',
    subs: [
      {
        heading: '✈️ 휴가 신청',
        tips: [
          { emoji: '📋', text: '휴가 날짜, 사유(질병 · 여행 · 기타 등), 보충 날짜를 입력해 신청해요.' },
          { emoji: '⏳', text: '신청 후 방장·부방장의 승인을 기다려요. 승인되면 캘린더에 자동으로 표시돼요.' },
          { emoji: '❌', text: '거절된 경우 사유와 함께 알림이 표시돼요.' },
        ],
      },
      {
        heading: '📋 휴가 명단',
        tips: [
          { emoji: '✅', text: '승인된 모든 멤버의 휴가 내역(날짜 · 사유 · 보충일 · 승인자)을 확인할 수 있어요.' },
        ],
      },
    ],
  },
  {
    id: 'resource',
    icon: Inbox,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    borderColor: 'border-primary-100',
    badge: '자료요청',
    title: '자료요청 탭',
    summary: '필요한 자료를 특정 멤버에게 요청',
    tips: [
      { emoji: '📤', text: '받을 사람, 자료 종류, 세부 내용을 입력하고 요청을 보내요.' },
      { emoji: '🔴', text: '우측 상단 메뉴(≡)의 빨간 점 = 처리해야 할 미완료 요청이 있다는 신호예요.' },
      { emoji: '✅', text: '요청 완료 후 [완료] 버튼을 눌러 상태를 업데이트하세요.' },
      { emoji: '🔒', text: '방장이 자료요청 권한을 제한한 멤버는 요청을 보낼 수 없어요.' },
    ],
  },
  {
    id: 'library',
    icon: BookMarked,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-100',
    badge: '도서관',
    title: '도서관 탭',
    summary: '학습 자료 다운로드 · 업로드',
    tips: [
      { emoji: '📥', text: '방장·부방장이 업로드한 학습 자료를 다운로드해요.' },
      { emoji: '🏷️', text: '태그(작품 목록 · 어휘 · 학습지 · 기출 문제 · 문법 · 기타)로 자료를 분류해 볼 수 있어요.' },
      { emoji: '➕', text: '방장·부방장은 새 자료를 업로드하고 삭제할 수 있어요.' },
      { emoji: '🔒', text: '방장이 도서관 다운로드 권한을 제한한 멤버는 다운로드할 수 없어요.' },
    ],
  },
];

function TipRow({ emoji, text }: Tip) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base flex-shrink-0 leading-none mt-0.5">{emoji}</span>
      <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
    </div>
  );
}

export default function TutorialTab() {
  const [openId, setOpenId] = useState<string | null>('intro');

  function toggle(id: string) {
    setOpenId(prev => (prev === id ? null : id));
  }

  return (
    <div className="space-y-2.5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Map className="w-4 h-4 text-primary-500" />
        <h2 className="text-sm font-bold text-gray-800">튜토리얼</h2>
        <span className="text-xs text-gray-400">· 전체 기능 가이드</span>
      </div>

      {/* Section cards */}
      {SECTIONS.map(section => {
        const Icon = section.icon;
        const isOpen = openId === section.id;

        return (
          <div
            key={section.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
              isOpen ? section.borderColor : 'border-gray-100'
            }`}
          >
            {/* Header row */}
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition"
            >
              <div className={`w-9 h-9 rounded-xl ${section.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${section.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 leading-snug">{section.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{section.summary}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mr-0.5 ${section.iconBg} ${section.iconColor}`}>
                {section.badge}
              </span>
              {isOpen
                ? <ChevronUp className="w-4 h-4 text-gray-300 flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />
              }
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className={`border-t px-4 py-4 space-y-3 ${section.borderColor}`}>
                {/* Plain tips */}
                {section.tips && (
                  <div className="space-y-2.5">
                    {section.tips.map((tip, i) => <TipRow key={i} {...tip} />)}
                  </div>
                )}

                {/* Sub-sections */}
                {section.subs && section.subs.map((sub, si) => (
                  <div key={si} className="bg-gray-50 rounded-xl px-3.5 py-3 space-y-2">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2.5">
                      {sub.heading}
                    </p>
                    {sub.tips.map((tip, ti) => (
                      <div key={ti} className="flex items-start gap-2">
                        <span className="text-sm flex-shrink-0 leading-none mt-0.5">{tip.emoji}</span>
                        <p className="text-xs text-gray-600 leading-relaxed">{tip.text}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-center text-[11px] text-gray-300 pt-1 pb-2">
        궁금한 점이 생기면 질의응답 탭에 질문을 남겨 주세요 😊
      </p>
    </div>
  );
}
