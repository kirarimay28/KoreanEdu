import { useState, useEffect } from 'react';
import { loginUser, registerUser } from '../../store';
import type { User } from '../../types';
import { LogIn, UserPlus, BookOpen } from 'lucide-react';
import { getTheme } from '../../theme';
import type { ThemeId } from '../../theme';

interface Props {
  onLogin: (user: User) => void;
}

type AuthMode = 'select' | 'login' | 'signup';

// ── 테마별 장식 SVG ────────────────────────────────────────

function DecorationPink() {
  return <>
    <svg className="absolute top-0 right-0 w-72 h-64 pointer-events-none"
      viewBox="0 0 300 260" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.17, color: 'var(--p-600)' }}>
      <ellipse cx="155" cy="140" rx="48" ry="15" transform="rotate(-8 155 140)" fill="currentColor" fillOpacity="0.9"/>
      <path d="M110 148 C88 156 68 164 50 174" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M113 153 C92 157 72 160 56 163" stroke="currentColor" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round"/>
      <path d="M116 157 C98 159 80 157 66 154" stroke="currentColor" strokeOpacity="0.65" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M196 128 C202 110 206 92 208 76" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round"/>
      <ellipse cx="210" cy="69" rx="11" ry="9" fill="currentColor" fillOpacity="0.95"/>
      <ellipse cx="211" cy="61" rx="5.5" ry="3.2" fill="rgba(155,55,48,0.85)"/>
      <circle cx="215" cy="70" r="2.2" fill="currentColor"/>
      <path d="M219 68 L236 63" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M112 145 C122 105 150 80 196 128" fill="currentColor" fillOpacity="0.55"/>
      <path d="M118 120 L108 102 M133 106 L128 88 M150 96 L148 77 M168 91 L169 72 M184 91 L188 73"
        stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M112 145 C124 102 152 78 196 128" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <path d="M112 148 C130 172 164 174 196 152" fill="currentColor" fillOpacity="0.35"/>
      <path d="M112 148 C132 174 166 176 196 152" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1" fill="none"/>
      <path d="M148 157 L142 192" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M163 159 L158 194" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M142 192 L134 198 M142 192 L142 200 M142 192 L150 198"
        stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M158 194 L150 200 M158 194 L158 202 M158 194 L166 200"
        stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
    <svg className="absolute bottom-10 left-0 w-64 pointer-events-none"
      viewBox="0 0 260 90" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.16, color: 'var(--p-600)' }}>
      <path d="M22 72 Q32 48 52 54 Q56 32 80 34 Q104 28 108 50 Q126 40 138 56 Q156 48 162 66 L22 66Z"
        fill="currentColor" fillOpacity="0.9" stroke="currentColor" strokeWidth="1"/>
      <path d="M14 80 Q28 60 46 64 Q50 50 66 52 Q80 48 84 62 Q96 58 102 70 L14 70Z"
        fill="currentColor" fillOpacity="0.55" stroke="currentColor" strokeOpacity="0.8" strokeWidth="0.8"/>
      <path d="M150 76 Q160 62 172 66 Q174 56 186 58 Q196 54 198 66 L150 68Z"
        fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeOpacity="0.65" strokeWidth="0.7"/>
    </svg>
    <svg className="absolute top-16 left-8 w-32 pointer-events-none"
      viewBox="0 0 130 60" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.12, color: 'var(--p-600)' }}>
      <path d="M12 44 Q20 26 36 30 Q38 14 56 16 Q72 12 76 28 Q90 22 96 36 L12 38Z"
        fill="currentColor" fillOpacity="0.9" stroke="currentColor" strokeWidth="0.8"/>
    </svg>
  </>;
}

