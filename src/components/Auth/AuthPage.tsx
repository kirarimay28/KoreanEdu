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
          radial-gradient(ellipse at 22% 18%, rgba(255,255,255,0.88) 0%, rgba(224,242,238,0.5) 32%, transparent 56%),
          radial-gradient(ellipse at 78% 84%, rgba(121,179,168,0.32) 0%, rgba(82,152,140,0.18) 36%, transparent 60%),
          radial-gradient(ellipse at 60% 38%, rgba(255,255,255,0.16) 0%, transparent 30%),
          radial-gradient(ellipse at 38% 68%, rgba(170,207,197,0.14) 0%, transparent 40%),
          linear-gradient(152deg, #bdd9d3 0%, #96c1b7 28%, #79b3a8 58%, #8cbdB4 82%, #a6c8c0 100%)
        `
      }}
    >
      {/* Crane motif — top-right */}
      <svg
        className="absolute top-0 right-0 w-72 h-64 pointer-events-none"
        viewBox="0 0 300 260" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.17 }}
      >
        {/* Body */}
        <ellipse cx="155" cy="140" rx="48" ry="15" transform="rotate(-8 155 140)" fill="rgba(43,100,96,0.9)"/>
        {/* Tail feathers */}
        <path d="M110 148 C88 156 68 164 50 174" stroke="rgba(43,100,96,1)" strokeWidth="3.5" strokeLinecap="round"/>
        <path d="M113 153 C92 157 72 160 56 163" stroke="rgba(43,100,96,0.8)" strokeWidth="3" strokeLinecap="round"/>
        <path d="M116 157 C98 159 80 157 66 154" stroke="rgba(43,100,96,0.65)" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Neck */}
        <path d="M196 128 C202 110 206 92 208 76" stroke="rgba(43,100,96,1)" strokeWidth="5.5" strokeLinecap="round"/>
        {/* Head */}
        <ellipse cx="210" cy="69" rx="11" ry="9" fill="rgba(43,100,96,0.95)"/>
        {/* Red crown */}
        <ellipse cx="211" cy="61" rx="5.5" ry="3.2" fill="rgba(155,55,48,0.85)"/>
        {/* Eye */}
        <circle cx="215" cy="70" r="2.2" fill="rgba(43,100,96,1)"/>
        {/* Beak */}
        <path d="M219 68 L236 63" stroke="rgba(43,100,96,1)" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Upper wing */}
        <path d="M112 145 C122 105 150 80 196 128" fill="rgba(43,100,96,0.55)"/>
        {/* Wing primary feather lines */}
        <path d="M118 120 L108 102 M133 106 L128 88 M150 96 L148 77 M168 91 L169 72 M184 91 L188 73"
          stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"/>
        {/* Upper wing edge */}
        <path d="M112 145 C124 102 152 78 196 128" stroke="rgba(43,100,96,1)" strokeWidth="1.2" fill="none"/>
        {/* Lower wing */}
        <path d="M112 148 C130 172 164 174 196 152" fill="rgba(43,100,96,0.35)"/>
        <path d="M112 148 C132 174 166 176 196 152" stroke="rgba(43,100,96,0.8)" strokeWidth="1" fill="none"/>
        {/* Legs */}
        <path d="M148 157 L142 192" stroke="rgba(43,100,96,0.9)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M163 159 L158 194" stroke="rgba(43,100,96,0.9)" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Feet */}
        <path d="M142 192 L134 198 M142 192 L142 200 M142 192 L150 198"
          stroke="rgba(43,100,96,0.85)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M158 194 L150 200 M158 194 L158 202 M158 194 L166 200"
          stroke="rgba(43,100,96,0.85)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>

      {/* Cloud motifs — bottom-left */}
      <svg
        className="absolute bottom-10 left-0 w-64 pointer-events-none"
        viewBox="0 0 260 90" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.16 }}
      >
        <path d="M22 72 Q32 48 52 54 Q56 32 80 34 Q104 28 108 50 Q126 40 138 56 Q156 48 162 66 L22 66Z"
          fill="rgba(43,100,96,0.9)" stroke="rgba(43,100,96,1)" strokeWidth="1"/>
        <path d="M14 80 Q28 60 46 64 Q50 50 66 52 Q80 48 84 62 Q96 58 102 70 L14 70Z"
          fill="rgba(43,100,96,0.55)" stroke="rgba(43,100,96,0.8)" strokeWidth="0.8"/>
        <path d="M150 76 Q160 62 172 66 Q174 56 186 58 Q196 54 198 66 L150 68Z"
          fill="rgba(43,100,96,0.4)" stroke="rgba(43,100,96,0.65)" strokeWidth="0.7"/>
      </svg>

      {/* Small cloud — top-left */}
      <svg
        className="absolute top-16 left-8 w-32 pointer-events-none"
        viewBox="0 0 130 60" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.12 }}
      >
        <path d="M12 44 Q20 26 36 30 Q38 14 56 16 Q72 12 76 28 Q90 22 96 36 L12 38Z"
          fill="rgba(43,100,96,0.9)" stroke="rgba(43,100,96,1)" strokeWidth="0.8"/>
      </svg>

      <div className="w-full max-w-sm relative">

        {/* Hero */}
        <div className="text-center mb-10">
          <div
            className="logo-float w-20 h-20 rounded-3xl flex items-center justify-center mb-5 mx-auto"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.12) 100%)',
              border: '1px solid rgba(255,255,255,0.60)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 10px 40px rgba(43,100,96,0.22), 0 0 0 1px rgba(255,255,255,0.45) inset',
            }}
          >
            <BookOpen className="w-10 h-10" style={{ color: '#0f2826', opacity: 0.80 }} />
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
          <div className="rounded-3xl p-7" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.70)', boxShadow: '0 4px 24px rgba(43,100,96,0.10), 0 0 0 1px rgba(255,255,255,0.50) inset' }}>
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
          <div className="rounded-3xl p-7" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.70)', boxShadow: '0 4px 24px rgba(43,100,96,0.10), 0 0 0 1px rgba(255,255,255,0.50) inset' }}>
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
          <div className="rounded-3xl p-7" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.70)', boxShadow: '0 4px 24px rgba(43,100,96,0.10), 0 0 0 1px rgba(255,255,255,0.50) inset' }}>
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

