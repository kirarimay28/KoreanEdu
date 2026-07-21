import { useState } from 'react';
import { loginUser, registerUser } from '../../store';
import type { User } from '../../types';
import { LogIn, UserPlus, BookOpen } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
}

type AuthMode = 'select' | 'login' | 'signup';

export default function AuthPage({ onLogin }: Props) {
  const [mode, setMode] = useState<AuthMode>('select');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState('');

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const result = loginUser(username, password);
    if (result.ok && result.user) {
      onLogin(result.user);
    } else {
      setError(result.error ?? '로그인에 실패했습니다.');
    }
  }

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim() || !resolution.trim()) {
      setError('모든 항목을 입력해 주세요.');
      return;
    }
    const result = registerUser(username.trim(), password, resolution.trim());
    if (result.ok && result.user) {
      onLogin(result.user);
    } else {
      setError(result.error ?? '회원가입에 실패했습니다.');
    }
  }

  function reset() {
    setMode('select');
    setUsername('');
    setPassword('');
    setResolution('');
    setError('');
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 38% 32%, rgba(255,255,255,0.62) 0%, rgba(169,217,190,0.28) 42%, transparent 65%),
          linear-gradient(145deg, #c8e6d4 0%, #a9d9be 50%, #8ecba6 100%)
        `
      }}
    >
      {/* Botanical decorations */}
      <svg className="absolute top-0 right-0 w-52 h-52 opacity-[0.18] pointer-events-none" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M160 10 C140 40 120 60 100 100" stroke="#1e5a3f" strokeWidth="1.5" strokeLinecap="round"/>
        <ellipse cx="130" cy="48" rx="22" ry="12" transform="rotate(-40 130 48)" fill="#27704f"/>
        <ellipse cx="115" cy="68" rx="19" ry="10" transform="rotate(-30 115 68)" fill="#358a63"/>
        <ellipse cx="107" cy="88" rx="16" ry="9" transform="rotate(-20 107 88)" fill="#4ea37c"/>
        <path d="M170 40 C155 55 148 70 143 90" stroke="#1e5a3f" strokeWidth="1" strokeLinecap="round"/>
        <ellipse cx="158" cy="58" rx="14" ry="7" transform="rotate(-50 158 58)" fill="#358a63"/>
        <ellipse cx="150" cy="74" rx="12" ry="6" transform="rotate(-38 150 74)" fill="#4ea37c"/>
      </svg>
      <svg className="absolute bottom-0 left-0 w-44 h-44 opacity-[0.15] pointer-events-none" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 170 C40 140 60 110 80 80" stroke="#1e5a3f" strokeWidth="1.5" strokeLinecap="round"/>
        <ellipse cx="48" cy="130" rx="20" ry="11" transform="rotate(40 48 130)" fill="#27704f"/>
        <ellipse cx="62" cy="110" rx="18" ry="9" transform="rotate(30 62 110)" fill="#358a63"/>
        <ellipse cx="73" cy="92" rx="15" ry="8" transform="rotate(20 73 92)" fill="#4ea37c"/>
        <circle cx="30" cy="160" r="3" fill="#77be9b"/>
        <circle cx="16" cy="155" r="2" fill="#77be9b"/>
      </svg>
      <svg className="absolute top-1/3 left-4 w-16 h-28 opacity-[0.12] pointer-events-none" viewBox="0 0 60 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 100 C30 70 20 40 30 10" stroke="#27704f" strokeWidth="1.2" strokeLinecap="round"/>
        <ellipse cx="20" cy="75" rx="14" ry="7" transform="rotate(20 20 75)" fill="#4ea37c"/>
        <ellipse cx="38" cy="55" rx="14" ry="7" transform="rotate(-15 38 55)" fill="#358a63"/>
        <ellipse cx="22" cy="38" rx="12" ry="6" transform="rotate(25 22 38)" fill="#27704f"/>
      </svg>

      <div className="w-full max-w-sm relative">

        {/* Hero */}
        <div className="text-center mb-10">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl mb-5 mx-auto"
            style={{ background: 'linear-gradient(145deg, #27704f, #1e5a3f)' }}
          >
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="auth-logo-shimmer text-6xl font-black tracking-tight mb-4">
            나랏말ᄊᆞ미
          </h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-10 bg-primary-200 rounded-full" />
            <div className="w-1.5 h-1.5 bg-primary-300 rounded-full" />
            <div className="h-px w-10 bg-primary-200 rounded-full" />
          </div>
          <p className="text-sm text-primary-400 font-medium tracking-widest">함께 합격을 향해</p>
        </div>

        {mode === 'select' && (
          <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-7">
            <p className="text-center text-[13px] text-gray-400 mb-6 leading-relaxed">
              스터디 구성원만 이용할 수 있습니다.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setMode('login')}
                className="w-full flex items-center justify-center gap-2 btn-primary"
              >
                <LogIn className="w-4 h-4" />로그인
              </button>
              <button
                onClick={() => setMode('signup')}
                className="w-full flex items-center justify-center gap-2 btn-secondary"
              >
                <UserPlus className="w-4 h-4" />회원가입
              </button>
            </div>
          </div>
        )}

        {mode === 'login' && (
          <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-7">
            <div className="flex items-center gap-2 mb-6">
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 transition text-lg leading-none">
                ←
              </button>
              <h2 className="text-base font-semibold text-gray-800">로그인</h2>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">아이디</label>
                <input
                  className="input-field"
                  placeholder="아이디를 입력하세요"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="label">비밀번호</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>
              )}
              <button type="submit" className="w-full btn-primary mt-2">
                로그인
              </button>
            </form>
          </div>
        )}

        {mode === 'signup' && (
          <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-7">
            <div className="flex items-center gap-2 mb-6">
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 transition text-lg leading-none">
                ←
              </button>
              <h2 className="text-base font-semibold text-gray-800">회원가입</h2>
            </div>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="label">아이디</label>
                <input
                  className="input-field"
                  placeholder="사용할 아이디를 입력하세요"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="label">비밀번호</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <p className="text-[11px] text-amber-600 mt-1">비밀번호는 네 자리 숫자로 설정해 주십시오.</p>
              </div>
              <div>
                <label className="label">나의 다짐</label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  placeholder="합격을 향한 나만의 다짐을 적어보세요"
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                />
                <p className="text-[11px] text-amber-600 mt-1">나의 다짐은 한 번 설정하면 변경할 수 없습니다.</p>
              </div>
              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>
              )}
              <button type="submit" className="w-full btn-primary mt-2">
                가입하기
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

