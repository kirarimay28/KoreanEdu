import { Crown, Users, Megaphone, MapPin, CalendarCheck, FileX, Wallet, ClipboardList, CalendarDays, BookMarked, CalendarRange, BookOpen, GraduationCap, Scroll, Shield, AlertCircle } from 'lucide-react';

interface Section {
  icon: React.ReactNode;
  title: string;
  adminOnly?: boolean;
  items: { label: string; desc: string }[];
}

const SECTIONS: Section[] = [
  {
    icon: <Users className="w-4 h-4" />,
    title: '멤버 관리',
    adminOnly: true,
    items: [
      { label: '부방장 지정 / 해제', desc: '멤버 탭 → 멤버 카드 펼치기 → 부방장 지정 버튼' },
      { label: '총무 지정 / 해제', desc: '멤버 탭 → 멤버 카드 펼치기 → 총무 지정 버튼 (회의록 탭 접근 권한 부여)' },
      { label: '멤버 탈퇴 처리', desc: '멤버 탭 → 멤버 카드 펼치기 → 탈퇴 처리' },
      { label: '경고 삭제', desc: '멤버 탭 → 경고 목록 → X 버튼' },
      { label: '권한 제한 설정', desc: '멤버 탭 → 스터디 탭 열람 / 도서관 다운로드 / 결석 신청 / 자료 요청 / 일지 제출 면제 각각 토글 가능' },
    ],
  },
  {
    icon: <Megaphone className="w-4 h-4" />,
    title: '공지사항',
    items: [
      { label: '공지 작성 / 수정', desc: '스터디 탭 상단 공지 바 → 연필 아이콘 또는 작성 버튼' },
      { label: '공지 고정 / 삭제 (방장 전용)', desc: '공지 항목 → 핀 고정 버튼 / X 버튼 (방장만 표시)' },
    ],
  },
  {
    icon: <MapPin className="w-4 h-4" />,
    title: '장소 공지',
    items: [
      { label: '스터디 장소 입력 / 수정 / 삭제', desc: '스터디 탭 상단 장소 바 → 탭해서 편집' },
    ],
  },
  {
    icon: <CalendarCheck className="w-4 h-4" />,
    title: '출석부',
    items: [
      { label: '출석 체크 확인', desc: '메뉴 → 출석부 → 대기중 카드에서 [확인] 버튼 탭' },
      { label: '캘린더 직접 수정', desc: '출석부 → 월별 캘린더 → 월요일 셀 탭해서 출석 추가/제거' },
    ],
  },
  {
    icon: <FileX className="w-4 h-4" />,
    title: '결석 신청',
    items: [
      { label: '결석 신청 승인 / 거절', desc: '메뉴 → 결석 신청 → 하단 "대기중 결석 신청" 목록에서 처리' },
    ],
  },
  {
    icon: <Wallet className="w-4 h-4" />,
    title: '벌금 관리',
    items: [
      { label: '벌금 부과', desc: '지갑 → 부과 탭 → 지각 / 과제 / 일지 항목별로 부과' },
      { label: '납부 확인 / 취소', desc: '지갑 → 납부 목록 각 행에서 납부 토글' },
      { label: '벌금 삭제', desc: '지갑 → 각 벌금 행 → 삭제 버튼' },
      { label: '면제 요청 승인 / 반려', desc: '지갑 → 면제 요청 탭' },
    ],
  },
  {
    icon: <ClipboardList className="w-4 h-4" />,
    title: '과제 · 체크리스트',
    items: [
      { label: '이번 주 과제 공지 작성 / 수정', desc: '과제 탭 → 이번 주 과제 → 편집 버튼' },
      { label: '체크리스트 항목 편집', desc: '과제 탭 → 체크리스트 → 편집 버튼' },
    ],
  },
  {
    icon: <CalendarDays className="w-4 h-4" />,
    title: '캘린더',
    items: [
      { label: '일정 추가 / 삭제', desc: '메뉴 → 캘린더 → 날짜 탭 → 일정 추가 / 삭제 버튼' },
    ],
  },
  {
    icon: <BookMarked className="w-4 h-4" />,
    title: '도서관',
    items: [
      { label: 'PDF 자료 업로드 / 삭제', desc: '메뉴 → 도서관 → 자료 추가 버튼 / 각 항목 삭제' },
    ],
  },
  {
    icon: <CalendarRange className="w-4 h-4" />,
    title: '시험기간',
    items: [
      { label: '시험기간 설정 / 삭제', desc: '메뉴 → 시험기간 → 시작일·마감일 입력 후 설정' },
      { label: '전체 멤버 공부 계획 열람', desc: '시험기간 탭 하단에 전체 계획 자동 표시' },
    ],
  },
  {
    icon: <Scroll className="w-4 h-4" />,
    title: '중세국어',
    items: [
      { label: '차시 업로드 / 수정 / 삭제', desc: '메뉴 → 중세국어 → 복습하기 → 업로드 버튼' },
      { label: '빈칸 시험 업로드 / 삭제', desc: '메뉴 → 중세국어 → 빈칸 시험 → 업로드 버튼' },
    ],
  },
  {
    icon: <GraduationCap className="w-4 h-4" />,
    title: '국교론',
    items: [
      { label: '회차 개설 및 아카이브 추가', desc: '메뉴 → 국교론 → 이번 주 회차 개설 / 아카이브 탭' },
      { label: '공개 / 비공개 전환', desc: '아카이브 회차 카드 → 토글 버튼' },
      { label: '배정 실행', desc: '회차 열기 → 배정 버튼' },
    ],
  },
  {
    icon: <BookOpen className="w-4 h-4" />,
    title: '커리큘럼 · 교재',
    items: [
      { label: '교재 공개 / 비공개', desc: '메뉴 → 커리큘럼 → 교재 카드 → 공개 전환 버튼' },
      { label: '국교론 교재 챕터 업로드 / 수정 / 삭제', desc: '메뉴 → 국교론 → 교재 탭' },
    ],
  },
  {
    icon: <Shield className="w-4 h-4" />,
    title: '스터디 관리',
    items: [
      { label: '타인 스터디 일지 업로드 / 삭제', desc: '스터디 탭 → 일지 → 다른 멤버 선택 후 업로드' },
      { label: '고어 시험 기록 열람 / 삭제', desc: '고어 탭 → 시험 응시 → 전체 기록 보기' },
      { label: '타인 게시글 / 댓글 삭제', desc: 'QnA, 문학 분석, 피드백 등 전 탭에서 삭제 가능' },
    ],
  },
];

