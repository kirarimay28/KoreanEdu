import { useState, useEffect } from 'react';
import type { User, MainTab } from './types';
import AuthPage from './components/Auth/AuthPage';
import StudyTab from './components/Study/StudyTab';
import PersonalStudyTab from './components/Personal/PersonalStudyTab';
import ReflectionTab from './components/Reflection/ReflectionTab';
import AttendanceTab from './components/Attendance/AttendanceTab';
import DateNavigator, { getKSTToday } from './components/common/DateNavigator';
import { BookOpen, GraduationCap, ClipboardList, CalendarCheck, LogOut, User as UserIcon } from 'lucide-react';

const SESSION_KEY = 'korean_edu_session';

const TABS: { id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'study', label: '스터디', icon: BookOpen },
  { id: 'personal', label: '개인공부', icon: GraduationCap },
  { id: 'reflection', label: '반성', icon: ClipboardList },
  { id: 'attendance', label: '출석', icon: CalendarCheck },
];

export default function App() {
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
            <span className="font-bold text-gray-900 text-sm">임용 스터디</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <UserIcon className="w-4 h-4 text-primary-400" />
              <span className="font-medium">{currentUser.username}</span>
            </div>
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

        <div>
          {activeTab === 'study' && <StudyTab date={date} currentUser={currentUser} />}
          {activeTab === 'personal' && <PersonalStudyTab date={date} currentUser={currentUser} />}
          {activeTab === 'reflection' && <ReflectionTab date={date} currentUser={currentUser} />}
          {activeTab === 'attendance' && <AttendanceTab />}
        </div>
      </main>
    </div>
  );
}
