export default function AppLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 32"
      className={className}
      aria-label="나랏말씀이"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 나 */}
      <g fill="currentColor">
        {/* ㄴ */}
        <rect x="1" y="20" width="10" height="2" />
        <rect x="1" y="10" width="2" height="12" />
        {/* ㅏ */}
        <rect x="14" y="8" width="2" height="16" />
        <rect x="16" y="13" width="4" height="2" />
      </g>

      {/* 랏 */}
      <g fill="currentColor" transform="translate(24,0)">
        {/* ㄹ */}
        <rect x="0" y="3" width="10" height="2" />
        <rect x="0" y="7" width="10" height="2" />
        <rect x="0" y="11" width="10" height="2" />
        <rect x="0" y="3" width="2" height="5" />
        <rect x="8" y="7" width="2" height="5" />
        {/* ㅏ */}
        <rect x="13" y="2" width="2" height="10" />
        <rect x="15" y="6" width="3" height="2" />
        {/* ㅅ (받침) */}
        <rect x="1" y="15" width="2" height="6" transform="rotate(-20,2,18)" />
        <rect x="7" y="15" width="2" height="6" transform="rotate(20,8,18)" />
      </g>

      {/* 말 */}
      <g fill="currentColor" transform="translate(52,0)">
        {/* ㅁ */}
        <rect x="0" y="3" width="10" height="2" />
        <rect x="0" y="11" width="10" height="2" />
        <rect x="0" y="3" width="2" height="10" />
        <rect x="8" y="3" width="2" height="10" />
        {/* ㅏ */}
        <rect x="13" y="2" width="2" height="10" />
        <rect x="15" y="6" width="3" height="2" />
        {/* ㄹ (받침) */}
        <rect x="0" y="15" width="10" height="1.5" />
        <rect x="0" y="18" width="10" height="1.5" />
        <rect x="0" y="21" width="10" height="1.5" />
        <rect x="0" y="15" width="1.5" height="4" />
        <rect x="8.5" y="18" width="1.5" height="4" />
      </g>

      {/* ㅆ */}
      <g fill="currentColor" transform="translate(80,0)">
        {/* ㅆ — two ㅅ side by side */}
        <path d="M0,12 L4,4 L8,12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M6,12 L10,4 L14,12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* ㅡ */}
        <rect x="0" y="14" width="14" height="2" />
        {/* 아래아 ᆞ — drawn as small filled circle below ㅡ */}
        <circle cx="7" cy="20" r="2.2" />
        {/* ㅣ */}
        <rect x="17" y="2" width="2" height="20" />
      </g>

      {/* 미 */}
      <g fill="currentColor" transform="translate(112,0)">
        {/* ㅁ */}
        <rect x="0" y="3" width="10" height="2" />
        <rect x="0" y="11" width="10" height="2" />
        <rect x="0" y="3" width="2" height="10" />
        <rect x="8" y="3" width="2" height="10" />
        {/* ㅣ */}
        <rect x="13" y="3" width="2" height="10" />
      </g>
    </svg>
  );
}
