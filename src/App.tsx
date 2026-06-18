import { useState, useEffect } from 'react';
import type { User, MainTab } from './types';
import AuthPage from './components/Auth/AuthPage';
import StudyTab from './components/Study/StudyTab';
import PersonalStudyTab from './components/Personal/PersonalStudyTab';
import ReflectionTab from './components/Reflection/ReflectionTab';
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
import AssignmentTab from './components/Assignment/AssignmentTab';
import SettingsTab from './components/Settings/SettingsTab';
import DateNavigator, { getKSTToday } from './components/common/DateNavigator';
import {
  BookOpen, GraduationCap, ClipboardList, CalendarCheck, CalendarDays,
  LogOut, RefreshCw, Inbox, Users, Plane, ListChecks, HelpCircle, Mail,
  BookMarked, Menu, ChevronLeft, Map, TableProperties, Settings, X,
} from 'lucide-react';
import AppLogo from './components/common/AppLogo';
import NameWithCrown from './components/common/NameWithCrown';
import DailyVocab from './components/common/DailyVocab';
import { initializeData, refreshData, getPendingRequestsForUser, getUserById } from './store';
import AnnouncementBar from './components/Admin/AnnouncementBar';
import LocationNoticeBar from './components/Admin/LocationNoticeBar';
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
  { id: 'study',      label: '스터디',   icon: BookOpen },
  { id: 'personal',   label: '개인공부', icon: GraduationCap },
  { id: 'reflection', label: '반성',     icon: ClipboardList },
  { id: 'qna',        label: '질의응답', icon: HelpCircle },
  { id: 'calendar',   label: '캘린더',   icon: CalendarDays },
  { id: 'assignment', label: '과제',     icon: TableProperties },
];

interface MenuTabDef {
  id: MainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const MENU_TABS: MenuTabDef[] = [
  { id: 'attendance', label: '출석',    icon: CalendarCheck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  { id: 'member',     label: '멤버',    icon: Users,         iconBg: 'bg-pink-50',    iconColor: 'text-pink-500' },
  { id: 'resource',   label: '자료요청', icon: Inbox,        iconBg: 'bg-violet-50',  iconColor: 'text-violet-500' },
  { id: 'vacation',   label: '휴가신청', icon: Plane,        iconBg: 'bg-rose-50',    iconColor: 'text-rose-500' },
  { id: 'vaclist',    label: '휴가명단', icon: ListChecks,   iconBg: 'bg-orange-50',  iconColor: 'text-orange-500' },
  { id: 'messages',   label: '쪽지',    icon: Mail,          iconBg: 'bg-sky-50',     iconColor: 'text-sky-500' },
  { id: 'library',    label: '도서관',  icon: BookMarked,    iconBg: 'bg-amber-50',   iconColor: 'text-amber-500' },
  { id: 'settings',   label: '설정',    icon: Settings,      iconBg: 'bg-gray-100',   iconColor: 'text-gray-500' },
  { id: 'tutorial',   label: '튜토리얼', icon: Map,          iconBg: 'bg-teal-50',    iconColor: 'text-teal-500' },
];

const isMenuTab = (tab: MainTab) => MENU_TABS.some(t => t.id === tab);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; }
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
    if (currentUser) sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    else sessionStorage.removeItem(SESSION_KEY);
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 gap-4">
        <div className="w-10 h-10 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 gap-4 p-8 text-center">
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
    <div className="min-h-screen bg-gray-50">

      {/* ── Side Panel Overlay ── */}
      {sideOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSideOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-[82%] max-w-[320px] bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden">

            {/* Close */}
            <button
              onClick={() => setSideOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/80 text-gray-400 hover:text-gray-700 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile header */}
            <div
              className="px-6 pt-10 pb-6 flex-shrink-0"
              style={{ background: 'linear-gradient(145deg, #4f46e5 0%, #3730a3 60%, #312e81 100%)' }}
            >
              {/* App identity */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-white font-black text-base tracking-tight">나랏말ᄊᆞ미</div>
                  <div className="text-indigo-300 text-[11px] mt-0.5">국어 임용 스터디</div>
                </div>
              </div>

              {/* User card */}
              <div className="bg-white/10 rounded-2xl px-4 py-3.5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-black text-white">{currentUser.username[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <NameWithCrown name={currentUser.username} className="text-sm font-bold text-white" />
                    <span className="text-[11px] text-indigo-200">{roleLabel}</span>
                  </div>
                </div>
                {currentUser.resolution && (
                  <p className="text-[11px] text-indigo-200 leading-relaxed italic border-t border-white/10 pt-2.5">
                    "{currentUser.resolution}"
                  </p>
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto py-2">
              {MENU_TABS.map(tab => {
                const Icon = tab.icon;
                const count = tab.id === 'resource' ? pendingCount : 0;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleMenuNav(tab.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3 transition ${
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                      isActive ? 'bg-primary-100' : tab.iconBg
                    }`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : tab.iconColor}`} />
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
            <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 space-y-1">
              <button
                onClick={handleRefresh}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition text-sm font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary-500' : ''}`} />
                새로고침
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
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
      <main className="max-w-2xl mx-auto px-4 py-4">

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
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition font-medium mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              로비로 돌아가기
            </button>
            <div key={refreshKey}>
              {activeTab === 'attendance' && <AttendanceTab />}
              {activeTab === 'resource'   && <ResourceTab currentUser={currentUser} />}
              {activeTab === 'member'     && <MemberTab currentUser={currentUser} />}
              {activeTab === 'vacation'   && <VacationRequestTab currentUser={currentUser} />}
              {activeTab === 'vaclist'    && <VacationListTab />}
              {activeTab === 'messages'   && <MessagesTab currentUser={currentUser} />}
              {activeTab === 'library'    && <LibraryTab currentUser={currentUser} />}
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
            <AnnouncementBar
              currentUser={currentUser}
              onShowWrite={() => setEducationMode('write')}
              onShowRead={() => setEducationMode('read')}
            />
            <LocationNoticeBar currentUser={currentUser} />
            <DailyVocab date={date} />
            {['study', 'personal', 'reflection'].includes(activeTab) && (
              <DateNavigator date={date} onChange={setDate} />
            )}

            {/* Main tab bar */}
            <div className="flex gap-0.5 mb-4 bg-gray-100 p-1 rounded-xl overflow-x-auto">
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

            <div key={refreshKey}>
              {activeTab === 'study'      && <StudyTab date={date} currentUser={currentUser} />}
              {activeTab === 'personal'   && <PersonalStudyTab date={date} currentUser={currentUser} />}
              {activeTab === 'reflection' && <ReflectionTab date={date} currentUser={currentUser} />}
              {activeTab === 'qna'        && <QnATab currentUser={currentUser} />}
              {activeTab === 'calendar'   && <CalendarTab currentUser={currentUser} />}
              {activeTab === 'assignment' && <AssignmentTab currentUser={currentUser} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
