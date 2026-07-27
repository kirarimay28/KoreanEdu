import { useState, useEffect } from 'react';
import type { User, MainTab } from './types';
import AuthPage from './components/Auth/AuthPage';
import StudyTab from './components/Study/StudyTab';
import PersonalStudyTab from './components/Personal/PersonalStudyTab';
import FineTab from './components/Fine/FineTab';
import AttendanceTab from './components/Attendance/AttendanceTab';
import ResourceTab from './components/Resource/ResourceTab';
import MemberTab from './components/Member/MemberTab';
import VacationRequestTab from './components/Vacation/VacationRequestTab';
import VacationListTab from './components/Vacation/VacationListTab';
import QnATab from './components/QnA/QnATab';
import CalendarTab from './components/Calendar/CalendarTab';
import MessagesTab from './components/Messages/MessagesTab';
import LibraryTab from './components/Library/LibraryTab';
import TutorialTab from './components/Tutorial/TutorialTab';
import CurriculumTab from './components/Curriculum/CurriculumTab';
import AssignmentTab from './components/Assignment/AssignmentTab';
import SettingsTab from './components/Settings/SettingsTab';
import VocabStudyTab from './components/Study/VocabStudyTab';
import DateNavigator, { getKSTToday } from './components/common/DateNavigator';
import {
  BookOpen, Receipt, CalendarCheck, CalendarDays,
  LogOut, RefreshCw, Inbox, Users, Plane, ListChecks, HelpCircle, Mail,
  BookMarked, Menu, ChevronLeft, Map, TableProperties, Settings, X, Languages, GraduationCap,
} from 'lucide-react';
import AppLogo from './components/common/AppLogo';
import NameWithCrown from './components/common/NameWithCrown';
import DailyVocab from './components/common/DailyVocab';
import { initializeData, refreshData, getPendingRequestsForUser, getUserById } from './store';
import AnnouncementBar from './components/Admin/AnnouncementBar';
import LocationNoticeBar from './components/Admin/LocationNoticeBar';
import VenueReminderBanner from './components/Admin/VenueReminderBanner';
import StudyLogWarningBanner from './components/Admin/StudyLogWarningBanner';
import StudyRoomPanel from './components/StudyRoom/StudyRoomPanel';
import { LITERARY_QUOTES } from './data/literaryQuotes';

function getDailyQuote(): string {
  const today = getKSTToday();
  let hash = 0;
  for (let i = 0; i < today.length; i++) hash = (hash * 31 + today.charCodeAt(i)) >>> 0;
  return LITERARY_QUOTES[hash % LITERARY_QUOTES.length];
}

const SESSION_KEY = 'korean_edu_session';

const MAIN_TABS: { id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'study',       label: '스터디', icon: BookOpen },
  { id: 'fine',        label: '벌금',   icon: Receipt },
  { id: 'assignment',  label: '과제',   icon: TableProperties },
  { id: 'vocab_study', label: '고어',   icon: Languages },
];

