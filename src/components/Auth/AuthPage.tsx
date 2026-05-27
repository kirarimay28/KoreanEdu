import { useState } from 'react';
import { loginUser, registerUser } from '../../store';
import type { User } from '../../types';
import { BookOpen, LogIn, UserPlus } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <AppLogo className="h-14 mx-auto" />
          <p className="text-gray-500 text-sm mt-1">함께 합격을 향해</p>
        </div>

        {mode === 'select' && (
          <div className="card space-y-4">
            <h2 className="text-center text-lg font-semibold text-gray-800 mb-6">시작하기</h2>
            <button
              onClick={() => setMode('login')}
              className="w-full flex items-center justify-center gap-3 btn-primary"
            >
              <LogIn className="w-5 h-5" />
              로그인
            </button>
            <button
              onClick={() => setMode('signup')}
              className="w-full flex items-center justify-center gap-3 btn-secondary"
            >
              <UserPlus className="w-5 h-5" />
              회원가입
            </button>
          </div>
        )}

        {mode === 'login' && (
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 transition">
                ←
              </button>
              <h2 className="text-lg font-semibold text-gray-800">로그인</h2>
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
                <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>
              )}
              <button type="submit" className="w-full btn-primary mt-2">
                로그인
              </button>
            </form>
          </div>
        )}

        {mode === 'signup' && (
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 transition">
                ←
              </button>
              <h2 className="text-lg font-semibold text-gray-800">회원가입</h2>
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
              </div>
              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>
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