function DecorationNotebook() {
  return <>
    {/* 연필 — 우상단 */}
    <svg className="absolute top-4 right-6 w-40 h-56 pointer-events-none"
      viewBox="0 0 160 230" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.15, color: 'var(--p-600)' }}>
      <rect x="62" y="18" width="36" height="158" rx="5" fill="currentColor" fillOpacity="0.45"/>
      <rect x="62" y="18" width="36" height="22" rx="5" fill="currentColor" fillOpacity="0.75"/>
      <rect x="62" y="36" width="36" height="9" fill="currentColor" fillOpacity="0.35"/>
      <path d="M62 176 L80 210 L98 176Z" fill="currentColor" fillOpacity="0.65"/>
      <path d="M68 176 L80 202 L92 176Z" fill="currentColor" fillOpacity="0.35"/>
      <circle cx="80" cy="27" r="5" fill="currentColor" fillOpacity="0.5"/>
      <line x1="80" y1="45" x2="80" y2="174" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
      {/* 별 */}
      <path d="M28 70 L31 79 L40 79 L33 85 L36 95 L28 89 L20 95 L23 85 L16 79 L25 79Z"
        fill="currentColor" fillOpacity="0.3"/>
      <path d="M130 40 L132 46 L138 46 L133 50 L135 57 L130 53 L125 57 L127 50 L122 46 L128 46Z"
        fill="currentColor" fillOpacity="0.22"/>
    </svg>
    {/* 노트 줄 — 좌하단 */}
    <svg className="absolute bottom-6 left-0 w-60 h-44 pointer-events-none"
      viewBox="0 0 240 175" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.14, color: 'var(--p-600)' }}>
      <line x1="44" y1="10" x2="44" y2="165" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5"/>
      {[28,52,76,100,124,148,168].map(y => (
        <line key={y} x1="8" x2="230" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.38" strokeWidth="1"/>
      ))}
      <circle cx="20" cy="28" r="5" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2"/>
      <circle cx="20" cy="100" r="5" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2"/>
      <circle cx="20" cy="168" r="5" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2"/>
    </svg>
    {/* 좌상단 작은 별 */}
    <svg className="absolute top-14 left-6 w-20 h-20 pointer-events-none"
      viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.13, color: 'var(--p-500)' }}>
      <path d="M40 10 L43 22 L55 22 L46 30 L49 42 L40 35 L31 42 L34 30 L25 22 L37 22Z" fill="currentColor"/>
    </svg>
  </>;
}

function DecorationChick() {
  return <>
    {/* 해 — 우상단 */}
    <svg className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
      viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.18, color: 'var(--p-500)' }}>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <line key={i}
          x1={192 + Math.cos(a) * 54} y1={64 + Math.sin(a) * 54}
          x2={192 + Math.cos(a) * 72} y2={64 + Math.sin(a) * 72}
          stroke="currentColor" strokeOpacity="0.65" strokeWidth="3.5" strokeLinecap="round"/>;
      })}
      <circle cx="192" cy="64" r="44" fill="currentColor" fillOpacity="0.5"/>
      <circle cx="192" cy="64" r="30" fill="currentColor" fillOpacity="0.35"/>
    </svg>
    {/* 병아리 — 좌하단 */}
    <svg className="absolute bottom-6 left-2 w-44 h-48 pointer-events-none"
      viewBox="0 0 175 195" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.18, color: 'var(--p-600)' }}>
      <ellipse cx="88" cy="130" rx="48" ry="40" fill="currentColor" fillOpacity="0.45"/>
      <circle cx="88" cy="78" r="34" fill="currentColor" fillOpacity="0.55"/>
      <circle cx="74" cy="70" r="6.5" fill="currentColor" fillOpacity="0.9"/>
      <circle cx="102" cy="70" r="6.5" fill="currentColor" fillOpacity="0.9"/>
      <circle cx="76" cy="68" r="2.8" fill="white" fillOpacity="0.75"/>
      <circle cx="104" cy="68" r="2.8" fill="white" fillOpacity="0.75"/>
      <path d="M81 84 L88 96 L95 84Z" fill="currentColor" fillOpacity="0.75"/>
      <path d="M40 128 C24 108 28 86 46 94 C42 108 40 122 40 128Z" fill="currentColor" fillOpacity="0.38"/>
      <path d="M136 128 C152 108 148 86 130 94 C134 108 136 122 136 128Z" fill="currentColor" fillOpacity="0.38"/>
      <path d="M72 168 L64 180 M72 168 L72 182 M72 168 L80 180" stroke="currentColor" strokeOpacity="0.65" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M104 168 L96 180 M104 168 L104 182 M104 168 L112 180" stroke="currentColor" strokeOpacity="0.65" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M86 46 Q88 30 90 46" stroke="currentColor" strokeOpacity="0.65" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M74 51 Q70 35 76 48" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.8" strokeLinecap="round"/>
      <path d="M100 51 Q106 35 102 48" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.8" strokeLinecap="round"/>
    </svg>
    {/* 좌상단 별/꽃 */}
    <svg className="absolute top-16 left-4 w-28 h-28 pointer-events-none"
      viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.16, color: 'var(--p-500)' }}>
      <path d="M30 22 L33 32 L44 32 L35 38 L38 49 L30 43 L22 49 L25 38 L16 32 L27 32Z" fill="currentColor"/>
      <path d="M76 60 L78 66 L84 66 L80 70 L82 77 L76 73 L70 77 L72 70 L68 66 L74 66Z" fill="currentColor" fillOpacity="0.7"/>
      <circle cx="85" cy="28" r="4" fill="currentColor" fillOpacity="0.5"/>
      <circle cx="55" cy="85" r="3" fill="currentColor" fillOpacity="0.4"/>
    </svg>
  </>;
}

