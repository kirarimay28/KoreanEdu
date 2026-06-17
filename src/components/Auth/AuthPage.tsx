import { useState } from 'react';
import { loginUser, registerUser } from '../../store';
import type { User } from '../../types';
import { LogIn, UserPlus } from 'lucide-react';
import AppLogo from '../common/AppLogo';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-sm">

        {/* Hero */}
        <div className="text-center mb-10">
          <AppLogo className="h-20 mx-auto mb-4" />
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
