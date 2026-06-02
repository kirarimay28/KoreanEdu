import { useState, useEffect, useRef } from 'react';
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
import DateNavigator, { getKSTToday } from './components/common/DateNavigator';
import { BookOpen, GraduationCap, ClipboardList, CalendarCheck, CalendarDays, LogOut, User as UserIcon, RefreshCw, Inbox, Users, Plane, ListChecks, HelpCircle, Mail, BookMarked, Menu, ChevronLeft, Map } from 'lucide-react';
import AppLogo from './components/common/AppLogo';
import DailyVocab from './components/common/DailyVocab';
import { initializeData, refreshData, getPendingRequestsForUser, getUserById } from './store';
import AnnouncementBar from './components/Admin/AnnouncementBar';
import { LITERARY_QUOTES } from './data/literaryQuotes';
import EducationAnswerPage from './components/Education/EducationAnswerPage';

function getDailyQuote(): string {
  const today = getKSTToday();
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash * 31 + today.charCodeAt(i)) >>> 0;
  }
  return LITERARY_QUOTES[hash % LITERARY_QUOTES.length];
}

const SESSION_KEY = 'korean_edu_session';

const MAIN_TABS: { id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'study', label: '스터디', icon: BookOpen },
  { id: 'personal', label: '개인공부', icon: GraduationCap },
  { id: 'reflection', label: '반성', icon: ClipboardList },
  { id: 'qna', label: '질의응답', icon: HelpCircle },
  { id: 'calendar', label: '캘린더', icon: CalendarDays },
];

const MENU_TABS: { id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'attendance', label: '출석', icon: CalendarCheck },
  { id: 'member', label: '멤버', icon: Users },
  { id: 'resource', label: '자료요청', icon: Inbox },
  { id: 'vacation', label: '휴가신청', icon: Plane },
  { id: 'vaclist', label: '휴가명단', icon: ListChecks },
  { id: 'messages', label: '쪽지', icon: Mail },
  { id: 'library', label: '도서관', icon: BookMarked },
  { id: 'tutorial', label: '튜토리얼', icon: Map },
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<MainTab>('study');
  const [date, setDate] = useState<string>(getKSTToday());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [educationMode, setEducationMode] = useState<'write' | 'read' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeData()
      .then(() => {
        setLoading(false);
        setCurrentUser(prev => prev ? (getUserById(prev.id) ?? prev) : null);
      })
      .catch(() => { setLoading(false); setLoadError(true); });
  }, []);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  function handleLogin(user: User) { setCurrentUser(user); }
  function handleLogout() { setCurrentUser(null); }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshData().catch(console.error);
    setCurrentUser(prev => prev ? (getUserById(prev.id) ?? prev) : null);
    setRefreshing(false);
    setRefreshKey(k => k + 1);
  }

  function handleMenuTab(id: MainTab) {
    setActiveTab(id);
    setMenuOpen(false);
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
          onClick={() => { setLoadError(false); setLoading(true); initializeData().then(() => setLoading(false)).catch(() => { setLoading(false); setLoadError(true); }); }}
          className="mt-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const isMenuTabActive = MENU_TABS.some(t => t.id === activeTab);
  const pendingCount = getPendingRequestsForUser(currentUser.id).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <AppLogo className="h-7" />
            </div>
            <p className="text-[10px] text-primary-400 italic mt-0.5 ml-10 leading-relaxed">{getDailyQuote()}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <UserIcon className="w-4 h-4 text-primary-400" />
              <span className="font-medium">{currentUser.username}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition rounded-lg hover:bg-gray-100"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition rounded-lg hover:bg-gray-100"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {/* 메뉴 버튼 */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className={`relative p-1.5 transition rounded-lg hover:bg-gray-100 ${isMenuTabActive ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-gray-600'}`}
                title="메뉴"
              >
                <Menu className="w-4 h-4" />
                {(isMenuTabActive || pendingCount > 0) && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50">
                  {MENU_TABS.map(tab => {
                    const Icon = tab.icon;
                    const count = tab.id === 'resource' ? pendingCount : 0;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleMenuTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition ${
                          activeTab === tab.id ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-left">{tab.label}</span>
                        {count > 0 && (
                          <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {educationMode ? (
          <EducationAnswerPage
            mode={educationMode}
            onBack={() => setEducationMode(null)}
            currentUser={currentUser}
          />
        ) : isMenuTabActive ? (
          <>
            <button
              onClick={() => { setActiveTab('study'); setMenuOpen(false); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition font-medium mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              로비로 돌아가기
            </button>
            <div key={refreshKey}>
              {activeTab === 'attendance' && <AttendanceTab />}
              {activeTab === 'resource' && <ResourceTab currentUser={currentUser} />}
              {activeTab === 'member' && <MemberTab currentUser={currentUser} />}
              {activeTab === 'vacation' && <VacationRequestTab currentUser={currentUser} />}
              {activeTab === 'vaclist' && <VacationListTab />}
              {activeTab === 'messages' && <MessagesTab currentUser={currentUser} />}
              {activeTab === 'library' && <LibraryTab currentUser={currentUser} />}
              {activeTab === 'tutorial' && <TutorialTab />}
            </div>
          </>
        ) : (
          <>
            <AnnouncementBar
              currentUser={currentUser}
              onShowWrite={() => setEducationMode('write')}
              onShowRead={() => setEducationMode('read')}
            />
            <DailyVocab date={date} />
            {['study', 'personal', 'reflection'].includes(activeTab) && (
              <DateNavigator date={date} onChange={setDate} />
            )}

            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl overflow-x-auto">
              {MAIN_TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 flex items-center justify-center gap-1 py-2 px-3 text-[11px] rounded-lg transition-all font-medium ${
                      activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div key={refreshKey}>
              {activeTab === 'study' && <StudyTab date={date} currentUser={currentUser} />}
              {activeTab === 'personal' && <PersonalStudyTab date={date} currentUser={currentUser} />}
              {activeTab === 'reflection' && <ReflectionTab date={date} currentUser={currentUser} />}
              {activeTab === 'qna' && <QnATab currentUser={currentUser} />}
              {activeTab === 'calendar' && <CalendarTab />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