function DecorationLofi() {
  return <>
    {/* 헤드폰 — 우상단 */}
    <svg className="absolute top-2 right-2 w-60 h-60 pointer-events-none"
      viewBox="0 0 235 235" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.16, color: 'var(--p-600)' }}>
      <path d="M58 138 C58 68 178 68 178 138" stroke="currentColor" strokeWidth="11" strokeLinecap="round" fill="none"/>
      <rect x="34" y="126" width="38" height="56" rx="15" fill="currentColor" fillOpacity="0.6"/>
      <rect x="163" y="126" width="38" height="56" rx="15" fill="currentColor" fillOpacity="0.6"/>
      <rect x="41" y="133" width="24" height="38" rx="10" fill="currentColor" fillOpacity="0.28"/>
      <rect x="170" y="133" width="24" height="38" rx="10" fill="currentColor" fillOpacity="0.28"/>
      {/* 음표 */}
      <path d="M115 158 L115 182" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M115 158 C115 158 125 154 125 146 L125 170" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="113" cy="184" rx="6.5" ry="4.5" fill="currentColor" fillOpacity="0.4"/>
      <ellipse cx="123" cy="172" rx="6.5" ry="4.5" fill="currentColor" fillOpacity="0.4"/>
    </svg>
    {/* 달 + 별 + 카세트 — 좌하단 */}
    <svg className="absolute bottom-4 left-0 w-60 h-52 pointer-events-none"
      viewBox="0 0 235 205" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.15, color: 'var(--p-500)' }}>
      <path d="M82 158 C50 136 50 94 82 72 C60 82 56 126 82 158Z" fill="currentColor" fillOpacity="0.65"/>
      <path d="M136 44 L139 53 L148 53 L141 58 L144 67 L136 62 L128 67 L131 58 L124 53 L133 53Z"
        fill="currentColor" fillOpacity="0.55"/>
      <circle cx="170" cy="90" r="4.5" fill="currentColor" fillOpacity="0.45"/>
      <circle cx="198" cy="52" r="3.2" fill="currentColor" fillOpacity="0.38"/>
      <circle cx="48" cy="48" r="2.8" fill="currentColor" fillOpacity="0.45"/>
      <circle cx="28" cy="80" r="2.2" fill="currentColor" fillOpacity="0.32"/>
      {/* 카세트 */}
      <rect x="140" y="136" width="68" height="48" rx="7" fill="none" stroke="currentColor" strokeOpacity="0.38" strokeWidth="2"/>
      <circle cx="160" cy="160" r="11" fill="none" stroke="currentColor" strokeOpacity="0.38" strokeWidth="2"/>
      <circle cx="188" cy="160" r="11" fill="none" stroke="currentColor" strokeOpacity="0.38" strokeWidth="2"/>
      <path d="M165 153 L183 153 L183 167 L165 167Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1"/>
      <circle cx="160" cy="160" r="4" fill="currentColor" fillOpacity="0.25"/>
      <circle cx="188" cy="160" r="4" fill="currentColor" fillOpacity="0.25"/>
    </svg>
    {/* 좌상단 별 */}
    <svg className="absolute top-10 left-3 w-28 h-28 pointer-events-none"
      viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.13, color: 'var(--p-500)' }}>
      <circle cx="28" cy="28" r="3.2" fill="currentColor"/>
      <circle cx="62" cy="14" r="2.2" fill="currentColor" fillOpacity="0.7"/>
      <circle cx="88" cy="44" r="2.8" fill="currentColor" fillOpacity="0.6"/>
      <circle cx="18" cy="68" r="2.2" fill="currentColor" fillOpacity="0.5"/>
      <circle cx="78" cy="82" r="3.2" fill="currentColor" fillOpacity="0.55"/>
      <circle cx="44" cy="92" r="2" fill="currentColor" fillOpacity="0.4"/>
    </svg>
  </>;
}