interface MenuTabDef {
  id: MainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const MENU_TABS: MenuTabDef[] = [
  { id: 'qna',        label: '질의응답', icon: HelpCircle,   iconBg: 'bg-blue-50',    iconColor: 'text-blue-500' },
  { id: 'calendar',   label: '캘린더',   icon: CalendarDays, iconBg: 'bg-primary-50', iconColor: 'text-primary-500' },
  { id: 'attendance', label: '출석',     icon: CalendarCheck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  { id: 'member',     label: '멤버',     icon: Users,         iconBg: 'bg-pink-50',    iconColor: 'text-pink-500' },
  { id: 'resource',   label: '자료요청', icon: Inbox,         iconBg: 'bg-primary-50',  iconColor: 'text-primary-500' },
  { id: 'vacation',   label: '휴가신청', icon: Plane,         iconBg: 'bg-rose-50',    iconColor: 'text-rose-500' },
  { id: 'vaclist',    label: '휴가명단', icon: ListChecks,    iconBg: 'bg-orange-50',  iconColor: 'text-orange-500' },
  { id: 'messages',   label: '쪽지',     icon: Mail,          iconBg: 'bg-sky-50',     iconColor: 'text-sky-500' },
  { id: 'library',    label: '도서관',   icon: BookMarked,    iconBg: 'bg-amber-50',   iconColor: 'text-amber-500' },
  { id: 'settings',   label: '설정',     icon: Settings,      iconBg: 'bg-gray-100',   iconColor: 'text-gray-500' },
  { id: 'curriculum', label: '커리큘럼', icon: GraduationCap, iconBg: 'bg-primary-50', iconColor: 'text-primary-500' },
  { id: 'tutorial',   label: '튜토리얼', icon: Map,           iconBg: 'bg-teal-50',    iconColor: 'text-teal-500' },
];

const isMenuTab = (tab: MainTab) => MENU_TABS.some(t => t.id === tab);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  });
  const [activeTab, setActiveTab] = useState<MainTab>('study');
  const [date, setDate] = useState<string>(getKSTToday());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sideOpen, setSideOpen] = useState(false);
  const dailyQuote = getDailyQuote();

  useEffect(() => {
    initializeData(() => {
      setCurrentUser(prev => prev ? (getUserById(prev.id) ?? prev) : null);
      setRefreshKey(k => k + 1);
    })
      .then(() => { setLoading(false); setCurrentUser(prev => prev ? (getUserById(prev.id) ?? prev) : null); })
      .catch(() => { setLoading(false); setLoadError(true); });
  }, []);

  useEffect(() => {
    if (currentUser) localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    else localStorage.removeItem(SESSION_KEY);
  }, [currentUser]);

  // Lock body scroll when side panel is open
  useEffect(() => {
    document.body.style.overflow = sideOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sideOpen]);

  function handleLogin(user: User) { setCurrentUser(user); }
  function handleLogout() { setCurrentUser(null); setSideOpen(false); }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshData().catch(console.error);
    setCurrentUser(prev => prev ? (getUserById(prev.id) ?? prev) : null);
    setRefreshing(false);
    setRefreshKey(k => k + 1);
  }

  function handleMenuNav(id: MainTab) {
    setActiveTab(id);
    setSideOpen(false);
  }

  function handleMainNav(id: MainTab) {
    setActiveTab(id);
  }

  const jadeBg = {
    background: `
      radial-gradient(ellipse 120% 90% at 50% 0%, transparent 47%, rgba(204,24,88,0.10) 48%, rgba(204,24,88,0.10) 51%, transparent 52%),
      radial-gradient(ellipse 120% 90% at 50% 0%, transparent 47%, rgba(204,24,88,0.10) 48%, rgba(204,24,88,0.10) 51%, transparent 52%),
      radial-gradient(ellipse 90% 65% at 12% 8%,  rgba(255,163,199,0.65) 0%, transparent 52%),
      radial-gradient(ellipse 80% 60% at 88% 92%, rgba(240,37,112,0.48)   0%, transparent 52%),
      linear-gradient(155deg, #fdd0e3 0%, #fce4ec 35%, #f9b0cc 65%, #fce4ec 100%)
    `,
    backgroundSize: '36px 24px, 36px 24px, 100% 100%, 100% 100%, 100% 100%',
    backgroundPosition: '0 0, 18px 12px, 0 0, 0 0, 0 0',
  } as React.CSSProperties;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={jadeBg}>
        <div className="w-10 h-10 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center" style={jadeBg}>
        <p className="text-red-500 font-semibold">서버 연결에 실패했습니다.</p>
        <p className="text-gray-500 text-sm">네트워크를 확인하고 다시 시도해 주세요.</p>
        <button
          onClick={() => {
            setLoadError(false); setLoading(true);
            initializeData().then(() => setLoading(false)).catch(() => { setLoading(false); setLoadError(true); });
          }}
          className="mt-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!currentUser) return <AuthPage onLogin={handleLogin} />;

  const pendingCount = getPendingRequestsForUser(currentUser.id).length;
  const roleLabel = currentUser.role === 'admin' ? '방장' : currentUser.role === 'subadmin' ? '부방장' : '멤버';

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(ellipse 120% 90% at 50% 0%, transparent 47%, rgba(204,24,88,0.10) 48%, rgba(204,24,88,0.10) 51%, transparent 52%),
          radial-gradient(ellipse 120% 90% at 50% 0%, transparent 47%, rgba(204,24,88,0.10) 48%, rgba(204,24,88,0.10) 51%, transparent 52%),
          radial-gradient(ellipse 90% 65% at 12% 8%,  rgba(255,163,199,0.65) 0%, transparent 52%),
          radial-gradient(ellipse 80% 60% at 88% 92%, rgba(240,37,112,0.48)   0%, transparent 52%),
          radial-gradient(ellipse 55% 45% at 50% 45%, rgba(255,255,255,0.22) 0%, transparent 60%),
          linear-gradient(155deg, #fdd0e3 0%, #fce4ec 35%, #f9b0cc 65%, #fce4ec 100%)
        `,
        backgroundSize: '36px 24px, 36px 24px, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
        backgroundPosition: '0 0, 18px 12px, 0 0, 0 0, 0 0, 0 0',
      }}
    >

      {/* ─── Cute pink decorative overlay ─── */}
      <svg
        aria-hidden="true"
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <path id="petal" d="M0 0 C-1.6 -0.8 -1.8 -3.8 0 -4.8 C1.8 -3.8 1.6 -0.8 0 0Z"/>
          <path id="sparkle" d="M0 -3.2 L0.45 -0.45 L3.2 0 L0.45 0.45 L0 3.2 L-0.45 0.45 L-3.2 0 L-0.45 -0.45Z"/>
          <path id="heart" d="M0 2.2 C-0.5 1.2 -3.2 -0.8 -3.2 -2.4 C-3.2 -4 -1.6 -4.6 0 -3 C1.6 -4.6 3.2 -4 3.2 -2.4 C3.2 -0.8 0.5 1.2 0 2.2Z"/>
        </defs>

        {/* Top-left sakura */}
        <g transform="translate(9,11)" opacity="0.13" fill="#f02570">
          <use href="#petal" transform="rotate(0)"/>
          <use href="#petal" transform="rotate(72)"/>
          <use href="#petal" transform="rotate(144)"/>
          <use href="#petal" transform="rotate(216)"/>
          <use href="#petal" transform="rotate(288)"/>
          <circle r="1" fill="#ffd6e8"/>
        </g>
        <g transform="translate(21,4) scale(0.65)" opacity="0.10" fill="#ff70a8">
          <use href="#petal" transform="rotate(36)"/>
          <use href="#petal" transform="rotate(108)"/>
          <use href="#petal" transform="rotate(180)"/>
          <use href="#petal" transform="rotate(252)"/>
          <use href="#petal" transform="rotate(324)"/>
          <circle r="1" fill="#fff0f5"/>
        </g>

        {/* Top-right sakura */}
        <g transform="translate(89,8)" opacity="0.13" fill="#f02570">
          <use href="#petal" transform="rotate(18)"/>
          <use href="#petal" transform="rotate(90)"/>
          <use href="#petal" transform="rotate(162)"/>
          <use href="#petal" transform="rotate(234)"/>
          <use href="#petal" transform="rotate(306)"/>
          <circle r="1" fill="#ffd6e8"/>
        </g>
        <g transform="translate(77,4) scale(0.6)" opacity="0.10" fill="#ff70a8">
          <use href="#petal" transform="rotate(0)"/>
          <use href="#petal" transform="rotate(72)"/>
          <use href="#petal" transform="rotate(144)"/>
          <use href="#petal" transform="rotate(216)"/>
          <use href="#petal" transform="rotate(288)"/>
          <circle r="1" fill="#fff0f5"/>
        </g>

        {/* Scattered sparkles */}
        <g transform="translate(33,6) scale(0.5)" opacity="0.16" fill="#ffa3c7">
          <use href="#sparkle"/>
        </g>
        <g transform="translate(56,5) scale(0.42)" opacity="0.13" fill="#f02570">
          <use href="#sparkle"/>
        </g>
        <g transform="translate(67,10) scale(0.38)" opacity="0.14" fill="#ff70a8">
          <use href="#sparkle"/>
        </g>
        <g transform="translate(44,9) scale(0.3)" opacity="0.12" fill="#ffc9e0">
          <use href="#sparkle"/>
        </g>

        {/* Side hearts */}
        <g transform="translate(4,47) scale(0.55)" opacity="0.09" fill="#f02570">
          <use href="#heart"/>
        </g>
        <g transform="translate(96,42) scale(0.5)" opacity="0.09" fill="#f02570">
          <use href="#heart"/>
        </g>

        {/* Bottom-right sakura */}
        <g transform="translate(85,87) scale(0.75)" opacity="0.11" fill="#ff70a8">
          <use href="#petal" transform="rotate(0)"/>
          <use href="#petal" transform="rotate(72)"/>
          <use href="#petal" transform="rotate(144)"/>
          <use href="#petal" transform="rotate(216)"/>
          <use href="#petal" transform="rotate(288)"/>
          <circle r="1" fill="#fff0f5"/>
        </g>
        <g transform="translate(13,90) scale(0.6)" opacity="0.10" fill="#f02570">
          <use href="#petal" transform="rotate(18)"/>
          <use href="#petal" transform="rotate(90)"/>
          <use href="#petal" transform="rotate(162)"/>
          <use href="#petal" transform="rotate(234)"/>
          <use href="#petal" transform="rotate(306)"/>
          <circle r="1" fill="#ffd6e8"/>
        </g>

        {/* Bottom wave bands */}
        <g opacity="0.11">
          <path d="M0 87 Q6.25 83 12.5 87 Q18.75 91 25 87 Q31.25 83 37.5 87 Q43.75 91 50 87 Q56.25 83 62.5 87 Q68.75 91 75 87 Q81.25 83 87.5 87 Q93.75 91 100 87 L100 93 Q93.75 97 87.5 93 Q81.25 89 75 93 Q68.75 97 62.5 93 Q56.25 89 50 93 Q43.75 97 37.5 93 Q31.25 89 25 93 Q18.75 97 12.5 93 Q6.25 89 0 93Z" fill="#f02570" fillOpacity="0.20"/>
          <path d="M0 92 Q6.25 88 12.5 92 Q18.75 96 25 92 Q31.25 88 37.5 92 Q43.75 96 50 92 Q56.25 88 62.5 92 Q68.75 96 75 92 Q81.25 88 87.5 92 Q93.75 96 100 92 L100 100 L0 100Z" fill="#f02570" fillOpacity="0.38"/>
          <path d="M0 87 Q6.25 83 12.5 87 Q18.75 91 25 87 Q31.25 83 37.5 87 Q43.75 91 50 87 Q56.25 83 62.5 87 Q68.75 91 75 87 Q81.25 83 87.5 87 Q93.75 91 100 87" stroke="white" strokeOpacity="0.18" strokeWidth="0.35" fill="none"/>
        </g>
      </svg>

      {/* ── Side Panel Overlay ── */}
      {sideOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-md"
            onClick={() => setSideOpen(false)}
          />

          {/* Panel — pink frosted glass */}
          <div className="relative w-[82%] max-w-[320px] h-full shadow-2xl flex flex-col z-10 overflow-hidden" style={{ background: 'rgba(253,228,240,0.75)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}>

            {/* Close */}
            <button
              onClick={() => setSideOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/60 text-gray-500 hover:text-gray-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile header — celadon glaze with crane */}
            <div
              className="relative px-6 pt-10 pb-6 flex-shrink-0 overflow-hidden"
              style={{
                background: `
                  radial-gradient(ellipse at 22% 20%, rgba(255,255,255,0.82) 0%, rgba(224,242,238,0.4) 30%, transparent 54%),
                  radial-gradient(ellipse at 76% 82%, rgba(255,163,199,0.28) 0%, transparent 50%),
                  linear-gradient(148deg, #fdd5e8 0%, #f9bcd4 30%, #ffa3c7 62%, #f8bed6 100%)
                `,
              }}
            >
              {/* Subtle crane motif */}
              <svg className="absolute right-2 top-3 w-24 h-20 pointer-events-none" viewBox="0 0 100 84" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.2 }}>
                <ellipse cx="52" cy="50" rx="20" ry="7" transform="rotate(-10 52 50)" fill="rgba(255,255,255,1)"/>
                <path d="M33 52 C38 34 53 28 67 46" fill="rgba(255,255,255,0.8)"/>
                <path d="M33 52 C38 34 55 26 67 46" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" fill="none"/>
                <path d="M67 46 C70 38 72 30 74 23" stroke="rgba(255,255,255,1)" strokeWidth="3" strokeLinecap="round"/>
                <ellipse cx="75" cy="19" rx="5.5" ry="4.5" fill="rgba(255,255,255,1)"/>
                <ellipse cx="76" cy="14.5" rx="3" ry="1.8" fill="rgba(220,80,70,0.75)"/>
                <circle cx="77.5" cy="19.5" r="1.5" fill="rgba(30,80,76,0.7)"/>
                <path d="M80 18 L90 15" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M33 55 C24 59 15 63 8 70" stroke="rgba(255,255,255,0.8)" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M34 58 C26 61 18 62 11 64" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M33 52 C40 64 54 66 66 56" fill="rgba(255,255,255,0.4)"/>
                <path d="M46 57 L44 72 M55 58 L53 73" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M44 72 L39 76 M44 72 L44 78 M44 72 L49 76" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinecap="round"/>
              </svg>

              {/* App identity */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-white/60 shadow-sm flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-primary-700" />
                </div>
                <div>
                  <div className="logo-serif text-primary-900 text-base">나랏말</div>
                  <div className="text-primary-700 text-[11px] mt-0.5">국어 임용 스터디</div>
                </div>
              </div>

              {/* User card */}
              <div className="bg-white/50 rounded-2xl px-4 py-3.5 space-y-2.5 shadow-sm" style={{ border: '1px solid rgba(255,255,255,0.6)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-black text-primary-700">{currentUser.username[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <NameWithCrown name={currentUser.username} className="text-sm font-bold text-primary-900" />
                    <span className="text-[11px] text-primary-600">{roleLabel}</span>
                  </div>
                </div>
                {currentUser.resolution && (
                  <p className="text-[11px] text-primary-700 leading-relaxed italic border-t border-primary-100 pt-2.5">
                    "{currentUser.resolution}"
                  </p>
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
              {MENU_TABS.map(tab => {
                const Icon = tab.icon;
                const count = tab.id === 'resource' ? pendingCount : 0;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleMenuNav(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${
                      isActive ? 'text-primary-800 shadow-sm' : 'text-gray-600 hover:bg-white/45'
                    }`}
                    style={isActive ? {
                      background: 'rgba(255,255,255,0.72)',
                      border: '1px solid rgba(255,163,199,0.22)',
                      boxShadow: '0 1px 6px rgba(240,37,112,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset',
                    } : {}}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all`}
                      style={isActive ? {
                        background: 'linear-gradient(135deg, #ffc9e0 0%, #ffa3c7 100%)',
                        boxShadow: '0 2px 6px rgba(240,37,112,0.2)',
                      } : { background: 'rgba(255,255,255,0.55)' }}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.iconColor}`} />
                    </div>
                    <span className={`flex-1 text-left text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {tab.label}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom: refresh + logout */}
            <div className="flex-shrink-0 border-t border-white/40 px-4 py-3 space-y-0.5">
              <button
                onClick={handleRefresh}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-white/60 transition text-sm font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary-500' : ''}`} />
                새로고침
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-red-500 hover:bg-white/60 transition text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-10" style={{ background: 'rgba(253,228,238,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,163,199,0.22)', boxShadow: '0 1px 12px rgba(240,37,112,0.09)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          {/* Left: hamburger */}
          <button
            onClick={() => setSideOpen(true)}
            className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
            {(isMenuTab(activeTab) || pendingCount > 0) && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
          </button>

          {/* Center: logo + quote */}
          <div className="flex-1 flex flex-col items-center min-w-0">
            <AppLogo className="h-6" />
            <p className="text-[9px] text-primary-400 italic mt-0.5 truncate max-w-full leading-none">
              {dailyQuote}
            </p>
          </div>

          {/* Right: username */}
          <div className="flex-shrink-0">
            <NameWithCrown name={currentUser.username} className="text-sm font-semibold text-gray-700" />
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-2xl mx-auto px-4 py-4" style={{ position: 'relative', zIndex: 1 }}>

        {/* Menu tab content */}
        {isMenuTab(activeTab) ? (
          <>
            <button
              onClick={() => handleMainNav('study')}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 transition font-medium mb-4 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,163,199,0.20)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              로비로 돌아가기
            </button>
            <div key={refreshKey} className="jade-enter">
              {activeTab === 'qna'        && <QnATab currentUser={currentUser} />}
              {activeTab === 'calendar'   && <CalendarTab currentUser={currentUser} />}
              {activeTab === 'attendance' && <AttendanceTab />}
              {activeTab === 'resource'   && <ResourceTab currentUser={currentUser} />}
              {activeTab === 'member'     && <MemberTab currentUser={currentUser} />}
              {activeTab === 'vacation'   && <VacationRequestTab currentUser={currentUser} />}
              {activeTab === 'vaclist'    && <VacationListTab />}
              {activeTab === 'messages'   && <MessagesTab currentUser={currentUser} />}
              {activeTab === 'library'    && <LibraryTab currentUser={currentUser} />}
              {activeTab === 'curriculum' && <CurriculumTab currentUser={currentUser} />}
              {activeTab === 'tutorial'   && <TutorialTab />}
              {activeTab === 'settings'   && (
                <SettingsTab
                  currentUser={currentUser}
                  onUserUpdate={user => { setCurrentUser(user); }}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </>

        /* Main tab content */
        ) : (
          <>
            <VenueReminderBanner currentUser={currentUser} />
            <AnnouncementBar currentUser={currentUser} />
            <LocationNoticeBar currentUser={currentUser} />
            <DailyVocab date={date} />
            {currentUser && <StudyRoomPanel currentUser={currentUser} />}
            <StudyLogWarningBanner />
            {activeTab === 'study' && (
              <DateNavigator date={date} onChange={setDate} />
            )}

            {/* Main tab bar */}
            <div className="flex gap-0.5 mb-4 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.55)' }}>
              {MAIN_TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleMainNav(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] rounded-lg transition-all font-medium whitespace-nowrap min-w-0 ${
                      activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div key={activeTab} className="jade-enter">
              {activeTab === 'study'       && <StudyTab date={date} currentUser={currentUser} />}
              {activeTab === 'personal'    && <PersonalStudyTab date={date} currentUser={currentUser} />}
              {activeTab === 'fine'        && <FineTab currentUser={currentUser} />}
              {activeTab === 'qna'         && <QnATab currentUser={currentUser} />}
              {activeTab === 'calendar'    && <CalendarTab currentUser={currentUser} />}
              {activeTab === 'assignment'  && <AssignmentTab currentUser={currentUser} />}
              {activeTab === 'vocab_study' && <VocabStudyTab />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
