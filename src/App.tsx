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
  BookOpen, Receipt, CalendarCheck, CalendarDays, Clock,
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
import { LITERARY_QUOTES } from './data/literaryQuotes';
import EducationAnswerPage from './components/Education/EducationAnswerPage';

function getDailyQuote(): string {
  const today = getKSTToday();
  let hash = 0;
  for (let i = 0; i < today.length; i++) hash = (hash * 31 + today.charCodeAt(i)) >>> 0;
  return LITERARY_QUOTES[hash % LITERARY_QUOTES.length];
}

const SESSION_KEY = 'korean_edu_session';

const MAIN_TABS: { id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'study',       label: '스터디', icon: BookOpen },
  { id: 'personal',    label: '타이머', icon: Clock },
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
  const [educationMode, setEducationMode] = useState<'write' | 'read' | null>(null);
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
    setEducationMode(null);
  }

  function handleMainNav(id: MainTab) {
    setActiveTab(id);
    setEducationMode(null);
  }

  const jadeBg = {
    background: `
      radial-gradient(ellipse 120% 90% at 50% 0%, transparent 47%, rgba(31,76,73,0.10) 48%, rgba(31,76,73,0.10) 51%, transparent 52%),
      radial-gradient(ellipse 120% 90% at 50% 0%, transparent 47%, rgba(31,76,73,0.10) 48%, rgba(31,76,73,0.10) 51%, transparent 52%),
      radial-gradient(ellipse 90% 65% at 12% 8%,  rgba(121,183,170,0.65) 0%, transparent 52%),
      radial-gradient(ellipse 80% 60% at 88% 92%, rgba(43,100,96,0.48)   0%, transparent 52%),
      linear-gradient(155deg, #c4dfd8 0%, #aecfc7 35%, #95b9b0 65%, #aecfc7 100%)
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
          radial-gradient(ellipse 120% 90% at 50% 0%, transparent 47%, rgba(31,76,73,0.10) 48%, rgba(31,76,73,0.10) 51%, transparent 52%),
          radial-gradient(ellipse 120% 90% at 50% 0%, transparent 47%, rgba(31,76,73,0.10) 48%, rgba(31,76,73,0.10) 51%, transparent 52%),
          radial-gradient(ellipse 90% 65% at 12% 8%,  rgba(121,183,170,0.65) 0%, transparent 52%),
          radial-gradient(ellipse 80% 60% at 88% 92%, rgba(43,100,96,0.48)   0%, transparent 52%),
          radial-gradient(ellipse 55% 45% at 50% 45%, rgba(255,255,255,0.22) 0%, transparent 60%),
          linear-gradient(155deg, #c4dfd8 0%, #aecfc7 35%, #95b9b0 65%, #aecfc7 100%)
        `,
        backgroundSize: '36px 24px, 36px 24px, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
        backgroundPosition: '0 0, 18px 12px, 0 0, 0 0, 0 0, 0 0',
      }}
    >

      {/* ─── 곤룡포 decorative overlay (cloud scrolls · dragon medallion · waves) ─── */}
      <svg
        aria-hidden="true"
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Top-left cloud scroll (구름문) */}
        <g opacity="0.13" fill="#1f4c49">
          <circle cx="4" cy="10" r="4.5"/>
          <circle cx="11" cy="6" r="5.5"/>
          <circle cx="20" cy="5" r="5"/>
          <circle cx="28" cy="7.5" r="4.5"/>
          <circle cx="34" cy="12" r="3.8"/>
          <path d="M0 11 Q11 1 20 5 Q29 1 35 13 L35 19 Q22 16 10 16.5 Q2 16.5 0 13Z"/>
          <path d="M0 13 Q-4 20 3 26 Q9 31 16 25 Q19 19 11 16.5" stroke="#1f4c49" strokeWidth="2" fill="none" strokeLinecap="round" strokeOpacity="0.65"/>
        </g>
        {/* Top-right cloud scroll (mirrored) */}
        <g opacity="0.13" fill="#1f4c49" transform="translate(100,0) scale(-1,1)">
          <circle cx="4" cy="10" r="4.5"/>
          <circle cx="11" cy="6" r="5.5"/>
          <circle cx="20" cy="5" r="5"/>
          <circle cx="28" cy="7.5" r="4.5"/>
          <circle cx="34" cy="12" r="3.8"/>
          <path d="M0 11 Q11 1 20 5 Q29 1 35 13 L35 19 Q22 16 10 16.5 Q2 16.5 0 13Z"/>
          <path d="M0 13 Q-4 20 3 26 Q9 31 16 25 Q19 19 11 16.5" stroke="#1f4c49" strokeWidth="2" fill="none" strokeLinecap="round" strokeOpacity="0.65"/>
        </g>
        {/* Dragon medallion — 원형 용문 */}
        <g opacity="0.10" transform="translate(50,44)">
          <circle r="13.5" fill="none" stroke="#1f4c49" strokeWidth="0.7"/>
          <circle r="12" fill="none" stroke="#1f4c49" strokeWidth="0.3"/>
          {/* Serpentine body */}
          <path d="M-7 -6 C-4 -10 3 -9 5 -4 C7 1 2 6 5 10 C8 13 11 9 9 4"
            stroke="#1f4c49" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 4 C8 0 10 -3 8 -6" stroke="#1f4c49" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
          {/* Head */}
          <ellipse cx="-7" cy="-6" rx="3" ry="2.2" fill="#1f4c49"/>
          <path d="M-9 -5 L-12.5 -3.5 M-10 -7 L-13 -6" stroke="#1f4c49" strokeWidth="1.1" strokeLinecap="round"/>
          {/* Horns */}
          <path d="M-7 -8.2 L-9.5 -12 M-5 -8 L-4 -12" stroke="#1f4c49" strokeWidth="0.8" strokeLinecap="round"/>
          {/* Claws */}
          <path d="M-1 -6 L-2 -9 M-1 -6 L0.5 -9.5 M-1 -6 L1.5 -9" stroke="#1f4c49" strokeWidth="0.7" strokeLinecap="round"/>
          <path d="M3 3 L2 6.5 M3 3 L4.5 6 M3 3 L5.5 4.5" stroke="#1f4c49" strokeWidth="0.7" strokeLinecap="round"/>
          {/* Pearl (여의주) */}
          <circle cx="10.5" cy="-5" r="2.2" fill="none" stroke="#1f4c49" strokeWidth="0.6"/>
          <circle cx="10.5" cy="-5" r="0.9" fill="#1f4c49"/>
          <path d="M9 -7.2 L10.5 -9.5 L12 -7.2" stroke="#1f4c49" strokeWidth="0.5" fill="none" strokeLinecap="round"/>
          {/* Cloud puffs (구름) */}
          <circle cx="-2" cy="2" r="1.5" fill="#1f4c49"/>
          <circle cx="2" cy="0" r="1.3" fill="#1f4c49"/>
          <circle cx="-4" cy="-1" r="1.2" fill="#1f4c49"/>
          <circle cx="3" cy="-2" r="1.1" fill="#1f4c49"/>
          <circle cx="7" cy="2" r="1.1" fill="#1f4c49"/>
        </g>
        {/* Bottom wave bands — 파도문 */}
        <g opacity="0.12">
          <path d="M0 83 Q6.25 79 12.5 83 Q18.75 87 25 83 Q31.25 79 37.5 83 Q43.75 87 50 83 Q56.25 79 62.5 83 Q68.75 87 75 83 Q81.25 79 87.5 83 Q93.75 87 100 83 L100 90 Q93.75 94 87.5 90 Q81.25 86 75 90 Q68.75 94 62.5 90 Q56.25 86 50 90 Q43.75 94 37.5 90 Q31.25 86 25 90 Q18.75 94 12.5 90 Q6.25 86 0 90Z" fill="#1f4c49" fillOpacity="0.22"/>
          <path d="M0 88 Q6.25 84 12.5 88 Q18.75 92 25 88 Q31.25 84 37.5 88 Q43.75 92 50 88 Q56.25 84 62.5 88 Q68.75 92 75 88 Q81.25 84 87.5 88 Q93.75 92 100 88 L100 95 Q93.75 99 87.5 95 Q81.25 91 75 95 Q68.75 99 62.5 95 Q56.25 91 50 95 Q43.75 99 37.5 95 Q31.25 91 25 95 Q18.75 99 12.5 95 Q6.25 91 0 95Z" fill="#1f4c49" fillOpacity="0.38"/>
          <path d="M0 93 Q6.25 89 12.5 93 Q18.75 97 25 93 Q31.25 89 37.5 93 Q43.75 97 50 93 Q56.25 89 62.5 93 Q68.75 97 75 93 Q81.25 89 87.5 93 Q93.75 97 100 93 L100 100 L0 100Z" fill="#1f4c49" fillOpacity="0.55"/>
          <path d="M0 88 Q6.25 84 12.5 88 Q18.75 92 25 88 Q31.25 84 37.5 88 Q43.75 92 50 88 Q56.25 84 62.5 88 Q68.75 92 75 88 Q81.25 84 87.5 88 Q93.75 92 100 88" stroke="white" strokeOpacity="0.22" strokeWidth="0.4" fill="none"/>
          <path d="M0 83 Q6.25 79 12.5 83 Q18.75 87 25 83 Q31.25 79 37.5 83 Q43.75 87 50 83 Q56.25 79 62.5 83 Q68.75 87 75 83 Q81.25 79 87.5 83 Q93.75 87 100 83" stroke="white" strokeOpacity="0.16" strokeWidth="0.35" fill="none"/>
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

          {/* Panel — celadon frosted glass */}
          <div className="relative w-[82%] max-w-[320px] h-full shadow-2xl flex flex-col z-10 overflow-hidden" style={{ background: 'rgba(232,242,238,0.68)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}>

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
                  radial-gradient(ellipse at 76% 82%, rgba(121,179,168,0.28) 0%, transparent 50%),
                  linear-gradient(148deg, #bdd9d3 0%, #96c1b7 30%, #79b3a8 62%, #8cbdb4 100%)
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
                      border: '1px solid rgba(121,179,168,0.22)',
                      boxShadow: '0 1px 6px rgba(43,100,96,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset',
                    } : {}}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all`}
                      style={isActive ? {
                        background: 'linear-gradient(135deg, #aacfc5 0%, #79b3a8 100%)',
                        boxShadow: '0 2px 6px rgba(43,100,96,0.2)',
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
      <header className="sticky top-0 z-10" style={{ background: 'rgba(228,240,236,0.76)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(121,179,168,0.20)', boxShadow: '0 1px 12px rgba(43,100,96,0.07)' }}>
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

        {/* Education answer page */}
        {educationMode ? (
          <EducationAnswerPage
            mode={educationMode}
            onBack={() => setEducationMode(null)}
            currentUser={currentUser}
          />

        /* Menu tab content */
        ) : isMenuTab(activeTab) ? (
          <>
            <button
              onClick={() => handleMainNav('study')}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 transition font-medium mb-4 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(121,179,168,0.20)' }}
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
            <AnnouncementBar
              currentUser={currentUser}
              onShowWrite={() => setEducationMode('write')}
              onShowRead={() => setEducationMode('read')}
            />
            <LocationNoticeBar currentUser={currentUser} />
            <DailyVocab date={date} />
            <StudyLogWarningBanner />
            {['study', 'personal'].includes(activeTab) && (
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