function DecorationMono() {
  return <>
    {/* 기하학 — 우상단 */}
    <svg className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
      viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.09, color: 'var(--p-700)' }}>
      <circle cx="196" cy="64" r="72" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="196" cy="64" r="50" fill="currentColor" fillOpacity="0.12"/>
      <circle cx="196" cy="64" r="26" fill="currentColor" fillOpacity="0.22"/>
      <line x1="124" y1="64" x2="260" y2="64" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1"/>
      <line x1="196" y1="0" x2="196" y2="136" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1"/>
      <rect x="18" y="18" width="52" height="52" fill="none" stroke="currentColor" strokeOpacity="0.38" strokeWidth="1.5"/>
      <rect x="27" y="27" width="34" height="34" fill="currentColor" fillOpacity="0.1"/>
      <path d="M140 200 L180 240 L100 240Z" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5"/>
    </svg>
    {/* 수평선 — 좌하단 */}
    <svg className="absolute bottom-6 left-0 w-64 h-40 pointer-events-none"
      viewBox="0 0 255 158" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.09, color: 'var(--p-700)' }}>
      {[18, 40, 60, 78, 96, 112, 128].map((y, i) => (
        <line key={y} x1="0" x2={200 - i * 14} y1={y} y2={y}
          stroke="currentColor" strokeOpacity={i < 3 ? 0.85 : 0.55} strokeWidth={i < 2 ? 2.2 : 1.2}/>
      ))}
      <circle cx="220" cy="40" r="28" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5"/>
      <circle cx="220" cy="40" r="14" fill="currentColor" fillOpacity="0.1"/>
    </svg>
    {/* 우하단 점선 사각형 */}
    <svg className="absolute bottom-10 right-4 w-24 h-24 pointer-events-none"
      viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.07, color: 'var(--p-700)' }}>
      <rect x="8" y="8" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4"/>
      <rect x="24" y="24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
    </svg>
  </>;
}

function DecorationCeladon() {
  return <>
    {/* 청자 항아리 — 우상단 */}
    <svg className="absolute top-0 right-2 w-44 h-64 pointer-events-none"
      viewBox="0 0 180 260" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.16, color: 'var(--p-600)' }}>
      <path d="M90 28 C106 28 128 44 136 70 C148 102 148 142 136 172 C124 198 110 212 90 216 C70 212 56 198 44 172 C32 142 32 102 44 70 C52 44 74 28 90 28Z"
        fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="2" strokeOpacity="0.45"/>
      <path d="M74 28 C74 18 106 18 106 28" fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.45"/>
      <ellipse cx="90" cy="16" rx="22" ry="7" fill="currentColor" fillOpacity="0.32" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.45"/>
      <path d="M44 102 Q58 91 72 102 Q82 89 92 102 Q102 89 112 102 Q126 91 138 102"
        stroke="currentColor" strokeOpacity="0.38" strokeWidth="1.5" fill="none"/>
      <path d="M90 148 C85 136 76 130 74 138 C72 127 80 118 90 124 C100 118 108 127 106 138 C104 130 95 136 90 148Z"
        fill="currentColor" fillOpacity="0.32"/>
      <path d="M90 148 C80 143 70 148 70 158 C70 165 78 172 90 172 C102 172 110 165 110 158 C110 148 100 143 90 148Z"
        fill="currentColor" fillOpacity="0.18"/>
      <ellipse cx="90" cy="216" rx="28" ry="8" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1" strokeOpacity="0.38"/>
    </svg>
    {/* 연꽃 + 물결 — 좌하단 */}
    <svg className="absolute bottom-4 left-0 w-60 h-44 pointer-events-none"
      viewBox="0 0 235 175" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.15, color: 'var(--p-600)' }}>
      <ellipse cx="118" cy="148" rx="95" ry="20" fill="none" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1.5"/>
      <ellipse cx="118" cy="148" rx="68" ry="14" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1"/>
      <ellipse cx="118" cy="148" rx="42" ry="8" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1"/>
      <path d="M118 88 C112 72 100 66 98 76 C93 63 104 52 118 60Z" fill="currentColor" fillOpacity="0.38"/>
      <path d="M118 88 C124 72 136 66 138 76 C143 63 132 52 118 60Z" fill="currentColor" fillOpacity="0.38"/>
      <path d="M118 88 C118 66 107 57 107 68 C102 57 110 46 118 54Z" fill="currentColor" fillOpacity="0.32"/>
      <path d="M118 88 C118 66 129 57 129 68 C134 57 126 46 118 54Z" fill="currentColor" fillOpacity="0.32"/>
      <ellipse cx="118" cy="88" rx="13" ry="11" fill="currentColor" fillOpacity="0.48"/>
      <path d="M118 99 C120 116 118 132 118 148" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round"/>
      <path d="M118 118 C96 107 74 114 78 126 C82 134 102 130 118 118Z" fill="currentColor" fillOpacity="0.22"/>
    </svg>
    {/* 좌상단 구름 */}
    <svg className="absolute top-14 left-4 w-36 h-20 pointer-events-none"
      viewBox="0 0 140 78" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.13, color: 'var(--p-600)' }}>
      <path d="M14 58 Q26 38 44 44 Q48 26 68 28 Q88 22 92 42 Q110 34 120 52 L14 52Z"
        fill="currentColor" fillOpacity="0.7" stroke="currentColor" strokeWidth="0.8"/>
    </svg>
  </>;
}

