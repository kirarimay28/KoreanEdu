import { useState, useEffect } from 'react';
import type { User, MainTab } from './types';
import AuthPage from './components/Auth/AuthPage';
import StudyTab from './components/Study/StudyTab';
import PersonalStudyTab from './components/Personal/PersonalStudyTab';
import ReflectionTab from './components/Reflection/ReflectionTab';
import AttendanceTab from './components/Attendance/AttendanceTab';
import DateNavigator, { getKSTToday } from './components/common/DateNavigator';
import { BookOpen, GraduationCap, ClipboardList, CalendarCheck, LogOut, User as UserIcon, RefreshCw } from 'lucide-react';
import AppLogo from './components/common/AppLogo';
import DailyVocab from './components/common/DailyVocab';
import { initializeData, refreshData } from './store';

const SESSION_KEY = 'korean_edu_session';

const TABS: { id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'study', label: '스터디', icon: BookOpen },
  { id: 'personal', label: '개인공부', icon: GraduationCap },
  { id: 'reflection', label: '반성', icon: ClipboardList },
  { id: 'attendance', label: '출석', icon: CalendarCheck },
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

  useEffect(() => {
    initializeData()
      .then(() => setLoading(false))
      .catch(() => { setLoading(false); setLoadError(true); });
  }, []);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  function handleLogin(user: User) {
    setCurrentUser(user);
  }

  function handleLogout() {
    setCurrentUser(null);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshData().catch(console.error);
    setRefreshing(false);
    setRefreshKey(k => k + 1);
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
        <p className="text-red-500 font-semibold">Firebase 연결에 실패했습니다.</p>
        <p className="text-gray-500 text-sm">.env.local 파일의 Firebase 설정값을 확인해 주세요.</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <AppLogo className="h-8" />
          </div>
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        <DailyVocab date={date} />
        {activeTab !== 'attendance' && (
          <DateNavigator date={date} onChange={setDate} />
        )}

        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-lg transition-all font-medium ${
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
          {activeTab === 'attendance' && <AttendanceTab />}
        </div>
      </main>
    </div>
  );
}