export default function AdminManualTab() {
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg,#fce7ef 0%,#fdf0f5 100%)', border: '1px solid #fce7ef' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#f9a8c9,#de4e80)' }}>
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">방장 권한 매뉴얼</p>
          <p className="text-xs text-gray-500 mt-0.5">방장 전용 항목은 <span className="text-rose-500 font-semibold">★</span> 표시</p>
        </div>
      </div>

      {/* 주의사항 */}
      <div className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>★ 방장 전용</strong> 항목은 방장만 실행 가능하며, 나머지는 부방장도 동일하게 수행할 수 있습니다.
        </p>
      </div>

      {/* 섹션들 */}
      {SECTIONS.map(section => (
        <div key={section.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* 섹션 헤더 */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-50"
            style={{ background: section.adminOnly ? 'linear-gradient(90deg,#fff1f2,#fff)' : 'transparent' }}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              section.adminOnly ? 'bg-rose-100 text-rose-500' : 'bg-primary-50 text-primary-500'
            }`}>
              {section.icon}
            </div>
            <p className="text-sm font-bold text-gray-800">{section.title}</p>
            {section.adminOnly && (
              <span className="ml-auto text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                ★ 방장 전용
              </span>
            )}
          </div>

          {/* 항목들 */}
          <div className="divide-y divide-gray-50">
            {section.items.map(item => (
              <div key={item.label} className="px-4 py-3">
                <p className="text-xs font-bold text-gray-800 mb-0.5">{item.label}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