function ThemeDecoration({ theme }: { theme: ThemeId }) {
  switch (theme) {
    case 'notebook': return <DecorationNotebook />;
    case 'chick':    return <DecorationChick />;
    case 'lofi':     return <DecorationLofi />;
    case 'mono':     return <DecorationMono />;
    case 'celadon':  return <DecorationCeladon />;
    default:         return <DecorationPink />;
  }
}

function getAuthBgStyle(theme: ThemeId): React.CSSProperties {
  if (theme === 'lofi') {
    return {
      background: 'linear-gradient(170deg, #c0b0f0 0%, #a8b0f0 22%, #b898e4 45%, #d0a8d4 68%, #e0b8dc 100%)',
    };
  }
  if (theme === 'notebook') {
    return {
      backgroundImage: [
        'linear-gradient(rgba(100,150,210,0.18) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(100,150,210,0.18) 1px, transparent 1px)',
        'linear-gradient(152deg, var(--p-100) 0%, var(--p-50) 60%, var(--p-100) 100%)',
      ].join(','),
      backgroundSize: '24px 24px, 24px 24px, 100% 100%',
    };
  }
  if (theme === 'mono') {
    return {
      background: 'linear-gradient(152deg, #f8f8f8 0%, #e8e8e8 40%, #d8d8d8 100%)',
    };
  }
  return {
    background: `
      radial-gradient(ellipse at 22% 18%, rgba(255,255,255,0.88) 0%, rgba(224,242,238,0.5) 32%, transparent 56%),
      radial-gradient(ellipse at 78% 84%, color-mix(in srgb, var(--p-300) 32%, transparent) 0%, color-mix(in srgb, var(--p-400) 18%, transparent) 36%, transparent 60%),
      radial-gradient(ellipse at 60% 38%, rgba(255,255,255,0.16) 0%, transparent 30%),
      linear-gradient(152deg, var(--p-100) 0%, var(--p-200) 28%, var(--p-300) 58%, var(--p-200) 82%, var(--p-100) 100%)
    `,
  };
}

// ── 컴포넌트 ────────────────────────────────────────────────

export default function AuthPage({ onLogin }: Props) {
  const [mode, setMode] = useState<AuthMode>('select');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<ThemeId>(getTheme);

  useEffect(() => {
    const handler = () => setTheme(getTheme());
    window.addEventListener('themechange', handler);
    return () => window.removeEventListener('themechange', handler);
  }, []);

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
      style={getAuthBgStyle(theme)}
    >
      <ThemeDecoration theme={theme} />

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
              boxShadow: '0 10px 40px color-mix(in srgb, var(--p-600) 22%, transparent), 0 0 0 1px rgba(255,255,255,0.45) inset',
            }}
          >
            <BookOpen className="w-10 h-10" style={{ color: 'var(--p-800)', opacity: 0.80 }} />
          </div>
          <h1 className="auth-logo-shimmer logo-serif text-6xl mb-4">
            나랏말
          </h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-10 bg-primary-200 rounded-full" />
            <div className="w-1.5 h-1.5 bg-primary-300 rounded-full" />
            <div className="h-px w-10 bg-primary-200 rounded-full" />
          </div>
          <p className="text-sm text-primary-400 font-medium tracking-widest">함께 합격을 향해</p>
        </div>

        {mode === 'select' && (
          <div className="rounded-3xl p-7" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.70)', boxShadow: '0 4px 24px color-mix(in srgb, var(--p-600) 10%, transparent), 0 0 0 1px rgba(255,255,255,0.50) inset' }}>
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
          <div className="rounded-3xl p-7" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.70)', boxShadow: '0 4px 24px color-mix(in srgb, var(--p-600) 10%, transparent), 0 0 0 1px rgba(255,255,255,0.50) inset' }}>
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
          <div className="rounded-3xl p-7" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.70)', boxShadow: '0 4px 24px color-mix(in srgb, var(--p-600) 10%, transparent), 0 0 0 1px rgba(255,255,255,0.50) inset' }}>
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
